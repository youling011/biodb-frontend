export function adaptSamplesResponse(payload) {
  const obj = payload || {};
  return {
    items: Array.isArray(obj.items) ? obj.items : [],
    total: Number(obj.total ?? 0),
    limit: Number(obj.limit ?? 20),
    offset: Number(obj.offset ?? 0),
    schema_version: obj.schema_version || "v1",
  };
}

export function adaptRowsResponse(payload) {
  const obj = payload || {};
  const rows = Array.isArray(obj.rows) ? obj.rows : Array.isArray(obj.rows_v2?.items) ? obj.rows_v2.items : [];
  const pagination = obj.pagination || obj.rows_v2?.pagination || { total: rows.length, offset: 0, limit: rows.length };
  return {
    ...obj,
    rows,
    pagination,
    schema_version: obj.schema_version || "v1",
  };
}
