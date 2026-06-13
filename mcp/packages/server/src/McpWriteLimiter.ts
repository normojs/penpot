export interface McpWriteLimiterConfig {
    rateWindowMs: number;
    perUserRateLimit: number;
    perSessionRateLimit: number;
    perFileRateLimit: number;
    perUserConcurrency: number;
    perSessionConcurrency: number;
    perFileConcurrency: number;
}

export interface McpWriteLimitRequest {
    toolName: string;
    userToken?: string;
    sessionId?: string;
    fileId?: string;
}

export interface McpWriteLimitRejection {
    code: "mcp_write_rate_limit" | "mcp_write_concurrency_limit";
    message: string;
    scope: "user" | "session" | "file";
    limit: number;
    active?: number;
    remaining?: number;
    retryAfterMs?: number;
    resetAt?: string;
    toolName: string;
}

export type McpWriteLimitAcquireResult =
    | {
          acquired: true;
          release: () => void;
      }
    | {
          acquired: false;
          rejection: McpWriteLimitRejection;
      };

interface RateCounter {
    count: number;
    resetAt: number;
}

type LimitScope = "user" | "session" | "file";

const DEFAULT_CONFIG: McpWriteLimiterConfig = {
    rateWindowMs: 60_000,
    perUserRateLimit: 240,
    perSessionRateLimit: 120,
    perFileRateLimit: 120,
    perUserConcurrency: 4,
    perSessionConcurrency: 2,
    perFileConcurrency: 1,
};

export class McpWriteLimiter {
    private readonly config: McpWriteLimiterConfig;
    private readonly rateCounters = new Map<string, RateCounter>();
    private readonly activeCounts = new Map<string, number>();

    constructor(config: Partial<McpWriteLimiterConfig> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    public static fromEnv(env: NodeJS.ProcessEnv = process.env): McpWriteLimiter {
        return new McpWriteLimiter({
            rateWindowMs: this.readPositiveInt(env.PENPOT_MCP_WRITE_RATE_WINDOW_MS, DEFAULT_CONFIG.rateWindowMs),
            perUserRateLimit: this.readNonNegativeInt(
                env.PENPOT_MCP_WRITE_RATE_LIMIT_PER_USER,
                DEFAULT_CONFIG.perUserRateLimit
            ),
            perSessionRateLimit: this.readNonNegativeInt(
                env.PENPOT_MCP_WRITE_RATE_LIMIT_PER_SESSION,
                DEFAULT_CONFIG.perSessionRateLimit
            ),
            perFileRateLimit: this.readNonNegativeInt(
                env.PENPOT_MCP_WRITE_RATE_LIMIT_PER_FILE,
                DEFAULT_CONFIG.perFileRateLimit
            ),
            perUserConcurrency: this.readNonNegativeInt(
                env.PENPOT_MCP_WRITE_CONCURRENCY_PER_USER,
                DEFAULT_CONFIG.perUserConcurrency
            ),
            perSessionConcurrency: this.readNonNegativeInt(
                env.PENPOT_MCP_WRITE_CONCURRENCY_PER_SESSION,
                DEFAULT_CONFIG.perSessionConcurrency
            ),
            perFileConcurrency: this.readNonNegativeInt(
                env.PENPOT_MCP_WRITE_CONCURRENCY_PER_FILE,
                DEFAULT_CONFIG.perFileConcurrency
            ),
        });
    }

    public acquire(request: McpWriteLimitRequest): McpWriteLimitAcquireResult {
        const keys = this.createKeys(request);
        const now = Date.now();

        const rateRejection = this.checkRateLimit(request, keys, now);
        if (rateRejection) {
            return { acquired: false, rejection: rateRejection };
        }

        const concurrencyRejection = this.checkConcurrencyLimit(request, keys);
        if (concurrencyRejection) {
            return { acquired: false, rejection: concurrencyRejection };
        }

        const activeKeys = keys.map((item) => item.activeKey).filter((key): key is string => typeof key === "string");
        for (const key of activeKeys) {
            this.activeCounts.set(key, (this.activeCounts.get(key) ?? 0) + 1);
        }

        let released = false;
        return {
            acquired: true,
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                for (const key of activeKeys) {
                    this.decrementActiveCount(key);
                }
            },
        };
    }

    public getStatus() {
        return {
            config: this.config,
            activeScopes: this.activeCounts.size,
            rateScopes: this.rateCounters.size,
        };
    }

    private static readPositiveInt(value: string | undefined, fallback: number): number {
        const parsed = Number.parseInt(value ?? "", 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    private static readNonNegativeInt(value: string | undefined, fallback: number): number {
        const parsed = Number.parseInt(value ?? "", 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    }

    private createKeys(request: McpWriteLimitRequest): {
        scope: LimitScope;
        limit: number;
        rateKey?: string;
        activeKey?: string;
    }[] {
        const userKey = request.userToken ? `user:${this.fingerprint(request.userToken)}` : "user:single";
        const sessionKey = request.sessionId ? `session:${request.sessionId}` : `session:${userKey}`;
        const fileKey = request.fileId ? `file:${request.fileId}` : undefined;

        return [
            {
                scope: "user",
                limit: this.config.perUserRateLimit,
                rateKey: `rate:${userKey}`,
                activeKey: this.activeKey("user", userKey, this.config.perUserConcurrency),
            },
            {
                scope: "session",
                limit: this.config.perSessionRateLimit,
                rateKey: `rate:${sessionKey}`,
                activeKey: this.activeKey("session", sessionKey, this.config.perSessionConcurrency),
            },
            {
                scope: "file",
                limit: this.config.perFileRateLimit,
                rateKey: fileKey ? `rate:${fileKey}` : undefined,
                activeKey: fileKey ? this.activeKey("file", fileKey, this.config.perFileConcurrency) : undefined,
            },
        ];
    }

    private activeKey(scope: LimitScope, key: string, limit: number): string | undefined {
        return limit > 0 ? `active:${scope}:${key}` : undefined;
    }

    private checkRateLimit(
        request: McpWriteLimitRequest,
        keys: ReturnType<McpWriteLimiter["createKeys"]>,
        now: number
    ): McpWriteLimitRejection | null {
        for (const item of keys) {
            if (!item.rateKey || item.limit <= 0) {
                continue;
            }

            const current = this.currentRateCounter(item.rateKey, now);
            if (current.count >= item.limit) {
                return {
                    code: "mcp_write_rate_limit",
                    message: `MCP write rate limit reached for ${item.scope}.`,
                    scope: item.scope,
                    limit: item.limit,
                    remaining: 0,
                    retryAfterMs: Math.max(0, current.resetAt - now),
                    resetAt: new Date(current.resetAt).toISOString(),
                    toolName: request.toolName,
                };
            }
        }

        for (const item of keys) {
            if (!item.rateKey || item.limit <= 0) {
                continue;
            }
            this.currentRateCounter(item.rateKey, now).count += 1;
        }

        return null;
    }

    private checkConcurrencyLimit(
        request: McpWriteLimitRequest,
        keys: ReturnType<McpWriteLimiter["createKeys"]>
    ): McpWriteLimitRejection | null {
        for (const item of keys) {
            const limit = this.getConcurrencyLimit(item.scope);
            if (!item.activeKey || limit <= 0) {
                continue;
            }

            const active = this.activeCounts.get(item.activeKey) ?? 0;
            if (active >= limit) {
                return {
                    code: "mcp_write_concurrency_limit",
                    message: `MCP write concurrency limit reached for ${item.scope}.`,
                    scope: item.scope,
                    limit,
                    active,
                    retryAfterMs: 0,
                    toolName: request.toolName,
                };
            }
        }

        return null;
    }

    private getConcurrencyLimit(scope: LimitScope): number {
        switch (scope) {
            case "user":
                return this.config.perUserConcurrency;
            case "session":
                return this.config.perSessionConcurrency;
            case "file":
                return this.config.perFileConcurrency;
        }
    }

    private currentRateCounter(key: string, now: number): RateCounter {
        const current = this.rateCounters.get(key);
        if (!current || current.resetAt <= now) {
            const next = { count: 0, resetAt: now + this.config.rateWindowMs };
            this.rateCounters.set(key, next);
            return next;
        }
        return current;
    }

    private decrementActiveCount(key: string): void {
        const next = (this.activeCounts.get(key) ?? 0) - 1;
        if (next <= 0) {
            this.activeCounts.delete(key);
        } else {
            this.activeCounts.set(key, next);
        }
    }

    private fingerprint(value: string): string {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }
}
