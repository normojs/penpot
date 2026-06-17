import assert from "node:assert/strict";
import test from "node:test";
import { SelectionPluginTask } from "../src/tasks/SelectionPluginTask.js";

test("SelectionPluginTask serializes selection get requests", () => {
    const request = new SelectionPluginTask({ action: "get" }).toRequest();

    assert.equal(request.task, "selection");
    assert.deepEqual(request.params, { action: "get" });
});
