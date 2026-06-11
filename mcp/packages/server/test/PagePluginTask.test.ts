import assert from "node:assert/strict";
import test from "node:test";
import { PagePluginTask } from "../src/tasks/PagePluginTask.js";

test("PagePluginTask serializes page list requests", () => {
    const request = new PagePluginTask({ action: "list" }).toRequest();

    assert.equal(request.task, "page");
    assert.deepEqual(request.params, { action: "list" });
});

test("PagePluginTask serializes page create requests", () => {
    const request = new PagePluginTask({ action: "create", name: "Flow", makeCurrent: false }).toRequest();

    assert.equal(request.task, "page");
    assert.deepEqual(request.params, { action: "create", name: "Flow", makeCurrent: false });
});

test("PagePluginTask serializes page rename requests", () => {
    const request = new PagePluginTask({
        action: "rename",
        pageId: "00000000-0000-0000-0000-000000000010",
        name: "Checkout",
    }).toRequest();

    assert.equal(request.task, "page");
    assert.deepEqual(request.params, {
        action: "rename",
        pageId: "00000000-0000-0000-0000-000000000010",
        name: "Checkout",
    });
});

test("PagePluginTask serializes page set current requests", () => {
    const request = new PagePluginTask({
        action: "setCurrent",
        pageId: "00000000-0000-0000-0000-000000000010",
    }).toRequest();

    assert.equal(request.task, "page");
    assert.deepEqual(request.params, {
        action: "setCurrent",
        pageId: "00000000-0000-0000-0000-000000000010",
    });
});
