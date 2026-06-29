import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { ActivationPayload } from "../src/types.js";
import { signPayload } from "../src/sign.js";
import { verifyActivationCode } from "../src/verify.js";

function exportPrivateKeyPem(privateKey: KeyObject): string {
  return String(privateKey.export({ type: "pkcs8", format: "pem" }));
}

function exportPublicKeyPem(publicKey: KeyObject): string {
  return String(publicKey.export({ type: "spki", format: "pem" }));
}

const payload: ActivationPayload = {
  licenseId: "550e8400-e29b-41d4-a716-446655440000",
  package: "regpoint_pro",
  modules: ["pro"],
  issuedAt: "2026-06-29T10:00:00.000Z",
  validUntil: "2027-06-29T10:00:00.000Z",
  instanceId: "a1b2c3d4e5f6g7h8i9j0k1l2",
  codeType: "initial"
};

describe("signPayload", () => {
  it("creates code verifiable by public key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048
    });

    const code = signPayload(payload, exportPrivateKeyPem(privateKey));
    const verification = verifyActivationCode(code, exportPublicKeyPem(publicKey));

    expect(verification.valid).toBe(true);
    expect(verification.payload.licenseId).toBe(payload.licenseId);
  });

  it("fails verification with different key", () => {
    const keyPairA = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const keyPairB = generateKeyPairSync("rsa", { modulusLength: 2048 });

    const code = signPayload(payload, exportPrivateKeyPem(keyPairA.privateKey));
    const verification = verifyActivationCode(code, exportPublicKeyPem(keyPairB.publicKey));

    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe("SIGNATURE_INVALID");
  });
});
