import assert from "node:assert/strict";
import test from "node:test";
import { SelectionPluginTask } from "../src/tasks/SelectionPluginTask.js";

test("SelectionPluginTask serializes selection get requests", () => {
    const request = new SelectionPluginTask({ action: "get" }).toRequest();

    assert.equal(request.task, "selection");
    assert.deepEqual(request.params, { action: "get" });
});

test("SelectionPluginTask serializes selection set requests", () => {
    const shapeIds = ["00000000-0000-0000-0000-000000000003"];
    const request = new SelectionPluginTask({ action: "set", shapeIds }).toRequest();

    assert.equal(request.task, "selection");
    assert.deepEqual(request.params, { action: "set", shapeIds });
});

test("SelectionPluginTask serializes selection clear requests", () => {
    const request = new SelectionPluginTask({ action: "set", shapeIds: [] }).toRequest();

    assert.equal(request.task, "selection");
    assert.deepEqual(request.params, { action: "set", shapeIds: [] });
});
