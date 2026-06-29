import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import {
  createCustomerRecord,
  getCustomerDetail,
  getCustomersList,
  patchCustomerRecord
} from "./customersService.js";
import type { CustomerInput } from "./customersValidation.js";

export const customersRouter = Router();

customersRouter.get("/api/v1/customers", requireAuth, async (req, res, next) => {
  try {
    const result = await getCustomersList({
      q: req.query.q as string | undefined,
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined
    });
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

customersRouter.post("/api/v1/customers", requireAuth, async (req, res, next) => {
  try {
    const result = await createCustomerRecord(req.body as CustomerInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    return ok(res, { customer: result.customer }, 201);
  } catch (error) {
    return next(error);
  }
});

customersRouter.get("/api/v1/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const detail = await getCustomerDetail(req.params.id);
    if (!detail) {
      return fail(res, 404, "NOT_FOUND", "Customer not found");
    }
    return ok(res, detail);
  } catch (error) {
    return next(error);
  }
});

customersRouter.patch("/api/v1/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await patchCustomerRecord(req.params.id, req.body as CustomerInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "Customer not found");
    }
    return ok(res, { customer: result.customer });
  } catch (error) {
    return next(error);
  }
});
