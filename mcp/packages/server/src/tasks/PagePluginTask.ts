import { PageTaskParams, PageTaskResultData, PluginTaskResult } from "@penpot/mcp-common";
import { PluginTask } from "../PluginTask.js";

export class PagePluginTask extends PluginTask<PageTaskParams, PluginTaskResult<PageTaskResultData>> {
    constructor(params: PageTaskParams) {
        super("page", params);
    }
}
