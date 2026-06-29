import { Router } from "express";
import { ok } from "../utils/apiResponse.js";

export const statusRouter = Router();

statusRouter.get("/status", (_req, res) =>
  ok(res, {
    status: "OK",
    database_status: "NOT_CONNECTED",
    signing_status: "NOT_IMPLEMENTED"
  })
);

statusRouter.get("/status/health", (_req, res) =>
  ok(res, {
    status: "OK"
  })
);
