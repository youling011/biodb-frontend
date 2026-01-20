<template>
  <div class="container">
    <div class="section-title">Help & Documentation</div>
    <el-collapse v-model="activeNames">
      <el-collapse-item title="How to search for a specific gene?" name="1">
        <div class="content">You can use the search bar on the Home page or the filter sidebar on the Browse page. Enter the official Gene Symbol (e.g., TP53).</div>
      </el-collapse-item>
      <el-collapse-item title="What is the source of the data?" name="2">
        <div class="content">Data is collected from public repositories including GEO, TCGA, and GWAS Catalog.</div>
      </el-collapse-item>
      <el-collapse-item title="How to cite this database?" name="3">
        <div class="content">Please cite: <i>Pan J, et al. BioOmicsDB: An integrated resource. Nucleic Acids Res. 2026.</i></div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const activeNames = ref(['1']);
</script>
<style scoped> 
.container { max-width: 800px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; } 
.content { color: #666; padding: 10px; }
</style>