import { ExportTaskParams, ExportTaskResultData, PluginTaskResult } from "@penpot/mcp-common";
import { PluginTask } from "../PluginTask.js";

export class ExportPluginTask extends PluginTask<ExportTaskParams, PluginTaskResult<ExportTaskResultData>> {
    constructor(params: ExportTaskParams) {
        super("export", params);
    }
}
