import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/environment.js";
import { fail } from "../utils/apiResponse.js";

export function instanceTokenAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const headerToken = req.header("X-Instance-Token");
  if (!headerToken) {
    return fail(res, 401, "INVALID_INSTANCE_TOKEN", "X-Instance-Token is required");
  }

  if (!env.integrationTokenHash) {
    return fail(res, 500, "TOKEN_HASH_NOT_CONFIGURED", "Token hash is not configured");
  }

  const incomingHash = createHash("sha256").update(headerToken).digest("hex");
  const left = Buffer.from(incomingHash, "utf8");
  const right = Buffer.from(env.integrationTokenHash, "utf8");

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return fail(res, 401, "INVALID_INSTANCE_TOKEN", "Instance token is invalid");
  }

  next();
}
