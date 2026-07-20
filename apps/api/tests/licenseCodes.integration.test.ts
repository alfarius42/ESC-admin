import { hashSync } from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const testUser = {
  id: "seed-admin",
  email: "admin@vendor.local",
  displayName: "Admin",
  role: "admin" as const,
  passwordHash: hashSync("admin12345", 12),
  isActive: true
};

vi.mock("../src/modules/auth/authRepository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) =>
    email === testUser.email ? testUser : null
  )
}));

vi.mock("../src/modules/licenses/licenseCodesService.js", () => ({
  issueLicenseCodeAndPersist: vi.fn(async (_licenseId: string, body: { codeType?: string }) => {
    if (!body.codeType) {
      return { error: { codeType: "codeType is required" } } as const;
    }

    if (body.codeType === "unknown") {
      return { error: { codeType: "invalid" } } as const;
    }

    if (body.codeType === "pilot-blocked") {
      return {
        conflict: true,
        reasons: ["INN_ALREADY_USED"],
        details: { inn: "7701234567" }
      } as const;
    }

    if (body.codeType === "pilot-missing-license") {
      return { notFound: true } as const;
    }

    if (body.codeType === "pilot-internal") {
      return { internalError: "missing key" } as const;
    }

    return {
      codeId: "code-001",
      activationCode: "encoded.payload.signature",
      payload: {
        licenseId: "lic-001",
        package: "regpoint_pro",
        modules: ["pro"],
        issuedAt: "2026-07-20T00:00:00.000Z",
        validUntil: "2027-07-20T23:59:59.000Z",
        instanceId: null,
        codeType: "initial"
      },
      displayOnce: true,
      emailTemplate: "email"
    } as const;
  })
}));

let app: ReturnType<(typeof import("../src/app.js"))["createApp"]>;
let authToken: string;

beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: "admin@vendor.local",
    password: "admin12345"
  });
  authToken = loginResponse.body.data.token as string;
}, 30000);

describe("license code issue precheck route", () => {
  it("returns 401 without auth token", async () => {
    const response = await request(app)
      .post("/api/v1/licenses/lic-001/codes")
      .send({ codeType: "pilot" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid codeType", async () => {
    const response = await request(app)
      .post("/api/v1/licenses/lic-001/codes")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ codeType: "unknown" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when license is missing", async () => {
    const response = await request(app)
      .post("/api/v1/licenses/lic-001/codes")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ codeType: "pilot-missing-license" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when pilot is ineligible", async () => {
    const response = await request(app)
      .post("/api/v1/licenses/lic-001/codes")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ codeType: "pilot-blocked" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
    expect(response.body.error.details.reasons).toContain("INN_ALREADY_USED");
  });

  it("returns 500 for internal issue failures", async () => {
    const response = await request(app)
      .post("/api/v1/licenses/lic-001/codes")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ codeType: "pilot-internal" });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns 201 when issuance succeeds", async () => {
    const response = await request(app)
      .post("/api/v1/licenses/lic-001/codes")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ codeType: "initial" });

    expect(response.status).toBe(201);
    expect(response.body.data.codeId).toBe("code-001");
    expect(response.body.data.displayOnce).toBe(true);
  });
});
