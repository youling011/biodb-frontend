import { createRouter, createWebHistory } from 'vue-router'
const Home = () => import("../views/Home.vue");
const Browse = () => import("../views/Browse.vue");
const Analysis = () => import("../views/Analysis.vue");
const SpeciesDetail = () => import("../views/SpeciesDetail.vue");
const MultiAnalysis = () => import("../views/MultiAnalysis.vue");
const Prediction = () => import("../views/Prediction.vue");
const Help = () => import("../views/Help.vue");
const Integration = () => import("../views/Integration.vue");

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
    {
        path: '/integration',
        name: 'Integration',
        component: Integration
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
