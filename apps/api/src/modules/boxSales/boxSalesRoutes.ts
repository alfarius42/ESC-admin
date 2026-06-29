import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type RequestAuthUser } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import {
  createBoxSaleRecord,
  getBoxSaleDetail,
  getBoxSalesList,
  getBoxSaleStats,
  patchBoxSaleRecord
} from "./boxSalesService.js";
import type { BoxSaleInput } from "./boxSalesValidation.js";

export const boxSalesRouter = Router();

function getAuthUser(res: Response): RequestAuthUser {
  return res.locals.authUser as RequestAuthUser;
}

boxSalesRouter.get("/api/v1/box-sales/stats", requireAuth, async (req, res, next) => {
  try {
    const result = await getBoxSaleStats({
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
});

boxSalesRouter.get("/api/v1/box-sales", requireAuth, async (req, res, next) => {
  try {
    const result = await getBoxSalesList({
      q: req.query.q as string | undefined,
      customerId: req.query.customerId as string | undefined,
      instanceId: req.query.instanceId as string | undefined,
      packageSku: req.query.packageSku as string | undefined,
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

boxSalesRouter.post("/api/v1/box-sales", requireAuth, async (req, res, next) => {
  try {
    const result = await createBoxSaleRecord(
      req.body as BoxSaleInput,
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

boxSalesRouter.get("/api/v1/box-sales/:id", requireAuth, async (req, res, next) => {
  try {
    const sale = await getBoxSaleDetail(req.params.id);
    if (!sale) {
      return fail(res, 404, "NOT_FOUND", "Box sale not found");
    }
    return ok(res, { sale });
  } catch (error) {
    return next(error);
  }
});

boxSalesRouter.patch("/api/v1/box-sales/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await patchBoxSaleRecord(req.params.id, req.body as BoxSaleInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      const message =
        "entity" in result && result.entity
          ? `${result.entity} not found`
          : "Box sale not found";
      return fail(res, 404, "NOT_FOUND", message);
    }
    return ok(res, { sale: result.sale });
  } catch (error) {
    return next(error);
  }
});
