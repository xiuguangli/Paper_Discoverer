import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import PaperView from '../views/PaperView.vue'
import NotFound from '../views/NotFoundView.vue'

interface RouteMeta {
  title: string
  [key: string]: unknown
  [key: symbol]: unknown
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'papers',
    component: PaperView,
    meta: {
      title: '论文列表'
    } as RouteMeta
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '404 Not Found'
    } as RouteMeta
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = (to.meta?.title as string) || '论文管理系统'
  next()
})

export default router
