import { Page } from "@penpot/plugin-types";
import { PageSummary, PageTaskParams, PageTaskResultData } from "../../../common/src";
import { PenpotUtils } from "../PenpotUtils.ts";
import { Task, TaskHandler } from "../TaskHandler";

export class PageTaskHandler extends TaskHandler<PageTaskParams> {
    readonly taskType = "page";

    async handle(task: Task<PageTaskParams>): Promise<void> {
        if (!penpot.currentFile) {
            task.sendError("No current Penpot file is available.");
            return;
        }

        try {
            const result = this.handleAction(task.params);
            task.sendSuccess(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            task.sendError(message);
        }
    }

    private handleAction(params: PageTaskParams): PageTaskResultData {
        switch (params.action) {
            case "list":
                return this.result();
            case "create":
                return this.createPage(params);
            case "rename":
                return this.renamePage(params);
            case "setCurrent":
                return this.setCurrentPage(params);
            default:
                throw new Error(`Unsupported page action: ${(params as PageTaskParams).action}`);
        }
    }

    private createPage(params: PageTaskParams): PageTaskResultData {
        const page = penpot.createPage();
        if (params.name) {
            page.name = params.name;
        }
        if (params.makeCurrent ?? true) {
            penpot.openPage(page);
        }
        return this.result(page);
    }

    private renamePage(params: PageTaskParams): PageTaskResultData {
        const page = this.requirePage(params.pageId);
        if (!params.name) {
            throw new Error("page.rename requires a non-empty name.");
        }
        page.name = params.name;
        return this.result(page);
    }

    private setCurrentPage(params: PageTaskParams): PageTaskResultData {
        const page = this.requirePage(params.pageId);
        penpot.openPage(page);
        return this.result(page);
    }

    private requirePage(pageId: string | undefined): Page {
        if (!pageId) {
            throw new Error("A pageId is required.");
        }
        const page = PenpotUtils.getPageById(pageId);
        if (!page) {
            throw new Error(`Page not found: ${pageId}`);
        }
        return page;
    }

    private result(page?: Page): PageTaskResultData {
        return {
            page: page ? this.summarizePage(page) : undefined,
            pages: this.listPages(),
            currentPage: penpot.currentPage ? this.summarizePage(penpot.currentPage) : null,
        };
    }

    private listPages(): PageSummary[] {
        return penpot.currentFile!.pages.map((page) => this.summarizePage(page));
    }

    private summarizePage(page: Page): PageSummary {
        return {
            id: page.id,
            name: page.name,
            current: page.id === penpot.currentPage?.id,
        };
    }
}
