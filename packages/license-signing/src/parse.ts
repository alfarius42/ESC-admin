import { fromBase64Url, toBase64Url } from "./base64url.js";
import type { ActivationPayload, ParsedActivationEnvelope } from "./types.js";

type JsonEnvelopeCandidate = {
  payload?: ActivationPayload | string;
  signature?: string;
  payloadBase64Url?: string;
  signatureBase64?: string;
  code?: string;
  envelope?: string;
};

function parsePayload(payloadValue: unknown): ActivationPayload {
  if (typeof payloadValue === "string") {
    return JSON.parse(payloadValue) as ActivationPayload;
  }
  return payloadValue as ActivationPayload;
}

function fromPayloadAndSignature(
  payload: ActivationPayload,
  signatureBase64: string
): ParsedActivationEnvelope {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64Url = toBase64Url(payloadJson);
  return {
    payload,
    payloadJson,
    payloadBase64Url,
    signatureBase64,
    envelope: `${payloadBase64Url}.${signatureBase64}`
  };
}

const MAX_WRAPPER_DEPTH = 12;

function parseJsonEnvelope(
  input: string,
  depth: number
): ParsedActivationEnvelope | null {
  if (depth > MAX_WRAPPER_DEPTH) {
    throw new Error("Activation envelope nesting is too deep");
  }

  let parsedJson: JsonEnvelopeCandidate;
  try {
    parsedJson = JSON.parse(input) as JsonEnvelopeCandidate;
  } catch {
    return null;
  }

  if (typeof parsedJson.code === "string") {
    return parseActivationEnvelopeInternal(parsedJson.code, depth + 1);
  }

  if (typeof parsedJson.envelope === "string") {
    return parseActivationEnvelopeInternal(parsedJson.envelope, depth + 1);
  }

  if (typeof parsedJson.payloadBase64Url === "string") {
    const payloadJson = fromBase64Url(parsedJson.payloadBase64Url).toString("utf8");
    const payload = JSON.parse(payloadJson) as ActivationPayload;
    const signatureBase64 = parsedJson.signatureBase64 ?? parsedJson.signature;
    if (typeof signatureBase64 !== "string") {
      throw new Error("JSON envelope must contain signature");
    }
    return {
      payload,
      payloadJson,
      payloadBase64Url: parsedJson.payloadBase64Url,
      signatureBase64,
      envelope: `${parsedJson.payloadBase64Url}.${signatureBase64}`
    };
  }

  if (parsedJson.payload && typeof parsedJson.signature === "string") {
    const payload = parsePayload(parsedJson.payload);
    return fromPayloadAndSignature(payload, parsedJson.signature);
  }

  return null;
}

function parseActivationEnvelopeInternal(
  code: string,
  depth: number
): ParsedActivationEnvelope {
  const trimmed = code.trim();

  const parsedJsonEnvelope = parseJsonEnvelope(trimmed, depth);
  if (parsedJsonEnvelope) {
    return parsedJsonEnvelope;
  }

  // Plain JSON payload without signature is parsable but unverifiable.
  if (trimmed.startsWith("{")) {
    const payload = JSON.parse(trimmed) as ActivationPayload;
    return {
      payload,
      payloadJson: trimmed,
      payloadBase64Url: toBase64Url(trimmed),
      signatureBase64: "",
      envelope: trimmed
    };
  }

  if (trimmed.includes(".")) {
    const dotIndex = trimmed.indexOf(".");
    const payloadBase64Url = trimmed.slice(0, dotIndex);
    const signatureBase64 = trimmed.slice(dotIndex + 1);
    const payloadJson = fromBase64Url(payloadBase64Url).toString("utf8");
    const payload = JSON.parse(payloadJson) as ActivationPayload;
    return {
      payload,
      payloadJson,
      payloadBase64Url,
      signatureBase64,
      envelope: trimmed
    };
  }

  throw new Error("Unsupported activation envelope format");
}

export function parseActivationEnvelope(code: string): ParsedActivationEnvelope {
  return parseActivationEnvelopeInternal(code, 0);
}
