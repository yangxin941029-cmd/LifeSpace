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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import graphData from '../../mock-data.json'

const chartRef = ref(null)
let chart = null

const categories = ['技术', '生活', '工作', '交叉领域']
const activeCategory = ref('')

// 颜色映射
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
    // 过滤节点
    const activeNodeIds = new Set(nodes.filter(n => n.category === activeCategory.value).map(n => n.id))
    
    // 过滤边：只要边连接的节点都在激活的节点集中，或者至少有一个节点是激活分类的
    // 这里为了网络完整性，我们显示所有与当前分类相关的节点及其连接
    // 简单策略：只显示当前分类的节点，以及它们之间的连接，或者它们连接到其他节点的连线（但其他节点隐藏？）
    // 更好的策略：显示当前分类节点 + 它们直接连接的邻居节点。
    
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
    legend: {
      show: false // 使用自定义 Tag 过滤
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
          symbolSize: 40 + (node.content ? 10 : 0),
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
        categories: categories.map(c => ({ name: c })),
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
