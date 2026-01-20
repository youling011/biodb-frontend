<template>
  <div class="container" v-loading="loading">
    <el-button @click="$router.go(-1)" icon="ArrowLeft" style="margin-bottom:10px">Back</el-button>
    
    <div v-if="item">
      <div class="detail-header">
        <h2>{{ item.gene_symbol }} <span class="subtitle">({{ item.organism }})</span></h2>
        <el-tag size="large">{{ item.method }}</el-tag>
      </div>

      <el-row :gutter="20">
        <el-col :span="10">
          <el-card class="sci-card" header="Basic Information">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="Entrez ID">{{ item.entrez_id }}</el-descriptions-item>
              <el-descriptions-item label="Disease">{{ item.disease }}</el-descriptions-item>
              <el-descriptions-item label="Chromsome">{{ item.chromosome }} : {{ item.start_position }} - {{ item.end_position }}</el-descriptions-item>
              <el-descriptions-item label="Strand">{{ item.strand }}</el-descriptions-item>
              <el-descriptions-item label="Publication PMID">
                <a :href="'https://pubmed.ncbi.nlm.nih.gov/' + item.pmid" target="_blank">{{ item.pmid }}</a>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
          
          <el-card class="sci-card" header="Phenotype Description" style="margin-top:20px">
            <p>{{ item.phenotype_desc }}</p>
          </el-card>
        </el-col>

        <el-col :span="14">
          <el-card class="sci-card" header="Differential Expression (Volcano Plot)">
            <div id="volcano" style="height: 400px;"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import api from '../api';

const props = defineProps(['id']);
const loading = ref(true);
const item = ref(null);

onMounted(async () => {
    try {
        const res = await api.getDetail(props.id);
        item.value = res.data;
        nextTick(() => initChart());
    } finally {
        loading.value = false;
    }
});

const initChart = () => {
    const chart = echarts.init(document.getElementById('volcano'));
    // IMPORTANT (Phase 2): No frontend random/mock generation is allowed.
    // This view is currently not wired into the main router, but we keep it deterministic.
    // Current point highlight only.
    const current = [Number(item.value.log2fc || 0), -Math.log10(Number(item.value.p_value || 1) || 1)];
    
    chart.setOption({
        tooltip: {},
        xAxis: { name: 'Log2FC', min:-4, max:4 },
        yAxis: { name: '-Log10(P-value)' },
        series: [
            { 
                type: 'scatter', 
                data: [current], 
                symbolSize: 15,
                label: { show: true, formatter: item.value.gene_symbol, position: 'top' }
            }
        ]
    });
};
</script>

<style scoped>
.container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
.detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.subtitle { font-size: 16px; color: #666; font-weight: normal; }
</style>