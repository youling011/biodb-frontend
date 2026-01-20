<template>
  <div class="page-container">
    <h2>Data Overview</h2>
    <el-card>
      <div style="margin-bottom: 20px; display: flex; gap: 10px;">
        <el-input v-model="search" placeholder="Search Species..." style="width: 300px;" prefix-icon="Search" />
        <el-button type="primary">Filter</el-button>
      </div>
      
      <el-table :data="samples" stripe border style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="species_name" label="Species" width="250" />
        <el-table-column prop="taxonomy" label="Taxonomy" width="150">
          <template #default="scope"><el-tag>{{ scope.row.taxonomy }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="omics_type" label="Omics Type" width="150" />
        <el-table-column label="Action">
          <template #default="scope">
            <el-button size="small" type="primary" @click="$router.push(`/species/${scope.row.id}`)">Analyze</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const samples = ref([]);
const loading = ref(true);
const search = ref('');

onMounted(async () => {
    try {
        const res = await axios.get('http://127.0.0.1:8000/api/stoichiometry/');
        samples.value = res.data;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.page-container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
</style>