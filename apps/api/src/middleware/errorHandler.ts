import type { NextFunction, Request, Response } from "express";
import { fail } from "../utils/apiResponse.js";

export function notFoundHandler(_req: Request, res: Response): Response {
  return fail(res, 404, "NOT_FOUND", "Route not found");
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  console.error(error);
  return fail(res, 500, "INTERNAL_ERROR", "Internal server error");
}
