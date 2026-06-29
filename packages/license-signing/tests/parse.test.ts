import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseActivationEnvelope } from "../src/parse.js";
import { signPayload } from "../src/sign.js";
import type { ActivationPayload } from "../src/types.js";

const payload: ActivationPayload = {
  licenseId: "550e8400-e29b-41d4-a716-446655440000",
  package: "regpoint_pro",
  modules: ["pro"],
  issuedAt: "2026-06-29T10:00:00.000Z",
  validUntil: "2027-06-29T10:00:00.000Z",
  instanceId: "a1b2c3d4e5f6g7h8i9j0k1l2",
  codeType: "initial"
};

function exportPrivateKeyPem(privateKey: KeyObject): string {
  return String(privateKey.export({ type: "pkcs8", format: "pem" }));
}

describe("parseActivationEnvelope", () => {
  it("parses dot-separated b64url.signature envelope", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const code = signPayload(payload, exportPrivateKeyPem(privateKey));
    const parsed = parseActivationEnvelope(code);

    expect(parsed.payload.licenseId).toBe(payload.licenseId);
    expect(parsed.signatureBase64.length).toBeGreaterThan(0);
    expect(parsed.envelope).toBe(code);
    expect(parsed.payloadBase64Url).toBe(code.split(".")[0]);
  });

  it("parses JSON wrapper with code field", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const code = signPayload(payload, exportPrivateKeyPem(privateKey));
    const parsed = parseActivationEnvelope(JSON.stringify({ code }));

    expect(parsed.payload.licenseId).toBe(payload.licenseId);
    expect(parsed.signatureBase64.length).toBeGreaterThan(0);
  });

  it("parses JSON with payloadBase64Url and signatureBase64", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const dot = signPayload(payload, exportPrivateKeyPem(privateKey));
    const [payloadBase64Url, signatureBase64] = dot.split(".");
    const parsed = parseActivationEnvelope(
      JSON.stringify({ payloadBase64Url, signatureBase64 })
    );

    expect(parsed.payload.licenseId).toBe(payload.licenseId);
    expect(parsed.payloadBase64Url).toBe(payloadBase64Url);
    expect(parsed.signatureBase64).toBe(signatureBase64);
  });

  it("parses plain JSON payload without signature", () => {
    const plain = JSON.stringify(payload);
    const parsed = parseActivationEnvelope(plain);

    expect(parsed.payload.licenseId).toBe(payload.licenseId);
    expect(parsed.signatureBase64).toBe("");
    expect(parsed.payloadJson).toBe(plain);
  });

  it("fails fast on excessively nested wrappers", () => {
    let wrapped = JSON.stringify({ code: JSON.stringify(payload) });
    for (let i = 0; i < 16; i += 1) {
      wrapped = JSON.stringify({ code: wrapped });
    }

    expect(() => parseActivationEnvelope(wrapped)).toThrow(
      "Activation envelope nesting is too deep"
    );
  });
});
