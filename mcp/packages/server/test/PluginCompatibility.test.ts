import assert from "node:assert/strict";
import test from "node:test";
import { MCP_PROTOCOL_VERSION, MCP_REQUIRED_PLUGIN_CAPABILITIES, PluginHelloMessage } from "@penpot/mcp-common";
import { getPluginClientInfo, negotiatePluginCompatibility } from "../src/PluginCompatibility.js";

function hello(overrides: Partial<PluginHelloMessage> = {}): PluginHelloMessage {
    return {
        type: "plugin-hello",
        protocolVersion: MCP_PROTOCOL_VERSION,
        pluginVersion: "2.15.4",
        penpotVersion: "2.15.4",
        frontendVersion: "2.15.4",
        capabilities: [...MCP_REQUIRED_PLUGIN_CAPABILITIES],
        fileContextCapabilities: ["page.read", "selection.read"],
        ownerTabId: "tab-1",
        updatedAt: "2026-06-13T00:00:00.000Z",
        ...overrides,
    };
}

test("negotiatePluginCompatibility accepts matching protocol and required capabilities", () => {
    const result = negotiatePluginCompatibility(hello());

    assert.equal(result.compatible, true);
    assert.equal(result.protocolVersion, MCP_PROTOCOL_VERSION);
    assert.deepEqual(result.missingCapabilities, []);
    assert.equal(result.error, undefined);
});

test("negotiatePluginCompatibility rejects incompatible protocol major versions", () => {
    const result = negotiatePluginCompatibility(hello({ protocolVersion: "2.0" }));

    assert.equal(result.compatible, false);
    assert.equal(result.error?.code, "mcp_protocol_incompatible");
    assert.match(result.error?.message ?? "", /2\.0/);
});

test("negotiatePluginCompatibility rejects plugins missing required capabilities", () => {
    const result = negotiatePluginCompatibility(
        hello({
            capabilities: ["file-context.read"],
        })
    );

    assert.equal(result.compatible, false);
    assert.equal(result.error?.code, "mcp_plugin_capabilities_missing");
    assert.ok(result.missingCapabilities.includes("page.write"));
    assert.ok(result.missingCapabilities.includes("export.read"));
});

test("negotiatePluginCompatibility reports unsupported plugin capabilities without rejecting", () => {
    const result = negotiatePluginCompatibility(
        hello({
            capabilities: [...MCP_REQUIRED_PLUGIN_CAPABILITIES, "future.experimental"],
        })
    );

    assert.equal(result.compatible, true);
    assert.deepEqual(result.unsupportedCapabilities, ["future.experimental"]);
});

test("getPluginClientInfo returns token-safe plugin metadata", () => {
    const info = getPluginClientInfo(hello());

    assert.equal(info.pluginVersion, "2.15.4");
    assert.equal(info.ownerTabId, "tab-1");
    assert.deepEqual(Object.keys(info).includes("userToken"), false);
});
