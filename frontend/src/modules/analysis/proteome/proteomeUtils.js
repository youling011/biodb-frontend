export function histogram(values, bins = 24) {
  const xs = (values || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (!xs.length) return { edges: [], counts: [] };
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min || 1;
  const step = span / bins;
  const counts = new Array(bins).fill(0);
  for (const x of xs) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((x - min) / step)));
    counts[idx] += 1;
  }
  const edges = new Array(bins).fill(0).map((_, i) => [min + i * step, min + (i + 1) * step]);
  return { edges, counts };
}

export function histOption(values, name, bins = 24) {
  const { edges, counts } = histogram(values, bins);
  const labels = edges.map((e) => `${e[0].toFixed(2)}-${e[1].toFixed(2)}`);
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "10%", right: "6%", top: 20, bottom: 60 },
    xAxis: { type: "category", data: labels, axisLabel: { rotate: 45, hideOverlap: true } },
    yAxis: { type: "value", name: "Count" },
    series: [{ type: "bar", data: counts, name, barWidth: "85%" }],
  };
}

export function mean(values) {
  const xs = (values || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(values) {
  const xs = (values || []).map((v) => Number(v)).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = xs.length;
  if (!n) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

export function pearson(x, y) {
  const xs = x.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const ys = y.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const n = Math.min(xs.length, ys.length);
  if (!n) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy) || 1;
  return num / den;
}

export function spearman(x, y) {
  const rank = (arr) => {
    const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const ranks = new Array(arr.length);
    for (let i = 0; i < sorted.length; i++) ranks[sorted[i][1]] = i + 1;
    return ranks;
  };
  return pearson(rank(x), rank(y));
}
