import { z } from "zod";
import { Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse, TextResponse } from "../ToolResponse.js";
import "reflect-metadata";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { ExecuteCodePluginTask } from "../tasks/ExecuteCodePluginTask.js";
import { ExecuteCodeTaskParams } from "@penpot/mcp-common";

export const ExecuteCodeErrorCodes = {
    EXECUTE_CODE_DISABLED: "execute_code_disabled",
} as const;

/**
 * Arguments class for ExecuteCodeTool
 */
export class ExecuteCodeArgs {
    static schema = {
        code: z
            .string()
            .min(1, "Code cannot be empty")
            .describe("The JavaScript code to execute in the plugin context."),
    };

    /**
     * The JavaScript code to execute in the plugin context.
     */
    code!: string;
}

/**
 * Tool for executing JavaScript code in the Penpot plugin context
 */
export class ExecuteCodeTool extends Tool<ExecuteCodeArgs> {
    /**
     * Creates a new ExecuteCode tool instance.
     *
     * @param mcpServer - The MCP server instance
     */
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ExecuteCodeArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.LEGACY_EXECUTE_CODE;
    }

    public getToolDescription(): string {
        return (
            "Executes JavaScript code in the Penpot plugin context.\n" +
            "This advanced legacy tool is disabled unless PENPOT_MCP_ENABLE_EXECUTE_CODE=true is set on the MCP server. " +
            "Prefer typed tools such as page.*, shape.*, prototype.*, export.*, and render.* for normal workflows.\n" +
            "IMPORTANT: Before using this tool, make sure you have read the 'Penpot High-Level Overview' and know " +
            "which Penpot API functionality is necessary and how to use it.\n" +
            "You have access two main objects: `penpot` (the Penpot API, of type `Penpot`), `penpotUtils`, " +
            "and `storage`.\n" +
            "`storage` is an object in which arbitrary data can be stored, simply by adding a new attribute; " +
            "stored attributes can be referenced in future calls to this tool, so any intermediate results that " +
            "could come in handy later should be stored in `storage` instead of just a fleeting variable; " +
            "you can also store functions and thus build up a library).\n" +
            "Think of the code being executed as the body of a function: " +
            "The tool call returns whatever you return in the applicable `return` statement, if any. " +
            "You can return arbitrary JS objects; no need to apply JSON.stringify.\n" +
            "If an exception occurs, the exception's message will be returned to you.\n" +
            "Any output that you generate via the `console` object will be returned to you separately; so you may use it " +
            "to track what your code is doing, but you should *only* do so only if there is an ACTUAL NEED for this! " +
            "VERY IMPORTANT: Don't use logging prematurely! NEVER log the data you are returning, as you will otherwise receive it twice!\n" +
            "VERY IMPORTANT: In general, try a simple approach first, and only if it fails, try more complex code that involves " +
            "handling different cases (in particular error cases) and that applies logging."
        );
    }

    protected async executeCore(args: ExecuteCodeArgs): Promise<ToolResponse> {
        if (!this.mcpServer.isExecuteCodeEnabled()) {
            return new JsonResponse({
                status: "error",
                error: {
                    code: ExecuteCodeErrorCodes.EXECUTE_CODE_DISABLED,
                    message:
                        "The execute_code tool is disabled. Use typed MCP tools for normal file operations, or start the MCP server with PENPOT_MCP_ENABLE_EXECUTE_CODE=true to enable this advanced legacy tool.",
                    actions: [
                        ToolNames.PAGE_LIST,
                        ToolNames.SHAPE_CREATE_FRAME,
                        ToolNames.SHAPE_CREATE_RECT,
                        ToolNames.SHAPE_CREATE_TEXT,
                        ToolNames.SHAPE_UPDATE,
                        ToolNames.SHAPE_SET_LAYOUT,
                        ToolNames.SHAPE_SET_STYLE,
                        ToolNames.EXPORT_SHAPE,
                        ToolNames.RENDER_PREVIEW,
                    ],
                    config: {
                        env: "PENPOT_MCP_ENABLE_EXECUTE_CODE",
                        enabledValue: "true",
                    },
                },
            });
        }

        const taskParams: ExecuteCodeTaskParams = { code: args.code };
        const task = new ExecuteCodePluginTask(taskParams);
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);

        if (result.data !== undefined) {
            return new TextResponse(JSON.stringify(result.data, null, 2));
        } else {
            return new TextResponse("Code executed successfully with no return value.");
        }
    }
}
