import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Browse from '../views/Browse.vue'
import Analysis from '../views/Analysis.vue'           // 新增：分析模块聚合页
import SpeciesDetail from '../views/SpeciesDetail.vue' // 单物种分析详情
import MultiAnalysis from '../views/MultiAnalysis.vue' // 多物种对比
import Prediction from '../views/Prediction.vue'
import Help from '../views/Help.vue'

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
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router