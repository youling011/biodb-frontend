<!-- frontend/src/views/Browse.vue -->
<template>
  <div class="browse-container">
    <div class="header">
      <h2>Data Overview</h2>
      <p>Select a species to view its detailed stoichiometric analysis.</p>
    </div>

    <el-card class="table-card">
      <div class="filter-bar">
        <el-input
          v-model="filterText"
          placeholder="Search Species / Taxonomy..."
          style="width: 360px"
          clearable
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="omicsFilter" placeholder="Omics" clearable style="width: 170px">
          <el-option label="Genome" value="GENOME" />
          <el-option label="Transcriptome" value="TRANSCRIPTOME" />
          <el-option label="Proteome" value="PROTEOME" />
        </el-select>

        <el-button type="primary" @click="refresh" :loading="loading">Refresh</el-button>

        <el-button
          type="success"
          plain
          :disabled="selectedRows.length === 0"
          @click="goToCompare"
          style="margin-left:auto"
        >
          Compare Selected ({{ selectedRows.length }})
        </el-button>
      </div>

      <el-table
        :data="filteredData"
        stripe
        style="width: 100%"
        v-loading="loading"
        @selection-change="onSelectionChange"
        @row-dblclick="(row) => goToDetail(row.id)"
      >
        <el-table-column type="selection" width="52" />
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="species_name" label="Species Name" min-width="220" />

        <el-table-column prop="taxonomy" label="Taxonomy" width="140">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.taxonomy }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="omics_type" label="Omics Type" width="140">
          <template #default="{ row }">
            <el-tag :type="omicsTagType(row.omics_type)">{{ row.omics_type }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Summary" min-width="320">
          <template #default="{ row }">
            <span style="color:#606266">
              genes: <b>{{ row.gene_count ?? row.summary_stats?.planned?.n_rows ?? '-' }}</b>,
              avg GC: <b>{{ row.avg_gc ?? row.summary_stats?.observed?.gc_content?.mean ?? '-' }}</b>,
              avg C:N: <b>{{ row.avg_cn_ratio ?? row.summary_stats?.observed?.ratios?.C_N_Ratio?.mean ?? '-' }}</b>
            </span>
          </template>
        </el-table-column>

        <el-table-column label="Action" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goToDetail(row.id)">View</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer-note">
        Double-click a row to open detail. If backend is empty/unavailable, demo data will be generated automatically.
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getSamples } from "../api";

const router = useRouter();

const loading = ref(false);
const raw = ref([]);

const filterText = ref("");
const omicsFilter = ref("");
const selectedRows = ref([]);

function omicsTagType(v) {
  if (v === "GENOME") return "success";
  if (v === "TRANSCRIPTOME") return "warning";
  if (v === "PROTEOME") return "info";
  return "";
}

const filteredData = computed(() => {
  const q = filterText.value.trim().toLowerCase();
  return (raw.value || [])
    .filter((r) => (omicsFilter.value ? r.omics_type === omicsFilter.value : true))
    .filter((r) => {
      if (!q) return true;
      const s = `${r.species_name || ""} ${r.taxonomy || ""} ${r.omics_type || ""}`.toLowerCase();
      return s.includes(q);
    });
});

function onSelectionChange(rows) {
  selectedRows.value = rows || [];
}

function goToDetail(id) {
  router.push({ name: "SpeciesDetail", params: { id } });
}

function goToCompare() {
  // 与你之前 MultiAnalysis.vue 的读取逻辑保持一致
  localStorage.setItem("biostoich_selected_samples", JSON.stringify(selectedRows.value));
  router.push({ name: "MultiAnalysis" });
}

async function refresh() {
  loading.value = true;
  try {
    raw.value = await getSamples();
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<style scoped>
.browse-container { max-width: 1400px; margin: 20px auto; padding: 0 20px; }
.header { margin-bottom: 16px; }
.table-card { border-radius: 10px; }
.filter-bar { margin-bottom: 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.footer-note { margin-top: 10px; color: #909399; font-size: 12px; }
</style>
