import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type RequestAuthUser } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import { listActivationCodesAdmin } from "./licenseCodesListService.js";
import {
  issueLicenseCodeAndPersist,
  type IssueCodeInput
} from "./licenseCodesService.js";
import { verifyActivationCodeAdmin } from "./licenseCodesVerifyService.js";
import {
  createLicenseRecord,
  getLicenseDetail,
  getLicensesList,
  patchLicenseRecord
} from "./licensesService.js";
import type { LicenseInput, LicenseListQuery } from "./licensesValidation.js";

export const licenseCodesRouter = Router();

function getAuthUser(res: Response): RequestAuthUser {
  return res.locals.authUser as RequestAuthUser;
}

licenseCodesRouter.get("/api/v1/licenses", requireAuth, async (req, res, next) => {
  try {
    const result = await getLicensesList({
      customerId: req.query.customerId as string | undefined,
      instanceId: req.query.instanceId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined
    } as LicenseListQuery);

    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

licenseCodesRouter.post("/api/v1/licenses", requireAuth, async (req, res, next) => {
  try {
    const result = await createLicenseRecord(req.body as LicenseInput);

    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      const message = result.entity === "boxSale" ? "Box sale not found" : "Instance not found";
      return fail(res, 404, "NOT_FOUND", message);
    }
    if ("conflict" in result) {
      return fail(res, 409, "CONFLICT", "License create conflict", result.details);
    }

    return ok(res, { license: result.license }, 201);
  } catch (error) {
    return next(error);
  }
});

licenseCodesRouter.get("/api/v1/licenses/:id", requireAuth, async (req, res, next) => {
  try {
    const detail = await getLicenseDetail(req.params.id);
    if (!detail) {
      return fail(res, 404, "NOT_FOUND", "License not found");
    }
    return ok(res, detail);
  } catch (error) {
    return next(error);
  }
});

licenseCodesRouter.patch("/api/v1/licenses/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await patchLicenseRecord(req.params.id, req.body as LicenseInput);

    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "License not found");
    }

    return ok(res, { license: result.license });
  } catch (error) {
    return next(error);
  }
});

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

licenseCodesRouter.get("/api/v1/codes", requireAuth, async (req, res, next) => {
  try {
    const result = await listActivationCodesAdmin({
      licenseId: req.query.licenseId as string | undefined,
      codeType: req.query.codeType as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined
    });

    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

licenseCodesRouter.post("/api/v1/codes/verify", requireAuth, async (req, res, next) => {
  try {
    const result = await verifyActivationCodeAdmin(req.body as { activationCode?: string });

    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }

    if ("internalError" in result) {
      return fail(res, 500, "INTERNAL_ERROR", result.internalError);
    }

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});
