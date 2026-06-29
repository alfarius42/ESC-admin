import express from "express";
import { env } from "./config/environment.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { customersRouter } from "./modules/customers/customersRoutes.js";
import { instancesRouter } from "./modules/instances/instancesRoutes.js";
import { authRouter } from "./routes/auth.js";
import { integrationsRouter } from "./routes/integrations.js";
import { statusRouter } from "./routes/status.js";

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(express.json());
  app.use(statusRouter);
  app.use(authRouter);
  app.use(customersRouter);
  app.use(instancesRouter);
  app.use(integrationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
