import { Router } from "express";
import { requireAuth, type RequestAuthUser } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/rateLimit.js";
import { loginWithCredentials } from "../modules/auth/authService.js";
import { fail, ok } from "../utils/apiResponse.js";

type LoginRequest = {
  email?: string;
  password?: string;
};

export const authRouter = Router();

authRouter.post("/api/v1/auth/login", loginRateLimit, async (req, res, next) => {
  const payload = req.body as LoginRequest;
  if (!payload.email || !payload.password) {
    return fail(res, 400, "VALIDATION_ERROR", "email and password are required");
  }

  try {
    const loginResult = await loginWithCredentials(payload.email, payload.password);
    if (!loginResult) {
      return fail(res, 401, "UNAUTHORIZED", "Invalid credentials");
    }
    return ok(res, loginResult);
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/api/v1/auth/me", requireAuth, (_req, res) => {
  const user = res.locals.authUser as RequestAuthUser;
  return ok(res, { user });
});

authRouter.post("/api/v1/auth/logout", requireAuth, (_req, res) =>
  ok(res, { ok: true })
);
