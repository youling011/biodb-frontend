<template>
  <div class="wrap">
    <el-card class="card">
      <template #header>
        <div class="hdr">
          <div class="ttl">
            <span>Regulatory Context</span>
            <el-tag effect="plain" type="info">showcase</el-tag>
          </div>
          <div class="actions">
            <el-button size="small" @click="regenerate">Re-generate</el-button>
            <el-button size="small" @click="exportOutliers">Export Outliers CSV</el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Promoter GC% vs Gene GC%</span>
                <el-button text @click="exportChart(pgcRef, 'genome_promoter_vs_gene_gc.png')">Export PNG</el-button>
              </div>
            </template>
            <EChart ref="pgcRef" :option="pgcOption" height="380px" />
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Intergenic GC% vs Intergenic Length</span>
                <el-button text @click="exportChart(igRef, 'genome_intergenic_gc_vs_length.png')">Export PNG</el-button>
              </div>
            </template>
            <EChart ref="igRef" :option="igOption" height="380px" />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 12px;">
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Promoter N / 100 Histogram</span>
                <el-button text @click="exportChart(pnRef, 'genome_promoter_n_hist.png')">Export PNG</el-button>
              </div>
            </template>
            <div class="note">
              For readability we plot Promoter_N_Atoms / 100 (scaled). Data are deterministic per sample seed.
            </div>
            <EChart ref="pnRef" :option="pnHistOption" height="300px" />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 12px;">
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Top Regulatory Outliers</span>
                <span class="mini">ranked by |Promoter GC - Gene GC| and Promoter N density</span>
              </div>
            </template>
            <el-table :data="outlierRows" stripe height="420">
              <el-table-column
                v-for="c in outlierColumns"
                :key="c.key"
                :prop="c.key"
                :label="c.label"
                :width="c.width"
                :sortable="c.sortable"
                :fixed="c.fixed"
              />
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 12px;">
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Local Genome Window</span>
                <div class="window-actions">
                  <el-select v-model="anchorGene" placeholder="Anchor gene" style="width: 220px">
                    <el-option v-for="g in anchorOptions" :key="g" :label="g" :value="g" />
                  </el-select>
                  <el-input-number v-model="windowSize" :min="1000" :max="50000" :step="1000" />
                </div>
              </div>
            </template>
            <div class="note">Window: ±{{ windowSize.toLocaleString() }} bp around selected gene.</div>
            <EChart :option="windowOption" height="260px" />
            <el-table :data="windowGenes" height="240" stripe @row-click="openGene">
              <el-table-column prop="Gene_Name" label="Gene" width="160" />
              <el-table-column prop="Contig" label="Contig" width="100" />
              <el-table-column prop="Start" label="Start" width="120" />
              <el-table-column prop="End" label="End" width="120" />
              <el-table-column prop="Product" label="Product" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-drawer v-model="drawerOpen" title="Gene Detail" size="36%">
      <div v-if="picked">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Gene">{{ picked.Gene_Name }}</el-descriptions-item>
          <el-descriptions-item label="Contig">{{ picked.Contig }}</el-descriptions-item>
          <el-descriptions-item label="Coordinates">{{ picked.Start }}-{{ picked.End }}</el-descriptions-item>
          <el-descriptions-item label="Product">{{ picked.Product }}</el-descriptions-item>
          <el-descriptions-item label="GO terms">{{ picked.GO_terms?.join('; ') || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { buildScatterOption, buildHistOption } from "../shared/echartsKit";
import { groupBy, isFiniteNumber } from "../shared/stats";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../../../api/showcaseAdapter";
import { histogram, safeDiv, safeNum } from "./genomeUtils";

const props = defineProps({
  // Preferred: parent passes a stable seed (e.g. from sampleId + refresh bump)
  seed: { type: [String, Number], default: "GENOME_REGULATORY" },
  seedBump: { type: Number, default: 0 },

  // Backward compatible: allow parent-provided rows/categories (showcase or backend)
  rows: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
});

const localRows = ref([]);

function resolveSeed() {
  const base = typeof props.seed === "number" ? (props.seed >>> 0) : hashStringToUint32(String(props.seed));
  return (base + (props.seedBump >>> 0)) >>> 0;
}

function regenerate() {
  // If parent supplies rows (already showcase-generated), use them for consistency.
  // Otherwise, generate locally so this tab is fully self-sufficient.
  if (props.rows && props.rows.length) {
    localRows.value = props.rows;
    return;
  }
  localRows.value = makeGenomeRows({
    seed: resolveSeed(),
    n: 1800,
    categories: props.categories && props.categories.length ? props.categories : undefined,
  });
}

defineExpose({ regenerate });

onMounted(regenerate);
watch(() => [props.seed, props.seedBump, props.rows], regenerate);

watch(localRows, () => {
  if (!anchorGene.value && localRows.value.length) {
    anchorGene.value = localRows.value[0].Gene_Name;
  }
});

function openGene(row) {
  picked.value = row;
  drawerOpen.value = true;
}

function downsample(rows, maxN = 3000) {
  const rs = rows || [];
  if (rs.length <= maxN) return rs;
  const step = Math.ceil(rs.length / maxN);
  return rs.filter((_, i) => i % step === 0);
}

const cats = computed(() => {
  if (props.categories?.length) return props.categories.map(String);
  const s = new Set((localRows.value || []).map((r) => String(r.Function_Category || "other")));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
});

const pgcRef = ref(null);
const igRef = ref(null);
const pnRef = ref(null);
const drawerOpen = ref(false);
const picked = ref(null);

const anchorGene = ref("");
const windowSize = ref(10000);

const anchorOptions = computed(() => localRows.value.map((r) => r.Gene_Name).slice(0, 500));
const anchorRow = computed(() => localRows.value.find((r) => r.Gene_Name === anchorGene.value) || localRows.value[0]);
const windowGenes = computed(() => {
  const anchor = anchorRow.value;
  if (!anchor) return [];
  const lo = anchor.Start - windowSize.value;
  const hi = anchor.End + windowSize.value;
  return (localRows.value || [])
    .filter((r) => r.Contig === anchor.Contig)
    .filter((r) => r.Start >= lo && r.End <= hi)
    .sort((a, b) => a.Start - b.Start);
});

const windowOption = computed(() => {
  const genes = windowGenes.value;
  return {
    grid: { left: 60, right: 20, top: 20, bottom: 30, containLabel: true },
    xAxis: { type: "value", name: "Position (bp)" },
    yAxis: { type: "category", data: genes.map((g) => g.Gene_Name) },
    series: [
      {
        type: "custom",
        renderItem: (params, api) => {
          const start = api.value(0);
          const end = api.value(1);
          const y = api.coord([0, params.dataIndex])[1];
          const xStart = api.coord([start, params.dataIndex])[0];
          const xEnd = api.coord([end, params.dataIndex])[0];
          const height = 10;
          return {
            type: "rect",
            shape: { x: xStart, y: y - height / 2, width: xEnd - xStart, height },
            style: api.style({ fill: "#4E79A7" }),
          };
        },
        data: genes.map((g) => [g.Start, g.End]),
      },
    ],
  };
});

const pgcOption = computed(() => {
  const rs = downsample(localRows.value, 2600);
  const byCat = groupBy(rs, (r) => String(r.Function_Category || "other"));
  const categories = cats.value;

  const series = categories.map((c) => {
    const pts = (byCat.get(c) || [])
      .map((r) => {
        const x = safeNum(r.GC_Content_Percent, NaN);
        const y = safeNum(r.Promoter_GC_Content, NaN);
        return { x, y, name: String(r.Gene_Name || "") };
      })
      .filter((p) => isFiniteNumber(p.x) && isFiniteNumber(p.y));

    return {
      name: c,
      type: "scatter",
      data: pts.map((p) => [p.x, p.y, p.name]),
      symbolSize: 5,
    };
  });

  const base = buildScatterOption(
    { points: [] },
    {
      xName: "Gene GC%",
      xUnit: "%",
      yName: "Promoter GC%",
      yUnit: "%",
      dataZoom: true,
      tooltipFormatter: (p) => {
        const d = p?.data || [];
        return `Gene: ${d[2] || ""}<br/>Gene GC: ${round(d[0], 2)}%<br/>Promoter GC: ${round(d[1], 2)}%`;
      },
    }
  );

  base.legend = { type: "scroll", top: 10 };
  base.series = series;
  base.grid = { left: "10%", right: "6%", top: 50, bottom: 55 };
  base.xAxis = { ...base.xAxis, min: 20, max: 80 };
  base.yAxis = { ...base.yAxis, min: 20, max: 80 };
  return base;
});

const igOption = computed(() => {
  const rs = downsample((localRows.value || []).filter((r) => safeNum(r.Intergenic_Length_bp, 0) > 0), 2800);
  const pts = rs
    .map((r) => {
      const x = safeNum(r.Intergenic_Length_bp, NaN);
      const y = safeNum(r.Intergenic_GC_Content, NaN);
      return { x, y, name: String(r.Gene_Name || "") };
    })
    .filter((p) => isFiniteNumber(p.x) && isFiniteNumber(p.y));

  const base = buildScatterOption(
    { points: pts.map((p) => ({ x: p.x, y: p.y, name: p.name })) },
    {
      xName: "Intergenic Length",
      xUnit: "bp",
      yName: "Intergenic GC%",
      yUnit: "%",
      dataZoom: true,
      tooltipFormatter: (p) => {
        const v = p?.value || p?.data?.value || [];
        const name = p?.name || p?.data?.name || "";
        return `Gene: ${name}<br/>IG length: ${round(v[0], 0)} bp<br/>IG GC: ${round(v[1], 2)}%`;
      },
    }
  );

  base.series[0].symbolSize = 5;
  base.grid = { left: "10%", right: "6%", top: 30, bottom: 55 };
  return base;
});

const pnHistOption = computed(() => {
  const pn = (localRows.value || [])
    .map((r) => safeDiv(r.Promoter_N_Atoms, 100))
    .filter((x) => Number.isFinite(x));

  const { edges, counts } = histogram(pn, { bins: 30 });
  return buildHistOption(
    { edges, counts },
    {
      xName: "Promoter N / 100",
      yName: "Count",
      dataZoom: false,
      toolbox: true,
    }
  );
});

const outlierRows = computed(() => {
  const rs = localRows.value || [];
  const scored = rs
    .map((r) => {
      const gcGene = safeNum(r.GC_Content_Percent, NaN);
      const gcProm = safeNum(r.Promoter_GC_Content, NaN);
      const diff = Number.isFinite(gcGene) && Number.isFinite(gcProm) ? Math.abs(gcProm - gcGene) : 0;

      const pn = safeNum(r.Promoter_N_Atoms, 0);
      const len = safeNum(r.Length_bp, 1);
      const pnDensity = pn / Math.max(1, len);

      return {
        Gene_Name: String(r.Gene_Name || ""),
        Function_Category: String(r.Function_Category || "other"),
        Length_bp: len,
        GC_Content_Percent: round(gcGene, 2),
        Promoter_GC_Content: round(gcProm, 2),
        GC_Diff: round(diff, 2),
        Promoter_N_Atoms: Math.round(pn),
        Promoter_N_per_bp: round(pnDensity, 4),
      };
    })
    .sort((a, b) => {
      // Primary: GC difference; Secondary: promoter N density
      if (b.GC_Diff !== a.GC_Diff) return b.GC_Diff - a.GC_Diff;
      return b.Promoter_N_per_bp - a.Promoter_N_per_bp;
    })
    .slice(0, 40);

  return scored;
});

const outlierColumns = computed(() => {
  const keys = [
    "Gene_Name",
    "Function_Category",
    "Length_bp",
    "GC_Content_Percent",
    "Promoter_GC_Content",
    "GC_Diff",
    "Promoter_N_Atoms",
    "Promoter_N_per_bp",
  ];

  return buildTableColumns(keys, {
    labelMap: {
      Gene_Name: "Gene",
      Function_Category: "Category",
      Length_bp: "Length(bp)",
      GC_Content_Percent: "Gene GC%",
      Promoter_GC_Content: "Promoter GC%",
      GC_Diff: "|GC diff|",
      Promoter_N_Atoms: "Promoter N",
      Promoter_N_per_bp: "N / bp",
    },
    widthMap: {
      Gene_Name: 170,
      Function_Category: 150,
      Length_bp: 110,
      GC_Content_Percent: 110,
      Promoter_GC_Content: 130,
      GC_Diff: 100,
      Promoter_N_Atoms: 130,
      Promoter_N_per_bp: 100,
    },
  });
});

function exportOutliers() {
  const cols = outlierColumns.value || [];
  exportObjectsToCsv("genome_regulatory_outliers.csv", outlierRows.value, cols);
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
.wrap { width: 100%; }
.card { width: 100%; }
.hdr { display:flex; justify-content: space-between; align-items:center; gap: 10px; flex-wrap: wrap; font-weight: 800; }
.ttl { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
.actions { display:flex; gap: 8px; flex-wrap: wrap; }
.subhdr { display:flex; justify-content: space-between; align-items:center; gap: 10px; font-weight: 800; }
.window-actions { display:flex; gap: 8px; align-items:center; }
.note { color:#909399; font-size: 12px; margin: 6px 0 10px; }
.mini { color:#909399; font-size: 12px; font-weight: 500; }
</style>
