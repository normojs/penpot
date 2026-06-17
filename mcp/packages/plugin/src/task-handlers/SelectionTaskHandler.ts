import { Page, Shape } from "@penpot/plugin-types";
import { PageSummary, SelectionShapeSummary, SelectionTaskParams, SelectionTaskResultData } from "../../../common/src";
import { PenpotUtils } from "../PenpotUtils";
import { Task, TaskHandler } from "../TaskHandler";

export class SelectionTaskHandler extends TaskHandler<SelectionTaskParams> {
    readonly taskType = "selection";

    async handle(task: Task<SelectionTaskParams>): Promise<void> {
        if (!penpot.currentFile) {
            task.sendError("No current Penpot file is available.");
            return;
        }

        try {
            task.sendSuccess(this.handleAction(task.params));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            task.sendError(message);
        }
    }

    private handleAction(params: SelectionTaskParams): SelectionTaskResultData {
        switch (params.action) {
            case "get":
                return this.result();
            case "set":
                return this.setSelection(params.shapeIds);
            default:
                throw new Error(`Unsupported selection action: ${(params as SelectionTaskParams).action}`);
        }
    }

    private setSelection(shapeIds: string[] | undefined): SelectionTaskResultData {
        if (!Array.isArray(shapeIds)) {
            throw new Error("selection.set requires shapeIds.");
        }

        const shapes = shapeIds.map((shapeId) => {
            const shape = PenpotUtils.findShapeById(shapeId);
            if (!shape) {
                throw new Error(`Shape not found: ${shapeId}`);
            }
            return shape;
        });

        penpot.selection = shapes;
        return this.result();
    }

    private result(): SelectionTaskResultData {
        const shapes = (penpot.selection ?? []).map((shape) => this.summarizeShape(shape));
        return {
            selectionIds: shapes.map((shape) => shape.id),
            shapes,
            currentPage: penpot.currentPage ? this.summarizePage(penpot.currentPage) : null,
        };
    }

    private summarizeShape(shape: Shape): SelectionShapeSummary {
        const currentPage = penpot.currentPage;
        return {
            id: shape.id,
            name: shape.name,
            type: shape.type,
            pageId: currentPage?.id,
            pageName: currentPage?.name,
            parentId: shape.parent?.id,
            x: shape.x,
            y: shape.y,
            parentX: shape.parent ? shape.parentX : undefined,
            parentY: shape.parent ? shape.parentY : undefined,
            width: shape.width,
            height: shape.height,
        };
    }

    private summarizePage(page: Page): PageSummary {
        return {
            id: page.id,
            name: page.name,
            current: page.id === penpot.currentPage?.id,
        };
    }
}
