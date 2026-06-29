import type { NextFunction, Request, Response } from "express";
import { fail } from "../utils/apiResponse.js";
import { verifyAuthToken } from "../modules/auth/authService.js";

export type RequestAuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin";
};

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return fail(res, 401, "UNAUTHORIZED", "Bearer token is required");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return fail(res, 401, "UNAUTHORIZED", "Bearer token is required");
  }

  const user = verifyAuthToken(token);
  if (!user) {
    return fail(res, 401, "UNAUTHORIZED", "Invalid or expired token");
  }

  res.locals.authUser = user satisfies RequestAuthUser;
  next();
}
