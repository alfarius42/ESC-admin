import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";

vi.mock("../src/modules/pilot/pilotEligibility.js", () => ({
  checkPilotEligibility: vi.fn(async () => ({
    eligible: true,
    reasons: [],
    details: {},
    policy: { pilotDurationDays: 30, checks: [] }
  }))
}));

vi.mock("../src/modules/licenses/licensesRepository.js", () => ({
  findLicenseIssueContext: vi.fn(async () => ({
    licenseId: "lic-001",
    customerId: "cust-001",
    licenseStatus: "active" as const,
    instanceId: "inst-001",
    packageSlug: "regpoint_pro",
    modules: ["pro"],
    validFrom: "2026-01-01",
    validUntil: "2026-12-31"
  })),
  countLicenseCodesByTypeAndStatus: vi.fn(async () => 0),
  hasLinkedReissueUpsellForCustomer: vi.fn(async () => true),
  insertActivationCodeAndMarkIssued: vi.fn(async () => ({ codeId: "code-001" })),
  appendAuditLog: vi.fn(async () => undefined)
}));

describe("license code service business rules", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { env } = await import("../src/config/environment.js");
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    env.licensePrivateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    env.codesEncryptionKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("blocks initial for invalid license status", async () => {
    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.findLicenseIssueContext).mockResolvedValueOnce({
      licenseId: "lic-001",
      customerId: "cust-001",
      licenseStatus: "active",
      instanceId: "inst-001",
      packageSlug: "regpoint_pro",
      modules: ["pro"],
      validFrom: "2026-01-01",
      validUntil: "2026-12-31"
    });

    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode("lic-001", { codeType: "initial" });

    expect("conflict" in result && result.conflict).toBe(true);
    if ("conflict" in result) {
      expect(result.reasons).toContain("INITIAL_STATUS_INVALID");
    }
  });

  it("blocks duplicate initial code", async () => {
    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.findLicenseIssueContext).mockResolvedValueOnce({
      licenseId: "lic-001",
      customerId: "cust-001",
      licenseStatus: "issued",
      instanceId: "inst-001",
      packageSlug: "regpoint_pro",
      modules: ["pro"],
      validFrom: "2026-01-01",
      validUntil: "2026-12-31"
    });
    vi.mocked(repo.countLicenseCodesByTypeAndStatus).mockResolvedValueOnce(1);

    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode("lic-001", { codeType: "initial" });

    expect("conflict" in result && result.conflict).toBe(true);
    if ("conflict" in result) {
      expect(result.reasons).toContain("INITIAL_ALREADY_EXISTS");
    }
  });

  it("blocks addon for invalid license status", async () => {
    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.findLicenseIssueContext).mockResolvedValueOnce({
      licenseId: "lic-001",
      customerId: "cust-001",
      licenseStatus: "draft",
      instanceId: "inst-001",
      packageSlug: "regpoint_pro",
      modules: ["pro"],
      validFrom: "2026-01-01",
      validUntil: "2026-12-31"
    });

    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode("lic-001", {
      codeType: "addon",
      modules: ["ticket"]
    });

    expect("conflict" in result && result.conflict).toBe(true);
    if ("conflict" in result) {
      expect(result.reasons).toContain("ADDON_STATUS_INVALID");
    }
  });

  it("blocks addon when incoming modules are subset", async () => {
    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode("lic-001", {
      codeType: "addon",
      modules: ["pro"]
    });

    expect("conflict" in result && result.conflict).toBe(true);
    if ("conflict" in result) {
      expect(result.reasons).toContain("ADDON_SUBSET_REJECTED");
    }
  });

  it("blocks renewal for invalid status", async () => {
    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.findLicenseIssueContext).mockResolvedValueOnce({
      licenseId: "lic-001",
      customerId: "cust-001",
      licenseStatus: "draft",
      instanceId: "inst-001",
      packageSlug: "regpoint_pro",
      modules: ["pro"],
      validFrom: "2026-01-01",
      validUntil: "2026-12-31"
    });

    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode("lic-001", { codeType: "renewal" });

    expect("conflict" in result && result.conflict).toBe(true);
    if ("conflict" in result) {
      expect(result.reasons).toContain("RENEWAL_STATUS_INVALID");
    }
  });

  it("adds warning for reissue without upsell", async () => {
    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.hasLinkedReissueUpsellForCustomer).mockResolvedValueOnce(false);

    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode("lic-001", { codeType: "reissue" });

    expect("warnings" in result).toBe(true);
    if ("warnings" in result) {
      expect(result.warnings).toContain("MISSING_REISSUE_UPSELL");
    }
  });
});
