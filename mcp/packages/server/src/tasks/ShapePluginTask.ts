import { PluginTaskResult, ShapeTaskParams, ShapeTaskResultData } from "@penpot/mcp-common";
import { PluginTask } from "../PluginTask.js";

export class ShapePluginTask extends PluginTask<ShapeTaskParams, PluginTaskResult<ShapeTaskResultData>> {
    constructor(params: ShapeTaskParams) {
        super("shape", params);
    }
}
