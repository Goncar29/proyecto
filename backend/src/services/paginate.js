/**
 * Pagination helper shared by public list endpoints.
 *
 * Usage:
 *   const { page, pageSize, skip, take } = parsePagination({ page, pageSize });
 *
 * Defaults and bounds match the spec:
 *   page     -> 1
 *   pageSize -> 12 (bounded 1..50)
 */
function parsePagination({ page, pageSize, defaultPageSize = 12, maxPageSize = 50 }) {
  // NOTE: Express 5 makes req.query an immutable getter, so our Joi `validate`
  // middleware cannot coerce query strings to numbers in-place. We coerce here.
  const pNum = Number(page);
  const psNum = Number(pageSize);
  const p = Math.max(1, Number.isFinite(pNum) && pNum >= 1 ? Math.floor(pNum) : 1);
  const raw = Number.isFinite(psNum) && psNum >= 1 ? Math.floor(psNum) : defaultPageSize;
  const ps = Math.min(maxPageSize, Math.max(1, raw));
  return {
    page: p,
    pageSize: ps,
    skip: (p - 1) * ps,
    take: ps,
  };
}

/**
 * Assemble a paginated envelope: { items, total, page, pageSize }.
 */
function buildPage({ items, total, page, pageSize }) {
  return { items, total, page, pageSize };
}

module.exports = { parsePagination, buildPage };
