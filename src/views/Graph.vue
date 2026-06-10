<template>
  <div class="graph-container">
    <div class="graph-header">
      <h2>知识网络</h2>
      <div class="filters">
        <el-tag
          v-for="cat in categories"
          :key="cat"
          :type="getCategoryType(cat)"
          :effect="activeCategory === cat ? 'dark' : 'plain'"
          @click="toggleCategory(cat)"
          style="cursor: pointer; margin-right: 8px;"
        >
          {{ cat }}
        </el-tag>
        <el-button size="small" @click="resetFilter" type="info">重置</el-button>
      </div>
    </div>
    
    <div ref="chartRef" class="chart-box"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

// 内联 Mock 数据，避免外部文件路径问题
const graphData = {
  "nodes": [
    { "id": "1", "title": "Vue3 核心概念", "content": "Vue3 采用 Composition API 模式，支持响应式系统、组件化开发。", "category": "技术", "tags": ["前端", "框架"] },
    { "id": "2", "title": "IndexedDB 本地存储", "content": "浏览器提供的本地数据库，支持存储大量结构化数据。", "category": "技术", "tags": ["存储", "WebAPI"] },
    { "id": "3", "title": "Vditor Markdown 编辑器", "content": "开源 Markdown 编辑器，支持即时渲染、数学公式。", "category": "技术", "tags": ["工具", "编辑器"] },
    { "id": "4", "title": "GitHub Pages 部署", "content": "免费部署静态网站到 github.io 域名。", "category": "技术", "tags": ["部署", "CI/CD"] },
    { "id": "5", "title": "语音识别 API", "content": "浏览器内置语音识别接口，支持实时转写。", "category": "技术", "tags": ["语音", "AI"] },
    { "id": "6", "title": "时间管理方法论", "content": "采用番茄工作法，结合任务优先级矩阵提升效率。", "category": "生活", "tags": ["效率", "习惯"] },
    { "id": "7", "title": "健康作息指南", "content": "保持每天 7-8 小时睡眠，规律饮食，每周运动。", "category": "生活", "tags": ["健康", "养生"] },
    { "id": "8", "title": "阅读清单 (2026)", "content": "计划阅读：《人月神话》《深度工作》《原则》。", "category": "生活", "tags": ["阅读", "成长"] },
    { "id": "9", "title": "LifeSpace 项目规划", "content": "打造个人知识/心情/工作管理平台。", "category": "工作", "tags": ["项目", "开发"] },
    { "id": "10", "title": "团队协作工具选型", "content": "对比 Notion、飞书文档，选择飞书作为协作平台。", "category": "工作", "tags": ["工具", "协作"] },
    { "id": "11", "title": "需求分析流程", "content": "采用用户故事地图 + 用例图梳理需求。", "category": "工作", "tags": ["需求", "流程"] },
    { "id": "12", "title": "Vue3 + IndexedDB 实践", "content": "在 LifeSpace 项目中结合 Vue3 和 IndexedDB。", "category": "技术", "tags": ["项目实践"] },
    { "id": "13", "title": "语音输入与时间管理", "content": "利用语音输入快速记录灵感，提升碎片时间利用率。", "category": "交叉领域", "tags": ["技术", "生活"] },
    { "id": "14", "title": "项目部署与 Actions", "content": "通过 GitHub Actions 实现自动构建并部署。", "category": "技术", "tags": ["自动化", "部署"] }
  ],
  "edges": [
    { "source": "1", "target": "3", "relation": "技术栈组合", "description": "Vue3 项目中可集成 Vditor 编辑器" },
    { "source": "1", "target": "12", "relation": "实践应用", "description": "Vue3 在 LifeSpace 项目中的具体实现" },
    { "source": "2", "target": "12", "relation": "实践应用", "description": "IndexedDB 在 LifeSpace 项目中用于笔记存储" },
    { "source": "4", "target": "14", "relation": "流程关联", "description": "GitHub Pages 配合 Actions 实现自动化部署" },
    { "source": "5", "target": "13", "relation": "场景结合", "description": "语音输入技术应用于时间管理场景" },
    { "source": "6", "target": "13", "relation": "场景结合", "description": "时间管理方法论指导语音输入的使用方式" },
    { "source": "7", "target": "6", "relation": "支撑关系", "description": "健康作息为时间管理提供身体基础" },
    { "source": "8", "target": "6", "relation": "目标关联", "description": "阅读清单是时间管理实践的具体目标" },
    { "source": "9", "target": "1", "relation": "技术选型", "description": "LifeSpace 项目采用 Vue3 作为前端框架" },
    { "source": "9", "target": "2", "relation": "技术选型", "description": "LifeSpace 项目使用 IndexedDB 存储笔记" },
    { "source": "9", "target": "5", "relation": "功能实现", "description": "LifeSpace 通过语音识别 API 实现语音输入" },
    { "source": "10", "target": "11", "relation": "流程指导", "description": "需求分析流程为工具选型提供决策依据" },
    { "source": "12", "target": "14", "relation": "项目交付", "description": "项目开发完成后通过 Actions 部署到 Pages" },
    { "source": "13", "target": "9", "relation": "功能规划", "description": "语音输入与时间管理的结合是 LifeSpace 的功能规划之一" }
  ]
}

const chartRef = ref(null)
let chart = null

const categories = ['技术', '生活', '工作', '交叉领域']
const activeCategory = ref('')

const categoryColor = {
  '技术': '#409EFF',
  '生活': '#67C23A',
  '工作': '#E6A23C',
  '交叉领域': '#F56C6C'
}

const getCategoryType = (cat) => {
  const map = { '技术': '', '生活': 'success', '工作': 'warning', '交叉领域': 'danger' }
  return map[cat] || 'info'
}

const toggleCategory = (cat) => {
  activeCategory.value = activeCategory.value === cat ? '' : cat
  updateChart()
}

const resetFilter = () => {
  activeCategory.value = ''
  updateChart()
}

const updateChart = () => {
  if (!chart) return

  let nodes = graphData.nodes
  let edges = graphData.edges

  if (activeCategory.value) {
    const activeNodeIds = new Set(nodes.filter(n => n.category === activeCategory.value).map(n => n.id))
    const relatedNodeIds = new Set()
    activeNodeIds.forEach(id => {
      relatedNodeIds.add(id)
      edges.forEach(e => {
        if (e.source === id) relatedNodeIds.add(e.target)
        if (e.target === id) relatedNodeIds.add(e.source)
      })
    })
    nodes = nodes.filter(n => relatedNodeIds.has(n.id))
    const nodeIds = new Set(nodes.map(n => n.id))
    edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        if (params.dataType === 'edge') {
          return `${params.data.source} ➔ ${params.data.target}<br/>${params.data.relation}: ${params.data.description}`
        }
        const data = params.data
        return `<b>${data.name}</b><br/>分类：${data.category}<br/>标签：${(data.tags || []).join(', ')}<br/>${data.content}`
      }
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: nodes.map(node => ({
          id: node.id,
          name: node.title,
          category: node.category,
          content: node.content,
          tags: node.tags,
          symbolSize: 40,
          itemStyle: {
            color: categoryColor[node.category] || '#999'
          },
          label: {
            show: true,
            position: 'bottom',
            formatter: '{b}'
          }
        })),
        links: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          relation: edge.relation,
          description: edge.description,
          label: {
            show: true,
            formatter: edge.relation,
            fontSize: 10
          },
          lineStyle: {
            color: '#ccc',
            curveness: 0.2
          }
        })),
        roam: true,
        draggable: true,
        force: {
          repulsion: 500,
          edgeLength: 150,
          gravity: 0.1
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 3
          }
        }
      }
    ]
  }

  chart.setOption(option)
}

onMounted(() => {
  chart = echarts.init(chartRef.value)
  updateChart()
  window.addEventListener('resize', () => chart.resize())
})

onUnmounted(() => {
  if (chart) chart.dispose()
  window.removeEventListener('resize', () => chart.resize())
})
</script>

<style scoped>
.graph-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  border-radius: 8px;
  padding: 20px;
  box-sizing: border-box;
}

.graph-header {
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.graph-header h2 {
  margin: 0;
  font-size: 20px;
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.chart-box {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  min-height: 400px;
}
</style>
