import { Router } from "express";
import { createHash } from "node:crypto";
import {
  findInstanceByTokenHash,
  findLicenseSummaryByInstanceId,
  markInstanceTokenVerified
} from "../db/instancesRepository.js";
import { env } from "../config/environment.js";
import { integrationTimeout } from "../middleware/integrationTimeout.js";
import { fail, ok } from "../utils/apiResponse.js";

type VerifyInstanceTokenRequest = {
  runtimeInstanceId: string;
  productVersion?: string;
  licenseStatus?: string;
  validUntil?: string;
  reportedAt?: string;
};

type VerifySuccessPayload = {
  tokenValid: true;
  instanceRegistered: true;
  licenseActive: boolean;
  validUntil: string | null;
  modules: string[];
  nextCheckAfterDays: number;
  warnings: string[];
};

async function buildVerifySuccessResponse(
  mode: "db" | "env",
  instanceId: string,
  payload: VerifyInstanceTokenRequest
): Promise<VerifySuccessPayload> {
  if (mode === "env") {
    return {
      tokenValid: true,
      instanceRegistered: true,
      licenseActive: true,
      validUntil: payload.validUntil ?? null,
      modules: ["pro"],
      nextCheckAfterDays: env.tokenCheckIntervalDays,
      warnings: []
    };
  }

  const warnings: string[] = [];
  const license = await findLicenseSummaryByInstanceId(instanceId);

  if (!license) {
    warnings.push("NO_LICENSE_REGISTERED");
    return {
      tokenValid: true,
      instanceRegistered: true,
      licenseActive: false,
      validUntil: payload.validUntil ?? null,
      modules: [],
      nextCheckAfterDays: env.tokenCheckIntervalDays,
      warnings
    };
  }

  return {
    tokenValid: true,
    instanceRegistered: true,
    licenseActive: license.licenseActive,
    validUntil: license.validUntil ?? payload.validUntil ?? null,
    modules: license.modules,
    nextCheckAfterDays: env.tokenCheckIntervalDays,
    warnings
  };
}

export const integrationsRouter = Router();

integrationsRouter.post(
  "/api/v1/integrations/verify-instance-token",
  integrationTimeout,
  async (req, res, next) => {
    const headerToken = req.header("X-Instance-Token");
    if (!headerToken) {
      return fail(res, 401, "INVALID_INSTANCE_TOKEN", "X-Instance-Token is required");
    }

    const payload = req.body as VerifyInstanceTokenRequest;
    if (!payload || !payload.runtimeInstanceId) {
      return fail(
        res,
        400,
        "RUNTIME_INSTANCE_ID_REQUIRED",
        "runtimeInstanceId is required"
      );
    }

    try {
      const tokenHash = createHash("sha256").update(headerToken).digest("hex");
      const verification = await findInstanceByTokenHash(tokenHash);
      if (!verification.record) {
        return fail(res, 401, "INVALID_INSTANCE_TOKEN", "Instance token is invalid");
      }

      if (
        verification.record.runtimeInstanceId &&
        verification.record.runtimeInstanceId !== payload.runtimeInstanceId
      ) {
        return fail(res, 404, "INSTANCE_NOT_FOUND", "Instance is not registered");
      }

      if (verification.record.instanceStatus === "suspended") {
        return fail(res, 403, "INSTANCE_SUSPENDED", "Instance is suspended");
      }

      await markInstanceTokenVerified(verification.record.id);

      const response = await buildVerifySuccessResponse(
        verification.mode,
        verification.record.id,
        payload
      );
      return ok(res, response);
    } catch (error) {
      return next(error);
    }
  }
);

integrationsRouter.post("/api/v1/integrations/verify-code", (_req, res) =>
  fail(res, 501, "NOT_IMPLEMENTED", "verify-code is planned for chunk 7")
);

integrationsRouter.post("/api/v1/integrations/support/messages", (_req, res) =>
  fail(res, 501, "NOT_IMPLEMENTED", "support integration is out of scope for chunk 0")
);
