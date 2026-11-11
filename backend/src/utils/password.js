import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const COST = 16384;

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw Object.assign(new Error("Password must be between 8 and 128 characters."), { status: 400 });
  }
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, { N: COST, r: 8, p: 1 });
  return `scrypt$${COST}$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") return false;
  const [algorithm, costText, saltHex, keyHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !/^\d+$/.test(costText || "") || !/^[a-f0-9]{32}$/i.test(saltHex || "") || !/^[a-f0-9]{128}$/i.test(keyHex || "")) {
    return false;
  }
  const cost = Number(costText);
  if (cost < 1024 || cost > 65536) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, { N: cost, r: 8, p: 1 });
  return timingSafeEqual(actual, expected);
}
