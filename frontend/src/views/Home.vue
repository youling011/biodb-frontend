<template>
  <div class="home-container">
    <div class="hero-section">
      <h1 class="main-title">Stoichiometric Characteristics Database</h1>
      <p class="sub-title">Exploring Elemental & Chemical Signatures across Genomes, Transcriptomes, and Proteomes</p>

      <div class="search-box">
        <el-input
          v-model="searchKey"
          placeholder="Search for Species (e.g., E. coli)…"
          size="large"
          @keyup.enter="goToBrowse"
        >
          <template #append><el-button icon="Search" @click="goToBrowse" /></template>
        </el-input>
      </div>
    </div>

    <div class="stats-container">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card" @click="goToBrowse">
            <div class="icon-wrapper" style="background:#ecf5ff">
              <el-icon :size="28" color="#409EFF"><Connection /></el-icon>
            </div>
            <div class="text-wrapper">
              <div class="stat-val">{{ stats.species_count }}</div>
              <div class="stat-label">Species</div>
            </div>
          </div>
        </el-col>

        <el-col :span="6">
          <div class="stat-card" @click="goToBrowse">
            <div class="icon-wrapper" style="background:#f0f9eb">
              <el-icon :size="28" color="#67C23A"><Document /></el-icon>
            </div>
            <div class="text-wrapper">
              <div class="stat-val">{{ stats.gene_count }}</div>
              <div class="stat-label">Genes</div>
            </div>
          </div>
        </el-col>

        <el-col :span="6">
          <div class="stat-card" @click="goToBrowse">
            <div class="icon-wrapper" style="background:#fdf6ec">
              <el-icon :size="28" color="#E6A23C"><Files /></el-icon>
            </div>
            <div class="text-wrapper">
            <div class="stat-val">{{ formatStat(stats.protein_count) }}</div>
            <div class="stat-label">Proteins (Coming soon)</div>
            </div>
          </div>
        </el-col>

        <el-col :span="6">
          <div class="stat-card" @click="goToBrowse">
            <div class="icon-wrapper" style="background:#fef0f0">
              <el-icon :size="28" color="#F56C6C"><Histogram /></el-icon>
            </div>
            <div class="text-wrapper">
              <div class="stat-val">{{ stats.monomer_count }}</div>
              <div class="stat-label">Monomers</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="intro-section">
      <el-row :gutter="40">
        <el-col :span="8">
          <el-card shadow="hover" class="feature-card">
            <template #header><h3><el-icon><DataLine /></el-icon> Single Species Analysis</h3></template>
            <p>Deep dive into the stoichiometric features of a single species.</p>
            <el-button type="primary" plain @click="goToBrowse">View Species List</el-button>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="feature-card">
            <template #header><h3><el-icon><Cpu /></el-icon> Multi-Species Comparison</h3></template>
            <p>Select multiple datasets to screen for differential monomers.</p>
            <el-button type="success" plain @click="$router.push('/multi-analysis')">Start Comparison</el-button>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="feature-card">
            <template #header><h3><el-icon><Share /></el-icon> Integration</h3></template>
            <p>Cross-omics summary alignment and joint PCA for multi-omics integration.</p>
            <el-button type="warning" plain @click="$router.push('/integration')">Open Integration</el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getGlobalStats } from "../api";

const router = useRouter();
const searchKey = ref("");

const stats = ref({
  species_count: "-",
  gene_count: "-",
  protein_count: null,
  monomer_count: "-",
});

function formatStat(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function goToBrowse() {
  router.push({ path: "/browse", query: { q: searchKey.value } });
}

onMounted(async () => {
  const data = await getGlobalStats();
  stats.value = data || stats.value;
});
</script>

<style scoped>
.hero-section { background: linear-gradient(180deg, #eef7ff 0%, #ffffff 100%); padding: 80px 20px; text-align: center; }
.main-title { font-size: 2.5rem; color: #2c3e50; margin-bottom: 10px; }
.sub-title { font-size: 1.2rem; color: #606266; margin-bottom: 40px; }
.search-box { max-width: 700px; margin: 0 auto; }
.stats-container { max-width: 1200px; margin: -30px auto 40px; position: relative; z-index: 10; padding: 0 20px; }
.stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; align-items: center; cursor: pointer; transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-5px); }
.icon-wrapper { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
.stat-val { font-size: 1.5rem; font-weight: bold; color: #303133; }
.stat-label { color: #909399; font-size: 0.9rem; }
.intro-section { max-width: 1200px; margin: 0 auto; padding: 20px; }
</style>
