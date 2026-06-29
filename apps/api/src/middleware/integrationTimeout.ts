import type { NextFunction, Request, Response } from "express";
import { env } from "../config/environment.js";
import { fail } from "../utils/apiResponse.js";

export function integrationTimeout(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setTimeout(env.verifyTimeoutMs, () => {
    if (!res.headersSent) {
      fail(
        res,
        503,
        "INTEGRATION_TIMEOUT",
        `Integration request timed out after ${env.verifyTimeoutMs}ms`
      );
    }
  });

  next();
}
