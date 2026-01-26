diff --git a/frontend/src/api/index.js b/frontend/src/api/index.js
index f34da469ccb565be95441e21df29d36b336aaf6d..464d78a1712b68e98c9e8191dede59629f64ecf1 100644
--- a/frontend/src/api/index.js
+++ b/frontend/src/api/index.js
@@ -1,152 +1,234 @@
 // frontend/src/api/index.js
 //
 // Data source strategy (Required modifications):
 // - Default: consume backend-simulated + DB-aggregated data.
 // - DEMO_MODE=true: use deterministic mock data without calling backend.
 // - Backend unavailable: fallback to deterministic mock ("异常兜底").
 //
 // Compatibility constraints:
 // - Existing UI expects legacy shapes for some endpoints (notably /rows/ returns { rows: [] }).
 // - Therefore we keep legacy keys while injecting meta.source and (where possible) also exposing
 //   the contract envelope { meta, rows, derived } returned by the backend.
 
 import { reactive } from "vue";
 import { http } from "./http";
 import { mockSpeciesAnalysis, mockMultiScreening } from "../mock/demoData";
+import {
+  makeOmicsSummaryVector,
+  makeTranscriptomeDE,
+  makeTranscriptomeHVG,
+  makeTranscriptomeQC,
+} from "./showcaseAdapter";
+import { validateOrThrow } from "./validate";
+import { getAdapter } from "./adapters";
+import { getCached, setCached, invalidateCache } from "../utils/queryCache";
 
-const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE || "")
+const MODE_STORAGE_KEY = "biostoich_data_mode";
+const ENV_DATA_MODE = String(import.meta.env.VITE_DATA_MODE || "demo")
   .trim()
   .toLowerCase();
 
-// Strategy 2 (per user request): always use demo data for UI showcasing,
-// regardless of backend availability. You may override by setting
-// VITE_FORCE_DEMO=0 in a future deployment scenario.
-const FORCE_DEMO = String(import.meta.env.VITE_FORCE_DEMO || "1")
-  .trim()
-  .toLowerCase();
-const USE_FORCE_DEMO = FORCE_DEMO === "1" || FORCE_DEMO === "true" || FORCE_DEMO === "yes";
-const USE_DEMO = USE_FORCE_DEMO || DEMO_MODE === "1" || DEMO_MODE === "true" || DEMO_MODE === "yes";
-const DEMO_MESSAGE = USE_FORCE_DEMO ? "FORCE_DEMO=true" : "DEMO_MODE=true";
+function readStoredMode() {
+  try {
+    return String(localStorage.getItem(MODE_STORAGE_KEY) || "").trim().toLowerCase();
+  } catch {
+    return "";
+  }
+}
+
+function resolveMode() {
+  const stored = readStoredMode();
+  return stored || ENV_DATA_MODE;
+}
 
 // Export a minimal global state so the UI can surface "demo_fallback" vs "demo_mode" vs "backend".
 // (A dedicated store is a recommended follow-up; this is kept minimal and non-invasive.)
+const INITIAL_MODE = resolveMode();
+
 export const dataSourceState = reactive({
-  source: USE_DEMO ? "demo_mode" : "backend", // backend | demo_mode | demo_fallback
-  message: USE_DEMO ? DEMO_MESSAGE : null,
+  mode: INITIAL_MODE,
+  source: INITIAL_MODE !== "backend" ? "demo_mode" : "backend", // backend | demo_mode | demo_fallback
+  message: INITIAL_MODE !== "backend" ? `DATA_MODE=${INITIAL_MODE}` : null,
   last_error: null,
   last_updated_at: Date.now(),
+  api_base: String(import.meta.env.VITE_API_BASE_URL || ""),
 });
 
 function markSource(source, message = null, err = null) {
   dataSourceState.source = source;
   dataSourceState.message = message;
   dataSourceState.last_error = err ? String(err?.message || err) : null;
   dataSourceState.last_updated_at = Date.now();
 }
 
+function delay(ms) {
+  return new Promise((resolve) => setTimeout(resolve, ms));
+}
+
+async function demoDelay() {
+  if (dataSourceState.mode !== "backend") {
+    await delay(150);
+  }
+}
+
+export function setDataMode(mode) {
+  const normalized = String(mode || "demo").trim().toLowerCase();
+  try {
+    localStorage.setItem(MODE_STORAGE_KEY, normalized);
+  } catch {}
+  dataSourceState.mode = normalized;
+  dataSourceState.source = normalized === "backend" ? "backend" : "demo_mode";
+  dataSourceState.message = normalized === "backend" ? null : `DATA_MODE=${normalized}`;
+  dataSourceState.last_updated_at = Date.now();
+  invalidateCache();
+}
+
 // Keep the species list consistent with backend DEFAULT_SPECIES (10).
 const DEMO_SPECIES = [
   { species_name: "Escherichia coli K-12", taxonomy: "Bacteria", tag: "ECOLI" },
   { species_name: "Bacillus subtilis 168", taxonomy: "Bacteria", tag: "BSUB" },
   { species_name: "Pseudomonas aeruginosa PAO1", taxonomy: "Bacteria", tag: "PAER" },
   { species_name: "Staphylococcus aureus N315", taxonomy: "Bacteria", tag: "SAUR" },
   { species_name: "Mycobacterium tuberculosis H37Rv", taxonomy: "Bacteria", tag: "MTUB" },
   { species_name: "Saccharomyces cerevisiae S288C", taxonomy: "Fungi", tag: "SCER" },
   { species_name: "Arabidopsis thaliana", taxonomy: "Plantae", tag: "ATHA" },
   { species_name: "Homo sapiens", taxonomy: "Mammalia", tag: "HSAP" },
   { species_name: "Mus musculus", taxonomy: "Mammalia", tag: "MMUS" },
   { species_name: "Drosophila melanogaster", taxonomy: "Insecta", tag: "DMEL" },
 ];
 
 function hash32(str) {
   const s = String(str ?? "");
   let h = 2166136261;
   for (let i = 0; i < s.length; i++) {
     h ^= s.charCodeAt(i);
     h = Math.imul(h, 16777619);
   }
   return h >>> 0;
 }
 
 function rngFrom(seedStr) {
   let a = hash32(seedStr) >>> 0;
   return function () {
     a |= 0;
     a = (a + 0x6d2b79f5) | 0;
     let t = Math.imul(a ^ (a >>> 15), 1 | a);
     t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
     return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
 }
 
 function round(x, d = 3) {
   const p = Math.pow(10, d);
   return Math.round(x * p) / p;
 }
 
 function buildDemoSamples() {
-  // Exactly: 10 species × 2 omics = 20 samples. Proteome is intentionally omitted.
+  // Exactly: 10 species × 3 omics = 30 samples for demo.
   const samples = [];
   let id = 1;
   for (const sp of DEMO_SPECIES) {
-    for (const omics of ["GENOME", "TRANSCRIPTOME"]) {
+    for (const omics of ["GENOME", "TRANSCRIPTOME", "PROTEOME"]) {
       const r = rngFrom(`${sp.tag}:${omics}`);
-      const planned = omics === "GENOME" ? 4494 : 4412;
+      const planned = omics === "GENOME" ? 4494 : omics === "TRANSCRIPTOME" ? 4412 : 3200;
       const gc = round(35 + r() * 30, 2);
       const cn = round(2.8 + r() * 4.2, 3);
       samples.push({
         id,
         species_name: sp.species_name,
         taxonomy: sp.taxonomy,
         omics_type: omics,
         gene_count: planned,
         avg_gc: gc,
         avg_cn_ratio: cn,
         summary_stats: {
           sim: {
             sim_version: "demo",
             template_version: "demo",
             sample_seed: hash32(`${sp.tag}:${omics}`) % 2147483647,
             species_tag: sp.tag,
             omics,
             status: "demo",
           },
           planned: { n_rows: planned },
           expected: {},
           observed: {},
           status: { rows_generated: true, observed_stats: true },
         },
       });
       id += 1;
     }
   }
   return samples;
 }
 
 const DEMO_SAMPLES = buildDemoSamples();
 
+const jobStore = new Map();
+let jobCounter = 1;
+
+function nowIso() {
+  return new Date().toISOString();
+}
+
+function createDemoJobRecord(type, params, result = null) {
+  const id = `job_${jobCounter++}`;
+  const record = {
+    id,
+    type,
+    params,
+    status: "queued",
+    progress: 0,
+    message: "Queued",
+    created_at: nowIso(),
+    updated_at: nowIso(),
+    result,
+  };
+  jobStore.set(id, record);
+  setTimeout(() => {
+    const r = jobStore.get(id);
+    if (!r) return;
+    r.status = "running";
+    r.progress = 0.4;
+    r.message = "Running";
+    r.updated_at = nowIso();
+  }, 200);
+  setTimeout(() => {
+    const r = jobStore.get(id);
+    if (!r) return;
+    r.status = "completed";
+    r.progress = 1;
+    r.message = "Completed";
+    r.updated_at = nowIso();
+    if (!r.result) {
+      r.result = { status: "demo", type, params };
+    }
+  }, 600);
+  return record;
+}
+
 function findDemoSample(id) {
   const sid = Number(id);
   return DEMO_SAMPLES.find((s) => Number(s.id) === sid) || null;
 }
 
 function normalizeSampleList(list) {
   // Normalize backend samples into the minimal fields used across the UI.
   return (Array.isArray(list) ? list : [])
     .filter((x) => x && typeof x === "object")
     .map((x) => {
       const ss = x.summary_stats || {};
       const planned = ss.planned || {};
       return {
         ...x,
         id: x.id,
         species_name: x.species_name,
         taxonomy: x.taxonomy,
         omics_type: x.omics_type,
         gene_count: x.gene_count ?? planned.n_rows ?? x.gene_count,
         avg_gc: x.avg_gc ?? ss?.observed?.gc_content?.mean ?? ss?.expected?.gc_content?.mean,
         avg_cn_ratio: x.avg_cn_ratio ?? ss?.observed?.ratios?.C_N_Ratio?.mean,
         summary_stats: ss,
       };
     });
 }
@@ -306,125 +388,168 @@ function normalizeRowsEndpointResponse(data, id, params, source) {
   const fields = meta.fields || (rowsArray[0] ? Object.keys(rowsArray[0]) : []);
 
   const rows_v2 = safeObj(obj.rows_v2);
   const rowsV2 = Object.keys(rows_v2).length
     ? {
         ...rows_v2,
         items: Array.isArray(rows_v2.items) ? rows_v2.items : rowsArray,
         pagination: rows_v2.pagination || pagination,
         fields: rows_v2.fields || fields,
       }
     : { items: rowsArray, pagination, fields };
 
   return {
     ...obj,
     meta: {
       sample_id: meta.sample_id ?? Number(id),
       omics: meta.omics || omics,
       status: meta.status || "ok",
       message: meta.message || null,
       ...meta,
       source: meta.source || source,
     },
     rows: rowsArray,
     pagination,
     rows_v2: rowsV2,
+    schema_version: obj.schema_version || meta.schema_version || "v1",
   };
 }
 
 function demoSpeciesAnalysis(id, params = {}, source = "demo_mode") {
   const omics = String(params?.omics || "GENOME").toUpperCase();
   const includeRaw = String(params?.include_raw ?? "1") !== "0";
   const limit = Number(params?.limit ?? 2000);
   const offset = Number(params?.offset ?? 0);
 
   const sample = findDemoSample(id);
   const planned = sample?.gene_count ?? (omics === "GENOME" ? 4494 : 4412);
   const n = Math.min(Math.max(offset + limit, 1000), Math.min(planned, 2000));
 
   const simulated = mockSpeciesAnalysis({ sampleId: id, omics, n, seed: "DEMO" });
   const rows = Array.isArray(simulated?.raw_data_sample) ? simulated.raw_data_sample : [];
   const page = includeRaw ? rows.slice(offset, offset + limit) : [];
 
   const pagination = {
     limit,
     offset,
     total: planned,
     has_next: offset + limit < planned,
   };
 
   return buildSpeciesAnalysisEnvelope({
     sample,
     omics,
     items: page,
     charts: simulated?.charts || {},
     tables: simulated?.tables || {},
     pagination,
     source,
     status: source === "demo_mode" ? "demo" : "fallback",
     message:
       source === "demo_fallback"
         ? "Backend unavailable. Using deterministic demo fallback." 
-        : DEMO_MESSAGE,
+        : dataSourceState.message,
   });
 }
 
 function demoRows(id, params = {}, source = "demo_mode") {
   const omics = String(params?.omics || "GENOME").toUpperCase();
   const limit = Math.max(1, Number(params?.limit ?? 2000));
   const offset = Math.max(0, Number(params?.offset ?? 0));
-  const rowFields = String(params?.row_fields || "")
-    .split(",")
-    .map((s) => s.trim())
-    .filter(Boolean);
+  const fieldsParam = params?.fields ?? params?.row_fields ?? "";
+  const rowFields = Array.isArray(fieldsParam)
+    ? fieldsParam
+    : String(fieldsParam || "")
+        .split(",")
+        .map((s) => s.trim())
+        .filter(Boolean);
 
   const sample = findDemoSample(id);
   const planned = sample?.gene_count ?? (omics === "GENOME" ? 4494 : 4412);
   const n = Math.min(Math.max(offset + limit, 1000), Math.min(planned, 2000));
   const simulated = mockSpeciesAnalysis({ sampleId: id, omics, n, seed: "DEMO" });
-  const rows = Array.isArray(simulated?.raw_data_sample) ? simulated.raw_data_sample : [];
+  let rows = Array.isArray(simulated?.raw_data_sample) ? simulated.raw_data_sample : [];
+
+  const filterParam = params?.filter;
+  let filterObj = filterParam;
+  if (typeof filterParam === "string" && filterParam.trim()) {
+    try {
+      filterObj = JSON.parse(filterParam);
+    } catch {
+      filterObj = null;
+    }
+  }
+  if (filterObj && typeof filterObj === "object") {
+    rows = rows.filter((r) =>
+      Object.entries(filterObj).every(([key, val]) => {
+        const v = r?.[key];
+        if (val && typeof val === "object") {
+          const min = Number(val.min ?? -Infinity);
+          const max = Number(val.max ?? Infinity);
+          const n = Number(v);
+          return n >= min && n <= max;
+        }
+        if (Array.isArray(val)) return val.includes(v);
+        if (typeof val === "string") return String(v || "").includes(val);
+        return v === val;
+      })
+    );
+  }
+
+  const sortBy = params?.sort_by;
+  const sortDir = String(params?.sort_dir || "asc").toLowerCase();
+  if (sortBy) {
+    rows = rows.slice().sort((a, b) => {
+      const av = a?.[sortBy];
+      const bv = b?.[sortBy];
+      if (av === bv) return 0;
+      if (sortDir === "desc") return av > bv ? -1 : 1;
+      return av > bv ? 1 : -1;
+    });
+  }
 
   const page = rows.slice(offset, offset + limit).map((r) => {
     if (!rowFields.length) return r;
     const out = {};
     for (const k of rowFields) out[k] = r?.[k];
     return out;
   });
 
   const pagination = {
     limit,
     offset,
     total: planned,
     has_next: offset + limit < planned,
   };
 
   return normalizeRowsEndpointResponse(
     {
       meta: { status: source === "demo_mode" ? "demo" : "fallback" },
       rows: page,
       pagination,
       rows_v2: { items: page, pagination },
+      schema_version: "v1",
     },
     id,
     { omics },
     source
   );
 }
 
 function demoObservedStats(id, params = {}, source = "demo_mode") {
   const omics = String(params?.omics || "GENOME").toUpperCase();
   const sample = findDemoSample(id);
   const planned = sample?.gene_count ?? (omics === "GENOME" ? 4494 : 4412);
 
   // Lightweight: reuse mockSpeciesAnalysis rows and compute simple means.
   const n = Math.min(planned, 1200);
   const simulated = mockSpeciesAnalysis({ sampleId: id, omics, n, seed: "DEMO" });
   const rows = Array.isArray(simulated?.raw_data_sample) ? simulated.raw_data_sample : [];
 
   // Minimal observed stats used by Phase3 UI.
   const keys =
     omics === "GENOME"
       ? {
           gc: "GC_Content_Percent",
           len: "Length_bp",
           C: "Carbon_Atoms",
           N: "Nitrogen_Atoms",
@@ -460,165 +585,443 @@ function demoObservedStats(id, params = {}, source = "demo_mode") {
     C_mean: round(mean(keys.C), 4),
     N_mean: round(mean(keys.N), 4),
     P_mean: round(mean(keys.P), 4),
   };
   if (keys.cn) observed.cn_ratio_mean = round(mean(keys.cn), 4);
   if (keys.entropy) observed.entropy_mean = round(mean(keys.entropy), 4);
 
   return withMetaSource(
     {
       sim: { status: source === "demo_mode" ? "demo" : "fallback", omics },
       planned: { n_rows: planned },
       expected: {},
       observed,
       status: { rows_generated: true, observed_stats: true },
     },
     source
   );
 }
 
 // -------------------------
 // Public API functions
 // -------------------------
 
 // 样本列表
 export async function getSamples(params = {}) {
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
-    return DEMO_SAMPLES;
+  const {
+    q = "",
+    omics = "",
+    taxonomy = "",
+    min_gc = null,
+    max_gc = null,
+    min_cn = null,
+    max_cn = null,
+    sort = "",
+    limit = 20,
+    offset = 0,
+  } = params || {};
+
+  const cached = getCached("samples", params, { schemaVersion: "v1", mode: dataSourceState.mode });
+  if (cached) return cached;
+
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const query = String(q || "").trim().toLowerCase();
+    let list = DEMO_SAMPLES.filter((s) => {
+      if (omics && s.omics_type !== omics) return false;
+      if (taxonomy && String(s.taxonomy) !== String(taxonomy)) return false;
+      if (!query) return true;
+      const hay = `${s.species_name} ${s.taxonomy} ${s.omics_type}`.toLowerCase();
+      return hay.includes(query);
+    });
+    const minGc = min_gc !== null ? Number(min_gc) : null;
+    const maxGc = max_gc !== null ? Number(max_gc) : null;
+    const minCn = min_cn !== null ? Number(min_cn) : null;
+    const maxCn = max_cn !== null ? Number(max_cn) : null;
+    list = list.filter((s) => {
+      const gc = Number(s.avg_gc ?? s.summary_stats?.observed?.gc_content?.mean);
+      const cn = Number(s.avg_cn_ratio ?? s.summary_stats?.observed?.ratios?.C_N_Ratio?.mean);
+      if (Number.isFinite(minGc) && gc < minGc) return false;
+      if (Number.isFinite(maxGc) && gc > maxGc) return false;
+      if (Number.isFinite(minCn) && cn < minCn) return false;
+      if (Number.isFinite(maxCn) && cn > maxCn) return false;
+      return true;
+    });
+    if (sort === "gc_desc") list = list.sort((a, b) => Number(b.avg_gc || 0) - Number(a.avg_gc || 0));
+    if (sort === "gc_asc") list = list.sort((a, b) => Number(a.avg_gc || 0) - Number(b.avg_gc || 0));
+    if (sort === "cn_desc") list = list.sort((a, b) => Number(b.avg_cn_ratio || 0) - Number(a.avg_cn_ratio || 0));
+    if (sort === "cn_asc") list = list.sort((a, b) => Number(a.avg_cn_ratio || 0) - Number(b.avg_cn_ratio || 0));
+    const items = list.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20));
+    const payload = { items, total: list.length, limit: Number(limit) || 20, offset: Number(offset) || 0, schema_version: "v1" };
+    const adapted = getAdapter(payload.schema_version).adaptSamplesResponse(payload);
+    const validated = validateOrThrow("samplesList", adapted);
+    setCached("samples", params, validated, { schemaVersion: payload.schema_version, mode: dataSourceState.mode });
+    return validated;
   }
+
   try {
-    const { data } = await http.get("/stoichiometry/", { params });
+    const { data } = await http.get("/stoichiometry/", { params: { q, omics, taxonomy, min_gc, max_gc, min_cn, max_cn, sort, limit, offset } });
     markSource("backend");
-    return normalizeSampleList(data);
+    const list = normalizeSampleList(Array.isArray(data?.items) ? data.items : data);
+    const total = Number(data?.total ?? list.length);
+    const payload = { items: list, total, limit: Number(limit) || 20, offset: Number(offset) || 0, schema_version: data?.schema_version || "v1" };
+    const adapted = getAdapter(payload.schema_version).adaptSamplesResponse(payload);
+    const validated = validateOrThrow("samplesList", adapted);
+    setCached("samples", params, validated, { schemaVersion: payload.schema_version, mode: dataSourceState.mode });
+    return validated;
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
-    return DEMO_SAMPLES;
+    const list = DEMO_SAMPLES;
+    const items = list.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20));
+    const payload = { items, total: list.length, limit: Number(limit) || 20, offset: Number(offset) || 0, schema_version: "v1" };
+    const adapted = getAdapter(payload.schema_version).adaptSamplesResponse(payload);
+    const validated = validateOrThrow("samplesList", adapted);
+    setCached("samples", params, validated, { schemaVersion: payload.schema_version, mode: dataSourceState.mode });
+    return validated;
   }
 }
 
 // 单条样本元信息
 export async function getSample(id) {
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
     return findDemoSample(id);
   }
   try {
     const { data } = await http.get(`/stoichiometry/${id}/`);
     markSource("backend");
     return data && data.id ? data : null;
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
     return findDemoSample(id);
   }
 }
 
+export async function getSpeciesOmics(sampleId) {
+  const sample = await getSample(sampleId);
+  if (!sample?.species_name) {
+    return { GENOME: null, TRANSCRIPTOME: null, PROTEOME: null };
+  }
+  if (dataSourceState.mode !== "backend") {
+    const same = DEMO_SAMPLES.filter((s) => s.species_name === sample.species_name);
+    return {
+      GENOME: same.find((s) => s.omics_type === "GENOME")?.id || null,
+      TRANSCRIPTOME: same.find((s) => s.omics_type === "TRANSCRIPTOME")?.id || null,
+      PROTEOME: same.find((s) => s.omics_type === "PROTEOME")?.id || null,
+    };
+  }
+
+  const response = await getSamples({ q: sample.species_name, limit: 200, offset: 0 });
+  const same = response.items || [];
+  return {
+    GENOME: same.find((s) => s.omics_type === "GENOME")?.id || null,
+    TRANSCRIPTOME: same.find((s) => s.omics_type === "TRANSCRIPTOME")?.id || null,
+    PROTEOME: same.find((s) => s.omics_type === "PROTEOME")?.id || null,
+  };
+}
+
 // 单样本分析（legacy keys + contract envelope)
 export async function getSpeciesAnalysis(id, params = { omics: "GENOME" }) {
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
     return demoSpeciesAnalysis(id, params, "demo_mode");
   }
   try {
     const { data } = await http.get(`/stoichiometry/${id}/species_analysis/`, { params });
     markSource("backend");
     // Inject meta.source if backend did not include it (or legacy backend).
     const normalized = normalizeSpeciesAnalysisResponse(data, id, params, "backend");
     return normalized;
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
     return demoSpeciesAnalysis(id, params, "demo_fallback");
   }
 }
 
 // Phase3: observed_stats (lightweight)
 export async function getObservedStats(id, params = { omics: "GENOME" }) {
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
     return demoObservedStats(id, params, "demo_mode");
   }
   try {
     const { data } = await http.get(`/stoichiometry/${id}/observed_stats/`, { params });
     markSource("backend");
     return withMetaSource(safeObj(data), "backend", { sample_id: Number(id), omics: String(params?.omics || "GENOME").toUpperCase() });
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
     return demoObservedStats(id, params, "demo_fallback");
   }
 }
 
+export async function getTranscriptomeQC(sampleId, params = {}) {
+  const cacheHit = getCached(`tx_qc:${sampleId}`, params, { schemaVersion: "v1", mode: dataSourceState.mode });
+  if (cacheHit) return cacheHit;
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const payload = makeTranscriptomeQC({ seed: `TX:QC:${sampleId}` });
+    const out = withMetaSource(payload, "demo_mode", { status: "demo", kind: "transcriptome_qc", params });
+    const validated = validateOrThrow("transcriptomeQC", out);
+    setCached(`tx_qc:${sampleId}`, params, validated, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return validated;
+  }
+  try {
+    const { data } = await http.get(`/stoichiometry/${sampleId}/transcriptome_qc/`, { params });
+    markSource("backend");
+    const out = withMetaSource(data, "backend", { kind: "transcriptome_qc" });
+    const validated = validateOrThrow("transcriptomeQC", out);
+    setCached(`tx_qc:${sampleId}`, params, validated, { schemaVersion: data?.schema_version || "v1", mode: dataSourceState.mode });
+    return validated;
+  } catch (e) {
+    markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
+    const payload = makeTranscriptomeQC({ seed: `TX:QC:${sampleId}` });
+    const out = withMetaSource(payload, "demo_fallback", { status: "fallback", kind: "transcriptome_qc", params });
+    const validated = validateOrThrow("transcriptomeQC", out);
+    setCached(`tx_qc:${sampleId}`, params, validated, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return validated;
+  }
+}
+
+export async function getTranscriptomeHVG(sampleId, params = {}) {
+  const nTop = Number(params?.n_top_genes ?? 1000);
+  const cacheHit = getCached(`tx_hvg:${sampleId}`, params, { schemaVersion: "v1", mode: dataSourceState.mode });
+  if (cacheHit) return cacheHit;
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const payload = makeTranscriptomeHVG({ seed: `TX:HVG:${sampleId}`, nTop });
+    const out = withMetaSource(payload, "demo_mode", { status: "demo", kind: "transcriptome_hvg", params });
+    const validated = validateOrThrow("transcriptomeHVG", out);
+    setCached(`tx_hvg:${sampleId}`, params, validated, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return validated;
+  }
+  try {
+    const { data } = await http.get(`/stoichiometry/${sampleId}/transcriptome_hvg/`, { params });
+    markSource("backend");
+    const out = withMetaSource(data, "backend", { kind: "transcriptome_hvg" });
+    const validated = validateOrThrow("transcriptomeHVG", out);
+    setCached(`tx_hvg:${sampleId}`, params, validated, { schemaVersion: data?.schema_version || "v1", mode: dataSourceState.mode });
+    return validated;
+  } catch (e) {
+    markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
+    const payload = makeTranscriptomeHVG({ seed: `TX:HVG:${sampleId}`, nTop });
+    const out = withMetaSource(payload, "demo_fallback", { status: "fallback", kind: "transcriptome_hvg", params });
+    const validated = validateOrThrow("transcriptomeHVG", out);
+    setCached(`tx_hvg:${sampleId}`, params, validated, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return validated;
+  }
+}
+
+export async function getTranscriptomeDE(sampleId, params = {}) {
+  const cacheHit = getCached(`tx_de:${sampleId}`, params, { schemaVersion: "v1", mode: dataSourceState.mode });
+  if (cacheHit) return cacheHit;
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const payload = makeTranscriptomeDE({ seed: `TX:DE:${sampleId}` });
+    const out = withMetaSource(payload, "demo_mode", { status: "demo", kind: "transcriptome_de", params });
+    const validated = validateOrThrow("transcriptomeDE", out);
+    setCached(`tx_de:${sampleId}`, params, validated, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return validated;
+  }
+  try {
+    const { data } = await http.get(`/stoichiometry/${sampleId}/transcriptome_de/`, { params });
+    markSource("backend");
+    const out = withMetaSource(data, "backend", { kind: "transcriptome_de" });
+    const validated = validateOrThrow("transcriptomeDE", out);
+    setCached(`tx_de:${sampleId}`, params, validated, { schemaVersion: data?.schema_version || "v1", mode: dataSourceState.mode });
+    return validated;
+  } catch (e) {
+    markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
+    const payload = makeTranscriptomeDE({ seed: `TX:DE:${sampleId}` });
+    const out = withMetaSource(payload, "demo_fallback", { status: "fallback", kind: "transcriptome_de", params });
+    const validated = validateOrThrow("transcriptomeDE", out);
+    setCached(`tx_de:${sampleId}`, params, validated, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return validated;
+  }
+}
+
+export async function getOmicsSummaryVector(sampleId, omics = "GENOME") {
+  const cacheHit = getCached(`omics_summary:${sampleId}:${omics}`, {}, { schemaVersion: "v1", mode: dataSourceState.mode });
+  if (cacheHit) return cacheHit;
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const out = withMetaSource(
+      {
+        sample_id: sampleId,
+        omics,
+        vector: makeOmicsSummaryVector({ seed: `${omics}:${sampleId}`, omics }),
+      },
+      "demo_mode",
+      { status: "demo", kind: "omics_summary_vector" }
+    );
+    setCached(`omics_summary:${sampleId}:${omics}`, {}, out, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return out;
+  }
+  try {
+    const { data } = await http.get(`/stoichiometry/${sampleId}/summary_vector/`, { params: { omics } });
+    markSource("backend");
+    const out = withMetaSource(data, "backend", { kind: "omics_summary_vector" });
+    setCached(`omics_summary:${sampleId}:${omics}`, {}, out, { schemaVersion: data?.schema_version || "v1", mode: dataSourceState.mode });
+    return out;
+  } catch (e) {
+    markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
+    const out = withMetaSource(
+      {
+        sample_id: sampleId,
+        omics,
+        vector: makeOmicsSummaryVector({ seed: `${omics}:${sampleId}`, omics }),
+      },
+      "demo_fallback",
+      { status: "fallback", kind: "omics_summary_vector" }
+    );
+    setCached(`omics_summary:${sampleId}:${omics}`, {}, out, { schemaVersion: "v1", mode: dataSourceState.mode });
+    return out;
+  }
+}
+
 // Phase3: rows endpoint (legacy: rows[]; new: rows_v2)
 export async function getSampleRows(
   id,
-  params = { omics: "GENOME", limit: 2000, offset: 0, row_fields: "" }
+  params = { omics: "GENOME", limit: 2000, offset: 0, row_fields: "", fields: "", sort_by: "", sort_dir: "", filter: "" }
 ) {
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
-    return demoRows(id, params, "demo_mode");
+  const cacheHit = getCached(`rows:${id}`, params, { schemaVersion: "v1", mode: dataSourceState.mode });
+  if (cacheHit) return cacheHit;
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const payload = demoRows(id, params, "demo_mode");
+    const adapted = getAdapter(payload.schema_version).adaptRowsResponse(payload);
+    const validated = validateOrThrow("rowsPage", adapted);
+    setCached(`rows:${id}`, params, validated, { schemaVersion: payload.schema_version, mode: dataSourceState.mode });
+    return validated;
   }
   try {
     const { data } = await http.get(`/stoichiometry/${id}/rows/`, { params });
     markSource("backend");
-    return normalizeRowsEndpointResponse(data, id, params, "backend");
+    const payload = normalizeRowsEndpointResponse(data, id, params, "backend");
+    const adapted = getAdapter(payload.schema_version).adaptRowsResponse(payload);
+    const validated = validateOrThrow("rowsPage", adapted);
+    setCached(`rows:${id}`, params, validated, { schemaVersion: payload.schema_version, mode: dataSourceState.mode });
+    return validated;
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
-    return demoRows(id, params, "demo_fallback");
+    const payload = demoRows(id, params, "demo_fallback");
+    const adapted = getAdapter(payload.schema_version).adaptRowsResponse(payload);
+    const validated = validateOrThrow("rowsPage", adapted);
+    setCached(`rows:${id}`, params, validated, { schemaVersion: payload.schema_version, mode: dataSourceState.mode });
+    return validated;
   }
 }
 
 // 多样本筛选
 export async function runMultiScreening(payload) {
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
     const out = mockMultiScreening({ payload, seed: "DEMO" });
     return withMetaSource(out, "demo_mode", { status: "demo" });
   }
   try {
     const { data } = await http.post("/stoichiometry/multi_screening/", payload);
     markSource("backend");
     const out = {
       feature_importance: Array.isArray(data?.feature_importance) ? data.feature_importance : [],
       diff_monomers: Array.isArray(data?.diff_monomers) ? data.diff_monomers : [],
       pca_data: Array.isArray(data?.pca_data) ? data.pca_data : [],
       message: data?.message,
     };
     return withMetaSource({ ...out, ...safeObj(data) }, "backend", { kind: "multi_screening" });
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
     const out = mockMultiScreening({ payload, seed: "DEMO" });
     return withMetaSource(out, "demo_fallback", { status: "fallback" });
   }
 }
 
+// Jobs API (async analysis)
+export async function createJob(type, params = {}) {
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const job = createDemoJobRecord(type, params);
+    return validateOrThrow("jobStatus", job);
+  }
+  const { data } = await http.post("/stoichiometry/jobs/", { type, params });
+  markSource("backend");
+  return validateOrThrow("jobStatus", data);
+}
+
+export async function getJobStatus(jobId) {
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const job = jobStore.get(jobId);
+    if (!job) throw new Error(`Job ${jobId} not found`);
+    return validateOrThrow("jobStatus", job);
+  }
+  const { data } = await http.get(`/stoichiometry/jobs/${jobId}/`);
+  markSource("backend");
+  return validateOrThrow("jobStatus", data);
+}
+
+export async function getJobResult(jobId) {
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
+    const job = jobStore.get(jobId);
+    if (!job) throw new Error(`Job ${jobId} not found`);
+    return job.result || { status: "pending" };
+  }
+  const { data } = await http.get(`/stoichiometry/jobs/${jobId}/result/`);
+  markSource("backend");
+  return data;
+}
+
 // 全局统计（保持兼容旧 UI 字段）
 export async function getGlobalStats() {
   const demoStats = () => ({
     species_count: DEMO_SPECIES.length,
     gene_count: DEMO_SAMPLES.filter((s) => s.omics_type === "GENOME").reduce((a, b) => a + (b.gene_count || 0), 0),
-    protein_count: 0,
+    protein_count: DEMO_SAMPLES.filter((s) => s.omics_type === "PROTEOME").reduce((a, b) => a + (b.gene_count || 0), 0),
     monomer_count: DEMO_SAMPLES.reduce((a, b) => a + (b.gene_count || 0), 0),
   });
 
-  if (USE_DEMO) {
-    markSource("demo_mode", DEMO_MESSAGE);
+  if (dataSourceState.mode !== "backend") {
+    markSource("demo_mode", dataSourceState.message);
+    await demoDelay();
     return withMetaSource(demoStats(), "demo_mode", { status: "demo", kind: "global_stats" });
   }
 
   try {
     const { data } = await http.get("/stoichiometry/global_stats/");
     markSource("backend");
     return withMetaSource(safeObj(data), "backend", { kind: "global_stats" });
   } catch (e) {
     markSource("demo_fallback", "Backend unavailable. Using deterministic demo fallback.", e);
     return withMetaSource(demoStats(), "demo_fallback", { status: "fallback", kind: "global_stats" });
   }
 }
 
 export default {
   getSamples,
   getSample,
+  getSpeciesOmics,
   getSpeciesAnalysis,
   getObservedStats,
   getSampleRows,
   runMultiScreening,
+  createJob,
+  getJobStatus,
+  getJobResult,
   getGlobalStats,
+  getTranscriptomeQC,
+  getTranscriptomeHVG,
+  getTranscriptomeDE,
+  getOmicsSummaryVector,
 };
