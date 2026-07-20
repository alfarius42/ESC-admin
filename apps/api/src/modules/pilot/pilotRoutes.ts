import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import { checkPilotEligibility } from "./pilotEligibility.js";

export const pilotRouter = Router();

pilotRouter.get(
  "/api/v1/customers/:customerId/pilot-eligibility",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await checkPilotEligibility(req.params.customerId);
      if (!result) {
        return fail(res, 404, "NOT_FOUND", "Customer not found");
      }
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  }
);
