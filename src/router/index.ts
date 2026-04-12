import {createRouter, createWebHistory} from 'vue-router'


export const constantRoutes = [

    {
        path: '/',
        name: 'GisData',
        component: () => import('~/components/data/GisData.vue'),
        // component: () => import('~/components/Home.vue'),
    },
    {
        path: '/data',
        name: 'GisDataReader',
        component: () => import('~/components/data/GisData.vue'),
    },
]

const router = createRouter({
    history: createWebHistory('/gis-tools/'),
    routes: [...constantRoutes]
})
const title = 'Gis Tools';
router.beforeEach((to, _from, next) => {
    const _title: string = (to?.meta?.title as string) || (to?.name as string) || '';
    document.title = _title ? `${title} - ${_title}` : title;
    next();
})

export default router;
