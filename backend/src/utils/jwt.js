import "dotenv/config";
import jwt from "jsonwebtoken";

const issuer = "learnspace-api";
const audience = "learnspace-client";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || /replace-with|change-me/i.test(secret)) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export function createToken(user) {
  return jwt.sign(
    { role: user.role },
    getSecret(),
    {
      algorithm: "HS256",
      audience,
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      issuer,
      subject: user.id,
    },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
    audience,
    issuer,
  });
}

export function validateJwtConfiguration() {
  getSecret();
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (
    !adminEmail
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)
    || adminEmail.toLowerCase() === "admin@example.com"
    || !adminPassword
    || adminPassword.length < 16
    || /replace-with|change-me/i.test(adminPassword)
  ) {
    throw new Error("Configure a private ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters.");
  }
}
