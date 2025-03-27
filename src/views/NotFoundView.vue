<template>
  <div class="not-found">
    <h1 class="error-code">404</h1>
    <h2 class="error-title">页面未找到</h2>
    <p class="error-message">抱歉，您访问的页面不存在。</p>
    <router-link to="/" class="home-link">返回首页</router-link>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
  padding: 20px;
}

.error-code {
  font-size: 6rem;
  font-weight: bold;
  color: #e74c3c;
  margin: 0;
}

.error-title {
  font-size: 2rem;
  color: #2c3e50;
  margin: 1rem 0;
}

.error-message {
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.home-link {
  display: inline-block;
  padding: 12px 24px;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.home-link:hover {
  background-color: #2980b9;
}
</style>