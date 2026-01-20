<template>
  <el-card>
    <div class="toolbar">
      <el-radio-group v-model="view" size="small">
        <el-radio-button label="pca">PCA map</el-radio-button>
        <el-radio-button label="fingerprint">GC-bucket fingerprint</el-radio-button>
      </el-radio-group>

      <el-select v-model="mode" style="width: 240px">
        <el-option label="Codon freq (64D)" value="codon" />
        <el-option label="Dinucleotide freq (16D)" value="dinuc" />
        <el-option label="Dinucleotide bias (16D)" value="dinuc_bias" />
      </el-select>

      <el-slider
        v-model="sampleN"
        :min="300"
        :max="3000"
        :step="100"
        show-input
        style="width: 420px"
      />
      <span class="hint">Sampling for performance</span>

      <template v-if="view === 'fingerprint'">
        <el-slider
          v-model="topK"
          :min="12"
          :max="mode === 'codon' ? 64 : 16"
          :step="2"
          show-input
          style="width: 360px"
        />
        <span class="hint">Top-K variable features</span>

        <el-select v-model="gcBinWidth" style="width: 160px">
          <el-option label="GC bins: 5%" :value="5" />
          <el-option label="GC bins: 10%" :value="10" />
          <el-option label="GC bins: 20%" :value="20" />
        </el-select>
      </template>

      <el-button icon="Refresh" @click="bumpSeed" style="margin-left:auto">Recompute</el-button>
    </div>

    <div class="note">
      Batch-4 alignment: feature ordering is fixed (dinuc: A/T/C/G order; codon: T/C/A/G triple-loop).
      For strict cross-species consistency, you can pass a fixed feature list via contract/derived in later backend upgrades.
    </div>

    <EChart v-if="view === 'pca'" :option="pcaOption" height="620px" />
    <EChart v-else :option="fingerprintOption" height="620px" />
  </el-card>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { safeNum, round } from "./transcriptomeUtils";
import { pca } from "../shared/pca";
import { buildScatterOption, buildHeatmapOption } from "../shared/echartsKit";
import { variance, mean, toNumber } from "../shared/stats";
import { makeTranscriptomeRows } from "../shared/showcaseKit";

const props = defineProps({
  seed: { type: String, default: "TX:demo" },
  seedBump: { type: Number, default: 0 },

  // Optional, for future strict cross-species consistency.
  // Example:
  // {
  //   dinucFreqKeys: [...],
  //   dinucBiasKeys: [...],
  //   codonFreqKeys: [...]
  // }
  featureSets: { type: Object, default: null },
});

// Self-generated dataset for this tab.
const rows = computed(() =>
  makeTranscriptomeRows({ seed: `${props.seed}:${props.seedBump}:fingerprint`, n: 3200 })
);

const view = ref("pca");
const mode = ref("codon");
const sampleN = ref(1500);
const topK = ref(30);
const gcBinWidth = ref(10);

// A small deterministic bump to recompute PCA / fingerprint when user clicks.
const recomputeSeed = ref(0);
function bumpSeed() {
  recomputeSeed.value += 1;
}

const DINUCS_ORDER = [
  "AA", "AT", "AC", "AG",
  "TA", "TT", "TC", "TG",
  "CA", "CT", "CC", "CG",
  "GA", "GT", "GC", "GG",
];

// For transcriptome codon order, we use T/C/A/G loop (stable and template-friendly).
const CODON_BASES = ["T", "C", "A", "G"];
const CODONS_ORDER = (() => {
  const out = [];
  for (const b1 of CODON_BASES) for (const b2 of CODON_BASES) for (const b3 of CODON_BASES) out.push(`${b1}${b2}${b3}`);
  return out;
})();

const keySets = computed(() => {
  const fs = props.featureSets || null;
  const dinucFreqKeys = fs?.dinucFreqKeys || DINUCS_ORDER.map((d) => `${d}_freq`);
  const dinucBiasKeys = fs?.dinucBiasKeys || DINUCS_ORDER.map((d) => `${d}_bias`);
  const codonFreqKeys = fs?.codonFreqKeys || CODONS_ORDER.map((c) => `${c}_freq`);
  return { dinucFreqKeys, dinucBiasKeys, codonFreqKeys };
});

function featureKeysForMode(m) {
  const ks = keySets.value;
  if (m === "dinuc") return ks.dinucFreqKeys;
  if (m === "dinuc_bias") return ks.dinucBiasKeys;
  return ks.codonFreqKeys;
}

const sampledRows = computed(() => {
  const rs = rows.value || [];
  if (rs.length <= sampleN.value) return rs;
  const step = Math.ceil(rs.length / sampleN.value);
  return rs.filter((_, i) => i % step === 0);
});

watch(
  () => [props.seed, props.seedBump],
  () => {
    recomputeSeed.value = 0;
  }
);

function vectorizeRows(rows, keys) {
  return (rows || []).map((r) => keys.map((k) => safeNum(r?.[k], 0)));
}

function explainedText(ratio) {
  if (!Array.isArray(ratio) || ratio.length < 2) return "";
  const p1 = Math.max(0, ratio[0]) * 100;
  const p2 = Math.max(0, ratio[1]) * 100;
  return ` (EVR: ${p1.toFixed(1)}%, ${p2.toFixed(1)}%)`;
}

const pcaOption = computed(() => {
  // Dependency to allow recompute on demand.
  void recomputeSeed.value;

  const rs = sampledRows.value;
  if (!rs.length) return { series: [] };

  const keys = featureKeysForMode(mode.value);
  const X = vectorizeRows(rs, keys);

  // PCA on standardized features
  const res = pca(X, { k: 2, standardize: true, seed: 42 + recomputeSeed.value });
  const scores = res?.scores || [];

  const pts = rs.map((r, i) => {
    const s = scores[i] || [0, 0];
    return {
      x: s[0],
      y: s[1],
      name: r?.Gene_Name || "",
      extra: {
        gc: round(safeNum(r?.GC_content, 0), 4),
        len: Math.round(safeNum(r?.Sequence_Length, 0)),
      },
    };
  });

  return buildScatterOption(
    { points: pts },
    {
      title: `Transcriptome PCA (${mode.value})${explainedText(res?.explainedVarianceRatio)}`,
      xName: "PC1",
      yName: "PC2",
      symbolSize: 6,
      dataZoom: true,
      toolbox: true,
      tooltipFormatter: (p) => {
        const nm = p?.name || "";
        const v = p?.value || [];
        const ex = p?.data?.extra || {};
        return `${nm}<br/>PC1: ${round(v[0], 4)}<br/>PC2: ${round(v[1], 4)}<br/>GC%: ${ex.gc}<br/>Len: ${ex.len}`;
      },
    }
  );
});

function gcBucketLabel(gc, w) {
  const x = Math.max(0, Math.min(100, toNumber(gc, 0)));
  const width = Math.max(1, Number(w) || 10);
  const lo = Math.floor(x / width) * width;
  const hi = Math.min(100, lo + width);
  return `${lo}-${hi}`;
}

function topVarianceKeys(rows, keys, k) {
  const items = keys.map((key) => {
    const arr = (rows || []).map((r) => safeNum(r?.[key], 0));
    const v = variance(arr, { sample: true });
    return { key, v: v === null ? 0 : v };
  });
  items.sort((a, b) => b.v - a.v);
  return items.slice(0, Math.max(1, k)).map((x) => x.key);
}

const fingerprintOption = computed(() => {
  void recomputeSeed.value;

  const rs = sampledRows.value;
  if (!rs.length) return { series: [] };

  const allKeys = featureKeysForMode(mode.value);
  const k = Math.min(Math.max(1, topK.value), allKeys.length);
  const keys = topVarianceKeys(rs, allKeys, k);

  // Bucket by GC content
  const width = gcBinWidth.value;
  const buckets = new Map(); // label -> {sum: number[], count: number}
  for (const r of rs) {
    const label = gcBucketLabel(r?.GC_content, width);
    if (!buckets.has(label)) {
      buckets.set(label, { sum: new Array(keys.length).fill(0), count: 0 });
    }
    const item = buckets.get(label);
    item.count += 1;
    for (let i = 0; i < keys.length; i++) {
      item.sum[i] += safeNum(r?.[keys[i]], 0);
    }
  }

  // Sort bucket labels by numeric start
  const yLabels = Array.from(buckets.keys()).sort((a, b) => {
    const na = Number(String(a).split("-")[0]);
    const nb = Number(String(b).split("-")[0]);
    return na - nb;
  });

  const values = [];
  for (let y = 0; y < yLabels.length; y++) {
    const label = yLabels[y];
    const item = buckets.get(label);
    const cnt = Math.max(1, item?.count || 0);
    for (let x = 0; x < keys.length; x++) {
      const m = (item?.sum?.[x] || 0) / cnt;
      values.push([x, y, round(m, 6)]);
    }
  }

  // Friendly x labels
  const xLabels = keys.map((k) => k.replace(/_(freq|bias)$/, ""));

  return buildHeatmapOption(
    { xLabels, yLabels, values },
    {
      title: `GC-bucket fingerprint (${mode.value}, top ${k} variance)`,
      xName: "Feature",
      yName: "GC% bucket",
      valueName: "Mean",
      xRotate: 45,
      dataZoom: true,
      toolbox: true,
      tooltipFormatter: (p) => {
        const d = p?.data || [];
        const x = d[0];
        const y = d[1];
        const val = d[2];
        return `GC bucket: ${yLabels[y]}<br/>Feature: ${xLabels[x]}<br/>Mean: ${val}`;
      },
    }
  );
});
</script>

<style scoped>
.toolbar { display:flex; gap: 12px; align-items:center; flex-wrap: wrap; }
.hint { color:#909399; font-size: 12px; }
.note { color:#909399; font-size: 12px; margin: 8px 0 10px; }
</style>
