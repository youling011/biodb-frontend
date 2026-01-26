import { clrTransform, median, pearson, robustCorr, spearmanCorr } from "../modules/analysis/shared/stats";

function prepareSeries(values, impute) {
  const arr = values.map((v) => Number(v));
  if (impute === "drop") return arr.filter((v) => Number.isFinite(v));
  if (impute === "zero") return arr.map((v) => (Number.isFinite(v) ? v : 0));
  if (impute === "pseudocount") return arr.map((v) => (Number.isFinite(v) ? v : 1));
  if (impute === "median") {
    const med = median(arr.filter((v) => Number.isFinite(v))) || 0;
    return arr.map((v) => (Number.isFinite(v) ? v : med));
  }
  return arr;
}

self.onmessage = (event) => {
  const { id, payload } = event.data || {};
  if (!id) return;
  try {
    const { rows, keys, method, transform, impute } = payload;
    const calc = method === "spearman" ? spearmanCorr : method === "robust" ? robustCorr : pearson;
    const data = [];
    const n = keys.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let xs = prepareSeries(rows.map((r) => r[keys[i]]), impute);
        let ys = prepareSeries(rows.map((r) => r[keys[j]]), impute);
        if (transform === "log1p") {
          xs = xs.map((v) => Math.log1p(Math.max(0, v)));
          ys = ys.map((v) => Math.log1p(Math.max(0, v)));
        }
        if (transform === "clr") {
          xs = clrTransform(xs, 1);
          ys = clrTransform(ys, 1);
        }
        const v = calc(xs, ys);
        data.push([j, i, Number(v?.toFixed(3) || 0)]);
      }
      if (i % 4 === 0) {
        self.postMessage({ id, type: "progress", progress: Math.min(0.9, i / n) });
      }
    }
    self.postMessage({ id, type: "result", result: data });
  } catch (e) {
    self.postMessage({ id, type: "error", error: e?.message || String(e) });
  }
};
