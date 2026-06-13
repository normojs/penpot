import {
    MCP_PROTOCOL_VERSION,
    MCP_REQUIRED_PLUGIN_CAPABILITIES,
    MCP_SERVER_CAPABILITIES,
    MCP_SERVER_VERSION,
    PluginClientInfo,
    PluginHelloMessage,
    ServerPluginCompatibilityMessage,
} from "@penpot/mcp-common";

export function getPluginClientInfo(message: PluginHelloMessage): PluginClientInfo {
    return {
        protocolVersion: message.protocolVersion,
        pluginVersion: message.pluginVersion,
        penpotVersion: message.penpotVersion,
        frontendVersion: message.frontendVersion,
        capabilities: [...message.capabilities],
        fileContextCapabilities: [...message.fileContextCapabilities],
        ownerTabId: message.ownerTabId,
        updatedAt: message.updatedAt,
    };
}

export function negotiatePluginCompatibility(message: PluginHelloMessage): ServerPluginCompatibilityMessage {
    const pluginCapabilities = new Set(message.capabilities);
    const serverCapabilities = new Set<string>(MCP_SERVER_CAPABILITIES);
    const missingCapabilities = MCP_REQUIRED_PLUGIN_CAPABILITIES.filter(
        (capability) => !pluginCapabilities.has(capability)
    );
    const unsupportedCapabilities = message.capabilities.filter((capability) => !serverCapabilities.has(capability));
    const protocolCompatible = getProtocolMajor(message.protocolVersion) === getProtocolMajor(MCP_PROTOCOL_VERSION);

    if (!protocolCompatible) {
        return compatibilityResponse(false, missingCapabilities, unsupportedCapabilities, {
            code: "mcp_protocol_incompatible",
            message:
                `Incompatible MCP protocol version ${message.protocolVersion}; ` +
                `this server requires protocol ${MCP_PROTOCOL_VERSION}.`,
        });
    }

    if (missingCapabilities.length > 0) {
        return compatibilityResponse(false, missingCapabilities, unsupportedCapabilities, {
            code: "mcp_plugin_capabilities_missing",
            message: `The MCP plugin is missing required capabilities: ${missingCapabilities.join(", ")}.`,
        });
    }

    return compatibilityResponse(true, missingCapabilities, unsupportedCapabilities);
}

function compatibilityResponse(
    compatible: boolean,
    missingCapabilities: string[],
    unsupportedCapabilities: string[],
    error?: { code: string; message: string }
): ServerPluginCompatibilityMessage {
    return {
        type: "plugin-compatibility",
        compatible,
        serverVersion: MCP_SERVER_VERSION,
        protocolVersion: MCP_PROTOCOL_VERSION,
        supportedCapabilities: [...MCP_SERVER_CAPABILITIES],
        requiredCapabilities: [...MCP_REQUIRED_PLUGIN_CAPABILITIES],
        missingCapabilities,
        unsupportedCapabilities,
        error,
    };
}

function getProtocolMajor(version: string): string {
    return version.split(".")[0] ?? version;
}
