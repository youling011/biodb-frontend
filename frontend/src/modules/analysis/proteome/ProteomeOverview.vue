<template>
  <div class="overview">
    <el-row :gutter="16">
      <el-col :span="4">
        <el-card class="kpi">
          <div class="k">Proteins</div>
          <div class="v">{{ rows.length }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="kpi">
          <div class="k">Length {{ statLabel }}</div>
          <div class="v">{{ lengthStat.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="kpi">
          <div class="k">pI {{ statLabel }}</div>
          <div class="v">{{ pIStat.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="kpi">
          <div class="k">GRAVY {{ statLabel }}</div>
          <div class="v">{{ gravyStat.toFixed(3) }}</div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card class="kpi">
          <div class="k">Instability {{ statLabel }}</div>
          <div class="v">{{ instabilityStat.toFixed(2) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="panel" style="margin-top: 14px;">
      <div class="controls">
        <el-select v-model="statMode" size="small" style="width: 150px">
          <el-option label="Mean" value="mean" />
          <el-option label="Median" value="median" />
        </el-select>
        <div class="slider">
          <span>Length quantile</span>
          <el-slider v-model="lengthQuantile" range :min="0" :max="100" :step="5" style="width: 220px" />
        </div>
        <div class="slider">
          <span>Bins</span>
          <el-slider v-model="bins" :min="10" :max="50" :step="2" style="width: 180px" />
        </div>
      </div>
    </el-card>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr">Length Distribution</div></template>
          <EChart :option="lenHist" height="260px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr">Molecular Weight Distribution</div></template>
          <EChart :option="mwHist" height="260px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr">pI Distribution</div></template>
          <EChart :option="pIHist" height="260px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr">GRAVY Distribution</div></template>
          <EChart :option="gravyHist" height="260px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="24">
        <el-card>
          <template #header><div class="hdr">Atoms per Residue (C/H/O/N/S)</div></template>
          <EChart :option="atomsOption" height="320px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";
import { histOption, mean, median } from "./proteomeUtils";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const bins = ref(24);
const statMode = ref("mean");
const lengthQuantile = ref([0, 100]);

const subset = computed(() => {
  if (!props.rows.length) return [];
  const lengths = props.rows.map((r) => r.Sequence_Length).sort((a, b) => a - b);
  const low = lengths[Math.floor((lengthQuantile.value[0] / 100) * (lengths.length - 1))];
  const high = lengths[Math.floor((lengthQuantile.value[1] / 100) * (lengths.length - 1))];
  return props.rows.filter((r) => r.Sequence_Length >= low && r.Sequence_Length <= high);
});

const statLabel = computed(() => (statMode.value === "mean" ? "Mean" : "Median"));
const lengthStat = computed(() => (statMode.value === "mean" ? mean(subset.value.map((r) => r.Sequence_Length)) : median(subset.value.map((r) => r.Sequence_Length))));
const pIStat = computed(() => (statMode.value === "mean" ? mean(subset.value.map((r) => r.pI)) : median(subset.value.map((r) => r.pI))));
const gravyStat = computed(() => (statMode.value === "mean" ? mean(subset.value.map((r) => r.GRAVY)) : median(subset.value.map((r) => r.GRAVY))));
const instabilityStat = computed(() => (statMode.value === "mean" ? mean(subset.value.map((r) => r.Instability_Index)) : median(subset.value.map((r) => r.Instability_Index))));

const lenHist = computed(() => histOption(subset.value.map((r) => r.Sequence_Length), "Length", bins.value));
const mwHist = computed(() => histOption(subset.value.map((r) => r.Molecular_Weight), "MW", bins.value));
const pIHist = computed(() => histOption(subset.value.map((r) => r.pI), "pI", bins.value));
const gravyHist = computed(() => histOption(subset.value.map((r) => r.GRAVY), "GRAVY", bins.value));

const atomsOption = computed(() => {
  const avg = (key) => mean(subset.value.map((r) => r[key]));
  const data = [
    avg("C_per_res"),
    avg("H_per_res"),
    avg("O_per_res"),
    avg("N_per_res"),
    avg("S_per_res"),
  ];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "10%", right: "6%", top: 20, bottom: 50 },
    xAxis: { type: "category", data: ["C", "H", "O", "N", "S"] },
    yAxis: { type: "value", name: "Atoms per residue" },
    series: [{ type: "bar", data, barWidth: "60%" }],
  };
});
</script>

<style scoped>
.kpi { border-radius: 10px; }
.k { font-size: 12px; color: #909399; }
.v { font-size: 20px; font-weight: 600; }
.panel { border-radius: 10px; }
.controls { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
.slider { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #606266; }
.hdr { font-weight: 600; }
</style>
