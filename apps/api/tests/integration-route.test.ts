import { createHash } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeInstanceId =
  process.env.INTEGRATION_TEST_RUNTIME_INSTANCE_ID ?? "a1b2c3d4e5f6g7h8i9j0k1l2";

const mockFindInstance = vi.fn();
const mockFindLicenseSummary = vi.fn();

vi.mock("../src/db/instancesRepository.js", () => ({
  findInstanceByTokenHash: (...args: unknown[]) => mockFindInstance(...args),
  findLicenseSummaryByInstanceId: (...args: unknown[]) =>
    mockFindLicenseSummary(...args),
  markInstanceTokenVerified: vi.fn(async () => undefined)
}));

let app: ReturnType<(typeof import("../src/app.js"))["createApp"]>;

beforeEach(async () => {
  vi.clearAllMocks();
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

describe("integration token route (repository mocked)", () => {
  it("returns 401 when header is missing", async () => {
    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .send({ runtimeInstanceId });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_INSTANCE_TOKEN");
  });

  it("returns 401 for invalid token", async () => {
    mockFindInstance.mockResolvedValue({ mode: "env", record: null });

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", "wrong")
      .send({ runtimeInstanceId });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("returns 404 for runtimeInstanceId mismatch", async () => {
    mockFindInstance.mockResolvedValue({
      mode: "db",
      record: {
        id: "inst-1",
        runtimeInstanceId: "other-runtime-id-1234567890",
        instanceStatus: "active"
      }
    });

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", "some-token")
      .send({ runtimeInstanceId });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("INSTANCE_NOT_FOUND");
  });

  it("returns 403 for suspended instance", async () => {
    mockFindInstance.mockResolvedValue({
      mode: "db",
      record: {
        id: "inst-1",
        runtimeInstanceId,
        instanceStatus: "suspended"
      }
    });

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", "some-token")
      .send({ runtimeInstanceId });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INSTANCE_SUSPENDED");
  });

  it("returns 401 after token rotate invalidates old hash", async () => {
    mockFindInstance.mockResolvedValue({ mode: "db", record: null });

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", "old-token-after-rotate")
      .send({ runtimeInstanceId });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_INSTANCE_TOKEN");
  });

  it("returns 200 for valid token in env mode with simplified license data", async () => {
    const token = process.env.INTEGRATION_INSTANCE_TOKEN_PLAIN ?? "replace-with-plain-token";
    if (!process.env.INTEGRATION_INSTANCE_TOKEN_HASH) {
      process.env.INTEGRATION_INSTANCE_TOKEN_HASH = createHash("sha256")
        .update(token)
        .digest("hex");
    }

    mockFindInstance.mockResolvedValue({
      mode: "env",
      record: {
        id: "env-instance",
        runtimeInstanceId,
        instanceStatus: "active"
      }
    });

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", token)
      .send({
        runtimeInstanceId,
        validUntil: "2027-06-14T23:59:59.000Z"
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tokenValid).toBe(true);
    expect(response.body.data.licenseActive).toBe(true);
    expect(response.body.data.modules).toEqual(["pro"]);
    expect(mockFindLicenseSummary).not.toHaveBeenCalled();
  });

  it("returns licenseActive false and NO_LICENSE_REGISTERED when no license in db mode", async () => {
    mockFindInstance.mockResolvedValue({
      mode: "db",
      record: {
        id: "inst-1",
        runtimeInstanceId,
        instanceStatus: "active"
      }
    });
    mockFindLicenseSummary.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", "valid-token")
      .send({ runtimeInstanceId, validUntil: "2027-06-14T23:59:59.000Z" });

    expect(response.status).toBe(200);
    expect(response.body.data.licenseActive).toBe(false);
    expect(response.body.data.modules).toEqual([]);
    expect(response.body.data.warnings).toContain("NO_LICENSE_REGISTERED");
  });

  it("returns licenseActive true and modules from license in db mode", async () => {
    mockFindInstance.mockResolvedValue({
      mode: "db",
      record: {
        id: "inst-1",
        runtimeInstanceId,
        instanceStatus: "active"
      }
    });
    mockFindLicenseSummary.mockResolvedValue({
      licenseStatus: "active",
      modules: ["pro"],
      validUntil: "2027-12-31",
      licenseActive: true
    });

    const response = await request(app)
      .post("/api/v1/integrations/verify-instance-token")
      .set("X-Instance-Token", "valid-token")
      .send({ runtimeInstanceId });

    expect(response.status).toBe(200);
    expect(response.body.data.licenseActive).toBe(true);
    expect(response.body.data.modules).toEqual(["pro"]);
    expect(response.body.data.validUntil).toBe("2027-12-31");
    expect(response.body.data.warnings).toEqual([]);
  });
});
