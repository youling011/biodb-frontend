<template>
  <div class="download-container">
    <div class="section-title">Data Download</div>
    <el-alert
      title="License Information"
      type="info"
      description="All data is available under CC-BY 4.0 License. Please cite our paper when using this data."
      show-icon
      style="margin-bottom: 20px;"
    />

    <el-table :data="files" border style="width: 100%">
      <el-table-column prop="name" label="Dataset Name" width="300" />
      <el-table-column prop="desc" label="Description" />
      <el-table-column prop="size" label="Size" width="120" />
      <el-table-column prop="date" label="Update Date" width="150" />
      <el-table-column label="Action" width="150">
        <template #default>
          <el-button type="primary" icon="Download" plain size="small">Download</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const files = ref([
  { name: 'All_Gene_Expression_Matrix.csv', desc: 'Normalized gene expression matrix for all 31,000 species.', size: '4.2 GB', date: '2026-01-01' },
  { name: 'Microbial_Phenotypes_Metadata.xlsx', desc: 'Metadata including habitat, temperature, and phylum info.', size: '12 MB', date: '2025-12-10' },
  { name: 'Differential_Analysis_Results.tar.gz', desc: 'Full statistical analysis output (DESeq2 results).', size: '560 MB', date: '2025-11-20' },
]);
</script>

<style scoped>
.download-container { padding: 20px; background: white; border-radius: 8px; }
</style>