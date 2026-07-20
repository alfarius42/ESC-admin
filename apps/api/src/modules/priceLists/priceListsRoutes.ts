import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { fail, ok } from "../../utils/apiResponse.js";
import {
  createPriceListItemRecord,
  createPriceListRecord,
  getCurrentPriceList,
  getPriceListDetail,
  getPriceListsList,
  importCanonPriceList,
  patchPriceListItemRecord,
  patchPriceListRecord,
  publishPriceListRecord,
  removePriceListItemRecord
} from "./priceListsService.js";
import type { ImportCanonInput, PriceListInput, PriceListItemInput } from "./priceListsValidation.js";

export const priceListsRouter = Router();

priceListsRouter.get("/api/v1/price-lists/current", requireAuth, async (_req, res, next) => {
  try {
    const priceList = await getCurrentPriceList();
    if (!priceList) {
      return fail(res, 404, "NOT_FOUND", "No published price list");
    }
    return ok(res, { priceList });
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.post("/api/v1/price-lists/import-canon", requireAuth, async (req, res, next) => {
  try {
    const result = await importCanonPriceList(req.body as ImportCanonInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", result.message ?? "Price list not found");
    }
    return ok(res, result, 201);
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.get("/api/v1/price-lists", requireAuth, async (req, res, next) => {
  try {
    const result = await getPriceListsList({
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

priceListsRouter.post("/api/v1/price-lists", requireAuth, async (req, res, next) => {
  try {
    const result = await createPriceListRecord(req.body as PriceListInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    return ok(res, { priceList: result.priceList }, 201);
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.get("/api/v1/price-lists/:id", requireAuth, async (req, res, next) => {
  try {
    const priceList = await getPriceListDetail(req.params.id);
    if (!priceList) {
      return fail(res, 404, "NOT_FOUND", "Price list not found");
    }
    return ok(res, { priceList });
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.patch("/api/v1/price-lists/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await patchPriceListRecord(req.params.id, req.body as PriceListInput);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("conflict" in result) {
      return fail(res, 409, "CONFLICT", result.message ?? "Conflict");
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "Price list not found");
    }
    return ok(res, { priceList: result.priceList });
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.post("/api/v1/price-lists/:id/publish", requireAuth, async (req, res, next) => {
  try {
    const result = await publishPriceListRecord(req.params.id);
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "Price list not found");
    }
    return ok(res, { priceList: result.priceList });
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.post("/api/v1/price-lists/:id/items", requireAuth, async (req, res, next) => {
  try {
    const result = await createPriceListItemRecord(
      req.params.id,
      req.body as PriceListItemInput
    );
    if ("error" in result) {
      return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
    }
    if ("conflict" in result) {
      return fail(res, 409, "CONFLICT", result.message ?? "Conflict");
    }
    if ("notFound" in result) {
      return fail(res, 404, "NOT_FOUND", "Price list not found");
    }
    return ok(res, { item: result.item }, 201);
  } catch (error) {
    return next(error);
  }
});

priceListsRouter.patch(
  "/api/v1/price-lists/:id/items/:itemId",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await patchPriceListItemRecord(
        req.params.id,
        req.params.itemId,
        req.body as PriceListItemInput
      );
      if ("error" in result) {
        return fail(res, 400, "VALIDATION_ERROR", "Validation failed", result.error);
      }
      if ("conflict" in result) {
        return fail(res, 409, "CONFLICT", result.message ?? "Conflict");
      }
      if ("notFound" in result) {
        return fail(res, 404, "NOT_FOUND", "Price list item not found");
      }
      return ok(res, { item: result.item });
    } catch (error) {
      return next(error);
    }
  }
);

priceListsRouter.delete(
  "/api/v1/price-lists/:id/items/:itemId",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await removePriceListItemRecord(req.params.id, req.params.itemId);
      if ("conflict" in result) {
        return fail(res, 409, "CONFLICT", result.message ?? "Conflict");
      }
      if ("notFound" in result) {
        return fail(res, 404, "NOT_FOUND", "Price list item not found");
      }
      return ok(res, { deleted: true });
    } catch (error) {
      return next(error);
    }
  }
);
