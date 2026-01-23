<template>
  <div class="de-panel">
    <el-card class="controls" shadow="never">
      <el-form :inline="true" label-position="top">
        <el-form-item label="Method">
          <el-select v-model="method" style="width: 140px">
            <el-option label="DESeq2" value="DESeq2" />
            <el-option label="edgeR" value="edgeR" />
            <el-option label="Wilcoxon" value="Wilcoxon" />
          </el-select>
        </el-form-item>
        <el-form-item label="Group A">
          <el-input v-model="groupA" placeholder="Condition A" style="width: 140px" />
        </el-form-item>
        <el-form-item label="Group B">
          <el-input v-model="groupB" placeholder="Condition B" style="width: 140px" />
        </el-form-item>
        <el-form-item label="log2FC >=">
          <el-input-number v-model="fcThreshold" :min="0" :step="0.2" />
        </el-form-item>
        <el-form-item label="padj <=">
          <el-input-number v-model="padjThreshold" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">Run</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <AsyncStateBlock :state="state" empty-text="No DE result." :retry="load">
      <el-row :gutter="12" style="margin-top: 10px">
        <el-col :xs="24" :lg="12">
          <el-card shadow="never">
            <template #header><div class="card-hdr"><span>Volcano</span></div></template>
            <EChart :option="volcanoOption" height="360px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card shadow="never">
            <template #header><div class="card-hdr"><span>MA Plot</span></div></template>
            <EChart :option="maOption" height="360px" />
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" style="margin-top: 10px">
        <template #header>
          <div class="card-hdr">
            <span>Top genes</span>
            <el-button size="small" @click="exportCsv">Export</el-button>
          </div>
        </template>
        <el-input v-model="kw" placeholder="Search gene" clearable style="margin-bottom: 8px" />
        <el-table :data="filtered" height="360" stripe>
          <el-table-column prop="gene" label="Gene" width="140" />
          <el-table-column prop="log2fc" label="log2FC" width="110" sortable />
          <el-table-column prop="pval" label="p-value" width="120" sortable />
          <el-table-column prop="padj" label="padj" width="120" sortable />
          <el-table-column prop="baseMean" label="baseMean" />
        </el-table>
      </el-card>
    </AsyncStateBlock>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import AsyncStateBlock from "../../../components/AsyncStateBlock.vue";
import EChart from "../../../components/EChart.vue";
import { getTranscriptomeDE } from "../../../api";
import { buildMAOption, buildVolcanoOption } from "../shared/echartsKit";
import { getQueryNumber, getQueryString, setQueryValues } from "../../../utils/urlState";
import { exportObjectsToCsv } from "../../../utils/exportCsv";

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
});

const method = ref(getQueryString("de_method", "DESeq2"));
const groupA = ref(getQueryString("de_a", "A"));
const groupB = ref(getQueryString("de_b", "B"));
const fcThreshold = ref(getQueryNumber("de_fc", 1));
const padjThreshold = ref(getQueryNumber("de_padj", 0.05));
const kw = ref("");

const loading = ref(false);
const error = ref("");
const table = ref([]);

const state = computed(() => {
  if (loading.value) return "loading";
  if (error.value) return "error";
  if (!table.value.length) return "empty";
  return "ready";
});

async function load() {
  if (!props.sampleId) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await getTranscriptomeDE(props.sampleId, {
      method: method.value,
      group_a: groupA.value,
      group_b: groupB.value,
      fc: fcThreshold.value,
      padj: padjThreshold.value,
    });
    table.value = Array.isArray(data?.de_table) ? data.de_table : [];
    try {
      localStorage.setItem("biostoich_de_table", JSON.stringify(table.value.slice(0, 1000)));
    } catch {}
  } catch (e) {
    error.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

watch(() => props.sampleId, load, { immediate: true });
watch([method, groupA, groupB, fcThreshold, padjThreshold], () => {
  setQueryValues({
    de_method: method.value,
    de_a: groupA.value,
    de_b: groupB.value,
    de_fc: fcThreshold.value,
    de_padj: padjThreshold.value,
  });
});

const filtered = computed(() => {
  const q = kw.value.trim().toLowerCase();
  if (!q) return table.value;
  return table.value.filter((r) => String(r.gene || "").toLowerCase().includes(q));
});

const volcanoOption = computed(() => {
  const points = table.value.map((r) => ({
    gene: r.gene,
    log2fc: r.log2fc,
    neglog10p: -Math.log10(Number(r.padj) || 1),
  }));
  return buildVolcanoOption({ points }, {
    fcThreshold: fcThreshold.value,
    pThreshold: padjThreshold.value,
  });
});

const maOption = computed(() => {
  const points = table.value.map((r) => ({
    gene: r.gene,
    mean: r.baseMean,
    log2fc: r.log2fc,
  }));
  return buildMAOption({ points });
});

function exportCsv() {
  exportObjectsToCsv("transcriptome_de.csv", filtered.value, [
    { key: "gene", label: "Gene" },
    { key: "log2fc", label: "log2FC" },
    { key: "pval", label: "pval" },
    { key: "padj", label: "padj" },
    { key: "baseMean", label: "baseMean" },
  ]);
}
</script>

<style scoped>
.de-panel {
  width: 100%;
}
.controls {
  margin-bottom: 10px;
}
.card-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
