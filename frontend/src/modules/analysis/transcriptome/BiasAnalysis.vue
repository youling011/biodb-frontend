<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>Mean Dinucleotide Frequency (4×4)</span></div></template>
          <EChart :option="meanFreqOption" height="380px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>Mean Dinucleotide Bias (4×4)</span></div></template>
          <EChart :option="meanBiasOption" height="380px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>GC_skew vs GC%</span></div></template>
          <EChart :option="skewScatter" height="360px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>AT_skew Distribution</span></div></template>
          <EChart :option="atSkewHist" height="360px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed } from "vue";
import EChart from "../../../components/EChart.vue";

import { buildHeatmapOption, buildScatterOption, buildHistOption } from "../shared/echartsKit";
import { mean } from "../shared/stats";
import { makeTranscriptomeRows, ShowcaseTxConsts } from "../shared/showcaseKit";
import { safeNum, round } from "./transcriptomeUtils";

const props = defineProps({
  seed: { type: String, default: "TX:demo" },
  seedBump: { type: Number, default: 0 },
});

// Self-generated dataset for this tab.
const rows = computed(() =>
  makeTranscriptomeRows({ seed: `${props.seed}:${props.seedBump}:bias`, n: 2600 })
);

const BASES = ["A", "T", "C", "G"];
const DINUCS = ShowcaseTxConsts?.TX_DINUCS_ORDER || [
  "AA", "AT", "AC", "AG",
  "TA", "TT", "TC", "TG",
  "CA", "CT", "CC", "CG",
  "GA", "GT", "GC", "GG",
];

function meanDinucMap(type) {
  const acc = {};
  for (const di of DINUCS) acc[di] = 0;
  const rs = rows.value || [];
  const n = rs.length || 1;
  for (const r of rs) {
    for (const di of DINUCS) {
      const v = safeNum(r?.[`${di}_${type}`], 0);
      acc[di] += v;
    }
  }
  for (const di of DINUCS) acc[di] = acc[di] / n;
  return acc;
}

function toHeatmapValues(m) {
  const values = [];
  for (let y = 0; y < BASES.length; y++) {
    for (let x = 0; x < BASES.length; x++) {
      const di = `${BASES[y]}${BASES[x]}`;
      values.push([x, y, round(safeNum(m?.[di], 0), 6)]);
    }
  }
  return values;
}

const meanFreqOption = computed(() => {
  const m = meanDinucMap("freq");
  return buildHeatmapOption(
    { xLabels: BASES, yLabels: BASES, values: toHeatmapValues(m) },
    {
      title: "Mean Dinucleotide Frequency",
      xName: "2nd base",
      yName: "1st base",
      valueName: "freq",
      xRotate: 0,
      visualMin: 0,
      visualMax: 0.2,
      dataZoom: false,
    }
  );
});

const meanBiasOption = computed(() => {
  const m = meanDinucMap("bias");
  return buildHeatmapOption(
    { xLabels: BASES, yLabels: BASES, values: toHeatmapValues(m) },
    {
      title: "Mean Dinucleotide Bias",
      xName: "2nd base",
      yName: "1st base",
      valueName: "bias",
      xRotate: 0,
      visualMin: 0.2,
      visualMax: 5.0,
      dataZoom: false,
    }
  );
});

const skewScatter = computed(() => {
  const rs = rows.value || [];
  // Subsample for performance and visual clarity.
  const step = Math.max(1, Math.ceil(rs.length / 1200));
  const pts = rs
    .filter((_, i) => i % step === 0)
    .map((r) => ({
      x: safeNum(r?.GC_content, 0),
      y: safeNum(r?.GC_skew, 0),
      name: String(r?.Gene_Name ?? ""),
      extra: {
        len: safeNum(r?.Sequence_Length, 0),
        at: safeNum(r?.AT_skew, 0),
      },
    }));

  return buildScatterOption(
    { points: pts },
    {
      title: "GC_skew vs GC%",
      xName: "GC%",
      xUnit: "%",
      yName: "GC_skew",
      xMin: 0,
      xMax: 100,
      yMin: -0.5,
      yMax: 0.5,
      symbolSize: 6,
      dataZoom: true,
      tooltipFormatter: (p) => {
        const d = p?.data || {};
        const v = d?.value || [];
        const ex = d?.extra || {};
        const nm = d?.name ? `${d.name}<br/>` : "";
        return `${nm}GC%: ${round(v[0], 4)}<br/>GC_skew: ${round(v[1], 4)}<br/>Len: ${ex.len}<br/>AT_skew: ${round(ex.at, 4)}`;
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
  for (let i = 0; i <= bins; i++) edges.push(round(min + i * step, 6));
  return { edges, counts };
}

const atSkewHist = computed(() => {
  const rs = rows.value || [];
  const vals = rs.map((r) => safeNum(r?.AT_skew, 0));
  const h = fixedRangeHist(vals, { min: -0.45, max: 0.45, bins: 28 });

  return buildHistOption(h, {
    title: "AT_skew distribution",
    xName: "AT_skew",
    yName: "Count",
    dataZoom: true,
    extra: {
      // A small visual enhancement: show mean line.
      graphic: (() => {
        const m = mean(vals.filter(Number.isFinite));
        if (!Number.isFinite(m)) return [];
        return [
          {
            type: "text",
            left: 14,
            top: 10,
            style: {
              text: `Mean: ${round(m, 4)}`,
              fill: "#606266",
              font: "12px sans-serif",
            },
          },
        ];
      })(),
    },
  });
});
</script>

<style scoped>
.hdr {
  font-weight: 800;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
