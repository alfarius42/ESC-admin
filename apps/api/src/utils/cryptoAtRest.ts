import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedValue = {
  ivBase64: string;
  tagBase64: string;
  encryptedBase64: string;
};

function resolveAes256Key(rawKey: string): Buffer {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    throw new Error("CODES_ENCRYPTION_KEY is required");
  }

  const isHex = /^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === 64;
  const key = isHex ? Buffer.from(trimmed, "hex") : Buffer.from(trimmed, "base64");
  if (key.length !== 32) {
    throw new Error("CODES_ENCRYPTION_KEY must be 32 bytes (hex64 or base64)");
  }
  return key;
}

export function encryptTextAtRest(plainText: string, rawKey: string): string {
  const key = resolveAes256Key(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedValue = {
    ivBase64: iv.toString("base64"),
    tagBase64: tag.toString("base64"),
    encryptedBase64: encrypted.toString("base64")
  };
  return JSON.stringify(payload);
}

export function decryptTextAtRest(serialized: string, rawKey: string): string {
  const payload = JSON.parse(serialized) as EncryptedValue;
  const key = resolveAes256Key(rawKey);
  const iv = Buffer.from(payload.ivBase64, "base64");
  const tag = Buffer.from(payload.tagBase64, "base64");
  const encrypted = Buffer.from(payload.encryptedBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}
