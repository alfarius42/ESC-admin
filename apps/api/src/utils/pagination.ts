type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PaginationParams = {
  page: number;
  limit: number;
  offset: number;
};

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function getPaginationParams(query: {
  page?: string;
  limit?: string;
}): PaginationParams {
  const page = toPositiveInt(query.page, 1);
  const requestedLimit = toPositiveInt(query.limit, 20);
  const limit = Math.min(requestedLimit, 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = total <= 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}
