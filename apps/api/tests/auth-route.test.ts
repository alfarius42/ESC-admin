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

let app: ReturnType<(typeof import("../src/app.js"))["createApp"]>;

beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

describe("auth routes", () => {
  it("returns token for valid seed credentials", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "admin@vendor.local",
      password: "admin12345"
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTypeOf("string");
    expect(response.body.data.user.email).toBe("admin@vendor.local");
  });

  it("returns 401 for invalid credentials", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "admin@vendor.local",
      password: "wrong-password"
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns current user for authorized request", async () => {
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "admin@vendor.local",
      password: "admin12345"
    });

    const token = loginResponse.body.data.token as string;
    const meResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user.role).toBe("admin");
  });

  it("returns 401 for /auth/me without bearer token", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for /auth/logout without bearer token", async () => {
    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("auth rate limit", () => {
  it("returns 429 when login limit exceeded", async () => {
    vi.resetModules();
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = "2";
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";

    const { createApp } = await import("../src/app.js");
    const rateLimitedApp = createApp();

    await request(rateLimitedApp).post("/api/v1/auth/login").send({
      email: "admin@vendor.local",
      password: "wrong"
    });
    await request(rateLimitedApp).post("/api/v1/auth/login").send({
      email: "admin@vendor.local",
      password: "wrong"
    });
    const response = await request(rateLimitedApp).post("/api/v1/auth/login").send({
      email: "admin@vendor.local",
      password: "wrong"
    });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("RATE_LIMITED");

    delete process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    vi.resetModules();
  });

  it("does not bypass limit via spoofed X-Forwarded-For", async () => {
    vi.resetModules();
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = "2";
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";

    const { createApp } = await import("../src/app.js");
    const rateLimitedApp = createApp();

    await request(rateLimitedApp)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", "1.2.3.4")
      .send({ email: "admin@vendor.local", password: "wrong" });
    await request(rateLimitedApp)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", "5.6.7.8")
      .send({ email: "admin@vendor.local", password: "wrong" });
    const response = await request(rateLimitedApp)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", "9.10.11.12")
      .send({ email: "admin@vendor.local", password: "wrong" });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("RATE_LIMITED");

    delete process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    vi.resetModules();
  });
});
