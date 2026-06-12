import { Export as PenpotExport, Page, Shape } from "@penpot/plugin-types";
import {
    ExportFormat,
    ExportSummary,
    ExportTargetType,
    ExportTaskParams,
    ExportTaskResultData,
    PageSummary,
} from "../../../common/src";
import { PenpotUtils } from "../PenpotUtils.ts";
import { Task, TaskHandler } from "../TaskHandler";

export class ExportTaskHandler extends TaskHandler<ExportTaskParams> {
    readonly taskType = "export";

    async handle(task: Task<ExportTaskParams>): Promise<void> {
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

    private async handleAction(params: ExportTaskParams): Promise<ExportTaskResultData> {
        switch (params.action) {
            case "exportShape":
                return this.exportShape(params);
            case "exportPage":
                return this.exportPage(params);
            case "renderPreview":
                return this.renderPreview(params);
            default:
                throw new Error(`Unsupported export action: ${(params as ExportTaskParams).action}`);
        }
    }

    private async exportShape(params: ExportTaskParams): Promise<ExportTaskResultData> {
        const targetType: ExportTargetType = params.shapeId ? "shape" : "selection";
        const shape = params.shapeId ? this.requireShape(params.shapeId) : this.requireSelection();
        const page = this.openPageForShape(shape);
        const format = params.format ?? "png";
        return this.result({
            bytes: await this.exportShapeBytes(shape, params, format),
            format,
            targetType,
            target: shape,
            page,
            scale: params.scale,
        });
    }

    private async exportPage(params: ExportTaskParams): Promise<ExportTaskResultData> {
        const page = this.requirePage(params.pageId);
        penpot.openPage(page);
        if (!page.root) {
            throw new Error(`Page has no root shape: ${page.id}`);
        }

        const format = params.format ?? "png";
        return this.result({
            bytes: await this.exportShapeBytes(page.root, params, format),
            format,
            targetType: "page",
            target: page.root,
            page,
            scale: params.scale,
        });
    }

    private async renderPreview(params: ExportTaskParams): Promise<ExportTaskResultData> {
        const target = params.target ?? (params.shapeId ? "shape" : "page");
        if (target === "page") {
            return this.exportPage({ ...params, action: "exportPage", format: "png" });
        }
        return this.exportShape({
            ...params,
            action: "exportShape",
            format: "png",
            shapeId: target === "selection" ? undefined : params.shapeId,
        });
    }

    private async exportShapeBytes(shape: Shape, params: ExportTaskParams, format: ExportFormat): Promise<Uint8Array> {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const config: PenpotExport = {
            type: format,
            scale: params.scale,
            skipChildren: params.skipChildren,
        };
        return shape.export(config);
    }

    private result(params: {
        bytes: Uint8Array;
        format: ExportFormat;
        targetType: ExportTargetType;
        target: Shape;
        page: Page | null;
        scale?: number;
    }): ExportTaskResultData {
        return {
            export: this.summarizeExport(params),
            currentPage: this.summarizeCurrentPage(),
        };
    }

    private summarizeExport(params: {
        bytes: Uint8Array;
        format: ExportFormat;
        targetType: ExportTargetType;
        target: Shape;
        page: Page | null;
        scale?: number;
    }): ExportSummary {
        return {
            targetType: params.targetType,
            targetId: params.target.id,
            targetName: params.target.name,
            pageId: params.page?.id,
            pageName: params.page?.name,
            format: params.format,
            mimeType: this.mimeType(params.format),
            scale: params.scale,
            byteLength: params.bytes.byteLength,
            dataBase64: this.bytesToBase64(params.bytes),
        };
    }

    private requireSelection(): Shape {
        const shape = penpot.selection?.[0];
        if (!shape) {
            throw new Error("No selected shape is available to export.");
        }
        return shape;
    }

    private requireShape(shapeId: string): Shape {
        const shape = PenpotUtils.findShapeById(shapeId);
        if (!shape) {
            throw new Error(`Shape not found: ${shapeId}`);
        }
        return shape;
    }

    private requirePage(pageId: string | undefined): Page {
        if (!pageId) {
            return penpot.currentPage!;
        }
        const page = PenpotUtils.getPageById(pageId);
        if (!page) {
            throw new Error(`Page not found: ${pageId}`);
        }
        return page;
    }

    private openPageForShape(shape: Shape): Page | null {
        const page = PenpotUtils.getPageForShape(shape);
        if (page) {
            penpot.openPage(page);
        }
        return page;
    }

    private mimeType(format: ExportFormat): string {
        switch (format) {
            case "png":
                return "image/png";
            case "jpeg":
                return "image/jpeg";
            case "svg":
                return "image/svg+xml";
            case "pdf":
                return "application/pdf";
            default:
                throw new Error(`Unsupported export format: ${(format as ExportFormat).toString()}`);
        }
    }

    private bytesToBase64(bytes: Uint8Array): string {
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    private summarizeCurrentPage(): PageSummary | null {
        return penpot.currentPage ? this.summarizePage(penpot.currentPage) : null;
    }

    private summarizePage(page: Page): PageSummary {
        return {
            id: page.id,
            name: page.name,
            current: page.id === penpot.currentPage?.id,
        };
    }
}
