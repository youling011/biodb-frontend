export const SampleContract = {
  id: "number",
  species_name: "string",
  taxonomy: "string",
  omics_type: "GENOME|TRANSCRIPTOME|PROTEOME",
  summary_stats: "object",
};

export const SpeciesAnalysisResponseContract = {
  meta: "object",
  overview: "object",
  known_distributions: "object",
  fingerprint: "object",
  top_genes: "array",
  rows: "object",
};

export const RowsResponseContract = {
  rows: "array",
  row_fields: "array",
  total: "number",
  limit: "number",
  offset: "number",
};

export const MultiScreeningResponseContract = {
  volcano: "array",
  pca: "array",
  feature_importance: "array",
  diff_table: "array",
  meta: "object",
};
