<!-- frontend/src/views/Prediction.vue -->
<template>
  <div class="prediction-container">
    <div class="hero-box">
      <h2>Proteome-based Species & Function Prediction</h2>
      <p>Upload proteomic stoichiometry data to infer species identity and functional traits.</p>
    </div>

    <el-row :gutter="40" style="margin-top: 24px;">
      <el-col :span="10">
        <el-card class="upload-card">
          <div class="upload-area">
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <h3>Upload Data File</h3>
            <p class="hint">Supported formats: .csv (stoichiometry), .fasta (AA sequences)</p>

            <el-upload
              class="upload-demo"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :show-file-list="true"
              accept=".csv,.fasta,.fa,.txt"
            >
              <div class="el-upload__text">Drop file here or <em>click to upload</em></div>
            </el-upload>

            <el-divider>OR</el-divider>

            <p class="hint">Use a demo sample:</p>
            <el-select v-model="selectedDemo" placeholder="Select Demo Sample" style="width: 100%; margin-bottom: 14px;">
              <el-option label="Unknown Sample #001" value="demo_s1" />
              <el-option label="Unknown Sample #002" value="demo_s2" />
              <el-option label="Unknown Sample #003" value="demo_s3" />
            </el-select>

            <el-button
              type="success"
              size="large"
              style="width: 100%;"
              @click="startPrediction"
              :loading="loading"
            >
              Run Prediction Model
            </el-button>

            <div class="small-note">
              If backend prediction is not wired yet, demo prediction results are generated automatically.
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="14">
        <transition name="fade">
          <div v-if="hasResult">
            <el-card class="result-card">
              <h4>Predicted Species</h4>
              <div class="predicted">
                <div class="pred-name">{{ result.predicted.name }}</div>
                <el-progress
                  :percentage="Math.round(result.predicted.prob * 100)"
                  status="success"
                  :stroke-width="12"
                />
                <div class="pred-sub">
                  Confidence: <b>{{ (result.predicted.prob * 100).toFixed(2) }}%</b>
                </div>
              </div>

              <el-divider />

              <div class="summary-grid">
                <div class="summary-item">
                  <div class="k">Protein Count</div>
                  <div class="v">{{ result.inputSummary.protein_count }}</div>
                </div>
                <div class="summary-item">
                  <div class="k">Avg C:N</div>
                  <div class="v">{{ result.inputSummary.avg_cn_ratio }}</div>
                </div>
                <div class="summary-item">
                  <div class="k">Avg GC%</div>
                  <div class="v">{{ result.inputSummary.avg_gc }}</div>
                </div>
              </div>
            </el-card>

            <el-row :gutter="16" style="margin-top: 14px;">
              <el-col :span="12">
                <el-card class="result-card">
                  <div class="card-header">
                    <h4>Top-10 Species Probability</h4>
                    <el-button text @click="exportChart(probRef, 'prediction_prob.png')">
                      <el-icon><Download /></el-icon>
                    </el-button>
                  </div>
                  <EChart ref="probRef" :option="probOption" height="280px" />
                </el-card>
              </el-col>

              <el-col :span="12">
                <el-card class="result-card">
                  <div class="card-header">
                    <h4>Functional Traits</h4>
                    <el-button text @click="exportChart(traitRef, 'prediction_traits.png')">
                      <el-icon><Download /></el-icon>
                    </el-button>
                  </div>
                  <EChart ref="traitRef" :option="traitOption" height="280px" />
                </el-card>
              </el-col>
            </el-row>

            <el-card class="result-card" style="margin-top: 14px;">
              <div class="card-header">
                <h4>Feature Contribution (SHAP-like)</h4>
                <el-button text @click="exportChart(shapRef, 'prediction_shap.png')">
                  <el-icon><Download /></el-icon>
                </el-button>
              </div>
              <EChart ref="shapRef" :option="shapOption" height="300px" />
            </el-card>

            <el-card class="result-card" style="margin-top: 14px;">
              <h4>Traits Table (detail)</h4>
              <el-table :data="result.traits" size="small" stripe height="240">
                <el-table-column prop="trait" label="Trait" />
                <el-table-column prop="score" label="Score" sortable width="120">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.score >= 0.7 ? 'success' : row.score >= 0.4 ? 'warning' : 'info'">
                      {{ row.score }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>

          <el-empty v-else description="Results will appear here after analysis" class="empty-state" />
        </transition>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import EChart from "../components/EChart.vue";
import { mockPredictionResult } from "../mock/demoData";

const loading = ref(false);

const selectedDemo = ref("demo_s1");
const uploadedFileName = ref("");
const result = ref(null);

const probRef = ref(null);
const traitRef = ref(null);
const shapRef = ref(null);

const hasResult = computed(() => !!result.value);

function handleFileChange(file) {
  uploadedFileName.value = file?.name || "";
}

function buildSeed() {
  // 上传文件优先，否则用 demo 选择
  return uploadedFileName.value ? `FILE:${uploadedFileName.value}` : `DEMO:${selectedDemo.value}`;
}

async function startPrediction() {
  loading.value = true;
  try {
    // 这里先用 mock 结果保证展示完整（后续你接后端预测接口时，可在此处替换为 API 调用）
    const seed = buildSeed();
    result.value = mockPredictionResult(seed);
  } finally {
    loading.value = false;
  }
}

const probOption = computed(() => {
  const top = result.value?.top || [];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "40%", right: "8%", top: 20, bottom: 20 },
    xAxis: { type: "value", max: 1 },
    yAxis: { type: "category", data: top.map((x) => x.name) },
    series: [{ type: "bar", data: top.map((x) => x.prob) }],
  };
});

const traitOption = computed(() => {
  const t = result.value?.traits || [];
  return {
    tooltip: {},
    grid: { left: "10%", right: "8%", top: 20, bottom: 50 },
    xAxis: { type: "category", data: t.map((x) => x.trait), axisLabel: { rotate: 35 } },
    yAxis: { type: "value", min: 0, max: 1 },
    series: [{ type: "line", data: t.map((x) => x.score), areaStyle: { opacity: 0.15 } }],
  };
});

const shapOption = computed(() => {
  const s = result.value?.shap || [];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "35%", right: "10%", top: 20, bottom: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: s.map((x) => x.feature) },
    series: [{ type: "bar", data: s.map((x) => x.value) }],
  };
});

function exportChart(chartRef, filename) {
  const inst = chartRef?.value?.getInstance?.();
  if (!inst) return;
  const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
</script>

<style scoped>
.prediction-container { max-width: 1400px; margin: 20px auto; padding: 0 20px; }
.hero-box { padding: 16px 18px; border-radius: 10px; background: #f6f8fb; }
.upload-card { border-radius: 10px; }
.upload-area { text-align: center; }
.upload-icon { font-size: 44px; margin-bottom: 10px; color: #409EFF; }
.hint { color: #909399; margin: 6px 0 12px; font-size: 13px; }
.small-note { margin-top: 12px; color: #909399; font-size: 12px; text-align: left; }

.result-card { border-radius: 10px; }
.predicted { margin-top: 8px; }
.pred-name { font-size: 18px; font-weight: 800; color: #2c3e50; margin-bottom: 10px; }
.pred-sub { margin-top: 6px; color: #606266; }

.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.summary-item { background: #fafafa; border-radius: 8px; padding: 10px; }
.summary-item .k { color: #909399; font-size: 12px; }
.summary-item .v { font-weight: 800; margin-top: 4px; color: #303133; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.empty-state { margin-top: 100px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
