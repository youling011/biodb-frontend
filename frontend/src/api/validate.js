import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

const schemas = {
  samplesList: {
    type: "object",
    properties: {
      items: { type: "array" },
      total: { type: "number" },
      limit: { type: "number" },
      offset: { type: "number" },
      schema_version: { type: "string" },
    },
    required: ["items", "total", "limit", "offset"],
  },
  rowsPage: {
    type: "object",
    properties: {
      rows: { type: "array" },
      pagination: {
        type: "object",
        properties: {
          total: { type: "number" },
          offset: { type: "number" },
          limit: { type: "number" },
        },
        required: ["total", "offset", "limit"],
      },
      schema_version: { type: "string" },
    },
    required: ["rows", "pagination"],
  },
  transcriptomeQC: {
    type: "object",
    properties: {
      qc_metrics: { type: "array" },
      normalization: { type: "object" },
      data_layer: { type: "object" },
      meta: { type: "object" },
    },
    required: ["qc_metrics"],
  },
  transcriptomeHVG: {
    type: "object",
    properties: {
      points: { type: "array" },
      fit: { type: "array" },
      hvg_table: { type: "array" },
      meta: { type: "object" },
    },
    required: ["points", "hvg_table"],
  },
  transcriptomeDE: {
    type: "object",
    properties: {
      de_table: { type: "array" },
      meta: { type: "object" },
    },
    required: ["de_table"],
  },
  jobStatus: {
    type: "object",
    properties: {
      id: { type: ["string", "number"] },
      status: { type: "string" },
      progress: { type: "number" },
      message: { type: "string" },
      created_at: { type: "string" },
      updated_at: { type: "string" },
    },
    required: ["id", "status"],
  },
};

const validators = Object.fromEntries(
  Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)])
);

export function validateOrThrow(name, payload) {
  const validate = validators[name];
  if (!validate) return payload;
  const ok = validate(payload);
  if (!ok) {
    const error = new Error(`Schema mismatch: ${name}`);
    error.details = validate.errors;
    throw error;
  }
  return payload;
}
