import { signPayload, type ActivationPayload } from "@esc-admin/license-signing";
import { hashSync } from "bcryptjs";
import { generateKeyPairSync } from "node:crypto";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const testUser = {
  id: "seed-admin",
  email: "admin@vendor.local",
  displayName: "Admin",
  role: "admin" as const,
  passwordHash: hashSync("admin12345", 12),
  isActive: true
};

const licenseId = "550e8400-e29b-41d4-a716-446655440001";
const instanceId = "a1b2c3d4e5f6g7h8i9j0k1l2";

let privateKeyPem = "";
let publicKeyPem = "";

vi.mock("../src/modules/auth/authRepository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) =>
    email === testUser.email ? testUser : null
  )
}));

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
    licenseId,
    customerId: "cust-001",
    licenseStatus: "draft" as const,
    instanceId: "inst-001",
    packageSlug: "regpoint_pro",
    modules: ["pro"],
    validFrom: "2026-01-01",
    validUntil: "2026-12-31"
  })),
  countLicenseCodesByTypeAndStatus: vi.fn(async () => 0),
  hasLinkedReissueUpsellForCustomer: vi.fn(async () => true),
  insertActivationCodeAndMarkIssued: vi.fn(async () => ({ codeId: "code-001" })),
  appendAuditLog: vi.fn(async () => undefined),
  findActivationCodeByLicenseAndHashPrefix: vi.fn(async () => null),
  listActivationCodes: vi.fn(async () => ({
    items: [
      {
        id: "code-001",
        licenseId,
        codeType: "initial" as const,
        modules: ["pro"],
        status: "issued" as const,
        codeHashPrefix: "abc123",
        validUntil: "2026-12-31T23:59:59.000Z",
        pilotUntil: null,
        issuedAt: "2026-07-20T10:00:00.000Z",
        activatedAt: null,
        issuedBy: { id: testUser.id, displayName: testUser.displayName }
      }
    ],
    total: 1
  }))
}));

let app: ReturnType<(typeof import("../src/app.js"))["createApp"]>;
let authToken: string;

beforeAll(async () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKeyPem = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  publicKeyPem = keys.publicKey.export({ type: "spki", format: "pem" }).toString();

  const { env } = await import("../src/config/environment.js");
  env.licensePrivateKey = privateKeyPem;
  env.licensePublicKey = publicKeyPem;
  env.codesEncryptionKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const { createApp } = await import("../src/app.js");
  app = createApp();

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: testUser.email,
    password: "admin12345"
  });
  authToken = loginResponse.body.data.token as string;
}, 30000);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("codes issue and verify flow", () => {
  it("issues initial code with signed envelope", async () => {
    const { issueLicenseCode } = await import("../src/modules/licenses/licenseCodesService.js");
    const result = await issueLicenseCode(licenseId, { codeType: "initial" });

    expect("activationCode" in result).toBe(true);
    if ("activationCode" in result) {
      expect(result.activationCode).toContain(".");
    }
  });

  it("verifies valid signed code registered in db", async () => {
    const payload: ActivationPayload = {
      licenseId,
      package: "regpoint_pro",
      modules: ["pro"],
      issuedAt: "2026-07-20T10:00:00.000Z",
      validUntil: "2027-07-20T23:59:59.000Z",
      instanceId,
      codeType: "initial"
    };
    const activationCode = signPayload(payload, privateKeyPem);
    const hashPrefix = (
      await import("node:crypto")
    ).createHash("sha256").update(activationCode).digest("hex").slice(0, 16);

    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.findActivationCodeByLicenseAndHashPrefix).mockResolvedValueOnce({
      id: "code-001",
      licenseId,
      codeType: "initial",
      codeStatus: "issued",
      targetInstanceId: null,
      modules: ["pro"],
      validUntil: payload.validUntil,
      activatedAt: null,
      revokedAt: null,
      licenseInstanceId: instanceId,
      licenseModules: ["pro"]
    });

    const { verifyActivationCodeAdmin } = await import(
      "../src/modules/licenses/licenseCodesVerifyService.js"
    );
    const result = await verifyActivationCodeAdmin({ activationCode });

    expect("valid" in result && result.valid).toBe(true);
    if ("valid" in result) {
      expect(result.registered).toBe(true);
      expect(result.codeId).toBe("code-001");
      expect(result.warnings).not.toContain("NOT_REGISTERED_IN_DB");
    }

    expect(hashPrefix.length).toBe(16);
  });

  it("blocks duplicate initial code", async () => {
    const repo = await import("../src/modules/licenses/licensesRepository.js");
    vi.mocked(repo.findLicenseIssueContext).mockResolvedValueOnce({
      licenseId,
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
    const result = await issueLicenseCode(licenseId, { codeType: "initial" });

    expect("conflict" in result && result.conflict).toBe(true);
    if ("conflict" in result) {
      expect(result.reasons).toContain("INITIAL_ALREADY_EXISTS");
    }
  });
});

describe("codes routes", () => {
  it("returns 401 for GET /codes without auth", async () => {
    const response = await request(app).get("/api/v1/codes");
    expect(response.status).toBe(401);
  });

  it("lists codes without full activation code", async () => {
    const response = await request(app)
      .get("/api/v1/codes")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].codeHashPrefix).toBe("abc123");
    expect(response.body.data.items[0].activationCode).toBeUndefined();
  });

  it("returns 401 for POST /codes/verify without auth", async () => {
    const response = await request(app)
      .post("/api/v1/codes/verify")
      .send({ activationCode: "invalid" });
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid verify envelope", async () => {
    const response = await request(app)
      .post("/api/v1/codes/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ activationCode: "not-a-valid-envelope" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with valid=false for wrong signing key", async () => {
    const payload: ActivationPayload = {
      licenseId,
      package: "regpoint_pro",
      modules: ["pro"],
      issuedAt: "2026-07-20T10:00:00.000Z",
      validUntil: "2027-07-20T23:59:59.000Z",
      instanceId: null,
      codeType: "initial"
    };
    const otherKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const otherPrivateKey = otherKeys.privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    const activationCode = signPayload(payload, otherPrivateKey);

    const response = await request(app)
      .post("/api/v1/codes/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ activationCode });

    expect(response.status).toBe(200);
    expect(response.body.data.valid).toBe(false);
    expect(response.body.data.warnings).toContain("NOT_REGISTERED_IN_DB");
  });
});
