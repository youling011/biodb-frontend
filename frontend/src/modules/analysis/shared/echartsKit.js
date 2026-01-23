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
  const a = {
    name: axisName,
    nameLocation: "middle",
    nameGap: 30,
    axisLine: { show: true },
    axisTick: { show: true },
    axisLabel: { show: true },
    splitLine: { show: true },
  };
  if (min !== null) a.min = min;
  if (max !== null) a.max = max;
  return a;
}

function defaultTooltip({ formatter = null, trigger = "axis", axisPointer = "cross" } = {}) {
  const tip = {
    trigger,
    confine: true,
  };
  if (trigger === "axis") {
    tip.axisPointer = { type: axisPointer };
  }
  if (typeof formatter === "function") {
    tip.formatter = formatter;
  }
  return tip;
}

function defaultToolbox({ enable = true } = {}) {
  if (!enable) return undefined;
  return {
    show: true,
    right: 10,
    feature: {
      saveAsImage: { show: true },
      dataZoom: { show: true },
      restore: { show: true },
    },
  };
}

function maybeDataZoom({ enable = true, axis = "x" } = {}) {
  if (!enable) return undefined;
  const dz = [];
  if (axis === "x" || axis === "both") {
    dz.push({ type: "inside", xAxisIndex: 0 });
    dz.push({ type: "slider", xAxisIndex: 0, height: 18, bottom: 8 });
  }
  if (axis === "y" || axis === "both") {
    dz.push({ type: "inside", yAxisIndex: 0 });
    dz.push({ type: "slider", yAxisIndex: 0, width: 14, right: 6 });
  }
  return dz;
}

function normalizeTitle(title) {
  if (!title) return undefined;
  return { text: String(title), left: "center", top: 6 };
}

function merge(base, overrides) {
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/**
 * Build histogram option.
 *
 * Data formats supported:
 * 1) { edges: number[], counts: number[] } where edges.length = counts.length + 1
 * 2) { bins: Array<{x0:number,x1:number,count:number}> }
 */
export function buildHistOption(data, cfg = {}) {
  const {
    title = "",
    xName = "",
    xUnit = "",
    yName = "Count",
    yUnit = "",
    xMin = null,
    xMax = null,
    dataZoom = false,
    toolbox = true,
    extra = {},
  } = cfg;

  let labels = [];
  let counts = [];

  if (data && Array.isArray(data.bins) && Array.isArray(data.counts)) {
    // Legacy/simple histogram: { bins: string[]|number[], counts: number[] }
    // Example bin labels: ["0-100", "100-200"] or "0–100".
    labels = data.bins.map((b) => String(b));
    counts = data.counts.map((v) => asNumber(v, 0));
  } else if (data && Array.isArray(data.bins) && data.bins.length && typeof data.bins[0] === "object") {
    // Object bins: { bins: Array<{x0,x1,count}> }
    labels = data.bins.map((b) => {
      const x0 = asNumber(b.x0, 0);
      const x1 = asNumber(b.x1, 0);
      return `${x0}–${x1}`;
    });
    counts = data.bins.map((b) => asNumber(b.count ?? b.y ?? b.value, 0));
  } else if (data && Array.isArray(data.edges) && Array.isArray(data.counts)) {
    const edges = data.edges.map((v) => asNumber(v, 0));
    counts = data.counts.map((v) => asNumber(v, 0));
    labels = counts.map((_, i) => `${edges[i]}–${edges[i + 1]}`);
  } else {
    labels = [];
    counts = [];
  }

  const opt = {
    title: normalizeTitle(title),
    grid: defaultGrid(),
    tooltip: defaultTooltip({ trigger: "axis", axisPointer: "shadow" }),
    toolbox: defaultToolbox({ enable: toolbox }),
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { rotate: labels.length > 18 ? 45 : 0, hideOverlap: true },
      ...defaultAxisCommon({ name: xName, unit: xUnit }),
    },
    yAxis: {
      type: "value",
      ...defaultAxisCommon({ name: yName, unit: yUnit }),
    },
    dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: "x" }),
    series: [
      {
        type: "bar",
        data: counts,
        large: true,
      },
    ],
  };

  // For histograms, optional x range control is applied via axisLabel/tooltip only.
  // If user provides xMin/xMax, we will filter bins to range (non-destructive).
  if (isFiniteNumber(xMin) || isFiniteNumber(xMax)) {
    const minV = isFiniteNumber(xMin) ? Number(xMin) : -Infinity;
    const maxV = isFiniteNumber(xMax) ? Number(xMax) : Infinity;

    if (data && Array.isArray(data.edges) && Array.isArray(data.counts)) {
      const edges = data.edges.map((v) => asNumber(v, 0));
      const kept = [];
      for (let i = 0; i < data.counts.length; i++) {
        const left = edges[i];
        const right = edges[i + 1];
        if (right < minV || left > maxV) continue;
        kept.push(i);
      }
      opt.xAxis.data = kept.map((i) => `${edges[i]}–${edges[i + 1]}`);
      opt.series[0].data = kept.map((i) => asNumber(data.counts[i], 0));
    }
  }

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
  } = cfg;

  const points = (data && Array.isArray(data.points)) ? data.points : [];
  const norm = points.map((p) => {
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

export function buildMeanVarOption(data, cfg = {}) {
  const {
    title = "Mean-Variance",
    xName = "Mean",
    yName = "Variance",
    toolbox = true,
    dataZoom = true,
    highlightColor = "#E8743B",
    fitColor = "#2E7D32",
  } = cfg;

  const points = Array.isArray(data?.points) ? data.points : [];
  const fit = Array.isArray(data?.fit) ? data.fit : [];

  return {
    title: normalizeTitle(title),
    grid: defaultGrid(),
    tooltip: defaultTooltip({ trigger: "item" }),
    toolbox: defaultToolbox({ enable: toolbox }),
    dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: "both" }),
    xAxis: { type: "value", ...defaultAxisCommon({ name: xName }) },
    yAxis: { type: "value", ...defaultAxisCommon({ name: yName }) },
    series: [
      {
        type: "scatter",
        data: points.map((p) => ({
          value: [asNumber(p.mean, 0), asNumber(p.variance ?? p.dispersion, 0)],
          name: p.gene,
          itemStyle: p.is_hvg ? { color: highlightColor } : undefined,
        })),
        symbolSize: 6,
      },
      {
        type: "line",
        data: fit.map((p) => [asNumber(p.x, 0), asNumber(p.y, 0)]),
        showSymbol: false,
        lineStyle: { color: fitColor, width: 2 },
      },
    ],
  };
}

export function buildVolcanoOption(data, cfg = {}) {
  const {
    title = "Volcano Plot",
    xName = "log2FC",
    yName = "-log10(padj)",
    fcThreshold = 1,
    pThreshold = 0.05,
  } = cfg;

  const points = Array.isArray(data?.points) ? data.points : [];
  const thresholdLine = -Math.log10(Math.max(pThreshold, 1e-12));

  return {
    title: normalizeTitle(title),
    grid: defaultGrid(),
    tooltip: defaultTooltip({ trigger: "item" }),
    toolbox: defaultToolbox({ enable: true }),
    xAxis: { type: "value", ...defaultAxisCommon({ name: xName }) },
    yAxis: { type: "value", ...defaultAxisCommon({ name: yName }) },
    series: [
      {
        type: "scatter",
        data: points.map((p) => [asNumber(p.log2fc, 0), asNumber(p.neglog10p, 0), p.gene]),
        symbolSize: 6,
      },
    ],
    markLine: {
      symbol: "none",
      data: [
        { xAxis: fcThreshold },
        { xAxis: -fcThreshold },
        { yAxis: thresholdLine },
      ],
    },
  };
}

export function buildMAOption(data, cfg = {}) {
  const {
    title = "MA Plot",
    xName = "Mean Expression",
    yName = "log2FC",
  } = cfg;

  const points = Array.isArray(data?.points) ? data.points : [];

  return {
    title: normalizeTitle(title),
    grid: defaultGrid(),
    tooltip: defaultTooltip({ trigger: "item" }),
    toolbox: defaultToolbox({ enable: true }),
    xAxis: { type: "value", ...defaultAxisCommon({ name: xName }) },
    yAxis: { type: "value", ...defaultAxisCommon({ name: yName }) },
    series: [
      {
        type: "scatter",
        data: points.map((p) => [asNumber(p.mean, 0), asNumber(p.log2fc, 0), p.gene]),
        symbolSize: 6,
      },
    ],
  };
}

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

  const opt = {
    title: normalizeTitle(title),
    grid: defaultGrid(),
    tooltip: defaultTooltip({
      trigger: "item",
      formatter: (param) => {
        if (param.seriesType === "boxplot") {
          const v = param.data;
          return `${param.name}<br/>min: ${v[0]}<br/>Q1: ${v[1]}<br/>median: ${v[2]}<br/>Q3: ${v[3]}<br/>max: ${v[4]}`;
        }
        if (param.seriesType === "scatter") {
          const v = param.data;
          return `${categories[v[0]]}<br/>outlier: ${v[1]}`;
        }
        return "";
      },
    }),
    toolbox: defaultToolbox({ enable: toolbox }),
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { rotate, hideOverlap: true },
      ...defaultAxisCommon({ name: xName, unit: "" }),
    },
    yAxis: {
      type: "value",
      ...defaultAxisCommon({ name: yName, unit: yUnit, min: yMin, max: yMax }),
    },
    dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: "x" }),
    series: [
      {
        name: "box",
        type: "boxplot",
        data: boxData,
      },
      {
        name: "outlier",
        type: "scatter",
        data: outliers,
        symbolSize: 5,
      },
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
  } = cfg;

  const xLabels = (data && Array.isArray(data.xLabels)) ? data.xLabels.map(String) : [];
  const yLabels = (data && Array.isArray(data.yLabels)) ? data.yLabels.map(String) : [];
  const values = (data && Array.isArray(data.values)) ? data.values : [];

  const vMin = isFiniteNumber(visualMin) ? Number(visualMin) : null;
  const vMax = isFiniteNumber(visualMax) ? Number(visualMax) : null;

  const opt = {
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
      ...defaultAxisCommon({ name: yName, unit: "" }),
    },
    visualMap: {
      min: vMin !== null ? vMin : undefined,
      max: vMax !== null ? vMax : undefined,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 10,
    },
    dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: "both" }),
    series: [
      {
        type: "heatmap",
        data: values,
        progressive: 2000,
      },
    ],
  };

  return merge(opt, extra);
}

/**
 * Build bar option.
 *
 * Data formats:
 * - { categories: string[], values: number[] }
 */
export function buildBarOption(data, cfg = {}) {
  const {
    title = "",
    xName = "",
    yName = "",
    yUnit = "",
    rotate = 45,
    horizontal = false,
    dataZoom = true,
    toolbox = true,
    extra = {},
  } = cfg;

  const categories = (data && Array.isArray(data.categories)) ? data.categories.map(String) : [];
  const values = (data && Array.isArray(data.values)) ? data.values.map((v) => asNumber(v, 0)) : [];

  const opt = {
    title: normalizeTitle(title),
    grid: defaultGrid(),
    tooltip: defaultTooltip({ trigger: "axis", axisPointer: "shadow" }),
    toolbox: defaultToolbox({ enable: toolbox }),
    dataZoom: maybeDataZoom({ enable: Boolean(dataZoom), axis: horizontal ? "y" : "x" }),
    xAxis: horizontal
      ? { type: "value", ...defaultAxisCommon({ name: xName, unit: "" }) }
      : { type: "category", data: categories, axisLabel: { rotate, hideOverlap: true }, ...defaultAxisCommon({ name: xName, unit: "" }) },
    yAxis: horizontal
      ? { type: "category", data: categories, axisLabel: { rotate, hideOverlap: true }, ...defaultAxisCommon({ name: yName, unit: yUnit }) }
      : { type: "value", ...defaultAxisCommon({ name: yName, unit: yUnit }) },
    series: [
      {
        type: "bar",
        data: values,
        large: true,
      },
    ],
  };

  return merge(opt, extra);
}

/**
 * Build radar option.
 *
 * Data formats:
 * - { indicators: Array<{name:string,max?:number}>, series: Array<{name:string, values:number[]}> }
 */
export function buildRadarOption(data, cfg = {}) {
  const {
    title = "",
    toolbox = true,
    extra = {},
  } = cfg;

  const indicators = (data && Array.isArray(data.indicators)) ? data.indicators : [];
  const seriesIn = (data && Array.isArray(data.series)) ? data.series : [];

  const opt = {
    title: normalizeTitle(title),
    tooltip: defaultTooltip({ trigger: "item" }),
    toolbox: defaultToolbox({ enable: toolbox }),
    radar: {
      indicator: indicators,
      radius: "65%",
    },
    series: [
      {
        type: "radar",
        data: seriesIn.map((s) => ({ name: String(s.name || ""), value: s.values || [] })),
      },
    ],
  };

  return merge(opt, extra);
}

/**
 * Convenience: normalize derived histogram payloads into {edges, counts}.
 *
 * Supports:
 * - {edges, counts}
 * - {bin_edges, bin_counts}
 * - {bins:[{x0,x1,count}]}
 */
export function normalizeHistogramPayload(h) {
  if (!h || typeof h !== "object") return { edges: [], counts: [] };
  if (Array.isArray(h.edges) && Array.isArray(h.counts)) {
    return { edges: h.edges, counts: h.counts };
  }
  if (Array.isArray(h.bin_edges) && Array.isArray(h.bin_counts)) {
    return { edges: h.bin_edges, counts: h.bin_counts };
  }

  // Accept multiple legacy/derived histogram encodings.
  // Goal: normalize into { edges:number[], counts:number[] }.
  if (Array.isArray(h.bins)) {
    const bins = h.bins;
    const first = bins[0];

    // Treat as the "derived" bin object format ONLY when range keys exist.
    const looksLikeRangeBinObj = Boolean(
      first &&
      typeof first === "object" &&
      (Object.prototype.hasOwnProperty.call(first, "x0") || Object.prototype.hasOwnProperty.call(first, "x1"))
    );

    // Helper: parse a label like "-0.5--0.4" or "0.1-0.2" or "0.1–0.2".
    const parseRangeLabel = (label) => {
      const s = String(label ?? "").trim();
      const m = s.match(/(-?\d+(?:\.\d+)?)[\s]*[\-–][\s]*(-?\d+(?:\.\d+)?)/);
      if (!m) return null;
      const x0 = Number(m[1]);
      const x1 = Number(m[2]);
      if (!Number.isFinite(x0) || !Number.isFinite(x1)) return null;
      return [x0, x1];
    };

    // Case A: legacy label bins: { bins: string[]|number[], counts: number[] }
    if (!looksLikeRangeBinObj) {
      // If bins are objects but without x0/x1, prefer common label keys.
      const hasObj = Boolean(first && typeof first === "object");
      const labels = hasObj
        ? bins.map((b) => (b && typeof b === "object" ? (b.label ?? b.bin ?? b.name ?? b.x ?? "") : b))
        : bins;

      const countsIn = Array.isArray(h.counts)
        ? h.counts
        : (hasObj ? bins.map((b) => (b && typeof b === "object" ? (b.count ?? b.y ?? b.value ?? 0) : 0)) : []);

      if (Array.isArray(countsIn) && countsIn.length === labels.length) {
        const edges = [];
        const counts = [];
        for (let i = 0; i < labels.length; i++) {
          const rng = parseRangeLabel(labels[i]);
          if (!rng) continue;
          const [x0, x1] = rng;
          if (edges.length === 0) edges.push(x0);
          edges.push(x1);
          counts.push(Number.isFinite(Number(countsIn[i])) ? Number(countsIn[i]) : 0);
        }
        if (edges.length && counts.length) return { edges, counts };
      }

      return { edges: [], counts: [] };
    }

    // Case B: derived bin objects: { bins: Array<{x0,x1,count}> }
    const edges = [];
    const counts = [];
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i] || {};
      const x0 = Number(b.x0);
      const x1 = Number(b.x1);
      if (i === 0) edges.push(Number.isFinite(x0) ? x0 : 0);
      edges.push(Number.isFinite(x1) ? x1 : 0);
      const c = (b.count ?? b.y ?? b.value);
      counts.push(Number.isFinite(Number(c)) ? Number(c) : 0);
    }
    return { edges, counts };
  }

  return { edges: [], counts: [] };
}
