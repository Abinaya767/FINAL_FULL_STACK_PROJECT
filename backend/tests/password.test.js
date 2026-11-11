import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/utils/password.js";

test("password hashes are salted and do not reveal the original password", async () => {
  const first = await hashPassword("LearnSpace!Password123");
  const second = await hashPassword("LearnSpace!Password123");
  assert.notEqual(first, "LearnSpace!Password123");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("LearnSpace!Password123", first), true);
  assert.equal(await verifyPassword("WrongPassword123", first), false);
});

test("password hashing rejects weak and invalid passwords", async () => {
  await assert.rejects(() => hashPassword("short"), /between 8 and 128/);
  await assert.rejects(() => hashPassword(12345678), /between 8 and 128/);
});
