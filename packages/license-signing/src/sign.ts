import { sign } from "node:crypto";
import { toBase64Url } from "./base64url.js";
import type { ActivationPayload } from "./types.js";

export function signPayload(payload: ActivationPayload, privateKeyPem: string): string {
  const payloadJson = JSON.stringify(payload);
  const signature = sign(null, Buffer.from(payloadJson), privateKeyPem).toString("base64");
  return `${toBase64Url(payloadJson)}.${signature}`;
}
