import { Board, Fill, FlexLayout, GridLayout, Page, Shape, Stroke, Text } from "@penpot/plugin-types";
import {
    PageSummary,
    ShapeLayout,
    ShapeSolidFill,
    ShapeStroke,
    ShapeSummary,
    ShapeTaskParams,
    ShapeTaskResultData,
} from "../../../common/src";
import { PenpotUtils } from "../PenpotUtils.ts";
import { Task, TaskHandler } from "../TaskHandler";

type ContainerShape = Shape & {
    appendChild(child: Shape): void;
};

type BoardWithLayout = Board & {
    flex?: FlexLayout;
    grid?: GridLayout;
};

export class ShapeTaskHandler extends TaskHandler<ShapeTaskParams> {
    readonly taskType = "shape";

    async handle(task: Task<ShapeTaskParams>): Promise<void> {
        if (!penpot.currentFile) {
            task.sendError("No current Penpot file is available.");
            return;
        }
        if (!penpot.currentPage) {
            task.sendError("No current Penpot page is available.");
            return;
        }

        try {
            const result = await this.handleAction(task.params);
            task.sendSuccess(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            task.sendError(message);
        }
    }

    private async handleAction(params: ShapeTaskParams): Promise<ShapeTaskResultData> {
        switch (params.action) {
            case "createFrame":
                return this.result(this.createFrame(params));
            case "createRect":
                return this.result(this.createRect(params));
            case "createText":
                return this.result(this.createText(params));
            case "createImage":
                return this.result(await this.createImage(params));
            case "update":
                return this.result(this.updateShape(params));
            case "delete":
                return this.deleteShape(params);
            default:
                throw new Error(`Unsupported shape action: ${(params as ShapeTaskParams).action}`);
        }
    }

    private createFrame(params: ShapeTaskParams): Shape {
        const frame = penpot.createBoard();
        this.applyShapeParams(frame, params);
        return frame;
    }

    private createRect(params: ShapeTaskParams): Shape {
        const rect = penpot.createRectangle();
        this.applyShapeParams(rect, params);
        return rect;
    }

    private createText(params: ShapeTaskParams): Shape {
        const content = params.content?.trim();
        if (!content) {
            throw new Error("shape.create_text requires non-empty content.");
        }

        const text = penpot.createText(content);
        if (!text) {
            throw new Error("Unable to create text shape.");
        }
        if (params.fontSize !== undefined) {
            text.fontSize = String(params.fontSize);
        }

        this.applyShapeParams(text, params);
        return text;
    }

    private async createImage(params: ShapeTaskParams): Promise<Shape> {
        const imageBase64 = params.imageBase64?.trim();
        if (!imageBase64) {
            throw new Error("shape.create_image requires imageBase64.");
        }
        if (!params.mimeType) {
            throw new Error("shape.create_image requires mimeType.");
        }

        const name = params.name?.trim() || "Image";
        const imageData = await penpot.uploadMediaData(
            name,
            PenpotUtils.base64ToByteArray(imageBase64),
            params.mimeType
        );
        const rect = penpot.createRectangle();
        rect.name = name;
        rect.fills = [{ fillOpacity: 1, fillImage: imageData }];

        const width =
            params.width ?? (params.height ? params.height * (imageData.width / imageData.height) : imageData.width);
        const height =
            params.height ?? (params.width ? params.width * (imageData.height / imageData.width) : imageData.height);

        this.applyShapeParams(rect, {
            ...params,
            width,
            height,
            name,
        });
        return rect;
    }

    private updateShape(params: ShapeTaskParams): Shape {
        const shape = this.requireShape(params.shapeId);
        if (params.content !== undefined) {
            this.requireTextShape(shape).characters = params.content;
        }
        if (params.fontSize !== undefined) {
            this.requireTextShape(shape).fontSize = String(params.fontSize);
        }
        this.applyShapeParams(shape, params, { allowReparent: false });
        return shape;
    }

    private deleteShape(params: ShapeTaskParams): ShapeTaskResultData {
        const shape = this.requireShape(params.shapeId);
        const summary = this.summarizeShape(shape);
        shape.remove();
        return {
            shape: summary,
            currentPage: penpot.currentPage ? this.summarizePage(penpot.currentPage) : null,
            deleted: true,
        };
    }

    private applyShapeParams(
        shape: Shape,
        params: ShapeTaskParams,
        options: { allowReparent: boolean } = { allowReparent: true }
    ): void {
        const name = params.name?.trim();
        if (name) {
            shape.name = name;
        }

        if (params.fill) {
            shape.fills = [this.toFill(params.fill)];
        }
        if (params.stroke) {
            shape.strokes = [this.toStroke(params.stroke)];
        }
        if (params.borderRadius !== undefined) {
            shape.borderRadius = params.borderRadius;
        }
        if (params.width !== undefined || params.height !== undefined) {
            shape.resize(params.width ?? shape.width, params.height ?? shape.height);
        }
        if (params.layout) {
            this.applyLayout(shape, params.layout);
        }

        const parent = params.parentId && options.allowReparent ? this.requireContainer(params.parentId) : null;
        if (parent) {
            parent.appendChild(shape);
        }

        if (params.x !== undefined || params.y !== undefined) {
            if (parent) {
                PenpotUtils.setParentXY(shape, params.x ?? shape.parentX, params.y ?? shape.parentY);
            } else if (!options.allowReparent && shape.parent) {
                PenpotUtils.setParentXY(shape, params.x ?? shape.parentX, params.y ?? shape.parentY);
            } else {
                shape.x = params.x ?? shape.x;
                shape.y = params.y ?? shape.y;
            }
        }
    }

    private applyLayout(shape: Shape, layout: ShapeLayout): void {
        const board = this.requireLayoutBoard(shape);
        this.removeLayout(board, layout.type);

        if (layout.type === "none") {
            return;
        }

        const nextLayout =
            layout.type === "flex" ? this.getOrCreateFlexLayout(board, layout) : this.getOrCreateGridLayout(board);
        this.applyCommonLayout(nextLayout, layout);
    }

    private removeLayout(board: BoardWithLayout, nextType: ShapeLayout["type"]): void {
        if (nextType !== "flex") {
            board.flex?.remove();
        }
        if (nextType !== "grid") {
            board.grid?.remove();
        }
    }

    private getOrCreateFlexLayout(board: BoardWithLayout, layout: ShapeLayout): FlexLayout {
        const flex = board.flex ?? board.addFlexLayout();
        flex.dir = layout.direction ?? flex.dir ?? "row";
        if (layout.wrap) {
            flex.wrap = layout.wrap;
        }
        return flex;
    }

    private getOrCreateGridLayout(board: BoardWithLayout): GridLayout {
        return board.grid ?? board.addGridLayout();
    }

    private applyCommonLayout(layout: FlexLayout | GridLayout, params: ShapeLayout): void {
        if (params.alignItems) {
            layout.alignItems = params.alignItems;
        }
        if (params.justifyContent) {
            layout.justifyContent = params.justifyContent;
        }
        if (params.rowGap !== undefined) {
            layout.rowGap = params.rowGap;
        }
        if (params.columnGap !== undefined) {
            layout.columnGap = params.columnGap;
        }
        if (params.padding !== undefined) {
            layout.topPadding = params.padding;
            layout.rightPadding = params.padding;
            layout.bottomPadding = params.padding;
            layout.leftPadding = params.padding;
        }
    }

    private requireShape(shapeId: string | undefined): Shape {
        if (!shapeId) {
            throw new Error("A shapeId is required.");
        }
        const shape = PenpotUtils.findShapeById(shapeId);
        if (!shape) {
            throw new Error(`Shape not found: ${shapeId}`);
        }
        return shape;
    }

    private requireContainer(parentId: string): ContainerShape {
        const parent = PenpotUtils.findShapeById(parentId);
        if (!parent) {
            throw new Error(`Parent shape not found: ${parentId}`);
        }
        if (!this.isContainerShape(parent)) {
            throw new Error(`Parent shape is not a container: ${parentId}`);
        }
        return parent;
    }

    private isContainerShape(shape: Shape): shape is ContainerShape {
        return typeof (shape as Partial<ContainerShape>).appendChild === "function";
    }

    private requireLayoutBoard(shape: Shape): BoardWithLayout {
        if (shape.type !== "board") {
            throw new Error(`Shape does not support layout updates: ${shape.id}`);
        }
        return shape as BoardWithLayout;
    }

    private requireTextShape(shape: Shape): Text {
        if (shape.type !== "text") {
            throw new Error(`Shape is not a text layer: ${shape.id}`);
        }
        return shape as Text;
    }

    private toFill(fill: ShapeSolidFill): Fill {
        return {
            fillColor: fill.color,
            fillOpacity: fill.opacity ?? 1,
        };
    }

    private toStroke(stroke: ShapeStroke): Stroke {
        return {
            strokeColor: stroke.color,
            strokeOpacity: stroke.opacity ?? 1,
            strokeWidth: stroke.width ?? 1,
            strokeStyle: stroke.style ?? "solid",
            strokeAlignment: stroke.alignment ?? "center",
        };
    }

    private result(shape: Shape): ShapeTaskResultData {
        return {
            shape: this.summarizeShape(shape),
            currentPage: penpot.currentPage ? this.summarizePage(penpot.currentPage) : null,
        };
    }

    private summarizeShape(shape: Shape): ShapeSummary {
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
