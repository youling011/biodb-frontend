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
  schema_version: "string",
};

export const TranscriptomeQCContract = {
  qc_metrics: "array",
  normalization: "object",
  data_layer: "object",
  meta: "object",
};

export const TranscriptomeHVGContract = {
  points: "array",
  fit: "array",
  hvg_table: "array",
  meta: "object",
};

export const TranscriptomeDEContract = {
  de_table: "array",
  meta: "object",
};

export const GenomeRowContract = {
  contig: "string",
  start: "number",
  end: "number",
  strand: "string",
  product: "string",
  description: "string",
  go_terms: "array",
  kegg: "string",
  cog: "string",
  pfam: "string",
  interpro: "string",
  operon_id: "string",
};

export const MultiScreeningResponseContract = {
  volcano: "array",
  pca: "array",
  feature_importance: "array",
  diff_table: "array",
  meta: "object",
};

export const JobStatusContract = {
  id: "string|number",
  status: "string",
  progress: "number",
  message: "string",
  created_at: "string",
  updated_at: "string",
};
