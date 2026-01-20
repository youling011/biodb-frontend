<template>
  <div class="container">
    <div class="section-title">Database Statistics</div>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="sci-card" header="Species Distribution">
          <div id="pie" style="height:300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="sci-card" header="Top Diseases">
          <div id="bar" style="height:300px"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row style="margin-top:20px">
        <el-col :span="24">
            <el-card class="sci-card" header="Chromosome Distribution">
                <div id="line" style="height:300px"></div>
            </el-card>
        </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as echarts from 'echarts';
import api from '../api';

onMounted(async () => {
    const res = await api.getStatistics();
    const data = res.data;

    // Pie Chart
    const pie = echarts.init(document.getElementById('pie'));
    pie.setOption({
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '60%', data: data.species_chart.map(i=>({value:i.count, name:i.organism})) }]
    });

    // Bar Chart
    const bar = echarts.init(document.getElementById('bar'));
    bar.setOption({
        tooltip: {}, xAxis: { type: 'value' }, yAxis: { type: 'category', data: data.disease_chart.map(i=>i.disease) },
        grid: { left: '20%' },
        series: [{ type: 'bar', data: data.disease_chart.map(i=>i.count), itemStyle: { color: '#409EFF' } }]
    });
    
    // Line Chart
    const line = echarts.init(document.getElementById('line'));
    line.setOption({
        tooltip: {}, xAxis: { type: 'category', data: data.chr_chart.map(i=>i.chromosome) }, yAxis: { type: 'value' },
        series: [{ type: 'line', data: data.chr_chart.map(i=>i.count), areaStyle: { opacity: 0.2 } }]
    });
});
</script>
<style scoped> .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; } </style>