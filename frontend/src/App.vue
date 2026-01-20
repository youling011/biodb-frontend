<script setup>
import DataSourceBanner from './components/DataSourceBanner.vue'
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-inner">
        <div class="logo" @click="$router.push('/')">
          <div class="logo-icon">
            <el-icon :size="28"><Histogram /></el-icon>
          </div>
          <div class="logo-text">
            <span class="main-text">BioStoichDB</span>
            <span class="sub-text">Biological Stoichiometry Database</span>
          </div>
        </div>
        
        <el-menu 
          mode="horizontal" 
          :router="true" 
          :default-active="$route.path"
          background-color="transparent"
          text-color="#ffffff" 
          active-text-color="#ffd04b"
          class="nav-menu"
        >
          <el-menu-item index="/">Home</el-menu-item>
          <el-menu-item index="/browse">Browse Data</el-menu-item>
          <el-menu-item index="/analysis">Analysis Tools</el-menu-item>
          <el-menu-item index="/prediction">Prediction</el-menu-item>
          <el-menu-item index="/help">Help</el-menu-item>
        </el-menu>
      </div>
    </el-header>
    
    <el-main class="main-body">
      <DataSourceBanner />
      <router-view v-slot="{ Component }">
        <transition name="fade-transform" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>

    <el-footer class="app-footer">
      <div class="footer-content">
        <p>&copy; 2026 Ecological & Biological Stoichiometry Research Group.</p>
        <p class="footer-sub">Supported by Django & Vue3 | High-Performance Omics Analysis</p>
      </div>
    </el-footer>
  </el-container>
</template>

<style>
/* Global Resets & Theme */
:root {
  --primary-color: #409EFF;
  --header-bg: #004d80;
  --bg-gradient-start: #eef7ff; /* 浅蓝起始 */
  --bg-gradient-end: #ffffff;   /* 白色结束 */
}

body { 
  margin: 0; 
  padding: 0;
  font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
  /* 全局浅蓝色渐变背景 */
  background: linear-gradient(180deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
  background-attachment: fixed; /* 背景固定，内容滚动 */
  min-height: 100vh;
  color: #2c3e50;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header Styling */
.app-header {
  background: linear-gradient(90deg, #005c99 0%, #008080 100%); /* 深蓝绿渐变页眉 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 0 !important;
  height: 64px !important;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: white;
}

.logo-icon {
  background: rgba(255,255,255,0.2);
  padding: 8px;
  border-radius: 8px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.main-text { font-size: 1.2rem; font-weight: 700; letter-spacing: 0.5px; }
.sub-text { font-size: 0.75rem; opacity: 0.8; font-weight: 300; }

.nav-menu { border-bottom: none !important; min-width: 500px; justify-content: flex-end; }
.nav-menu .el-menu-item:hover { background-color: rgba(255,255,255,0.1) !important; }

/* Main Body */
.main-body {
  flex: 1;
  padding: 20px !important;
  overflow-x: hidden;
}

/* Footer */
.app-footer {
  background-color: #f0f4f8;
  border-top: 1px solid #dcdfe6;
  text-align: center;
  padding: 30px 0 !important;
  margin-top: auto;
}
.footer-content { color: #606266; font-size: 0.9rem; }
.footer-sub { font-size: 0.8rem; color: #909399; margin-top: 5px; }

/* Transitions */
.fade-transform-enter-active, .fade-transform-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-transform-enter-from { opacity: 0; transform: translateY(10px); }
.fade-transform-leave-to { opacity: 0; transform: translateY(-10px); }
</style>