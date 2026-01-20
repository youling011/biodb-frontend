<template>
  <div class="analysis-hub">
    <div class="hub-header">
      <h1>Stoichiometric Analysis Tools</h1>
      <p>Select an analysis module to explore the chemical signatures of biological data.</p>
    </div>

    <div class="cards-container">
      <el-row :gutter="40">
        
        <el-col :span="12">
          <div class="module-card single-card" @click="$router.push('/browse')">
            <div class="card-content">
              <div class="icon-area">
                <el-icon><DataLine /></el-icon>
              </div>
              <div class="text-area">
                <h2>Single Species Analysis</h2>
                <p>Deep dive into one species. Analyze Genome, Transcriptome, and Proteome stoichiometric features.</p>
                <ul class="features-list">
                  <li><el-icon><Check /></el-icon> Elemental Distribution</li>
                  <li><el-icon><Check /></el-icon> Amino Acid Ratios</li>
                  <li><el-icon><Check /></el-icon> Top/Low 10 Extreme Monomers</li>
                </ul>
                <el-button type="primary" round class="action-btn">
                  Select Species <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="card-bg-decoration"></div>
          </div>
        </el-col>

        <el-col :span="12">
          <div class="module-card multi-card" @click="$router.push('/multi-analysis')">
            <div class="card-content">
              <div class="icon-area">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="text-area">
                <h2>Multi-Species Comparison</h2>
                <p>Screen for differential monomers across multiple species or omics datasets using custom thresholds.</p>
                <ul class="features-list">
                  <li><el-icon><Check /></el-icon> Differential Screening (FC/P-value)</li>
                  <li><el-icon><Check /></el-icon> Feature Importance Ranking</li>
                  <li><el-icon><Check /></el-icon> PCA & Cluster Analysis</li>
                </ul>
                <el-button type="success" round class="action-btn">
                  Start Comparison <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="card-bg-decoration"></div>
          </div>
        </el-col>

      </el-row>
    </div>

    <div class="extra-tools">
      <el-divider content-position="center">More Tools</el-divider>
      <el-row :gutter="20" justify="center">
        <el-col :span="6">
          <el-card shadow="hover" class="mini-tool" @click="$router.push('/prediction')">
            <div class="mini-content">
              <el-icon :size="20" color="#E6A23C"><Cpu /></el-icon>
              <span>Species Prediction Model</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="mini-tool" @click="$router.push('/browse')">
             <div class="mini-content">
              <el-icon :size="20" color="#67C23A"><Search /></el-icon>
              <span>Search Database</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
// No complex logic needed here, mainly navigation
</script>

<style scoped>
.analysis-hub {
  max-width: 1200px;
  margin: 40px auto;
}

.hub-header {
  text-align: center;
  margin-bottom: 50px;
}
.hub-header h1 { font-size: 2.5rem; color: #2c3e50; margin-bottom: 10px; }
.hub-header p { font-size: 1.2rem; color: #606266; }

/* Module Cards */
.module-card {
  background: white;
  border-radius: 16px;
  height: 350px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.02);
}

.module-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}

.card-content {
  position: relative;
  z-index: 2;
  padding: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.icon-area {
  font-size: 48px;
  margin-bottom: 20px;
}

.text-area h2 { margin: 0 0 10px; font-size: 1.8rem; color: #303133; }
.text-area p { color: #606266; margin-bottom: 20px; line-height: 1.5; }

.features-list {
  list-style: none;
  padding: 0;
  margin-bottom: 30px;
  color: #555;
}
.features-list li { margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }

.action-btn { position: absolute; bottom: 40px; }

/* Styles for Single Species Card */
.single-card .icon-area { color: #409EFF; }
.single-card .card-bg-decoration {
  position: absolute;
  top: -50px; right: -50px;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(64,158,255,0.1) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
}
.single-card:hover { border-bottom: 4px solid #409EFF; }

/* Styles for Multi Species Card */
.multi-card .icon-area { color: #67C23A; }
.multi-card .card-bg-decoration {
  position: absolute;
  top: -50px; right: -50px;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(103,194,58,0.1) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
}
.multi-card:hover { border-bottom: 4px solid #67C23A; }

/* Extra Tools */
.extra-tools { margin-top: 60px; }
.mini-tool { cursor: pointer; text-align: center; border-radius: 8px; transition: all 0.2s; }
.mini-tool:hover { transform: scale(1.02); }
.mini-content { display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold; color: #555; }
</style>