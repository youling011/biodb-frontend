diff --git a/frontend/src/router/index.js b/frontend/src/router/index.js
index fe1f8027017a252fcfaaf280d978ab040004d838..1499ae696d1f48ff8e9896537af715d3055bf3db 100644
--- a/frontend/src/router/index.js
+++ b/frontend/src/router/index.js
@@ -1,54 +1,60 @@
 import { createRouter, createWebHistory } from 'vue-router'
-import Home from '../views/Home.vue'
-import Browse from '../views/Browse.vue'
-import Analysis from '../views/Analysis.vue'           // 新增：分析模块聚合页
-import SpeciesDetail from '../views/SpeciesDetail.vue' // 单物种分析详情
-import MultiAnalysis from '../views/MultiAnalysis.vue' // 多物种对比
-import Prediction from '../views/Prediction.vue'
-import Help from '../views/Help.vue'
+const Home = () => import("../views/Home.vue");
+const Browse = () => import("../views/Browse.vue");
+const Analysis = () => import("../views/Analysis.vue");
+const SpeciesDetail = () => import("../views/SpeciesDetail.vue");
+const MultiAnalysis = () => import("../views/MultiAnalysis.vue");
+const Prediction = () => import("../views/Prediction.vue");
+const Help = () => import("../views/Help.vue");
+const Integration = () => import("../views/Integration.vue");
 
 const routes = [
     { 
         path: '/', 
         name: 'Home', 
         component: Home 
     },
     { 
         path: '/browse', 
         name: 'Browse', 
         component: Browse 
     },
     { 
         path: '/analysis', 
         name: 'Analysis', 
         component: Analysis 
     },
     { 
         path: '/species/:id', 
         name: 'SpeciesDetail', 
         component: SpeciesDetail, 
         props: true 
     },
     { 
         path: '/multi-analysis', 
         name: 'MultiAnalysis', 
         component: MultiAnalysis 
     },
     { 
         path: '/prediction', 
         name: 'Prediction', 
         component: Prediction 
     },
     { 
         path: '/help', 
         name: 'Help', 
         component: Help 
     },
+    {
+        path: '/integration',
+        name: 'Integration',
+        component: Integration
+    },
 ]
 
 const router = createRouter({
     history: createWebHistory(),
     routes
 })
 
-export default router
\ No newline at end of file
+export default router
