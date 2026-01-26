diff --git a/frontend/src/modules/analysis/shared/echartsKit.js b/frontend/src/modules/analysis/shared/echartsKit.js
index 7f7fd85836d6e99ae5139043370533def72e48a8..0d534f08cf26e8a470caba4bc8bc5da2ffadd05e 100644
--- a/frontend/src/modules/analysis/shared/echartsKit.js
+++ b/frontend/src/modules/analysis/shared/echartsKit.js
@@ -1,25 +1,27 @@
+import { sampleScatterPoints, sampleHeatmapValues } from "./stats";
+
 /**
  * ECharts option kit
  *
  * Goal:
  * - Provide reusable option builders so chart options are not scattered across components.
  * - Keep defaults consistent (tooltip/axis/grid/dataZoom/toolbox) while allowing per-chart overrides.
  *
  * This module is intentionally dependency-free (does not import echarts).
  */
 
 function isFiniteNumber(v) {
   return Number.isFinite(Number(v));
 }
 
 function asNumber(v, fallback = null) {
   const n = Number(v);
   return Number.isFinite(n) ? n : fallback;
 }
 
 function defaultGrid() {
   return { left: 56, right: 22, top: 34, bottom: 46, containLabel: true };
 }
 
 function defaultAxisCommon({ name = "", unit = "", min = null, max = null } = {}) {
   const axisName = (name && unit) ? `${name} (${unit})` : (name || "");
@@ -182,100 +184,221 @@ export function buildHistOption(data, cfg = {}) {
   return merge(opt, extra);
 }
 
 /**
  * Build scatter option.
  *
  * Data formats:
  * - points: Array<[x,y]> or Array<{x,y,name?,extra?}>
  */
 export function buildScatterOption(data, cfg = {}) {
   const {
     title = "",
     xName = "",
     xUnit = "",
     yName = "",
     yUnit = "",
     xMin = null,
     xMax = null,
     yMin = null,
     yMax = null,
     symbolSize = 6,
     dataZoom = true,
     toolbox = true,
     tooltipFormatter = null,
     extra = {},
+    maxPoints = 50000,
+    samplingStrategy = "grid",
   } = cfg;
 
   const points = (data && Array.isArray(data.points)) ? data.points : [];
-  const norm = points.map((p) => {
+  const { points: sampled, lod } = sampleScatterPoints(points, { maxPoints, strategy: samplingStrategy });
+  const norm = sampled.map((p) => {
     if (Array.isArray(p)) return { value: [asNumber(p[0], null), asNumber(p[1], null)] };
     if (p && typeof p === "object") {
       const x = asNumber(p.x, null);
       const y = asNumber(p.y, null);
       const item = { value: [x, y] };
       if (p.name) item.name = String(p.name);
       if (p.extra) item.extra = p.extra;
       return item;
     }
     return { value: [null, null] };
   }).filter((it) => isFiniteNumber(it.value[0]) && isFiniteNumber(it.value[1]));
 
   const opt = {
+    meta: { lod },
     title: normalizeTitle(title),
     grid: defaultGrid(),
     tooltip: defaultTooltip({
       trigger: "item",
       formatter: typeof tooltipFormatter === "function" ? tooltipFormatter : ((params) => {
         const v = params?.value || [];
         const nm = params?.name ? `${params.name}<br/>` : "";
         return `${nm}${xName || "x"}: ${v[0]}<br/>${yName || "y"}: ${v[1]}`;
       }),
     }),
     toolbox: defaultToolbox({ enable: toolbox }),
     xAxis: {
       type: "value",
       ...defaultAxisCommon({ name: xName, unit: xUnit, min: xMin, max: xMax }),
     },
     yAxis: {
       type: "value",
       ...defaultAxisCommon({ name: yName, unit: yUnit, min: yMin, max: yMax }),
     },
     dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: "both" }),
     series: [
       {
         type: "scatter",
         symbolSize,
         data: norm,
         large: true,
       },
     ],
   };
 
   return merge(opt, extra);
 }
 
+export function buildMeanVarOption(data, cfg = {}) {
+  const {
+    title = "Mean-Variance",
+    xName = "Mean",
+    yName = "Variance",
+    toolbox = true,
+    dataZoom = true,
+    highlightColor = "#E8743B",
+    fitColor = "#2E7D32",
+    maxPoints = 50000,
+    samplingStrategy = "grid",
+  } = cfg;
+
+  const points = Array.isArray(data?.points) ? data.points : [];
+  const { points: sampled, lod } = sampleScatterPoints(points, { maxPoints, strategy: samplingStrategy });
+  const fit = Array.isArray(data?.fit) ? data.fit : [];
+
+  return {
+    meta: { lod },
+    title: normalizeTitle(title),
+    grid: defaultGrid(),
+    tooltip: defaultTooltip({ trigger: "item" }),
+    toolbox: defaultToolbox({ enable: toolbox }),
+    dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: "both" }),
+    xAxis: { type: "value", ...defaultAxisCommon({ name: xName }) },
+    yAxis: { type: "value", ...defaultAxisCommon({ name: yName }) },
+    series: [
+      {
+        type: "scatter",
+        data: sampled.map((p) => ({
+          value: [asNumber(p.mean, 0), asNumber(p.variance ?? p.dispersion, 0)],
+          name: p.gene,
+          itemStyle: p.is_hvg ? { color: highlightColor } : undefined,
+        })),
+        symbolSize: 6,
+      },
+      {
+        type: "line",
+        data: fit.map((p) => [asNumber(p.x, 0), asNumber(p.y, 0)]),
+        showSymbol: false,
+        lineStyle: { color: fitColor, width: 2 },
+      },
+    ],
+  };
+}
+
+export function buildVolcanoOption(data, cfg = {}) {
+  const {
+    title = "Volcano Plot",
+    xName = "log2FC",
+    yName = "-log10(padj)",
+    fcThreshold = 1,
+    pThreshold = 0.05,
+    maxPoints = 50000,
+    samplingStrategy = "grid",
+  } = cfg;
+
+  const points = Array.isArray(data?.points) ? data.points : [];
+  const { points: sampled, lod } = sampleScatterPoints(points, { maxPoints, strategy: samplingStrategy });
+  const thresholdLine = -Math.log10(Math.max(pThreshold, 1e-12));
+
+  return {
+    meta: { lod },
+    title: normalizeTitle(title),
+    grid: defaultGrid(),
+    tooltip: defaultTooltip({ trigger: "item" }),
+    toolbox: defaultToolbox({ enable: true }),
+    xAxis: { type: "value", ...defaultAxisCommon({ name: xName }) },
+    yAxis: { type: "value", ...defaultAxisCommon({ name: yName }) },
+    series: [
+      {
+        type: "scatter",
+        data: sampled.map((p) => [asNumber(p.log2fc, 0), asNumber(p.neglog10p, 0), p.gene]),
+        symbolSize: 6,
+      },
+    ],
+    markLine: {
+      symbol: "none",
+      data: [
+        { xAxis: fcThreshold },
+        { xAxis: -fcThreshold },
+        { yAxis: thresholdLine },
+      ],
+    },
+  };
+}
+
+export function buildMAOption(data, cfg = {}) {
+  const {
+    title = "MA Plot",
+    xName = "Mean Expression",
+    yName = "log2FC",
+    maxPoints = 50000,
+    samplingStrategy = "grid",
+  } = cfg;
+
+  const points = Array.isArray(data?.points) ? data.points : [];
+  const { points: sampled, lod } = sampleScatterPoints(points, { maxPoints, strategy: samplingStrategy });
+
+  return {
+    meta: { lod },
+    title: normalizeTitle(title),
+    grid: defaultGrid(),
+    tooltip: defaultTooltip({ trigger: "item" }),
+    toolbox: defaultToolbox({ enable: true }),
+    xAxis: { type: "value", ...defaultAxisCommon({ name: xName }) },
+    yAxis: { type: "value", ...defaultAxisCommon({ name: yName }) },
+    series: [
+      {
+        type: "scatter",
+        data: sampled.map((p) => [asNumber(p.mean, 0), asNumber(p.log2fc, 0), p.gene]),
+        symbolSize: 6,
+      },
+    ],
+  };
+}
+
 /**
  * Build boxplot option.
  *
  * Expected data:
  * - categories: string[]
  * - boxData: Array<[min,q1,median,q3,max]>
  * - outliers: Array<[catIndex, value]>
  */
 export function buildBoxplotOption(data, cfg = {}) {
   const {
     title = "",
     xName = "",
     yName = "",
     yUnit = "",
     yMin = null,
     yMax = null,
     rotate = 0,
     dataZoom = true,
     toolbox = true,
     extra = {},
   } = cfg;
 
   const categories = (data && Array.isArray(data.categories)) ? data.categories.map(String) : [];
   const boxData = (data && Array.isArray(data.boxData)) ? data.boxData : [];
   const outliers = (data && Array.isArray(data.outliers)) ? data.outliers : [];
@@ -324,60 +447,63 @@ export function buildBoxplotOption(data, cfg = {}) {
     ],
   };
 
   return merge(opt, extra);
 }
 
 /**
  * Build heatmap option.
  *
  * Data formats:
  * - { xLabels: string[], yLabels: string[], values: Array<[xIndex,yIndex,value]> }
  */
 export function buildHeatmapOption(data, cfg = {}) {
   const {
     title = "",
     xName = "",
     yName = "",
     valueName = "value",
     xRotate = 45,
     visualMin = null,
     visualMax = null,
     dataZoom = true,
     toolbox = true,
     tooltipFormatter = null,
     extra = {},
+    maxCells = 40000,
   } = cfg;
 
   const xLabels = (data && Array.isArray(data.xLabels)) ? data.xLabels.map(String) : [];
   const yLabels = (data && Array.isArray(data.yLabels)) ? data.yLabels.map(String) : [];
-  const values = (data && Array.isArray(data.values)) ? data.values : [];
+  const valuesRaw = (data && Array.isArray(data.values)) ? data.values : [];
+  const { values, lod } = sampleHeatmapValues(valuesRaw, { maxCells });
 
   const vMin = isFiniteNumber(visualMin) ? Number(visualMin) : null;
   const vMax = isFiniteNumber(visualMax) ? Number(visualMax) : null;
 
   const opt = {
+    meta: { lod },
     title: normalizeTitle(title),
     grid: { left: 80, right: 30, top: 34, bottom: 60, containLabel: true },
     tooltip: defaultTooltip({
       trigger: "item",
       formatter: typeof tooltipFormatter === "function" ? tooltipFormatter : ((param) => {
         const v = param?.data || [];
         const xi = v[0];
         const yi = v[1];
         const val = v[2];
         const x = xLabels[xi] ?? String(xi);
         const y = yLabels[yi] ?? String(yi);
         return `${y}<br/>${x}<br/>${valueName}: ${val}`;
       }),
     }),
     toolbox: defaultToolbox({ enable: toolbox }),
     xAxis: {
       type: "category",
       data: xLabels,
       axisLabel: { rotate: xRotate, hideOverlap: true },
       ...defaultAxisCommon({ name: xName, unit: "" }),
     },
     yAxis: {
       type: "category",
       data: yLabels,
       axisLabel: { hideOverlap: true },
