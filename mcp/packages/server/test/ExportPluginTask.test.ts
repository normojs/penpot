import assert from "node:assert/strict";
import test from "node:test";
import { ExportPluginTask } from "../src/tasks/ExportPluginTask.js";

test("ExportPluginTask serializes shape export requests", () => {
    const request = new ExportPluginTask({
        action: "exportShape",
        shapeId: "00000000-0000-0000-0000-000000000010",
        format: "svg",
        skipChildren: false,
    }).toRequest();

    assert.equal(request.task, "export");
    assert.deepEqual(request.params, {
        action: "exportShape",
        shapeId: "00000000-0000-0000-0000-000000000010",
        format: "svg",
        skipChildren: false,
    });
});

test("ExportPluginTask serializes page export requests", () => {
    const request = new ExportPluginTask({
        action: "exportPage",
        pageId: "00000000-0000-0000-0000-000000000011",
        format: "png",
        scale: 2,
    }).toRequest();

    assert.equal(request.task, "export");
    assert.deepEqual(request.params, {
        action: "exportPage",
        pageId: "00000000-0000-0000-0000-000000000011",
        format: "png",
        scale: 2,
    });
});

test("ExportPluginTask serializes preview render requests", () => {
    const request = new ExportPluginTask({
        action: "renderPreview",
        target: "selection",
        format: "png",
        scale: 1,
    }).toRequest();

    assert.equal(request.task, "export");
    assert.deepEqual(request.params, {
        action: "renderPreview",
        target: "selection",
        format: "png",
        scale: 1,
    });
});
