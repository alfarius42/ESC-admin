export { toBase64Url, fromBase64Url } from "./base64url.js";
export { signPayload } from "./sign.js";
export { parseActivationEnvelope } from "./parse.js";
export { verifyActivationCode, type VerificationResult } from "./verify.js";
export { deriveCapabilities, validateModules } from "./capabilities.js";
export type {
  ActivationPayload,
  CodeType,
  PackageSlug,
  ParsedActivationEnvelope,
  ProductModule
} from "./types.js";
