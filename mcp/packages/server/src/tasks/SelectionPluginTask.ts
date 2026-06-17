import { PluginTaskResult, SelectionTaskParams, SelectionTaskResultData } from "@penpot/mcp-common";
import { PluginTask } from "../PluginTask.js";

export class SelectionPluginTask extends PluginTask<SelectionTaskParams, PluginTaskResult<SelectionTaskResultData>> {
    constructor(params: SelectionTaskParams) {
        super("selection", params);
    }
}
