import { verify } from "node:crypto";
import { parseActivationEnvelope } from "./parse.js";
import type { ActivationPayload } from "./types.js";

export type VerificationResult = {
  valid: boolean;
  payload: ActivationPayload;
  reason?: string;
};

export function verifyActivationCode(
  activationCode: string,
  publicKeyPem: string
): VerificationResult {
  const parsed = parseActivationEnvelope(activationCode);
  if (!parsed.signatureBase64) {
    return {
      valid: false,
      payload: parsed.payload,
      reason: "SIGNATURE_MISSING"
    };
  }

  const isValid = verify(
    null,
    Buffer.from(parsed.payloadJson),
    publicKeyPem,
    Buffer.from(parsed.signatureBase64, "base64")
  );

  return {
    valid: isValid,
    payload: parsed.payload,
    reason: isValid ? undefined : "SIGNATURE_INVALID"
  };
}
