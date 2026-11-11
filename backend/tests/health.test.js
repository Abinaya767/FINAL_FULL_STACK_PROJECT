import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import app from "../src/app.js";

const server = createServer(app);
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint returns a successful API response", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
  assert.ok(body.data.timestamp);
});

test("unknown API route returns JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/route-that-does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.match(body.message, /Route not found/);
});

test("security headers are present on API responses", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-powered-by"), null);
});
