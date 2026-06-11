import assert from "node:assert/strict";
import test from "node:test";
import { ShapePluginTask } from "../src/tasks/ShapePluginTask.js";

test("ShapePluginTask serializes frame creation requests", () => {
    const request = new ShapePluginTask({
        action: "createFrame",
        name: "Mobile",
        x: 100,
        y: 120,
        width: 390,
        height: 844,
        fill: { color: "#ffffff", opacity: 1 },
    }).toRequest();

    assert.equal(request.task, "shape");
    assert.deepEqual(request.params, {
        action: "createFrame",
        name: "Mobile",
        x: 100,
        y: 120,
        width: 390,
        height: 844,
        fill: { color: "#ffffff", opacity: 1 },
    });
});

test("ShapePluginTask serializes rectangle creation requests", () => {
    const request = new ShapePluginTask({
        action: "createRect",
        parentId: "00000000-0000-0000-0000-000000000010",
        name: "Primary Button",
        x: 24,
        y: 32,
        width: 180,
        height: 48,
        fill: { color: "#3366ff" },
        stroke: { color: "#2244aa", width: 2, alignment: "inner" },
        borderRadius: 8,
    }).toRequest();

    assert.equal(request.task, "shape");
    assert.deepEqual(request.params, {
        action: "createRect",
        parentId: "00000000-0000-0000-0000-000000000010",
        name: "Primary Button",
        x: 24,
        y: 32,
        width: 180,
        height: 48,
        fill: { color: "#3366ff" },
        stroke: { color: "#2244aa", width: 2, alignment: "inner" },
        borderRadius: 8,
    });
});

test("ShapePluginTask serializes text creation requests", () => {
    const request = new ShapePluginTask({
        action: "createText",
        parentId: "00000000-0000-0000-0000-000000000010",
        name: "Title",
        x: 24,
        y: 32,
        content: "Welcome",
        fontSize: 32,
        fill: { color: "#111111" },
    }).toRequest();

    assert.equal(request.task, "shape");
    assert.deepEqual(request.params, {
        action: "createText",
        parentId: "00000000-0000-0000-0000-000000000010",
        name: "Title",
        x: 24,
        y: 32,
        content: "Welcome",
        fontSize: 32,
        fill: { color: "#111111" },
    });
});

test("ShapePluginTask serializes image creation requests", () => {
    const request = new ShapePluginTask({
        action: "createImage",
        parentId: "00000000-0000-0000-0000-000000000010",
        name: "Logo",
        x: 24,
        y: 32,
        width: 96,
        imageBase64: "aGVsbG8=",
        mimeType: "image/png",
    }).toRequest();

    assert.equal(request.task, "shape");
    assert.deepEqual(request.params, {
        action: "createImage",
        parentId: "00000000-0000-0000-0000-000000000010",
        name: "Logo",
        x: 24,
        y: 32,
        width: 96,
        imageBase64: "aGVsbG8=",
        mimeType: "image/png",
    });
});

test("ShapePluginTask serializes shape update requests", () => {
    const request = new ShapePluginTask({
        action: "update",
        shapeId: "00000000-0000-0000-0000-000000000011",
        name: "Updated Card",
        x: 48,
        y: 64,
        width: 320,
        height: 180,
        fill: { color: "#f5f5f5", opacity: 0.9 },
        stroke: { color: "#222222", width: 1, style: "dashed" },
        borderRadius: 12,
        layout: {
            type: "flex",
            direction: "column",
            rowGap: 12,
            padding: 16,
        },
    }).toRequest();

    assert.equal(request.task, "shape");
    assert.deepEqual(request.params, {
        action: "update",
        shapeId: "00000000-0000-0000-0000-000000000011",
        name: "Updated Card",
        x: 48,
        y: 64,
        width: 320,
        height: 180,
        fill: { color: "#f5f5f5", opacity: 0.9 },
        stroke: { color: "#222222", width: 1, style: "dashed" },
        borderRadius: 12,
        layout: {
            type: "flex",
            direction: "column",
            rowGap: 12,
            padding: 16,
        },
    });
});

test("ShapePluginTask serializes shape delete requests", () => {
    const request = new ShapePluginTask({
        action: "delete",
        shapeId: "00000000-0000-0000-0000-000000000011",
    }).toRequest();

    assert.equal(request.task, "shape");
    assert.deepEqual(request.params, {
        action: "delete",
        shapeId: "00000000-0000-0000-0000-000000000011",
    });
});
