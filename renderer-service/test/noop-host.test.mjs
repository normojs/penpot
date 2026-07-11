import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const buildPath = "/Volumes/fushilu/.caches/penpot/renderer-service/index.js";
const serviceModule = await import(`${pathToFileURL(buildPath).href}?test=${Date.now()}`);

async function withService(run) {
    const service = await serviceModule.startRendererService({ port: 0 });
    try {
        await run(service);
    } finally {
        await service.stop();
    }
}

test("noop host exposes the P25.24 health contract", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/health`);

        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
        assert.deepEqual(await response.json(), serviceModule.healthResponse);
    });
});

test("noop host rejects thumbnail rendering without producing an artifact", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ operation: "thumbnail.render" }),
        });

        assert.equal(response.status, 501);
        assert.deepEqual(await response.json(), serviceModule.noopThumbnailResponse);
    });
});

test("noop host lifecycle closes the listening socket", async () => {
    const service = await serviceModule.startRendererService({ port: 0 });
    assert.equal(service.server.listening, true);

    await service.stop();

    assert.equal(service.server.listening, false);
});
