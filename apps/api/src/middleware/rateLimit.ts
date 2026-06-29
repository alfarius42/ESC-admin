import type { NextFunction, Request, Response } from "express";
import { env } from "../config/environment.js";
import { fail } from "../utils/apiResponse.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientKey(req: Request): string {
  return req.socket.remoteAddress ?? req.ip ?? "unknown";
}

export function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const key = getClientKey(req);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + env.authRateLimitWindowMs
    });
    return next();
  }

  if (existing.count >= env.authRateLimitMaxRequests) {
    return fail(
      res,
      429,
      "RATE_LIMITED",
      `Too many requests. Retry after ${Math.ceil((existing.resetAt - now) / 1000)}s`
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  next();
}
