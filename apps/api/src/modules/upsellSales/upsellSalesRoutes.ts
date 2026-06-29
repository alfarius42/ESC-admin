import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type RequestAuthUser } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import {
  createUpsellSaleRecord,
  getUpsellSaleDetail,
  getUpsellSalesList,
  getUpsellSaleStats,
  patchUpsellSaleRecord
} from "./upsellSalesService.js";
import type { UpsellSaleInput } from "./upsellSalesValidation.js";

export const upsellSalesRouter = Router();

function getAuthUser(res: Response): RequestAuthUser {
  return res.locals.authUser as RequestAuthUser;
}

upsellSalesRouter.get(
  "/api/v1/upsell-sales/stats",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await getUpsellSaleStats({
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined
      });
      if ("error" in result) {
        return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
      }
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  }
);

upsellSalesRouter.get("/api/v1/upsell-sales", requireAuth, async (req, res, next) => {
  try {
    const result = await getUpsellSalesList({
      q: req.query.q as string | undefined,
      customerId: req.query.customerId as string | undefined,
      instanceId: req.query.instanceId as string | undefined,
      sku: req.query.sku as string | undefined,
      skuCategory: req.query.skuCategory as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
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

upsellSalesRouter.post("/api/v1/upsell-sales", requireAuth, async (req, res, next) => {
  try {
    const result = await createUpsellSaleRecord(
      req.body as UpsellSaleInput,
      getAuthUser(res).id
    );
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", `${result.entity} not found`);
    }
    return ok(res, { sale: result.sale }, 201);
  } catch (error) {
    return next(error);
  }
});

upsellSalesRouter.get(
  "/api/v1/upsell-sales/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const sale = await getUpsellSaleDetail(req.params.id);
      if (!sale) {
        return fail(res, 404, "NOT_FOUND", "Upsell sale not found");
      }
      return ok(res, { sale });
    } catch (error) {
      return next(error);
    }
  }
);

upsellSalesRouter.patch(
  "/api/v1/upsell-sales/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await patchUpsellSaleRecord(
        req.params.id,
        req.body as UpsellSaleInput
      );
      if ("error" in result) {
        return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
      }
      if ("notFound" in result) {
        const message =
          "entity" in result && result.entity
            ? `${result.entity} not found`
            : "Upsell sale not found";
        return fail(res, 404, "NOT_FOUND", message);
      }
      return ok(res, { sale: result.sale });
    } catch (error) {
      return next(error);
    }
  }
);
