import type { ActivationPayload, ProductModule } from "./types.js";

const allowedModules: ProductModule[] = ["point", "promo", "pro", "ticket"];

export function validateModules(modules: string[]): ProductModule[] {
  return modules.filter((module): module is ProductModule =>
    allowedModules.includes(module as ProductModule)
  );
}

export function deriveCapabilities(payload: ActivationPayload): ProductModule[] {
  const modules = validateModules(payload.modules);
  if (modules.length > 0) {
    return [...new Set(modules)];
  }

  // Pilot may come without explicit modules in legacy payloads.
  if (payload.codeType === "pilot") {
    return ["point"];
  }

  return [];
}
