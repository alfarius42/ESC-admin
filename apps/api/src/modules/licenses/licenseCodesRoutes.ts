import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type RequestAuthUser } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import {
  issueLicenseCodeAndPersist,
  type IssueCodeInput
} from "./licenseCodesService.js";

export const licenseCodesRouter = Router();

function getAuthUser(res: Response): RequestAuthUser {
  return res.locals.authUser as RequestAuthUser;
}

licenseCodesRouter.post(
  "/api/v1/licenses/:id/codes",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await issueLicenseCodeAndPersist(
        req.params.id,
        req.body as IssueCodeInput,
        getAuthUser(res).id
      );
      if ("error" in result) {
        const details = Object.fromEntries(
          Object.entries(result.error ?? {}).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string"
          )
        );
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          details
        );
      }
      if ("notFound" in result) {
        return fail(res, 404, "NOT_FOUND", "License not found");
      }
      if ("conflict" in result) {
        const reasons = "reasons" in result ? result.reasons : [];
        const details = "details" in result ? result.details : undefined;
        return fail(
          res,
          409,
          "CONFLICT",
          "Code issue blocked by business rules",
          {
            reasons: (reasons ?? []).join(","),
            ...(details ?? {})
          }
        );
      }
      if ("internalError" in result) {
        return fail(
          res,
          500,
          "INTERNAL_ERROR",
          result.internalError ?? "Internal error"
        );
      }

      return ok(res, result, 201);
    } catch (error) {
      return next(error);
    }
  }
);
