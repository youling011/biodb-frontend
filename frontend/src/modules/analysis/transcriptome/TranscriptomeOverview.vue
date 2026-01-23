<template>
  <div class="tx-overview">
    <el-card class="data-layer" shadow="never">
      <div class="card-hdr">
        <span>Data Layer Declaration</span>
      </div>
      <div class="layer-tags">
        <el-tag type="info" effect="plain">raw counts: yes</el-tag>
        <el-tag type="success" effect="plain">normalized: yes</el-tag>
        <el-tag type="warning" effect="plain">log1p: yes</el-tag>
      </div>
    </el-card>

    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Transcripts</div>
            <div class="kpi-value">{{ kpi.n.toLocaleString() }}</div>
            <div class="kpi-sub">synthetic rows</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg Length</div>
            <div class="kpi-value">{{ fmt(kpi.avgLen, 0) }}</div>
            <div class="kpi-sub">nt</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg GC</div>
            <div class="kpi-value">{{ fmt(kpi.avgGC, 2) }}</div>
            <div class="kpi-sub">%</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg Entropy</div>
            <div class="kpi-value">{{ fmt(kpi.avgEntropy, 3) }}</div>
            <div class="kpi-sub">bits/nt</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 10px">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg LZ</div>
            <div class="kpi-value">{{ fmt(kpi.avgLZ, 3) }}</div>
            <div class="kpi-sub">complexity</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg AT-skew</div>
            <div class="kpi-value">{{ fmt(kpi.avgATSkew, 3) }}</div>
            <div class="kpi-sub">[-1, 1]</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg GC-skew</div>
            <div class="kpi-value">{{ fmt(kpi.avgGCSkew, 3) }}</div>
            <div class="kpi-sub">[-1, 1]</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card>
          <div class="kpi">
            <div class="kpi-title">Avg Motif (H/ACA)</div>
            <div class="kpi-value">{{ fmt(kpi.avgHACA, 4) }}</div>
            <div class="kpi-sub">freq</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-hdr">
              <span>Stoichiometric budget (mean atoms)</span>
              <el-button size="small" @click="corrVisible = true">Correlation</el-button>
            </div>
          </template>
          <EChart :option="budgetOption" height="360px" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-hdr">
              <span>Atom density (mean atoms / nt)</span>
            </div>
          </template>
          <EChart :option="densityOption" height="360px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>Length distribution</span></div></template>
          <EChart :option="lenHist" height="320px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>GC% distribution</span></div></template>
          <EChart :option="gcHist" height="320px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>Entropy distribution</span></div></template>
          <EChart :option="entropyHist" height="320px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>LZ complexity distribution</span></div></template>
          <EChart :option="lzHist" height="320px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>AT-skew distribution</span></div></template>
          <EChart :option="atSkewHist" height="320px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>GC-skew distribution</span></div></template>
          <EChart :option="gcSkewHist" height="320px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :xs="24" :lg="24">
        <el-card shadow="never">
          <template #header><div class="card-hdr"><span>Base spacing (A/T/C/G)</span></div></template>
          <EChart :option="spacingBox" height="340px" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="corrVisible" title="Correlation heatmap" width="980px">
      <EChart :option="corrHeatmap" height="540px" />
      <template #footer>
        <el-button @click="corrVisible = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";

import { makeTranscriptomeRows } from "../../../api/showcaseAdapter";
import { buildBarOption, buildHistOption, buildBoxplotOption, buildHeatmapOption } from "../shared/echartsKit";
import { boxplotStats, cleanNumbers, mean, pearson, quantile, toNumber } from "../shared/stats";

const props = defineProps({
  seed: { type: String, default: "TX:demo" },
  seedBump: { type: Number, default: 0 },
});

const corrVisible = ref(false);

const rows = computed(() => {
  return makeTranscriptomeRows({
    seed: `${props.seed}:${props.seedBump}:overview`,
    n: 2600,
  });
});

function fmt(v, digits = 3) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return digits === 0 ? String(Math.round(n)) : n.toFixed(digits);
}

function arrOf(key) {
  const out = [];
  for (const r of rows.value) {
    const n = toNumber(r?.[key], null);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function histFrom(values, { bins = 26, min = null, max = null, digits = 2 } = {}) {
  const v = cleanNumbers(values);
  if (!v.length) return { bins: [], counts: [] };

  let lo = Number.isFinite(min) ? Number(min) : quantile(v, 0.02);
  let hi = Number.isFinite(max) ? Number(max) : quantile(v, 0.98);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    lo = Math.min(...v);
    hi = Math.max(...v);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return { bins: [], counts: [] };

  const b = Math.max(8, Math.min(60, Math.round(bins)));
  const step = (hi - lo) / b;
  const counts = new Array(b).fill(0);

  for (const x of v) {
    if (x < lo || x > hi) continue;
    const idx = Math.min(b - 1, Math.max(0, Math.floor((x - lo) / step)));
    counts[idx] += 1;
  }

  const labels = [];
  for (let i = 0; i < b; i++) {
    const x0 = lo + i * step;
    const x1 = lo + (i + 1) * step;
    labels.push(`${x0.toFixed(digits)}–${x1.toFixed(digits)}`);
  }

  return { bins: labels, counts };
}

const kpi = computed(() => {
  const n = rows.value.length;
  const lens = arrOf("Sequence_Length");
  const gcs = arrOf("GC_content");
  const ent = arrOf("Sequence_Entropy");
  const lz = arrOf("LZ_complexity");
  const at = arrOf("AT_skew");
  const gc = arrOf("GC_skew");
  const haca = arrOf("H_ACA_box_freq");

  return {
    n,
    avgLen: mean(lens) ?? 0,
    avgGC: mean(gcs) ?? 0,
    avgEntropy: mean(ent) ?? 0,
    avgLZ: mean(lz) ?? 0,
    avgATSkew: mean(at) ?? 0,
    avgGCSkew: mean(gc) ?? 0,
    avgHACA: mean(haca) ?? 0,
  };
});

const budgetOption = computed(() => {
  const keys = ["C_count", "H_count", "O_count", "N_count", "P_count"];
  const categories = ["C", "H", "O", "N", "P"];
  const values = keys.map((k) => mean(arrOf(k)) ?? 0);
  return buildBarOption(
    { categories, values },
    {
      title: "Mean atom counts per transcript",
      xName: "Element",
      yName: "Atoms",
      rotate: 0,
      dataZoom: false,
    }
  );
});

const densityOption = computed(() => {
  const len = arrOf("Sequence_Length");
  const mLen = mean(len) ?? 1;
  const keys = ["C_count", "H_count", "O_count", "N_count", "P_count"];
  const categories = ["C", "H", "O", "N", "P"];
  const values = keys.map((k) => (mean(arrOf(k)) ?? 0) / Math.max(1, mLen));
  return buildBarOption(
    { categories, values },
    {
      title: "Mean atoms per nucleotide",
      xName: "Element",
      yName: "Atoms / nt",
      rotate: 0,
      dataZoom: false,
    }
  );
});

const lenHist = computed(() => {
  return buildHistOption(histFrom(arrOf("Sequence_Length"), { bins: 28, digits: 0 }), {
    title: "Sequence length (nt)",
    xName: "Length",
    yName: "Count",
    dataZoom: true,
  });
});

const gcHist = computed(() => {
  return buildHistOption(histFrom(arrOf("GC_content"), { bins: 26, min: 0, max: 100, digits: 1 }), {
    title: "GC%",
    xName: "GC%",
    yName: "Count",
    dataZoom: true,
  });
});

const entropyHist = computed(() => {
  return buildHistOption(histFrom(arrOf("Sequence_Entropy"), { bins: 26, digits: 3 }), {
    title: "Entropy",
    xName: "Entropy",
    yName: "Count",
    dataZoom: true,
  });
});

const lzHist = computed(() => {
  return buildHistOption(histFrom(arrOf("LZ_complexity"), { bins: 26, digits: 3 }), {
    title: "LZ complexity",
    xName: "LZ",
    yName: "Count",
    dataZoom: true,
  });
});

const atSkewHist = computed(() => {
  return buildHistOption(histFrom(arrOf("AT_skew"), { bins: 26, min: -1, max: 1, digits: 3 }), {
    title: "AT-skew",
    xName: "AT-skew",
    yName: "Count",
    dataZoom: true,
  });
});

const gcSkewHist = computed(() => {
  return buildHistOption(histFrom(arrOf("GC_skew"), { bins: 26, min: -1, max: 1, digits: 3 }), {
    title: "GC-skew",
    xName: "GC-skew",
    yName: "Count",
    dataZoom: true,
  });
});

const spacingBox = computed(() => {
  const cats = ["A", "T", "C", "G"];
  const keys = ["A_avg_spacing", "T_avg_spacing", "C_avg_spacing", "G_avg_spacing"];

  const boxData = [];
  const outliers = [];

  for (let i = 0; i < keys.length; i++) {
    const vals = arrOf(keys[i]);
    const st = boxplotStats(vals);
    boxData.push([
      Number(st.min ?? 0),
      Number(st.q1 ?? 0),
      Number(st.median ?? 0),
      Number(st.q3 ?? 0),
      Number(st.max ?? 0),
    ]);

    const ol = Array.isArray(st.outliers) ? st.outliers : [];
    // Keep a bounded number of outliers for performance.
    for (const x of ol.slice(0, 80)) outliers.push([i, x]);
  }

  return buildBoxplotOption(
    { categories: cats, boxData, outliers },
    {
      title: "A/T/C/G average spacing",
      xName: "Base",
      yName: "Avg spacing",
      dataZoom: false,
    }
  );
});

const corrHeatmap = computed(() => {
  const items = [
    { key: "C_count", label: "C" },
    { key: "H_count", label: "H" },
    { key: "O_count", label: "O" },
    { key: "N_count", label: "N" },
    { key: "P_count", label: "P" },
    { key: "GC_content", label: "GC%" },
    { key: "Sequence_Length", label: "Length" },
    { key: "Sequence_Entropy", label: "Entropy" },
    { key: "LZ_complexity", label: "LZ" },
    { key: "AT_skew", label: "AT_skew" },
    { key: "GC_skew", label: "GC_skew" },
  ];

  const series = items.map((it) => arrOf(it.key));
  const labels = items.map((it) => it.label);

  const values = [];
  for (let y = 0; y < items.length; y++) {
    for (let x = 0; x < items.length; x++) {
      const r = pearson(series[x], series[y]);
      const v = r === null ? 0 : Math.round(r * 1000) / 1000;
      values.push([x, y, v]);
    }
  }

  return buildHeatmapOption(
    { xLabels: labels, yLabels: labels, values },
    {
      title: "Pearson correlation",
      xName: "Metric",
      yName: "Metric",
      valueName: "r",
      xRotate: 0,
      visualMin: -1,
      visualMax: 1,
      dataZoom: false,
    }
  );
});
</script>

<style scoped>
.tx-overview {
  width: 100%;
}
.data-layer {
  background: #f7f9fc;
  margin-bottom: 12px;
}
.layer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kpi-title {
  font-weight: 800;
  color: #2c3e50;
}
.kpi-value {
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
}
.kpi-sub {
  color: #909399;
  font-size: 12px;
}
.card-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
}
</style>
