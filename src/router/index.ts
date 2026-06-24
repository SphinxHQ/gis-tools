/**
 * @file Vue Router configuration
 * @description Defines the application routes and router instance with HTML5 history mode
 *              under the /gis-tools/ base path. Includes a beforeEach guard for document title.
 * @author yuanyu <yuanyu@supermap.com>
 * @date 2026-04-13
 */
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
