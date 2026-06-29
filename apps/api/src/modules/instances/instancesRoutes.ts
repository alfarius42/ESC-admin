import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import {
  createInstanceRecord,
  getInstanceDetail,
  getInstancesList,
  patchInstanceRecord,
  rotateIntegrationToken,
  type InstanceInput
} from "./instancesService.js";

export const instancesRouter = Router();

instancesRouter.get("/api/v1/instances", requireAuth, async (req, res, next) => {
  try {
    const result = await getInstancesList({
      q: req.query.q as string | undefined,
      status: req.query.status as string | undefined,
      customerId: req.query.customerId as string | undefined,
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined
    });
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

instancesRouter.post("/api/v1/instances", requireAuth, async (req, res, next) => {
  try {
    const result = await createInstanceRecord(req.body as InstanceInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "Customer not found");
    }
    return ok(res, result, 201);
  } catch (error) {
    return next(error);
  }
});

instancesRouter.get("/api/v1/instances/:id", requireAuth, async (req, res, next) => {
  try {
    const detail = await getInstanceDetail(req.params.id);
    if (!detail) {
      return fail(res, 404, "NOT_FOUND", "Instance not found");
    }
    return ok(res, detail);
  } catch (error) {
    return next(error);
  }
});

instancesRouter.patch("/api/v1/instances/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await patchInstanceRecord(req.params.id, req.body as InstanceInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "Instance not found");
    }
    return ok(res, { instance: result.instance });
  } catch (error) {
    return next(error);
  }
});

instancesRouter.post(
  "/api/v1/integrations/instances/:id/rotate-token",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await rotateIntegrationToken(req.params.id);
      if ("notFound" in result) {
        return fail(res, 404, "NOT_FOUND", "Instance not found");
      }
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  }
);
