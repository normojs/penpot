import type { FileContextSnapshot } from "@penpot/mcp-common";
import { CommandErrorCodes } from "@penpot/command-runtime";

export const FileContextErrorCodes = {
    FILE_CONTEXT_REQUIRED: CommandErrorCodes.FILE_CONTEXT_REQUIRED,
    FILE_CONTEXT_AMBIGUOUS: "file_context_ambiguous",
    FILE_CONTEXT_NOT_FOUND: "file_context_not_found",
    FILE_CONTEXT_STALE: "file_context_stale",
} as const;

export type FileContextErrorCode = (typeof FileContextErrorCodes)[keyof typeof FileContextErrorCodes];

export interface StoredFileContext extends FileContextSnapshot {
    status: "available" | "bound" | "stale";
    lastSeenAt: string;
    verifiedAt?: string;
    staleReason?: string;
}

export interface FileContextSelector {
    contextId?: string;
    fileId?: string;
}

export interface FileContextLookupError {
    code: FileContextErrorCode;
    message: string;
    contexts?: StoredFileContext[];
}

export type FileContextLookupResult =
    | { ok: true; context: StoredFileContext }
    | { ok: false; error: FileContextLookupError };

export interface FileContextSessionSummary {
    status: "unbound" | "available" | "bound" | "stale";
    bound: boolean;
    boundContext: StoredFileContext | null;
    availableContexts: StoredFileContext[];
    staleContexts: StoredFileContext[];
    contextCount: number;
}

export interface FileContextRegistryStatus {
    sessionsWithContexts: number;
    totalContexts: number;
    availableContexts: number;
    boundContexts: number;
    staleContexts: number;
}

const SINGLE_USER_CONTEXT_KEY = "__single_user__";

export class FileContextRegistry {
    private readonly contextsBySession: Map<string, Map<string, StoredFileContext>> = new Map();
    private readonly boundContextBySession: Map<string, string> = new Map();

    public upsertContext(userToken: string | null | undefined, context: FileContextSnapshot): StoredFileContext {
        const sessionKey = this.sessionKey(userToken);
        const contexts = this.getOrCreateSessionContexts(sessionKey);
        const existingBoundContextId = this.boundContextBySession.get(sessionKey);
        const status = existingBoundContextId === context.contextId ? "bound" : "available";
        const now = new Date().toISOString();
        const stored: StoredFileContext = {
            ...context,
            status,
            selectionIds: context.selectionIds ?? [],
            capabilities: context.capabilities ?? [],
            updatedAt: context.updatedAt || now,
            lastSeenAt: now,
        };

        contexts.set(stored.contextId, stored);
        return stored;
    }

    public markSessionStale(userToken: string | null | undefined, reason: string): void {
        const sessionKey = this.sessionKey(userToken);
        const contexts = this.contextsBySession.get(sessionKey);
        if (!contexts) {
            return;
        }

        for (const context of contexts.values()) {
            context.status = "stale";
            context.staleReason = reason;
        }
    }

    public clearSession(userToken: string | null | undefined, reason: string): void {
        this.markSessionStale(userToken, reason);
        this.boundContextBySession.delete(this.sessionKey(userToken));
    }

    public getSessionSummary(userToken: string | null | undefined): FileContextSessionSummary {
        const sessionKey = this.sessionKey(userToken);
        const contexts = this.listSessionContexts(sessionKey);
        const activeContexts = contexts.filter((context) => context.status !== "stale");
        const staleContexts = contexts.filter((context) => context.status === "stale");
        const boundContextId = this.boundContextBySession.get(sessionKey);
        const boundContext = boundContextId ? contexts.find((context) => context.contextId === boundContextId) : null;

        let status: FileContextSessionSummary["status"] = "unbound";
        if (boundContext?.status === "bound") {
            status = "bound";
        } else if (boundContext?.status === "stale") {
            status = "stale";
        } else if (activeContexts.length > 0) {
            status = "available";
        } else if (staleContexts.length > 0) {
            status = "stale";
        }

        return {
            status,
            bound: status === "bound",
            boundContext: boundContext ?? null,
            availableContexts: activeContexts,
            staleContexts,
            contextCount: contexts.length,
        };
    }

    public getStatus(): FileContextRegistryStatus {
        let totalContexts = 0;
        let availableContexts = 0;
        let boundContexts = 0;
        let staleContexts = 0;

        for (const contexts of this.contextsBySession.values()) {
            for (const context of contexts.values()) {
                totalContexts++;
                if (context.status === "bound") {
                    boundContexts++;
                } else if (context.status === "stale") {
                    staleContexts++;
                } else {
                    availableContexts++;
                }
            }
        }

        return {
            sessionsWithContexts: this.contextsBySession.size,
            totalContexts,
            availableContexts,
            boundContexts,
            staleContexts,
        };
    }

    public findBindableContext(
        userToken: string | null | undefined,
        selector: FileContextSelector
    ): FileContextLookupResult {
        const sessionKey = this.sessionKey(userToken);
        const contexts = this.listSessionContexts(sessionKey);
        const activeContexts = contexts.filter((context) => context.status !== "stale");

        if (selector.contextId) {
            const context = contexts.find((item) => item.contextId === selector.contextId);
            if (!context) {
                return {
                    ok: false,
                    error: {
                        code: FileContextErrorCodes.FILE_CONTEXT_NOT_FOUND,
                        message: `No available file context exists for contextId '${selector.contextId}'.`,
                    },
                };
            }
            if (context.status === "stale") {
                return {
                    ok: false,
                    error: {
                        code: FileContextErrorCodes.FILE_CONTEXT_STALE,
                        message: `File context '${selector.contextId}' is stale and cannot be bound.`,
                        contexts: [context],
                    },
                };
            }
            if (selector.fileId && context.fileId !== selector.fileId) {
                return {
                    ok: false,
                    error: {
                        code: FileContextErrorCodes.FILE_CONTEXT_NOT_FOUND,
                        message: `File context '${selector.contextId}' does not match fileId '${selector.fileId}'.`,
                    },
                };
            }

            return { ok: true, context };
        }

        const candidates = selector.fileId
            ? activeContexts.filter((context) => context.fileId === selector.fileId)
            : activeContexts;

        if (candidates.length === 0) {
            return {
                ok: false,
                error: {
                    code: selector.fileId
                        ? FileContextErrorCodes.FILE_CONTEXT_NOT_FOUND
                        : FileContextErrorCodes.FILE_CONTEXT_REQUIRED,
                    message: selector.fileId
                        ? `No available file context exists for fileId '${selector.fileId}'.`
                        : "No available Penpot file context is currently reported for this MCP session.",
                },
            };
        }

        if (candidates.length > 1) {
            return {
                ok: false,
                error: {
                    code: FileContextErrorCodes.FILE_CONTEXT_AMBIGUOUS,
                    message:
                        "Multiple file contexts match the bind request. Call file.get_context and bind with a contextId.",
                    contexts: candidates,
                },
            };
        }

        return { ok: true, context: candidates[0] };
    }

    public bindContext(
        userToken: string | null | undefined,
        contextId: string,
        verifiedAt: string = new Date().toISOString()
    ): StoredFileContext | null {
        const sessionKey = this.sessionKey(userToken);
        const contexts = this.contextsBySession.get(sessionKey);
        const target = contexts?.get(contextId);
        if (!contexts || !target || target.status === "stale") {
            return null;
        }

        for (const context of contexts.values()) {
            context.status = context.contextId === contextId ? "bound" : "available";
            if (context.contextId === contextId) {
                context.verifiedAt = verifiedAt;
            }
        }
        this.boundContextBySession.set(sessionKey, contextId);
        return target;
    }

    public releaseContext(userToken: string | null | undefined): StoredFileContext | null {
        const sessionKey = this.sessionKey(userToken);
        const boundContextId = this.boundContextBySession.get(sessionKey);
        if (!boundContextId) {
            return null;
        }

        const contexts = this.contextsBySession.get(sessionKey);
        const context = contexts?.get(boundContextId) ?? null;
        this.boundContextBySession.delete(sessionKey);

        if (context && context.status !== "stale") {
            context.status = "available";
        }

        return context;
    }

    private sessionKey(userToken: string | null | undefined): string {
        return userToken || SINGLE_USER_CONTEXT_KEY;
    }

    private getOrCreateSessionContexts(sessionKey: string): Map<string, StoredFileContext> {
        let contexts = this.contextsBySession.get(sessionKey);
        if (!contexts) {
            contexts = new Map();
            this.contextsBySession.set(sessionKey, contexts);
        }
        return contexts;
    }

    private listSessionContexts(sessionKey: string): StoredFileContext[] {
        return [...(this.contextsBySession.get(sessionKey)?.values() ?? [])];
    }
}
