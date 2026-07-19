import assert from "node:assert/strict";
import test from "node:test";
import { FileContextErrorCodes, FileContextRegistry } from "../src/FileContextRegistry.js";
import type { FileContextSnapshot } from "@penpot/mcp-common";

function context(overrides: Partial<FileContextSnapshot> = {}): FileContextSnapshot {
    const fileId = overrides.fileId ?? "00000000-0000-0000-0000-000000000001";
    const ownerTabId = overrides.ownerTabId ?? "tab-1";
    return {
        contextId: overrides.contextId ?? `${ownerTabId}:${fileId}`,
        status: overrides.status ?? "available",
        ownerTabId,
        fileId,
        fileName: overrides.fileName ?? "Prototype",
        revn: overrides.revn ?? 1,
        pageId: overrides.pageId ?? "00000000-0000-0000-0000-000000000010",
        pageName: overrides.pageName ?? "Page 1",
        selectionIds: overrides.selectionIds ?? [],
        capabilities: overrides.capabilities ?? ["page.read", "shape.write"],
        updatedAt: overrides.updatedAt ?? "2026-06-11T00:00:00.000Z",
    };
}

test("FileContextRegistry stores available context summaries by token", () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", context());

    const summary = registry.getSessionSummary("token-1");
    assert.equal(summary.status, "available");
    assert.equal(summary.bound, false);
    assert.equal(summary.availableContexts.length, 1);
    assert.equal(summary.availableContexts[0].fileName, "Prototype");
});

test("FileContextRegistry binds one active context per token", () => {
    const registry = new FileContextRegistry();
    const first = context({ contextId: "tab-1:file-1", fileId: "00000000-0000-0000-0000-000000000001" });
    const second = context({
        contextId: "tab-2:file-2",
        ownerTabId: "tab-2",
        fileId: "00000000-0000-0000-0000-000000000002",
    });

    registry.upsertContext("token-1", first);
    registry.upsertContext("token-1", second);

    const bound = registry.bindContext("token-1", second.contextId);
    assert.equal(bound?.contextId, second.contextId);

    const summary = registry.getSessionSummary("token-1");
    assert.equal(summary.status, "bound");
    assert.equal(summary.boundContext?.contextId, second.contextId);
    assert.equal(summary.availableContexts.find((item) => item.contextId === first.contextId)?.status, "available");
});

test("FileContextRegistry returns ambiguity when binding without a unique match", () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", context({ contextId: "tab-1:file-1" }));
    registry.upsertContext(
        "token-1",
        context({
            contextId: "tab-2:file-2",
            ownerTabId: "tab-2",
            fileId: "00000000-0000-0000-0000-000000000002",
        })
    );

    const result = registry.findBindableContext("token-1", {});
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.error.code, FileContextErrorCodes.FILE_CONTEXT_AMBIGUOUS);
        assert.equal(result.error.contexts?.length, 2);
    }
});

test("FileContextRegistry marks contexts stale after disconnect", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);

    registry.clearSession("token-1", "closed");

    const summary = registry.getSessionSummary("token-1");
    assert.equal(summary.status, "stale");
    assert.equal(summary.bound, false);
    assert.equal(summary.staleContexts.length, 1);

    const result = registry.findBindableContext("token-1", { contextId: snapshot.contextId });
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.error.code, FileContextErrorCodes.FILE_CONTEXT_STALE);
    }
});

test("FileContextRegistry releases the current bound context", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);

    const released = registry.releaseContext("token-1");
    assert.equal(released?.contextId, snapshot.contextId);

    const summary = registry.getSessionSummary("token-1");
    assert.equal(summary.status, "available");
    assert.equal(summary.bound, false);
    assert.equal(summary.boundContext, null);
    assert.equal(summary.availableContexts[0].contextId, snapshot.contextId);
});

test("FileContextRegistry supports bind-release-rebind lifecycle", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);

    registry.bindContext("token-1", snapshot.contextId);
    assert.equal(registry.getSessionSummary("token-1").status, "bound");

    registry.releaseContext("token-1");
    assert.equal(registry.getSessionSummary("token-1").status, "available");

    const rebound = registry.bindContext("token-1", snapshot.contextId);
    assert.equal(rebound?.contextId, snapshot.contextId);
    assert.equal(registry.getSessionSummary("token-1").status, "bound");
});

test("FileContextRegistry release without bound context is idempotent", () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", context());

    assert.equal(registry.releaseContext("token-1"), null);
    assert.equal(registry.getSessionSummary("token-1").status, "available");
});

test("FileContextRegistry reconnect upsert restores available context after stale disconnect", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);

    registry.clearSession("token-1", "plugin WebSocket disconnected");
    assert.equal(registry.getSessionSummary("token-1").status, "stale");

    const refreshed = context({
        pageId: "00000000-0000-0000-0000-000000000011",
        pageName: "Page 2",
        updatedAt: "2026-06-11T01:00:00.000Z",
    });
    registry.upsertContext("token-1", refreshed);

    const summary = registry.getSessionSummary("token-1");
    assert.equal(summary.status, "available");
    assert.equal(summary.bound, false);
    assert.equal(summary.availableContexts[0].pageName, "Page 2");
    assert.equal(summary.staleContexts.length, 0);
});

test("FileContextRegistry upsert keeps bound status for the active context", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);

    const updated = registry.upsertContext(
        "token-1",
        context({
            selectionIds: ["shape-1"],
            updatedAt: "2026-06-11T01:00:00.000Z",
        })
    );

    assert.equal(updated.status, "bound");
    assert.deepEqual(updated.selectionIds, ["shape-1"]);
    assert.equal(registry.getSessionSummary("token-1").status, "bound");
});

test("FileContextRegistry isolates contexts across user tokens", () => {
    const registry = new FileContextRegistry();
    const userA = context({
        contextId: "tab-a:file-a",
        ownerTabId: "tab-a",
        fileId: "00000000-0000-0000-0000-0000000000aa",
        fileName: "User A File",
    });
    const userB = context({
        contextId: "tab-b:file-b",
        ownerTabId: "tab-b",
        fileId: "00000000-0000-0000-0000-0000000000bb",
        fileName: "User B File",
    });

    registry.upsertContext("token-1", userA);
    registry.upsertContext("token-2", userB);
    registry.bindContext("token-1", userA.contextId);
    registry.bindContext("token-2", userB.contextId);

    const summaryA = registry.getSessionSummary("token-1");
    const summaryB = registry.getSessionSummary("token-2");

    assert.equal(summaryA.status, "bound");
    assert.equal(summaryA.boundContext?.fileId, userA.fileId);
    assert.equal(summaryA.contextCount, 1);
    assert.equal(
        summaryA.availableContexts.concat(summaryA.staleContexts).some((ctx) => ctx.fileId === userB.fileId),
        false
    );

    assert.equal(summaryB.status, "bound");
    assert.equal(summaryB.boundContext?.fileId, userB.fileId);
    assert.equal(summaryB.contextCount, 1);
    assert.equal(
        summaryB.availableContexts.concat(summaryB.staleContexts).some((ctx) => ctx.fileId === userA.fileId),
        false
    );

    // Releasing A must not affect B.
    registry.releaseContext("token-1");
    assert.equal(registry.getSessionSummary("token-1").status, "available");
    assert.equal(registry.getSessionSummary("token-2").status, "bound");
    assert.equal(registry.getSessionSummary("token-2").boundContext?.fileId, userB.fileId);
});
