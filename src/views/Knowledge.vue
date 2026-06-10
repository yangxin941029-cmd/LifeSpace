<template>
  <div class="voice-container">
    <!-- 顶部标题区 -->
    <header class="header">
      <h1>LifeSpace · 语音知识库</h1>
      <p class="subtitle">点击麦克风，说出你的想法，即刻保存</p>
    </header>

    <!-- 核心输入区 -->
    <main class="input-area">
      <!-- 标题输入 -->
      <input 
        v-model="currentNote.title" 
        placeholder="笔记标题 (可选)..." 
        class="title-input" 
        @blur="handleSave"
      />

      <!-- 内容显示/输入区 -->
      <div 
        ref="contentRef"
        contenteditable="true" 
        class="content-input" 
        placeholder="点击麦克风开始说话，或直接输入..."
        @input="onContentInput"
      >
        {{ currentNote.content || '' }}
      </div>

      <!-- 状态提示 -->
      <div class="status-bar">
        <span v-if="isListening" class="listening">🔴 正在聆听...</span>
        <span v-else class="saved">{{ saveStatus }}</span>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <button 
          class="mic-btn" 
          :class="{ active: isListening }" 
          @click="toggleVoice"
          :disabled="!isVoiceSupported"
        >
          <span v-if="isListening">⏹️</span>
          <span v-else>🎙️</span>
        </button>
        <p class="hint" v-if="!isVoiceSupported">当前浏览器不支持语音输入，请使用 Chrome</p>
      </div>
    </main>

    <!-- 历史列表 (极简折叠) -->
    <div class="history-toggle" @click="showHistory = !showHistory">
      {{ showHistory ? ' 收起历史' : ' 查看历史' }}
    </div>
    
    <div v-if="showHistory" class="history-list">
      <div 
        v-for="note in notes" 
        :key="note.id" 
        class="history-item"
        @click="loadNote(note)"
      >
        <strong>{{ note.title || '无标题' }}</strong>
        <span class="time">{{ new Date(note.updateTime).toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getAllNotes, saveNote, deleteNote } from '../utils/db'

const notes = ref([])
const currentNote = ref({ id: '', title: '', content: '' })
const isListening = ref(false)
const saveStatus = ref('已保存')
const showHistory = ref(false)
const isVoiceSupported = ref(true)

let recognition = null
let contentRef = null

// 初始化语音识别
const initVoice = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    isVoiceSupported.value = false
    return
  }

  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = true // 持续录音
  recognition.interimResults = true // 实时显示中间结果

  recognition.onstart = () => { isListening.value = true }
  recognition.onend = () => { isListening.value = false }
  
  recognition.onresult = (event) => {
    let finalTranscript = ''
    let interimTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    // 追加到当前内容
    if (finalTranscript) {
      currentNote.value.content = (currentNote.value.content || '') + finalTranscript + ' '
      handleSave() // 语音输入一段后自动保存
    }
    
    // 更新 DOM 显示 (因为 contenteditable 双向绑定比较复杂，这里直接操作 DOM)
    if (contentRef.value) {
      contentRef.value.textContent = currentNote.value.content || ''
    }
  }

  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error)
    isListening.value = false
    if (event.error === 'not-allowed') {
      alert('请允许麦克风权限')
    }
  }
}

const toggleVoice = () => {
  if (!recognition) return
  
  if (isListening.value) {
    recognition.stop()
  } else {
    // 如果没有内容，创建一个新笔记
    if (!currentNote.value.id) {
      createNewNote()
    }
    recognition.start()
  }
}

const createNewNote = async () => {
  currentNote.value = {
    id: Date.now().toString(),
    title: '',
    content: '',
    updateTime: new Date().toISOString()
  }
  if (contentRef.value) contentRef.value.textContent = ''
}

const onContentInput = () => {
  if (contentRef.value) {
    currentNote.value.content = contentRef.value.textContent
  }
  handleSave()
}

let saveTimer
const handleSave = async () => {
  if (!currentNote.value.id) return
  saveStatus.value = '保存中...'
  
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      currentNote.value.updateTime = new Date().toISOString()
      await saveNote(currentNote.value) // Calls the imported DB function
      saveStatus.value = '✅ 已保存'
      loadNotes() // 刷新列表
    } catch (e) {
      saveStatus.value = '❌ 保存失败'
    }
  }, 1000)
}

const loadNotes = async () => {
  try {
    notes.value = await getAllNotes()
  } catch (e) {
    console.error(e)
  }
}

const loadNote = (note) => {
  currentNote.value = { ...note }
  if (contentRef.value) contentRef.value.textContent = note.content || ''
  showHistory.value = false
}

onMounted(() => {
  initVoice()
  loadNotes()
  // 默认加载最新的一条，或者新建一条
  if (notes.value.length > 0) {
    loadNote(notes.value[0])
  } else {
    createNewNote()
  }
})

onUnmounted(() => {
  if (recognition) recognition.stop()
})
</script>

<style scoped>
.voice-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}
.header h1 { margin: 0; font-size: 28px; color: #333; }
.subtitle { color: #888; margin-top: 10px; }

.input-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  padding: 20px;
  overflow: hidden;
}

.title-input {
  border: none;
  border-bottom: 1px solid #eee;
  padding: 10px 0;
  font-size: 24px;
  font-weight: bold;
  outline: none;
  width: 100%;
  margin-bottom: 15px;
}

.content-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 18px;
  line-height: 1.6;
  resize: none;
  overflow-y: auto;
  color: #444;
  min-height: 200px;
}
.content-input:empty:before {
  content: attr(placeholder);
  color: #ccc;
}

.status-bar {
  height: 30px;
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}
.listening { color: #f56c6c; font-weight: bold; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.5; } }

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.mic-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: #409eff;
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-btn.active {
  background: #f56c6c;
  transform: scale(1.1);
}
.mic-btn:disabled { background: #ccc; cursor: not-allowed; }

.hint { color: #999; font-size: 12px; }

.history-toggle {
  text-align: center;
  padding: 10px;
  cursor: pointer;
  color: #409eff;
  font-weight: bold;
}
.history-list {
  max-height: 200px;
  overflow-y: auto;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px;
}
.history-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}
.history-item:hover { background: #eef; }
.history-item .time { font-size: 12px; color: #999; }
</style>
