import { PluginTaskResult, PrototypeTaskParams, PrototypeTaskResultData } from "@penpot/mcp-common";
import { PluginTask } from "../PluginTask.js";

export class PrototypePluginTask extends PluginTask<PrototypeTaskParams, PluginTaskResult<PrototypeTaskResultData>> {
    constructor(params: PrototypeTaskParams) {
        super("prototype", params);
    }
}
