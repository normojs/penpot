import { Action, Animation, Board, Flow, Interaction, Page, Shape, Trigger } from "@penpot/plugin-types";
import {
    PageSummary,
    PrototypeAnimation,
    PrototypeFlowSummary,
    PrototypeInteractionSummary,
    PrototypeTaskParams,
    PrototypeTaskResultData,
} from "../../../common/src";
import { PenpotUtils } from "../PenpotUtils.ts";
import { Task, TaskHandler } from "../TaskHandler";

export class PrototypeTaskHandler extends TaskHandler<PrototypeTaskParams> {
    readonly taskType = "prototype";

    async handle(task: Task<PrototypeTaskParams>): Promise<void> {
        if (!penpot.currentFile) {
            task.sendError("No current Penpot file is available.");
            return;
        }
        if (!penpot.currentPage) {
            task.sendError("No current Penpot page is available.");
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

    private handleAction(params: PrototypeTaskParams): PrototypeTaskResultData {
        switch (params.action) {
            case "createFlow":
                return this.createFlow(params);
            case "createInteraction":
                return this.createInteraction(params);
            default:
                throw new Error(`Unsupported prototype action: ${(params as PrototypeTaskParams).action}`);
        }
    }

    private createFlow(params: PrototypeTaskParams): PrototypeTaskResultData {
        const name = params.name?.trim();
        if (!name) {
            throw new Error("prototype.create_flow requires a non-empty name.");
        }

        const board = this.requireBoard(params.startingBoardId, "startingBoardId");
        const flow = penpot.currentPage!.createFlow(name, board);
        return {
            flow: this.summarizeFlow(flow),
            currentPage: this.summarizeCurrentPage(),
        };
    }

    private createInteraction(params: PrototypeTaskParams): PrototypeTaskResultData {
        const source = this.requireShape(params.sourceShapeId, "sourceShapeId");
        const destination = this.requireBoard(params.destinationBoardId, "destinationBoardId");
        const trigger = params.trigger ?? "click";
        const action: Action = {
            type: "navigate-to",
            destination,
            preserveScrollPosition: params.preserveScrollPosition,
            animation: params.animation ? this.toAnimation(params.animation) : undefined,
        };

        const index = source.interactions.length;
        const interaction = source.addInteraction(trigger as Trigger, action, params.delay);
        return {
            interaction: this.summarizeInteraction(source, interaction, destination, index),
            currentPage: this.summarizeCurrentPage(),
        };
    }

    private requireShape(shapeId: string | undefined, fieldName: string): Shape {
        if (!shapeId) {
            throw new Error(`${fieldName} is required.`);
        }
        const shape = PenpotUtils.findShapeById(shapeId);
        if (!shape) {
            throw new Error(`Shape not found: ${shapeId}`);
        }
        return shape;
    }

    private requireBoard(shapeId: string | undefined, fieldName: string): Board {
        const shape = this.requireShape(shapeId, fieldName);
        if (shape.type !== "board") {
            throw new Error(`${fieldName} must reference a board/frame shape: ${shapeId}`);
        }
        return shape as Board;
    }

    private toAnimation(animation: PrototypeAnimation): Animation {
        switch (animation.type) {
            case "dissolve":
                return {
                    type: "dissolve",
                    duration: animation.duration,
                    easing: animation.easing,
                };
            case "slide":
                return {
                    type: "slide",
                    duration: animation.duration,
                    direction: animation.direction ?? "left",
                    way: animation.way ?? "in",
                    offsetEffect: animation.offsetEffect,
                    easing: animation.easing,
                };
            case "push":
                return {
                    type: "push",
                    duration: animation.duration,
                    direction: animation.direction ?? "left",
                    easing: animation.easing,
                };
            default:
                throw new Error(`Unsupported prototype animation: ${(animation as PrototypeAnimation).type}`);
        }
    }

    private summarizeFlow(flow: Flow): PrototypeFlowSummary {
        return {
            name: flow.name,
            pageId: flow.page.id,
            pageName: flow.page.name,
            startingBoardId: flow.startingBoard.id,
            startingBoardName: flow.startingBoard.name,
        };
    }

    private summarizeInteraction(
        source: Shape,
        interaction: Interaction,
        destination: Board,
        index: number
    ): PrototypeInteractionSummary {
        return {
            sourceShapeId: source.id,
            sourceShapeName: source.name,
            index,
            identity: {
                kind: "source-index",
                sourceShapeId: source.id,
                interactionIndex: index,
                unstable: true,
            },
            trigger: interaction.trigger,
            delay: interaction.delay,
            actionType: "navigate-to",
            destinationBoardId: destination.id,
            destinationBoardName: destination.name,
        };
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
