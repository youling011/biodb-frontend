export function adaptSamplesResponse(payload) {
  const obj = payload || {};
  const items = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.data?.items) ? obj.data.items : [];
  return {
    items,
    total: Number(obj.total ?? obj.data?.total ?? items.length),
    limit: Number(obj.limit ?? obj.data?.limit ?? items.length),
    offset: Number(obj.offset ?? obj.data?.offset ?? 0),
    schema_version: obj.schema_version || "v2",
  };
}

export function adaptRowsResponse(payload) {
  const obj = payload || {};
  const rows = Array.isArray(obj.rows_v2?.items) ? obj.rows_v2.items : Array.isArray(obj.rows) ? obj.rows : [];
  const pagination = obj.rows_v2?.pagination || obj.pagination || { total: rows.length, offset: 0, limit: rows.length };
  return {
    ...obj,
    rows,
    pagination,
    schema_version: obj.schema_version || "v2",
  };
}
