<template>
  <div class="export">
    <el-card>
      <template #header><div class="hdr">Export</div></template>
      <p>Download current proteome data as CSV or summary JSON.</p>
      <div class="actions">
        <el-button type="primary" @click="exportCsv">Export CSV</el-button>
        <el-button type="success" plain @click="exportSummary">Export Summary JSON</el-button>
      </div>
    </el-card>

    <el-card style="margin-top: 16px;">
      <template #header><div class="hdr">API Contract (Demo)</div></template>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="/api/stoichiometry/:id/species_analysis?omics=PROTEOME"
        description="Returns proteome analysis overview, distributions, fingerprints, and metadata."
      />
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="/api/stoichiometry/:id/rows?omics=PROTEOME&limit=&offset="
        description="Returns paginated proteome rows for explorer tables."
        style="margin-top: 10px;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const summary = computed(() => {
  const total = props.rows.length;
  const avg = (key) => props.rows.reduce((a, b) => a + Number(b[key] || 0), 0) / (total || 1);
  return {
    total,
    avg_length: avg("Sequence_Length"),
    avg_pI: avg("pI"),
    avg_gravy: avg("GRAVY"),
    avg_instability: avg("Instability_Index"),
  };
});

function exportCsv() {
  const columns = [
    { key: "Protein_ID", label: "Protein ID" },
    { key: "Sequence_Length", label: "Length" },
    { key: "Molecular_Weight", label: "MW" },
    { key: "pI", label: "pI" },
    { key: "Net_Charge", label: "Net Charge" },
    { key: "GRAVY", label: "GRAVY" },
    { key: "Instability_Index", label: "Instability" },
    { key: "Aliphatic_Index", label: "Aliphatic" },
    { key: "Disulfide_Potential", label: "Disulfide" },
  ];
  exportObjectsToCsv("proteome_rows.csv", props.rows, columns);
}

function exportSummary() {
  const blob = new Blob([JSON.stringify(summary.value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "proteome_summary.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.actions { display: flex; gap: 10px; margin-top: 10px; }
.hdr { font-weight: 600; }
</style>
