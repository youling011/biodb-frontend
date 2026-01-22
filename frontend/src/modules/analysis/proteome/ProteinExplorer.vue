<template>
  <div class="explorer">
    <div class="filters">
      <el-input v-model="search" placeholder="Search Protein_ID..." clearable style="width: 240px" />
      <el-input-number v-model="lengthRange[0]" :min="0" :max="2000" controls-position="right" />
      <span>to</span>
      <el-input-number v-model="lengthRange[1]" :min="0" :max="2000" controls-position="right" />
      <el-input-number v-model="pIRange[0]" :min="0" :max="14" controls-position="right" />
      <span>to</span>
      <el-input-number v-model="pIRange[1]" :min="0" :max="14" controls-position="right" />
      <el-input-number v-model="gravyRange[0]" :min="-3" :max="3" controls-position="right" />
      <span>to</span>
      <el-input-number v-model="gravyRange[1]" :min="-3" :max="3" controls-position="right" />
      <el-select v-model="instabilityMode" placeholder="Instability" clearable style="width: 150px">
        <el-option label="Stable (< 40)" value="stable" />
        <el-option label="Unstable (>= 40)" value="unstable" />
      </el-select>
      <el-switch v-model="disulfideOnly" active-text="Disulfide > 0" />
      <el-button @click="exportCsv" type="primary" plain>Export CSV</el-button>
    </div>

    <el-table :data="pagedRows" stripe height="520" @row-click="openDetail">
      <el-table-column prop="Protein_ID" label="Protein ID" min-width="140" show-overflow-tooltip />
      <el-table-column prop="Sequence_Length" label="Length" sortable width="110" />
      <el-table-column prop="Molecular_Weight" label="MW" sortable width="110" />
      <el-table-column prop="pI" label="pI" sortable width="90" />
      <el-table-column prop="Net_Charge" label="Charge" sortable width="100" />
      <el-table-column prop="GRAVY" label="GRAVY" sortable width="100" />
      <el-table-column prop="Instability_Index" label="Instability" sortable width="130" />
      <el-table-column prop="Aliphatic_Index" label="Aliphatic" sortable width="120" />
      <el-table-column prop="Disulfide_Potential" label="Disulfide" sortable width="120" />
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        :total="filteredRows.length"
      />
    </div>

    <el-drawer v-model="drawerOpen" size="45%" title="Protein Detail">
      <div v-if="selected">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Protein ID">{{ selected.Protein_ID }}</el-descriptions-item>
          <el-descriptions-item label="Length">{{ selected.Sequence_Length }}</el-descriptions-item>
          <el-descriptions-item label="MW">{{ selected.Molecular_Weight }}</el-descriptions-item>
          <el-descriptions-item label="pI">{{ selected.pI }}</el-descriptions-item>
          <el-descriptions-item label="GRAVY">{{ selected.GRAVY }}</el-descriptions-item>
          <el-descriptions-item label="Instability">{{ selected.Instability_Index }}</el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="12" style="margin-top: 14px;">
          <el-col :span="12">
            <el-card>
              <template #header><div class="hdr">AA Composition (Top 10)</div></template>
              <EChart :option="aaOption" height="260px" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header><div class="hdr">PhysChem Profile</div></template>
              <EChart :option="physOption" height="260px" />
            </el-card>
          </el-col>
        </el-row>

        <el-card style="margin-top: 14px;">
          <template #header><div class="hdr">Atoms per Residue</div></template>
          <EChart :option="atomOption" height="240px" />
        </el-card>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const search = ref("");
const lengthRange = ref([0, 2000]);
const pIRange = ref([0, 14]);
const gravyRange = ref([-3, 3]);
const instabilityMode = ref("");
const disulfideOnly = ref(false);

const currentPage = ref(1);
const pageSize = ref(50);

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.rows.filter((r) => {
    if (q && !String(r.Protein_ID).toLowerCase().includes(q)) return false;
    if (r.Sequence_Length < lengthRange.value[0] || r.Sequence_Length > lengthRange.value[1]) return false;
    if (r.pI < pIRange.value[0] || r.pI > pIRange.value[1]) return false;
    if (r.GRAVY < gravyRange.value[0] || r.GRAVY > gravyRange.value[1]) return false;
    if (instabilityMode.value === "stable" && r.Instability_Index >= 40) return false;
    if (instabilityMode.value === "unstable" && r.Instability_Index < 40) return false;
    if (disulfideOnly.value && r.Disulfide_Potential <= 0) return false;
    return true;
  });
});

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

const drawerOpen = ref(false);
const selected = ref(null);

function openDetail(row) {
  selected.value = row;
  drawerOpen.value = true;
}

function exportCsv() {
  exportObjectsToCsv(
    "proteome_filtered.csv",
    filteredRows.value,
    [
      { key: "Protein_ID", label: "Protein ID" },
      { key: "Sequence_Length", label: "Length" },
      { key: "Molecular_Weight", label: "MW" },
      { key: "pI", label: "pI" },
      { key: "Net_Charge", label: "Net Charge" },
      { key: "GRAVY", label: "GRAVY" },
      { key: "Instability_Index", label: "Instability" },
      { key: "Aliphatic_Index", label: "Aliphatic" },
      { key: "Disulfide_Potential", label: "Disulfide" },
    ]
  );
}

const aaOption = computed(() => {
  if (!selected.value) return { series: [] };
  const aaKeys = Object.keys(selected.value).filter((k) => k.startsWith("AA_"));
  const top = aaKeys
    .map((k) => ({ name: k.replace("AA_", ""), value: selected.value[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "20%", right: "10%", top: 20, bottom: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: top.map((t) => t.name) },
    series: [{ type: "bar", data: top.map((t) => t.value) }],
  };
});

const physOption = computed(() => {
  if (!selected.value) return { series: [] };
  const items = [
    { name: "pI", value: selected.value.pI },
    { name: "GRAVY", value: selected.value.GRAVY },
    { name: "Instability", value: selected.value.Instability_Index },
    { name: "Aliphatic", value: selected.value.Aliphatic_Index },
    { name: "Aromaticity", value: selected.value.Aromaticity },
  ];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "25%", right: "10%", top: 20, bottom: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: items.map((i) => i.name) },
    series: [{ type: "bar", data: items.map((i) => i.value) }],
  };
});

const atomOption = computed(() => {
  if (!selected.value) return { series: [] };
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: ["C", "H", "O", "N", "S"] },
    yAxis: { type: "value" },
    series: [{
      type: "bar",
      data: [
        selected.value.C_per_res,
        selected.value.H_per_res,
        selected.value.O_per_res,
        selected.value.N_per_res,
        selected.value.S_per_res,
      ],
    }],
  };
});
</script>

<style scoped>
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.hdr { font-weight: 600; }
</style>
