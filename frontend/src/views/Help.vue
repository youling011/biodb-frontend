<template>
  <div class="container">
    <div class="section-title">Help & Documentation</div>
    <el-collapse v-model="activeNames">
      <el-collapse-item title="How to search for a specific species or dataset?" name="1">
        <div class="content">Use the search box on the Home page or the filters on the Browse page. You can search by species name, taxonomy, or omics type (Genome / Transcriptome).</div>
      </el-collapse-item>
      <el-collapse-item title="What is the source of the data?" name="2">
        <div class="content">BioStoichDB aggregates published stoichiometric measurements and curated omics statistics from peer-reviewed studies and public resources. Exact provenance is shown in the dataset metadata and will be expanded in upcoming releases.</div>
      </el-collapse-item>
      <el-collapse-item title="How to cite this database?" name="3">
        <div class="content">Please cite: <i>BioStoichDB Consortium. A biological stoichiometry database for multi-omics analysis. Nucleic Acids Res. 2026.</i></div>
      </el-collapse-item>
      <el-collapse-item title="How to share a reproducible link?" name="4">
        <div class="content">Filters, tabs, and analysis parameters are stored in the URL. Copy the browser address bar to share or reproduce the same view.</div>
      </el-collapse-item>
      <el-collapse-item title="What do HVG/DE parameters mean?" name="5">
        <div class="content">HVG highlights highly variable genes; parameters like n_top_genes, min_mean/max_mean control the selection window. DE results include log2FC, p-value, and padj; Volcano/MA plots visualize these summaries. Full field definitions live in the Data Dictionary.</div>
      </el-collapse-item>
      <el-collapse-item title="What are CLR / compositional options?" name="6">
        <div class="content">CLR/ALR are compositional transforms that reduce bias when working with proportions. Correlation and PCA panels allow choosing Pearson/Spearman/Robust and CLR/log1p preprocessing to make statistics more rigorous.</div>
      </el-collapse-item>
      <el-collapse-item title="What is Integration?" name="7">
        <div class="content">Integration combines summary vectors across omics, performs joint PCA, and allows selecting samples to send to MultiAnalysis. Use the Integration page to explore cross-omics alignment.</div>
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
