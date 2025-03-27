<template>
  <div class="paper-container">
    <h1>顶会学术论文库</h1>
    
    <!-- 选择区域 -->
    <div class="select-bar">
      <!-- 左侧会议和年份选择 -->
      <div class="left-controls">
      </div>

      <!-- 中间会议和年份选择 -->
      <div class="center-controls">
        <select v-model="selectedConference" @change="loadData" class="select-input">
          <option v-for="conf in conferences" :key="conf" :value="conf">
            {{ conf.toUpperCase() }}
          </option>
        </select>
        <select v-model="selectedYear" @change="loadData" class="select-input">
          <option v-for="year in conferenceYears[selectedConference] || []" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
        <div class="paper-count">{{ selectedYear }}年{{ selectedConference.toUpperCase() }}共{{ papers.length }}篇论文</div>
      </div>

      <!-- 右侧列显示控制 -->
      <div class="right-controls">
        <div class="page-size-control">
          <select v-model="pageSize" class="select-input">
            <option :value="10">10条/页</option>
            <option :value="50">50条/页</option>
            <option :value="100">100条/页</option>
            <option :value="papers.length">全部</option>
          </select>
        </div>
        <div class="column-control">
          <button @click="showColumnSelector = !showColumnSelector" class="column-control-btn">
            显示列 ▼
          </button>
          <div v-if="showColumnSelector" class="column-selector">
            <!-- 添加全选选项 -->
            <div class="column-option">
              <label>
                <input 
                  type="checkbox" 
                  :checked="isAllColumnsSelected"
                  @change="toggleAllColumns"
                >
                全选
              </label>
            </div>
            <!-- 分隔线 -->
            <div class="column-divider"></div>
            <div v-for="column in columns" :key="column.key" class="column-option">
              <label>
                <input 
                  type="checkbox" 
                  v-model="column.visible"
                  :disabled="column.key === 'order'"
                >
                {{ column.label }}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 加载提示 -->
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载论文数据...</p>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadData" class="retry-btn">重试</button>
      </div>

      <!-- 论文列表 -->
      <div v-else-if="papers.length > 0" class="table-container">
        <table>
          <thead>
            <tr>
              <th 
                v-for="column in columns" 
                :key="column.key" 
                v-show="column.visible"
                :style="{ width: columnWidths[column.key] + 'px' }"
              >
                <!-- 搜索输入框容器 -->
                <div class="search-container">
                  <input 
                    v-if="column.key !== 'actions'"
                    type="text" 
                    v-model="columnSearches[column.key]" 
                    :placeholder="'搜索' + column.label"
                    class="column-search-input"
                    @input="handleColumnSearch(column.key)"
                  >
                  <!-- 搜索结果数量显示 -->
                  <div v-if="column.key !== 'actions'"
                       class="search-result-count"
                       :class="{ 'no-results': columnSearchResults[column.key] === 0 && columnSearches[column.key], 'default-count': !columnSearches[column.key] }">
                    #:{{ columnSearches[column.key] ? columnSearchResults[column.key] : papers.length }}
                  </div>
                </div>
              </th>
            </tr>
            <tr>
              <th 
                v-for="column in columns" 
                :key="column.key" 
                v-show="column.visible"
                :class="{ sortable: column.sortable }"
                :style="{ width: columnWidths[column.key] + 'px' }"
                @click="column.sortable && sortPapers(column.key)"
              >
                <div class="th-content">
                  {{ column.label }}
                  <span v-if="column.sortable" class="sort-icon" :class="{ active: sortField === column.key }">
                    {{ sortField === column.key ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </div>
                <div class="resizer" @mousedown="startResize($event, column.key)"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="paper in paginatedPapers" :key="paper.order">
              <td v-for="column in columns" 
                  :key="column.key"
                  v-show="column.visible"
                  :class="{ 
                    'expandable-cell': ['abstract', 'motivation', 'method', 'concepts'].includes(column.key),
                    'center-align': column.key === 'order'
                  }"
              >
                <div v-if="column.key === 'actions'" class="action-buttons">
                  <a v-if="paper.pdf" :href="paper.pdf" target="_blank" class="btn pdf">
                    <img src="@/assets/PDF.png" alt="PDF" class="action-icon">
                  </a>
                  <a v-if="paper.html" :href="paper.html" target="_blank" class="btn web">
                    <img src="@/assets/html_page.png" alt="网页" class="action-icon">
                  </a>
                </div>
                <div v-else-if="['abstract', 'motivation','question', 'method', 'concepts'].includes(column.key)" 
                     class="truncated-content" 
                     @click="showPopup(column.label, paper[fieldMap[column.key]] || paper[column.key])">
                  <div v-html="highlightSearchText(truncateText(paper[fieldMap[column.key]] || paper[column.key], column.key === 'abstract' ? 40 : 20), activeSearchTerm)"></div>
                </div>
                <div v-else-if="column.key === 'order'" class="order-cell">
                  <span v-html="highlightSearchText(formatValue(paper[column.key]), activeSearchTerm)"></span>
                </div>
                <div v-else>
                  <span v-html="highlightSearchText(formatValue(paper[fieldMap[column.key]] || paper[column.key]), activeSearchTerm)"></span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空数据提示 -->
      <div v-else class="empty">
        <p>暂无数据</p>
      </div>

      <!-- 分页控制 -->
      <div v-if="papers.length > 0" class="pagination">
        <button 
          @click="currentPage--" 
          :disabled="currentPage <= 1"
          class="page-btn"
        >上一页</button>
        <span>{{ currentPage }} / {{ totalPages }}</span>
        <button 
          @click="currentPage++" 
          :disabled="currentPage >= totalPages"
          class="page-btn"
        >下一页</button>
      </div>
    </div>

    <!-- 添加弹出框组件 -->
    <div v-if="expandedContent.show" class="popup-overlay" @click="closePopup">
      <div class="popup-content" @click.stop>
        <div class="popup-header">
          <h3>{{ expandedContent.title }}</h3>
          <button class="close-btn" @click="closePopup">×</button>
        </div>
        <div class="popup-body" style="white-space: pre-line;">
          <span v-html="highlightSearchText(expandedContent.content, activeSearchTerm)"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

// 状态变量
const papers = ref([]);
const loading = ref(true);
const error = ref(null);
const currentPage = ref(1);
const pageSize = ref(10);

// 会议和年份的动态数据
const conferences = ref([]);
const conferenceYears = ref({});

// 监听pageSize变化
watch(pageSize, () => {
  currentPage.value = 1;  // 重置到第一页
});

const selectedConference = ref('');
const selectedYear = ref('');

// 监听会议变化，更新可选的年份
watch(selectedConference, () => {
  if (selectedConference.value && conferenceYears.value[selectedConference.value]) {
    const years = conferenceYears.value[selectedConference.value];
    selectedYear.value = years[0] || '';
  }
});

// 添加排序状态
const sortField = ref('order');  // 当前排序字段
const sortOrder = ref('asc');    // 排序方向：asc 或 desc

// 添加列宽调整相关的状态
const columnWidths = ref({
  order: 60,
  title: 200,
  chineseTitle: 150,
  abstract: 200,
  field: 80,
  question: 100,
  motivation: 120,
  method: 120,
  keywords: 100,
  concepts: 120,
  actions: 60
});

const isResizing = ref(false);
const currentResizingColumn = ref(null);
const startX = ref(0);
const startWidth = ref(0);

// 列选择器显示状态
const showColumnSelector = ref(false);

// 添加列显示控制状态
const columns = ref([
  { key: 'order', label: '序号', visible: true, sortable: true },
  { key: 'title', label: '标题', visible: true, sortable: true },
  { key: 'chineseTitle', label: '中文标题', visible: true, sortable: true },
  { key: 'abstract', label: '摘要翻译', visible: true, sortable: false },
  { key: 'field', label: '领域', visible: true, sortable: true },
  { key: 'question', label: '问题', visible: true, sortable: false },
  { key: 'motivation', label: '动机', visible: true, sortable: false },
  { key: 'method', label: '方法', visible: true, sortable: false },
  { key: 'keywords', label: '关键词', visible: true, sortable: false },
  { key: 'concepts', label: '涉及的技术概念', visible: true, sortable: false },
  { key: 'actions', label: '网址', visible: true, sortable: false }
]);

// 添加搜索相关的状态
const searchText = ref('');
const searchColumn = ref('title');

// 在 script setup 部分，将 fieldMap 移到顶部
const fieldMap = {
  'title': 'title',
  'chineseTitle': '中文标题',
  'abstract': '摘要翻译',
  'field': '领域',
  'question': '问题',
  'motivation': '动机',
  'method': '方法',
  'keywords': '关键词',
  'concepts': '涉及的技术概念'
};

// 添加列搜索状态
const columnSearches = ref({});

// 当前有效的搜索词
const activeSearchTerm = computed(() => {
  for (const column of columns.value) {
    if (column.key !== 'actions' && columnSearches.value[column.key] && columnSearches.value[column.key].trim() !== '') {
      const searchTerm = columnSearches.value[column.key].trim();
      console.log('当前搜索词:', searchTerm);
      return searchTerm;
    }
  }
  return '';
});

// 初始化列搜索对象
columns.value.forEach(column => {
  columnSearches.value[column.key] = '';
});

// 计算每列的搜索结果数
const columnSearchResults = computed(() => {
  const results = {};
  
  columns.value.forEach(column => {
    if (column.key === 'actions') return;
    
    if (columnSearches.value[column.key]) {
      // 当该列有搜索内容时，计算匹配的行数
      const searchText = columnSearches.value[column.key].toLowerCase();
      results[column.key] = papers.value.filter(paper => {
        const value = column.key === 'order' ? 
          paper[column.key] : 
          formatValue(paper[fieldMap[column.key]] || paper[column.key]);
        const valueLower = String(value).toLowerCase();
        return valueLower.includes(searchText);
      }).length;
    } else {
      results[column.key] = 0;
    }
  });
  
  return results;
});

// 格式化数据显示
function formatValue(value) {
  if (value === 0) return '0';  // 特别处理序号为0的情况
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    // 处理字典类型数据
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${val}`)
      .join('\n');
  }
  return String(value);
}

// 文本截断函数
function truncateText(text, maxLength) {
  const str = formatValue(text);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

// 修改过滤逻辑
const filteredPapers = computed(() => {
  // 找到当前有搜索内容的列
  const activeSearchColumn = columns.value.find(column => 
    column.key !== 'actions' && columnSearches.value[column.key] && columnSearches.value[column.key].trim() !== ''
  );
  
  // 如果没有任何列有搜索内容，返回所有论文
  if (!activeSearchColumn) return papers.value;
  
  // 否则只根据当前搜索列进行过滤
  const column = activeSearchColumn;
  const searchText = columnSearches.value[column.key].trim().toLowerCase();
  
  return papers.value.filter(paper => {
    let valueToSearch = column.key === 'order' ? 
      paper[column.key] : 
      paper[fieldMap[column.key]] || paper[column.key];
      
    // 确保值是字符串
    valueToSearch = String(valueToSearch || '');
    
    return valueToSearch.toLowerCase().includes(searchText);
  });
});

// 修改分页计算逻辑，使用过滤后的数据
const totalPages = computed(() => Math.ceil(filteredPapers.value.length / pageSize.value));
const paginatedPapers = computed(() => {
  // 首先对过滤后的数组进行排序
  const sortedPapers = [...filteredPapers.value].sort((a, b) => {
    let aValue = sortField.value === 'order' ? 
      a[sortField.value] : 
      formatValue(a[sortField.value] || a[fieldMap[sortField.value]]);
    let bValue = sortField.value === 'order' ? 
      b[sortField.value] : 
      formatValue(b[sortField.value] || b[fieldMap[sortField.value]]);
    
    // 对于序号，进行数字比较
    if (sortField.value === 'order') {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }
    
    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // 然后进行分页
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return sortedPapers.slice(start, end);
});

// 加载数据
const loadData = async () => {
  if (!selectedConference.value || !selectedYear.value) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    // 构建文件名
    const fileName = `${selectedConference.value}_papersinfo_${selectedYear.value}.json`;
    const basePath = import.meta.env.PROD ? '/Paper_Discoverer' : '';
    
    // 使用fetch直接获取JSON文件
    try {
      // 从public/assets目录加载
      const response = await fetch(`${basePath}/assets/paper_info/${fileName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      papers.value = await response.json();
    } catch (fetchError) {
      console.error('Failed to fetch JSON file:', fetchError);
      error.value = `无法加载数据文件: ${fileName}`;
      papers.value = [];
    }
    
    // 初始化搜索结果计数
    updateColumnSearchResults();
    
  } catch (err) {
    console.error('加载数据错误:', err);
    error.value = `无法加载数据: ${err.message}`;
    papers.value = [];
  } finally {
    loading.value = false;
  }
};

// 修复会议和年份数据加载
const loadConferencesAndYears = async () => {
  try {
    // 手动设置可用的会议和年份
    const confYearMap = {
      'cvpr': ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2015'],
      'iccv': ['2023', '2021', '2019']
    };
    
    // 更新状态
    conferences.value = Object.keys(confYearMap).sort();
    conferenceYears.value = confYearMap;
    
    console.log('可用会议:', conferences.value);
    console.log('会议年份映射:', conferenceYears.value);
    
    // 设置默认选择
    if (conferences.value.length > 0) {
      selectedConference.value = conferences.value[0];
      const years = conferenceYears.value[selectedConference.value];
      if (years && years.length > 0) {
        selectedYear.value = years[0];
      }
    }
    
    // 加载初始数据
    await loadData();
    
  } catch (err) {
    console.error('会议和年份加载错误:', err);
    error.value = `无法加载会议和年份数据: ${err.message}`;
  }
};

// 排序函数
function sortPapers(field) {
  if (sortField.value === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // 如果是新字段，则设置为升序
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

// 处理列宽调整的函数
function startResize(e, column) {
  isResizing.value = true;
  currentResizingColumn.value = column;
  startX.value = e.pageX;
  startWidth.value = columnWidths.value[column];
  
  // 添加全局事件监听
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopResize);
  
  // 防止文本选择
  e.preventDefault();
}

function handleMouseMove(e) {
  if (!isResizing.value) return;
  
  const diff = e.pageX - startX.value;
  const newWidth = Math.max(50, startWidth.value + diff); // 最小宽度50px
  columnWidths.value[currentResizingColumn.value] = newWidth;
}

function stopResize() {
  isResizing.value = false;
  currentResizingColumn.value = null;
  
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopResize);
}

// 添加弹出框状态
const expandedContent = ref({
  show: false,
  title: '',
  content: ''
});

// 显示弹出框
function showPopup(title, content) {
  expandedContent.value = {
    show: true,
    title,
    content: formatValue(content)
  };
}

// 关闭弹出框
function closePopup() {
  expandedContent.value.show = false;
}

// 高亮搜索词函数
function highlightSearchText(text, searchTerm) {
  if (!searchTerm || !text) return text;
  
  const textStr = String(text || '');
  
  // 使用最简单直接的字符串替换方法
  if (!searchTerm.trim()) return textStr;
  
  // 转义搜索词中的特殊字符（如果有的话）
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  
  // 直接替换匹配到的文本
  return textStr.replace(searchRegex, '<mark style="background-color:yellow;color:black;font-weight:bold;">$1</mark>');
}

// 组件挂载时加载数据
onMounted(async () => {
  await loadConferencesAndYears();
});

// 添加全选相关的计算属性和方法
const isAllColumnsSelected = computed(() => {
  return columns.value.every(col => col.key === 'order' || col.visible);
});

function toggleAllColumns(e) {
  const checked = e.target.checked;
  columns.value.forEach(column => {
    if (column.key !== 'order') {  // 保持序号列始终可见
      column.visible = checked;
    }
  });
}

// 添加列搜索处理函数
function handleColumnSearch(columnKey) {
  // 清空其他列的搜索条件
  columns.value.forEach(column => {
    if (column.key !== columnKey && column.key !== 'actions') {
      columnSearches.value[column.key] = '';
    }
  });
  
  // 重置到第一页
  currentPage.value = 1;
}

// 更新列搜索结果计数的函数
function updateColumnSearchResults() {
  columns.value.forEach(column => {
    if (column.key !== 'actions' && columnSearches.value[column.key]) {
      const searchText = columnSearches.value[column.key].toLowerCase();
      columnSearches.value[column.key] = searchText;
    }
  });
}
</script>

<style scoped>
.th-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
}

.sort-icon {
  color: #ccc;
  font-size: 14px;
  transition: color 0.2s;
}

.sort-icon.active {
  color: #007bff;
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sortable:hover .sort-icon {
  color: #007bff;
}

.sortable:hover {
  background-color: #f5f5f5;
}

.resizer {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 5px;
  background: transparent;  /* 默认透明 */
  cursor: col-resize;
  user-select: none;
  touch-action: none;
  transition: background 0.2s;  /* 添加过渡效果 */
}

.resizer:hover {
  background: rgba(0, 0, 0, 0.2);  /* 鼠标悬停时显示 */
}

/* 拖动时的样式 */
.table-container {
  user-select: text; /* 允许文本选择 */
}

/* 只在调整列宽时禁用文本选择 */
.table-container.resizing {
  user-select: none;
}

/* 确保表格内容可以选择 */
td {
  user-select: text;
}

/* 只有表头和调整列宽的把手不可选择 */
th {
  position: relative;
  background-color: transparent;
  padding: 0;
  text-align: center;
  border: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  box-sizing: border-box;
}

/* 确保表格布局固定 */
table {
  table-layout: fixed;
  border-collapse: collapse;
  width: max-content;
}

thead tr:first-child {
  /* 移除红色下边框 */
}

.resizer {
  user-select: none;
}

.column-control {
  position: relative;
  display: inline-block;
}

.column-control-btn {
  padding: 8px 15px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.column-control-btn:hover {
  background-color: #f8f9fa;
  border-color: #ced4da;
}

.column-selector {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 180px;
  max-height: 400px;
  overflow-y: auto;
}

.column-option {
  padding: 8px 12px;
  transition: background-color 0.2s;
}

.column-option:hover {
  background-color: #f8f9fa;
}

.column-option label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  width: 100%;
  font-size: 14px;
}

.column-option input[type="checkbox"] {
  margin: 0;
  width: 16px;
  height: 16px;
}

.column-option input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.column-option input[type="checkbox"]:disabled + span {
  color: #6c757d;
  cursor: not-allowed;
}
h1{
  text-align: center;
}

.select-bar {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  box-sizing: border-box;
}

/* 添加中心控制区样式 */
.center-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.center-controls .paper-count {
  margin-left: 15px;
  white-space: nowrap;
}

.search-area {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  justify-content: center;
  max-width: 600px;
  margin: 0 20px;
}

.search-input {
  padding: 8px 15px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 16px;
  min-width: 300px;
}

.select-input {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 16px;
  min-width: 120px;
  background-color: white;
}

.search-result {
  color: #666;
  font-size: 15px;
  white-space: nowrap;
}

.truncated-content {
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.truncated-content:hover {
  background-color: #f8f9fa;
}

.expand-icon {
  color: #007bff;
}

.left-controls {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  width: 100px;
}

.right-controls {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  width: 360px;
  justify-content: flex-end;
}

.select-input:hover, .search-input:hover, .column-control-btn:hover {
  border-color: #80bdff;
}

.select-input:focus, .search-input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0,123,255,.15);
}

.paper-container {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead tr:first-child {
  /* 移除红色下边框 */
}

.left-controls {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  width: 100px;
}

.search-area {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 0 20px;
}

.right-controls {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  width: 260px;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
}

.btn.pdf {
  background-color: transparent;
  border: none;
}

.btn.pdf:hover {
  background-color: rgba(220, 53, 69, 0.1);
  border: none;
}

.btn.web {
  background-color: transparent;
  border: none;
}

.btn.web:hover {
  background-color: rgba(0, 123, 255, 0.1);
  border: none;
}

.action-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* 弹出框样式 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.popup-body {
  padding: 20px;
  overflow-y: auto;
  line-height: 1.6;
  font-size: 16px;
  color: #333;
}

.paper-count {
  color: #666;
  font-size: 15px;
  white-space: nowrap;
  padding: 8px 0;
}

/* 表格行悬停效果 */
tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:nth-child(even) {
  background-color: #f8f9fa;  /* 偶数行的背景色 */
}

tbody tr:hover {
  background-color: #f0f7ff;  /* 鼠标悬停时的背景色 */
}

.column-divider {
  height: 1px;
  background-color: #dee2e6;
  margin: 8px 0;
}

.column-search-input {
  width: calc(100% - 2px);
  padding: 4px 6px;
  margin: 4px 1px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  text-align: left;
  box-sizing: border-box;
}

.column-search-input::placeholder {
  text-align: left;
}

.column-search-input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0,123,255,.15);
}

/* 搜索容器样式 */
.search-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 4px;
  box-sizing: border-box;
}

/* 搜索结果数量样式 */
.search-result-count {
  font-size: 12px;
  color: #28a745;
  margin: 0;
  text-align: left;
  padding: 5px 2px;
  font-weight: bold;
  border-bottom: none; /* 移除下边框 */
  box-sizing: border-box;
}

/* 无结果的情况 */
.search-result-count.no-results {
  color: #dc3545;
}

/* 默认计数样式 */
.search-result-count.default-count {
  color: #6c757d;
}

/* 添加序号列的样式 */
td[style*="width: 60px"] {  /* 针对序号列的宽度 */
  text-align: center;
}

/* 序号列居中对齐 */
.center-align {
  text-align: center !important;
}

/* 序号单元格样式 */
.order-cell {
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.page-size-control {
  display: flex;
  align-items: center;
}

.page-size-control .select-input {
  min-width: 90px;
  padding: 8px 10px;
}
</style>
