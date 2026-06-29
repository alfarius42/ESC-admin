export type ProductModule = "point" | "promo" | "pro" | "ticket";

export type PackageSlug =
  | "regpoint_point"
  | "regpoint_promo"
  | "regpoint_pro"
  | "regpoint_ticket";

export type CodeType = "initial" | "addon" | "renewal" | "pilot" | "reissue";

export type ActivationPayload = {
  licenseId: string;
  package: PackageSlug | null;
  modules: ProductModule[];
  issuedAt: string;
  validUntil: string | null;
  instanceId: string | null;
  codeType: CodeType;
  pilotUntil?: string | null;
};

export type ParsedActivationEnvelope = {
  payload: ActivationPayload;
  payloadJson: string;
  payloadBase64Url: string;
  signatureBase64: string;
  envelope: string;
};
