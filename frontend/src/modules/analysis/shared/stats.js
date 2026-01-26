diff --git a/frontend/src/modules/analysis/shared/stats.js b/frontend/src/modules/analysis/shared/stats.js
index b610ff11132bd4aaef69ca63d8d9b57831882717..f8353d1480548f7526539d3957e8ab87d42954c3 100644
--- a/frontend/src/modules/analysis/shared/stats.js
+++ b/frontend/src/modules/analysis/shared/stats.js
@@ -314,48 +314,214 @@ export function zscoreMatrix(matrix) {
       if (!Number.isFinite(v) || counts[j] < 2) continue;
       const d = v - means[j];
       variances[j] += d * d;
     }
   }
   const stds = new Array(n).fill(0);
   for (let j = 0; j < n; j++) {
     stds[j] = counts[j] > 1 ? Math.sqrt(variances[j] / (counts[j] - 1)) : 0;
   }
 
   const X = new Array(m);
   for (let i = 0; i < m; i++) {
     const row = matrix[i];
     const out = new Array(n);
     for (let j = 0; j < n; j++) {
       const v = toNumber(row?.[j], null);
       if (!Number.isFinite(v) || stds[j] === 0) out[j] = 0;
       else out[j] = (v - means[j]) / stds[j];
     }
     X[i] = out;
   }
 
   return { X, means, stds };
 }
 
+export function log1pMatrix(matrix) {
+  if (!Array.isArray(matrix)) return [];
+  return matrix.map((row) => (Array.isArray(row) ? row.map((v) => Math.log1p(Math.max(0, toNumber(v, 0)))) : []));
+}
+
+export function imputeMatrix(matrix, strategy = "drop", { pseudocount = 1 } = {}) {
+  if (!Array.isArray(matrix)) return { X: [], dropped: 0 };
+  if (strategy === "drop") {
+    const X = matrix.filter((row) => Array.isArray(row) && row.every((v) => Number.isFinite(toNumber(v, null))));
+    return { X, dropped: matrix.length - X.length };
+  }
+
+  if (strategy === "zero") {
+    return { X: matrix.map((row) => row.map((v) => toNumber(v, 0))), dropped: 0 };
+  }
+
+  if (strategy === "pseudocount") {
+    return { X: matrix.map((row) => row.map((v) => {
+      const n = toNumber(v, null);
+      return Number.isFinite(n) ? n : pseudocount;
+    })), dropped: 0 };
+  }
+
+  if (strategy === "median") {
+    const cols = Array.isArray(matrix[0]) ? matrix[0].length : 0;
+    const medians = new Array(cols).fill(0).map((_, j) => median(cleanNumbers(matrix.map((row) => row?.[j])) ) ?? 0);
+    return {
+      X: matrix.map((row) => row.map((v, j) => {
+        const n = toNumber(v, null);
+        return Number.isFinite(n) ? n : medians[j];
+      })),
+      dropped: 0,
+    };
+  }
+
+  return { X: matrix, dropped: 0 };
+}
+
+export function clrTransform(vector, pseudocount = 1) {
+  const v = (Array.isArray(vector) ? vector : []).map((x) => Math.max(0, toNumber(x, 0)) + pseudocount);
+  if (v.length === 0) return [];
+  const logv = v.map((x) => Math.log(x));
+  const gm = mean(logv) ?? 0;
+  return logv.map((x) => x - gm);
+}
+
+export function alrTransform(vector, refIndex = 0, pseudocount = 1) {
+  const v = (Array.isArray(vector) ? vector : []).map((x) => Math.max(0, toNumber(x, 0)) + pseudocount);
+  if (v.length === 0) return [];
+  const denom = v[refIndex] ?? 1;
+  return v.map((x) => Math.log(x / denom));
+}
+
+export function aitchisonDistance(x, y, { pseudocount = 1 } = {}) {
+  const cx = clrTransform(x, pseudocount);
+  const cy = clrTransform(y, pseudocount);
+  const n = Math.min(cx.length, cy.length);
+  if (n === 0) return null;
+  let s = 0;
+  for (let i = 0; i < n; i++) {
+    const d = (cx[i] ?? 0) - (cy[i] ?? 0);
+    s += d * d;
+  }
+  return Math.sqrt(s);
+}
+
+function rankArray(arr) {
+  const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
+  const ranks = new Array(arr.length);
+  for (let i = 0; i < indexed.length; i++) {
+    ranks[indexed[i].i] = i + 1;
+  }
+  return ranks;
+}
+
+export function spearmanCorr(xArr, yArr) {
+  const x = cleanNumbers(xArr);
+  const y = cleanNumbers(yArr);
+  const n = Math.min(x.length, y.length);
+  if (n < 2) return null;
+  const rx = rankArray(x.slice(0, n));
+  const ry = rankArray(y.slice(0, n));
+  return pearson(rx, ry);
+}
+
+function winsorize(arr, p = 0.05) {
+  if (!arr.length) return [];
+  const sorted = [...arr].sort((a, b) => a - b);
+  const lo = quantile(sorted, p);
+  const hi = quantile(sorted, 1 - p);
+  return arr.map((v) => Math.min(hi, Math.max(lo, v)));
+}
+
+export function robustCorr(xArr, yArr, { winsor = 0.05 } = {}) {
+  const x = cleanNumbers(xArr);
+  const y = cleanNumbers(yArr);
+  const n = Math.min(x.length, y.length);
+  if (n < 2) return null;
+  const wx = winsorize(x.slice(0, n), winsor);
+  const wy = winsorize(y.slice(0, n), winsor);
+  return pearson(wx, wy);
+}
+
+function mulberry32(seed) {
+  let a = seed >>> 0;
+  return function () {
+    a |= 0;
+    a = (a + 0x6D2B79F5) | 0;
+    let t = Math.imul(a ^ (a >>> 15), 1 | a);
+    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
+    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
+  };
+}
+
+export function sampleScatterPoints(points, { maxPoints = 50000, strategy = "grid", seed = 42 } = {}) {
+  const arr = Array.isArray(points) ? points : [];
+  if (arr.length <= maxPoints) {
+    return { points: arr, lod: { enabled: false, originalCount: arr.length, sampledCount: arr.length, strategy } };
+  }
+
+  if (strategy === "random") {
+    const rand = mulberry32(seed);
+    const sampled = arr.filter(() => rand() < maxPoints / arr.length);
+    return { points: sampled.slice(0, maxPoints), lod: { enabled: true, originalCount: arr.length, sampledCount: Math.min(maxPoints, sampled.length), strategy } };
+  }
+
+  // grid sampling
+  const xs = arr.map((p) => (Array.isArray(p) ? Number(p[0]) : Number(p?.x)));
+  const ys = arr.map((p) => (Array.isArray(p) ? Number(p[1]) : Number(p?.y)));
+  const xmin = Math.min(...xs);
+  const xmax = Math.max(...xs);
+  const ymin = Math.min(...ys);
+  const ymax = Math.max(...ys);
+  const gridSize = Math.max(8, Math.floor(Math.sqrt(maxPoints)));
+  const xStep = (xmax - xmin) / gridSize || 1;
+  const yStep = (ymax - ymin) / gridSize || 1;
+  const bucket = new Map();
+  for (const p of arr) {
+    const x = Array.isArray(p) ? Number(p[0]) : Number(p?.x);
+    const y = Array.isArray(p) ? Number(p[1]) : Number(p?.y);
+    const xi = Math.floor((x - xmin) / xStep);
+    const yi = Math.floor((y - ymin) / yStep);
+    const key = `${xi}:${yi}`;
+    if (!bucket.has(key)) bucket.set(key, p);
+  }
+  const sampled = Array.from(bucket.values()).slice(0, maxPoints);
+  return {
+    points: sampled,
+    lod: { enabled: true, originalCount: arr.length, sampledCount: sampled.length, strategy: "grid" },
+  };
+}
+
+export function sampleHeatmapValues(values, { maxCells = 40000, seed = 42 } = {}) {
+  const arr = Array.isArray(values) ? values : [];
+  if (arr.length <= maxCells) {
+    return { values: arr, lod: { enabled: false, originalCount: arr.length, sampledCount: arr.length, strategy: "none" } };
+  }
+  const rand = mulberry32(seed);
+  const step = Math.max(1, Math.floor(arr.length / maxCells));
+  const sampled = arr.filter((_, i) => i % step === 0 || rand() < maxCells / arr.length);
+  return {
+    values: sampled.slice(0, maxCells),
+    lod: { enabled: true, originalCount: arr.length, sampledCount: Math.min(sampled.length, maxCells), strategy: "slice" },
+  };
+}
+
 /**
  * Build an ECharts boxplot series dataset from raw values.
  * Returns { categories, boxData, outliers }
  */
 export function buildEChartsBoxplot(groups, { whiskerCoef = 1.5 } = {}) {
   const categories = Object.keys(groups);
   const boxData = [];
   const outliers = [];
 
   categories.forEach((cat, idx) => {
     const s = boxplotStats(groups[cat], { whiskerCoef });
     if (s.count === 0) {
       boxData.push([0, 0, 0, 0, 0]);
       return;
     }
     boxData.push([s.whiskerLow, s.q1, s.median, s.q3, s.whiskerHigh]);
     for (const v of s.outliers) {
       outliers.push([idx, v]);
     }
   });
 
   return { categories, boxData, outliers };
 }
