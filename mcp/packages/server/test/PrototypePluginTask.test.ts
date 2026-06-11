import assert from "node:assert/strict";
import test from "node:test";
import { PrototypePluginTask } from "../src/tasks/PrototypePluginTask.js";

test("PrototypePluginTask serializes flow creation requests", () => {
    const request = new PrototypePluginTask({
        action: "createFlow",
        name: "Checkout",
        startingBoardId: "00000000-0000-0000-0000-000000000010",
    }).toRequest();

    assert.equal(request.task, "prototype");
    assert.deepEqual(request.params, {
        action: "createFlow",
        name: "Checkout",
        startingBoardId: "00000000-0000-0000-0000-000000000010",
    });
});

test("PrototypePluginTask serializes interaction creation requests", () => {
    const request = new PrototypePluginTask({
        action: "createInteraction",
        sourceShapeId: "00000000-0000-0000-0000-000000000011",
        destinationBoardId: "00000000-0000-0000-0000-000000000012",
        trigger: "click",
        preserveScrollPosition: true,
        animation: {
            type: "dissolve",
            duration: 300,
            easing: "ease-in-out",
        },
    }).toRequest();

    assert.equal(request.task, "prototype");
    assert.deepEqual(request.params, {
        action: "createInteraction",
        sourceShapeId: "00000000-0000-0000-0000-000000000011",
        destinationBoardId: "00000000-0000-0000-0000-000000000012",
        trigger: "click",
        preserveScrollPosition: true,
        animation: {
            type: "dissolve",
            duration: 300,
            easing: "ease-in-out",
        },
    });
});

test("PrototypePluginTask serializes delayed interaction requests", () => {
    const request = new PrototypePluginTask({
        action: "createInteraction",
        sourceShapeId: "00000000-0000-0000-0000-000000000011",
        destinationBoardId: "00000000-0000-0000-0000-000000000012",
        trigger: "after-delay",
        delay: 1200,
    }).toRequest();

    assert.equal(request.task, "prototype");
    assert.deepEqual(request.params, {
        action: "createInteraction",
        sourceShapeId: "00000000-0000-0000-0000-000000000011",
        destinationBoardId: "00000000-0000-0000-0000-000000000012",
        trigger: "after-delay",
        delay: 1200,
    });
});
