import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Knowledge',
    component: () => import('../views/Knowledge.vue'),
    meta: { title: '知识库', icon: 'Document' }
  },
  {
    path: '/graph',
    name: 'Graph',
    component: () => import('../views/Graph.vue'),
    meta: { title: '知识图谱', icon: 'Connection' }
  },
  {
    path: '/mood',
    name: 'Mood',
    component: () => import('../views/Mood.vue'),
    meta: { title: '心情日记', icon: 'Sunny' }
  },
  {
    path: '/work',
    name: 'Work',
    component: () => import('../views/Work.vue'),
    meta: { title: '工作台', icon: 'Briefcase' }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // Use hash mode for GitHub Pages
  routes
})

export default router
