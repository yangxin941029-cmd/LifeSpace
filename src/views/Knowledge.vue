<template>
  <div class="knowledge-container">
    <!-- 左侧笔记列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <el-input
          v-model="searchQuery"
          placeholder="搜索笔记..."
          prefix-icon="Search"
          clearable
          size="default"
        />
        <el-button type="primary" :icon="Plus" circle @click="createNote" class="add-btn" />
      </div>
      
      <div class="note-list" v-if="filteredNotes.length > 0">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-item"
          :class="{ active: currentNote && currentNote.id === note.id }"
          @click="selectNote(note.id)"
        >
          <div class="note-title">{{ note.title || '无标题笔记' }}</div>
          <div class="note-meta">
            <span class="note-date">{{ formatDate(note.updateTime) }}</span>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无笔记，点击 + 创建" :image-size="100" />
    </div>

    <!-- 右侧编辑器区域 -->
    <div class="editor-area">
      <div v-if="currentNote" class="editor-header">
        <el-input
          v-model="currentNote.title"
          placeholder="输入笔记标题..."
          class="title-input"
          @blur="saveCurrentNote"
          @keyup.enter="saveCurrentNote"
        />
        <div class="editor-actions">
          <span class="save-status">{{ saveStatus }}</span>
          <el-button type="danger" :icon="Delete" text @click="confirmDelete">删除</el-button>
        </div>
      </div>

      <div v-if="currentNote" id="vditor-container" class="vditor-wrapper"></div>
      <el-empty v-else description="选择或创建一个笔记开始记录" :image-size="150" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Plus, Delete, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { getAllNotes, getNote, saveNote, deleteNote } from '../utils/db'

// 状态
const notes = ref([])
const currentNote = ref(null)
const searchQuery = ref('')
const saveStatus = ref('')
let vditor = null

// 过滤笔记
const filteredNotes = computed(() => {
  if (!searchQuery.value) return notes.value
  const query = searchQuery.value.toLowerCase()
  return notes.value.filter(note => 
    (note.title && note.title.toLowerCase().includes(query)) || 
    (note.content && note.content.toLowerCase().includes(query))
  )
})

// 格式化日期
const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// 加载笔记列表
const loadNotes = async () => {
  try {
    notes.value = await getAllNotes()
  } catch (error) {
    console.error('加载笔记失败:', error)
    ElMessage.error('加载笔记失败')
  }
}

// 创建新笔记
const createNote = async () => {
  const newNote = {
    id: Date.now().toString(),
    title: '新笔记',
    content: '# 新笔记\n\n开始你的创作...',
    updateTime: new Date().toISOString()
  }
  try {
    await saveNote(newNote)
    await loadNotes()
    selectNote(newNote.id)
    ElMessage.success('笔记已创建')
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

// 选择笔记
const selectNote = async (id) => {
  try {
    currentNote.value = await getNote(id)
    await nextTick() // 等待 DOM 更新
    initVditor(currentNote.value.content)
  } catch (error) {
    ElMessage.error('加载笔记内容失败')
  }
}

// 初始化 Vditor
const initVditor = (content) => {
  if (vditor) {
    vditor.destroy()
  }
  
  vditor = new Vditor('vditor-container', {
    height: '100%',
    mode: 'ir', // 即时渲染模式
    cache: { enable: false }, // 禁用默认缓存，使用我们的 IndexedDB
    placeholder: '支持 Markdown 语法...',
    toolbar: [
      'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
      'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
      'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
      'upload', 'record', 'table', '|',
      'undo', 'redo', '|',
      'fullscreen', 'edit-mode', 'both', 'preview', 'outline', 'code-theme', 'content-theme', 'export',
      'devtools', 'help'
    ],
    preview: {
      markdown: {
        toc: true, // 目录
        mark: true, // 高亮
        math: { engine: 'KaTeX' }, // 数学公式
      },
      hljs: { style: 'github' }, // 代码高亮
    },
    input: (value) => {
      if (currentNote.value) {
        currentNote.value.content = value
        saveCurrentNote()
      }
    },
    after: () => {
      if (content) {
        vditor.setValue(content)
      }
    }
  })
}

// 保存当前笔记（防抖逻辑简化为直接调用，实际可加 debounce）
let saveTimer = null
const saveCurrentNote = async () => {
  if (!currentNote.value) return
  
  saveStatus.value = '保存中...'
  clearTimeout(saveTimer)
  
  // 简单防抖，300ms 后保存
  saveTimer = setTimeout(async () => {
    try {
      // 同步标题，防止标题修改了但内容没变导致不触发 input
      const noteToSave = { ...currentNote.value }
      if (vditor) {
        noteToSave.content = vditor.getValue()
      }
      
      await saveNote(noteToSave)
      saveStatus.value = '已保存'
      // 更新列表中的 updateTime 和 title
      await loadNotes()
    } catch (error) {
      saveStatus.value = '保存失败'
      console.error(error)
    }
  }, 500)
}

// 删除笔记
const confirmDelete = async () => {
  if (!currentNote.value) return
  
  ElMessageBox.confirm(
    `确定要删除笔记 "${currentNote.value.title}" 吗？此操作无法撤销。`,
    '警告',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await deleteNote(currentNote.value.id)
      if (vditor) vditor.destroy()
      vditor = null
      currentNote.value = null
      await loadNotes()
      ElMessage.success('笔记已删除')
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 监听标题变化
watch(() => currentNote.value?.title, () => {
  saveCurrentNote()
})

// 初始化
onMounted(() => {
  loadNotes()
})
</script>

<style scoped>
.knowledge-container {
  display: flex;
  height: 100%;
  background-color: #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 15px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  gap: 10px;
}

.add-btn {
  flex-shrink: 0;
}

.note-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.note-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.note-item:hover {
  background-color: #f5f7fa;
}

.note-item.active {
  background-color: #ecf5ff;
  border-left: 3px solid #409eff;
}

.note-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-meta {
  font-size: 12px;
  color: #909399;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  position: relative;
}

.editor-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  gap: 15px;
}

.title-input {
  flex: 1;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding-left: 0;
}

.title-input :deep(.el-input__inner) {
  font-size: 20px;
  font-weight: bold;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.save-status {
  font-size: 12px;
  color: #67c23a;
}

.vditor-wrapper {
  flex: 1;
  overflow: hidden;
}

/* 覆盖 Vditor 样式以适应布局 */
:deep(.vditor) {
  border: none !important;
}
:deep(.vditor-toolbar) {
  border-bottom: 1px solid #e6e6e6 !important;
  background-color: #fafafa !important;
}
</style>
