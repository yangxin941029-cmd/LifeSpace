<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo">LifeSpace</div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/">
          <el-icon><document /></el-icon>
          <span>知识库</span>
        </el-menu-item>
        <el-menu-item index="/mood">
          <el-icon><sunny /></el-icon>
          <span>心情日记</span>
        </el-menu-item>
        <el-menu-item index="/work">
          <el-icon><briefcase /></el-icon>
          <span>工作台</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.sidebar {
  background-color: #304156;
  color: white;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  background-color: #263445;
}
.el-menu-vertical:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
