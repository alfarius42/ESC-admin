import type { Response } from "express";

type ApiError = {
  code: string;
  message: string;
  details?: Record<string, string>;
};

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({
    success: true,
    data,
    error: null
  });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string>
): Response {
  const error: ApiError = details ? { code, message, details } : { code, message };
  return res.status(status).json({
    success: false,
    data: null,
    error
  });
}
