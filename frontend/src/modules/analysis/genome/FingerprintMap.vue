<template>
  <el-card>
    <template #header>
      <div class="hdr">
        <div class="ttl">
          <span>Fingerprint Map</span>
          <el-tag effect="plain" type="info">showcase</el-tag>
        </div>
        <div class="actions">
          <el-button size="small" @click="regenerate">Re-generate</el-button>
          <el-button size="small" @click="exportFeatures">Export Features CSV</el-button>
          <el-button size="small" @click="exportChart(mapRef, exportName)">Export PNG</el-button>
        </div>
      </div>
    </template>

    <div class="toolbar">
      <el-select v-model="mode" style="width: 240px">
        <el-option label="Codon proportions (64D)" value="codon" />
        <el-option label="AA proportions (20D)" value="aa" />
        <el-option label="Dinucleotide proportions (16D)" value="dinuc" />
      </el-select>

      <el-select v-model="view" style="width: 250px">
        <el-option label="Fingerprint Heatmap (category means)" value="heatmap" />
        <el-option label="Embedding Scatter (PCA on sampled genes)" value="scatter" />
      </el-select>

      <el-slider v-model="topK" :min="8" :max="48" :step="2" show-input style="width: 340px" />
      <span class="hint">Top variable features: {{ topK }}</span>

      <template v-if="view === 'scatter'">
        <el-slider v-model="sampleN" :min="200" :max="2000" :step="100" show-input style="width: 370px" />
        <span class="hint">Sampling genes: {{ sampleN }}</span>
      </template>
    </div>

    <div class="note" v-if="view === 'heatmap'">
      Heatmap summarizes Function_Category means. Features are chosen by variance across categories.
    </div>
    <div class="note" v-else>
      Scatter uses PCA on sampled genes over the same Top-K features. Explained variance: {{ explainedText }}.
    </div>

    <EChart ref="mapRef" :option="option" height="620px" />

    <el-divider content-position="left">Top Variable Features</el-divider>

    <el-table :data="featureTableRows" stripe height="360">
      <el-table-column
        v-for="c in featureTableColumns"
        :key="c.key"
        :prop="c.key"
        :label="c.label"
        :width="c.width"
        :sortable="c.sortable"
        :fixed="c.fixed"
      />
    </el-table>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { buildHeatmapOption, buildScatterOption } from "../shared/echartsKit";
import { groupBy, isFiniteNumber, mean } from "../shared/stats";
import { pca } from "../shared/pca";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../../../api/showcaseAdapter";
import { safeNum } from "./genomeUtils";

const props = defineProps({
  seed: { type: [String, Number], default: "GENOME_FINGERPRINT" },
  seedBump: { type: Number, default: 0 },

  // Backward compatible
  rows: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
});

const localRows = ref([]);

function resolveSeed() {
  const base = typeof props.seed === "number" ? (props.seed >>> 0) : hashStringToUint32(String(props.seed));
  return (base + (props.seedBump >>> 0)) >>> 0;
}

function regenerate() {
  if (props.rows && props.rows.length) {
    localRows.value = props.rows;
    return;
  }
  localRows.value = makeGenomeRows({
    seed: resolveSeed(),
    n: 2000,
    categories: props.categories && props.categories.length ? props.categories : undefined,
  });
}

defineExpose({ regenerate });

onMounted(regenerate);
watch(() => [props.seed, props.seedBump, props.rows], regenerate);

const mode = ref("codon");
const view = ref("heatmap");
const sampleN = ref(800);
const topK = ref(24);

const mapRef = ref(null);

function listFeatureKeys(row0, modeVal) {
  if (!row0) return [];
  const keys = Object.keys(row0);
  if (modeVal === "codon") return keys.filter((k) => k.startsWith("Codon_") && k.endsWith("_Proportion")).sort();
  if (modeVal === "aa") return keys.filter((k) => k.startsWith("AA_") && k.endsWith("_Proportion")).sort();
  return keys.filter((k) => k.startsWith("Dinuc_") && k.endsWith("_Proportion")).sort();
}

function shortName(k) {
  return String(k)
    .replace(/^Codon_/, "")
    .replace(/^AA_/, "")
    .replace(/^Dinuc_/, "")
    .replace(/_Proportion$/, "");
}

const featureKeys = computed(() => listFeatureKeys((localRows.value || [])[0], mode.value));

function downsample(rows, n) {
  const rs = rows || [];
  if (rs.length <= n) return rs;
  const step = Math.ceil(rs.length / n);
  return rs.filter((_, i) => i % step === 0);
}

const cats = computed(() => {
  if (props.categories?.length) return props.categories.map(String);
  const s = new Set((localRows.value || []).map((r) => String(r.Function_Category || "other")));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
});

function computeCategoryMeans(keys) {
  if (!keys.length) return { categories: [], means: [] };
  const byCat = groupBy(localRows.value || [], (r) => String(r.Function_Category || "other"));
  const categories = cats.value;

  const meansMat = categories.map((c) => {
    const rs = byCat.get(c) || [];
    const sum = new Array(keys.length).fill(0);
    const cnt = new Array(keys.length).fill(0);

    for (const r of rs) {
      for (let j = 0; j < keys.length; j++) {
        const v = safeNum(r?.[keys[j]], NaN);
        if (Number.isFinite(v)) {
          sum[j] += v;
          cnt[j] += 1;
        }
      }
    }

    return sum.map((s, j) => (cnt[j] ? s / cnt[j] : 0));
  });

  return { categories, means: meansMat };
}

function featureVarianceAcrossCats(catMeans) {
  const meansMat = catMeans.means || [];
  if (!meansMat.length) return [];
  const m = meansMat.length;
  const n = meansMat[0].length;

  const out = new Array(n).fill(0).map((_, j) => {
    const col = [];
    for (let i = 0; i < m; i++) col.push(meansMat[i][j] || 0);
    const mu = mean(col) || 0;
    let acc = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (const x of col) {
      acc += (x - mu) * (x - mu);
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    const v = acc / Math.max(1, col.length - 1);
    return { j, variance: v, range: hi - lo };
  });

  out.sort((a, b) => b.variance - a.variance);
  return out;
}

const topFeatures = computed(() => {
  const keys = featureKeys.value;
  const catMeans = computeCategoryMeans(keys);
  const stats = featureVarianceAcrossCats(catMeans);
  return { keys, catMeans, stats };
});

const heatmapOption = computed(() => {
  const keys = topFeatures.value.keys;
  const catMeans = topFeatures.value.catMeans;
  const stats = topFeatures.value.stats;

  if (!keys.length || !catMeans.categories.length) {
    return buildHeatmapOption({ xLabels: [], yLabels: [], values: [] }, { xName: "Feature", yName: "Category" });
  }

  const chosen = stats.slice(0, topK.value).map((s) => s.j);
  const xLabels = chosen.map((j) => shortName(keys[j]));
  const yLabels = catMeans.categories;

  const values = [];
  for (let yi = 0; yi < yLabels.length; yi++) {
    for (let xi = 0; xi < chosen.length; xi++) {
      const v = catMeans.means[yi][chosen[xi]] || 0;
      values.push([xi, yi, Number(round(v, 6))]);
    }
  }

  return buildHeatmapOption(
    { xLabels, yLabels, values },
    {
      xName: `${mode.value.toUpperCase()} features`,
      yName: "Function_Category",
      valueName: "Mean proportion",
      xRotate: 45,
      dataZoom: true,
      tooltipFormatter: (p) => {
        const d = p?.data || [];
        return `Category: ${yLabels[d[1]]}<br/>Feature: ${xLabels[d[0]]}<br/>Mean: ${d[2]}`;
      },
    }
  );
});

const scatterPca = computed(() => {
  const keys = topFeatures.value.keys;
  const stats = topFeatures.value.stats;

  if (!keys.length) return { series: [], explained: [] };

  const chosen = stats.slice(0, topK.value).map((s) => s.j);
  const rs = downsample(localRows.value || [], sampleN.value);

  const X = rs.map((r) => chosen.map((j) => safeNum(r?.[keys[j]], 0)));
  const { scores, explainedVarianceRatio } = pca(X, { k: 2, seed: 42 });

  const pts = rs.map((r, i) => {
    const x = scores?.[i]?.[0] ?? 0;
    const y = scores?.[i]?.[1] ?? 0;
    return {
      x,
      y,
      name: String(r.Gene_Name || ""),
      cat: String(r.Function_Category || "other"),
      len: safeNum(r.Length_bp, 0),
    };
  });

  const byCat = groupBy(pts, (p) => p.cat);
  const categories = cats.value;

  const series = categories.map((c) => {
    const ps = byCat.get(c) || [];
    return {
      name: c,
      type: "scatter",
      data: ps.map((p) => [p.x, p.y, p.name, p.len]),
      symbolSize: (d) => Math.max(4, Math.min(12, Math.sqrt(d[3] || 0) / 6)),
    };
  });

  return { series, explained: explainedVarianceRatio || [] };
});

const explainedText = computed(() => {
  const ex = scatterPca.value.explained || [];
  if (!ex.length) return "N/A";
  const a = Number((ex[0] * 100).toFixed(1));
  const b = Number((ex[1] * 100).toFixed(1));
  return `PC1 ${a}%, PC2 ${b}%`;
});

const scatterOption = computed(() => {
  const base = buildScatterOption(
    { points: [] },
    {
      xName: "PC1",
      yName: "PC2",
      dataZoom: true,
      tooltipFormatter: (p) => {
        const d = p?.data || [];
        return `Gene: ${d[2] || ""}<br/>Length: ${d[3] || ""} bp<br/>PC1: ${Number(d[0]).toFixed(3)}<br/>PC2: ${Number(d[1]).toFixed(3)}`;
      },
    }
  );

  base.legend = { type: "scroll", top: 10 };
  base.series = scatterPca.value.series || [];
  base.grid = { left: "8%", right: "6%", top: 55, bottom: 55 };
  base.xAxis = { ...base.xAxis, scale: true };
  base.yAxis = { ...base.yAxis, scale: true };
  return base;
});

const option = computed(() => (view.value === "heatmap" ? heatmapOption.value : scatterOption.value));

const exportName = computed(() => {
  const v = view.value === "heatmap" ? "fingerprint_heatmap" : "fingerprint_scatter";
  return `${v}_${mode.value}.png`;
});

const featureTableRows = computed(() => {
  const keys = topFeatures.value.keys;
  const stats = topFeatures.value.stats;
  return stats.slice(0, Math.max(12, topK.value)).map((s, idx) => ({
    Rank: idx + 1,
    Feature: shortName(keys[s.j]),
    Variance: round(s.variance, 10),
    Range: round(s.range, 8),
    Mode: mode.value,
  }));
});

const featureTableColumns = computed(() => {
  return buildTableColumns(["Rank", "Feature", "Variance", "Range", "Mode"], {
    labelMap: {
      Rank: "#",
      Feature: "Feature",
      Variance: "Variance (across cats)",
      Range: "Max - Min",
      Mode: "Mode",
    },
    widthMap: { Rank: 70, Feature: 160, Variance: 170, Range: 140, Mode: 110 },
  });
});

function exportFeatures() {
  const cols = featureTableColumns.value || [];
  exportObjectsToCsv(`genome_fingerprint_features_${mode.value}.csv`, featureTableRows.value, cols);
}

function exportChart(chartRef, filename) {
  const inst = chartRef?.value?.getInstance?.() || chartRef?.value?.chart;
  if (!inst) return;
  const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
</script>

<style scoped>
.hdr { display:flex; justify-content: space-between; align-items:center; gap: 10px; flex-wrap: wrap; font-weight: 800; }
.ttl { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
.actions { display:flex; gap: 8px; flex-wrap: wrap; }
.toolbar { display:flex; gap: 12px; align-items:center; flex-wrap: wrap; margin: 6px 0 10px; }
.hint { color:#909399; font-size: 12px; }
.note { color:#909399; font-size: 12px; margin: 6px 0 10px; }
</style>
