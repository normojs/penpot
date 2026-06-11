import { Fill, Page, Shape, Stroke } from "@penpot/plugin-types";
import {
    PageSummary,
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

    private applyShapeParams(shape: Shape, params: ShapeTaskParams): void {
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

        const parent = params.parentId ? this.requireContainer(params.parentId) : null;
        if (parent) {
            parent.appendChild(shape);
        }

        if (params.x !== undefined || params.y !== undefined) {
            if (parent) {
                PenpotUtils.setParentXY(shape, params.x ?? shape.parentX, params.y ?? shape.parentY);
            } else {
                shape.x = params.x ?? shape.x;
                shape.y = params.y ?? shape.y;
            }
        }
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
