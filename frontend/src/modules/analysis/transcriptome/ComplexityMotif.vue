<template>
  <div class="complexity-motif">
    <el-row :gutter="12">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-hdr">
              <div>
                <div class="title">Motif vs GC / Skew</div>
                <div class="sub">Showcase: selects top motif genes from synthetic transcriptome rows, then visualizes correlation and binned mean.</div>
              </div>
              <div class="ctrl">
                <el-select v-model="xField" size="small" style="width: 160px">
                  <el-option label="GC content (%)" value="GC_content" />
                  <el-option label="GC skew" value="GC_skew" />
                  <el-option label="AT skew" value="AT_skew" />
                </el-select>
                <el-select v-model="motifField" size="small" style="width: 160px">
                  <el-option label="H/ACA box freq" value="H_ACA_box_freq" />
                  <el-option label="C/D box freq" value="C_D_box_freq" />
                </el-select>
              </div>
            </div>
          </template>

          <div class="chart">
            <EChart :option="motifVsXOption" style="height: 360px" />
          </div>

          <div class="metrics">
            <el-tag size="small" type="info">n={{ motifScatterN }}</el-tag>
            <el-tag size="small" type="info">Pearson r={{ motifScatterR ?? 'NA' }}</el-tag>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-hdr">
              <div>
                <div class="title">Complexity vs Motif</div>
                <div class="sub">Relates sequence complexity (Entropy/LZ) to motif frequency (Top Motifs subset).</div>
              </div>
              <div class="ctrl">
                <el-select v-model="complexityField" size="small" style="width: 160px">
                  <el-option label="Entropy" value="Sequence_Entropy" />
                  <el-option label="LZ complexity" value="LZ_complexity" />
                </el-select>
              </div>
            </div>
          </template>

          <div class="chart">
            <EChart :option="complexityVsMotifOption" style="height: 360px" />
          </div>

          <div class="metrics">
            <el-tag size="small" type="info">n={{ complexityScatterN }}</el-tag>
            <el-tag size="small" type="info">Pearson r={{ complexityScatterR ?? 'NA' }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-hdr">
              <div>
                <div class="title">Motif distribution</div>
                <div class="sub">Histogram computed on the full synthetic dataset.</div>
              </div>
              <div class="ctrl">
                <el-select v-model="histMotif" size="small" style="width: 160px">
                  <el-option label="H/ACA box" value="haca" />
                  <el-option label="C/D box" value="cd" />
                </el-select>
              </div>
            </div>
          </template>
          <div class="chart">
            <EChart :option="motifHistOption" style="height: 320px" />
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-hdr">
              <div>
                <div class="title">Base spacing</div>
                <div class="sub">A/T/C/G average spacing boxplots (derived from synthetic rows).</div>
              </div>
            </div>
          </template>
          <div class="chart">
            <EChart :option="spacingBoxOption" style="height: 320px" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 12px">
      <template #header>
        <div class="card-hdr">
          <div>
            <div class="title">Top motif genes</div>
            <div class="sub">Synthetic extremes by motif frequency; useful for follow-up inspection.</div>
          </div>
          <div class="ctrl">
            <el-button size="small" @click="exportTopMotifs">Export CSV</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="topMotifRows"
        height="360"
        size="small"
        :empty-text="'No data'"
      >
        <el-table-column prop="Gene_Name" label="Gene" min-width="160" />
        <el-table-column prop="GC_content" label="GC%" width="90" />
        <el-table-column prop="GC_skew" label="GC_skew" width="100" />
        <el-table-column prop="AT_skew" label="AT_skew" width="100" />
        <el-table-column prop="Sequence_Entropy" label="Entropy" width="100" />
        <el-table-column prop="LZ_complexity" label="LZ" width="100" />
        <el-table-column prop="H_ACA_box_freq" label="H/ACA" width="100" />
        <el-table-column prop="C_D_box_freq" label="C/D" width="100" />
        <el-table-column prop="Sequence_Length" label="Len" width="90" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";

import { makeTranscriptomeRows } from "../../../api/showcaseAdapter";
import { buildScatterOption, buildHistOption, buildBoxplotOption } from "../shared/echartsKit";
import { mean, pearson, cleanNumbers, boxplotStats } from "../shared/stats";
import { safeNum, round } from "./transcriptomeUtils";

const props = defineProps({
  seed: { type: String, default: "TX:demo" },
  seedBump: { type: Number, default: 0 },
});

// Self-generated dataset for this tab.
const rows = computed(() =>
  makeTranscriptomeRows({ seed: `${props.seed}:${props.seedBump}:complexity`, n: 2600 })
);

const xField = ref("GC_content");
const motifField = ref("H_ACA_box_freq");
const complexityField = ref("Sequence_Entropy");
const histMotif = ref("haca");

function num(v, dflt = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

function axisRangeForX(field) {
  if (field === "GC_content") return { min: 0, max: 100, unit: "%" };
  if (field === "GC_skew" || field === "AT_skew") return { min: -0.5, max: 0.5, unit: "" };
  return { min: null, max: null, unit: "" };
}

function binnedMeanLine(points, { min, max, bins = 12 } = {}) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const lo = Number.isFinite(min) ? min : Math.min(...points.map((p) => p.x));
  const hi = Number.isFinite(max) ? max : Math.max(...points.map((p) => p.x));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [];

  const step = (hi - lo) / bins;
  const buckets = new Array(bins).fill(0).map(() => []);
  for (const p of points) {
    const x = p.x;
    const y = p.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < lo || x > hi) continue;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / step)));
    buckets[idx].push(y);
  }

  const out = [];
  for (let i = 0; i < bins; i++) {
    const ys = cleanNumbers(buckets[i]);
    if (!ys.length) continue;
    const xCenter = lo + (i + 0.5) * step;
    const m = mean(ys);
    if (Number.isFinite(xCenter) && Number.isFinite(m)) out.push([xCenter, m]);
  }
  return out;
}

const topMotifRows = computed(() => {
  const rs = rows.value || [];
  const key = motifField.value;
  const sorted = [...rs].sort((a, b) => safeNum(b?.[key], 0) - safeNum(a?.[key], 0));
  // Take a stable top subset for charts/table.
  return sorted.slice(0, 260).map((r) => ({
    Gene_Name: String(r?.Gene_Name ?? ""),
    GC_content: safeNum(r?.GC_content, null),
    GC_skew: safeNum(r?.GC_skew, null),
    AT_skew: safeNum(r?.AT_skew, null),
    Sequence_Entropy: safeNum(r?.Sequence_Entropy, null),
    LZ_complexity: safeNum(r?.LZ_complexity, null),
    H_ACA_box_freq: safeNum(r?.H_ACA_box_freq, null),
    C_D_box_freq: safeNum(r?.C_D_box_freq, null),
    Sequence_Length: safeNum(r?.Sequence_Length, null),
  }));
});

const motifScatterPoints = computed(() => {
  const pts = [];
  for (const r of topMotifRows.value) {
    const x = num(r[xField.value], null);
    const y = num(r[motifField.value], null);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    pts.push({
      x,
      y,
      name: r.Gene_Name,
      extra: {
        Gene_Name: r.Gene_Name,
        GC_content: r.GC_content,
        GC_skew: r.GC_skew,
        AT_skew: r.AT_skew,
        Sequence_Entropy: r.Sequence_Entropy,
        LZ_complexity: r.LZ_complexity,
        Sequence_Length: r.Sequence_Length,
      },
    });
  }
  return pts;
});

const motifScatterN = computed(() => motifScatterPoints.value.length);
const motifScatterR = computed(() => {
  const xs = motifScatterPoints.value.map((p) => p.x);
  const ys = motifScatterPoints.value.map((p) => p.y);
  const r = pearson(xs, ys);
  return r === null ? null : Number(r.toFixed(3));
});

const motifVsXOption = computed(() => {
  const range = axisRangeForX(xField.value);
  const xLabel = xField.value === "GC_content" ? "GC content" : xField.value;
  const yLabel = motifField.value === "H_ACA_box_freq" ? "H/ACA box freq" : "C/D box freq";

  const lineData = binnedMeanLine(motifScatterPoints.value, {
    min: range.min,
    max: range.max,
    bins: 12,
  });

  const base = buildScatterOption(
    { points: motifScatterPoints.value },
    {
      title: `${yLabel} vs ${xLabel}`,
      xName: xLabel,
      xUnit: range.unit,
      yName: yLabel,
      xMin: range.min,
      xMax: range.max,
      yMin: null,
      yMax: null,
      symbolSize: 7,
      dataZoom: true,
      tooltipFormatter: (params) => {
        const d = params?.data;
        const ex = d?.extra || {};
        const v = d?.value || [];
        const nm = d?.name ? `${d.name}<br/>` : "";
        return (
          `${nm}` +
          `${xLabel}: ${round(v[0], 4)}${range.unit}<br/>` +
          `${yLabel}: ${round(v[1], 6)}<br/>` +
          `Len: ${ex.Sequence_Length ?? ""}<br/>` +
          `Entropy: ${ex.Sequence_Entropy ?? ""}<br/>` +
          `LZ: ${ex.LZ_complexity ?? ""}`
        );
      },
    }
  );

  base.legend = { show: true, top: 28, left: "left" };
  base.series = [
    { ...base.series[0], name: "genes" },
    {
      name: "binned mean",
      type: "line",
      data: lineData,
      showSymbol: true,
      symbolSize: 5,
      smooth: true,
    },
  ];

  return base;
});

const complexityScatterPoints = computed(() => {
  const pts = [];
  for (const r of topMotifRows.value) {
    const x = num(r[complexityField.value], null);
    const y = num(r[motifField.value], null);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    pts.push({
      x,
      y,
      name: r.Gene_Name,
      extra: {
        Gene_Name: r.Gene_Name,
        GC_content: r.GC_content,
        Sequence_Length: r.Sequence_Length,
      },
    });
  }
  return pts;
});

const complexityScatterN = computed(() => complexityScatterPoints.value.length);
const complexityScatterR = computed(() => {
  const xs = complexityScatterPoints.value.map((p) => p.x);
  const ys = complexityScatterPoints.value.map((p) => p.y);
  const r = pearson(xs, ys);
  return r === null ? null : Number(r.toFixed(3));
});

const complexityVsMotifOption = computed(() => {
  const xLabel = complexityField.value === "Sequence_Entropy" ? "Entropy" : "LZ complexity";
  const yLabel = motifField.value === "H_ACA_box_freq" ? "H/ACA box freq" : "C/D box freq";

  const xs = complexityScatterPoints.value.map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : null;
  const xMax = xs.length ? Math.max(...xs) : null;
  const pad = (xMin !== null && xMax !== null) ? (xMax - xMin) * 0.05 : 0;

  return buildScatterOption(
    { points: complexityScatterPoints.value },
    {
      title: `${yLabel} vs ${xLabel}`,
      xName: xLabel,
      yName: yLabel,
      xMin: xMin !== null ? xMin - pad : null,
      xMax: xMax !== null ? xMax + pad : null,
      symbolSize: 7,
      dataZoom: true,
      tooltipFormatter: (params) => {
        const d = params?.data;
        const ex = d?.extra || {};
        const v = d?.value || [];
        const nm = d?.name ? `${d.name}<br/>` : "";
        return (
          `${nm}` +
          `${xLabel}: ${round(v[0], 6)}<br/>` +
          `${yLabel}: ${round(v[1], 6)}<br/>` +
          `GC%: ${ex.GC_content ?? ""}<br/>` +
          `Len: ${ex.Sequence_Length ?? ""}`
        );
      },
    }
  );
});

function fixedRangeHist(values, { min, max, bins }) {
  const v = (values || []).map((x) => safeNum(x, NaN)).filter(Number.isFinite);
  if (!v.length || !(max > min) || bins < 2) return { edges: [], counts: [] };
  const step = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (const x of v) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((x - min) / step)));
    counts[idx] += 1;
  }
  const edges = [];
  for (let i = 0; i <= bins; i++) edges.push(round(min + i * step, 10));
  return { edges, counts };
}

const motifHistOption = computed(() => {
  const rs = rows.value || [];
  const key = histMotif.value === "haca" ? "H_ACA_box_freq" : "C_D_box_freq";
  const vals = rs.map((r) => safeNum(r?.[key], 0));
  const h = fixedRangeHist(vals, { min: 0, max: 0.01, bins: 28 });
  const title = histMotif.value === "haca" ? "H/ACA motif frequency" : "C/D motif frequency";
  return buildHistOption(h, {
    title,
    xName: "Motif frequency",
    yName: "Count",
    dataZoom: true,
  });
});

const spacingBoxOption = computed(() => {
  const rs = rows.value || [];
  const bases = ["A", "T", "C", "G"];
  const keys = ["A_avg_spacing", "T_avg_spacing", "C_avg_spacing", "G_avg_spacing"];

  const boxData = [];
  const outliers = [];
  for (let i = 0; i < keys.length; i++) {
    const arr = rs.map((r) => safeNum(r?.[keys[i]], NaN)).filter(Number.isFinite);
    const st = boxplotStats(arr);
    const item = [
      round(st.min ?? 0, 6),
      round(st.q1 ?? 0, 6),
      round(st.median ?? 0, 6),
      round(st.q3 ?? 0, 6),
      round(st.max ?? 0, 6),
    ];
    boxData.push(item);
    // cap outliers for readability
    const outs = (st.outliers || []).slice(0, 24);
    for (const v of outs) outliers.push([i, round(v, 6)]);
  }

  return buildBoxplotOption(
    {
      categories: bases,
      boxData,
      outliers,
    },
    {
      title: "Base spacing",
      xName: "Base",
      yName: "Avg spacing",
      dataZoom: false,
    }
  );
});

function exportTopMotifs() {
  const rowsOut = topMotifRows.value;
  if (!rowsOut.length) return;
  exportObjectsToCsv(`tx_top_motif_genes_${Date.now()}.csv`, rowsOut);
}
</script>

<style scoped>
.complexity-motif .card-hdr {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.complexity-motif .title {
  font-weight: 600;
}
.complexity-motif .sub {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.complexity-motif .ctrl {
  display: flex;
  gap: 8px;
  align-items: center;
}
.complexity-motif .metrics {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
