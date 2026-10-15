/**
 * Cognitive Evolution News - Client-side Application
 * Features: Search, Filtering, Expandable Summaries, Dark/Light Mode, Pagination
 */

// ===== Constants =====
const NEWS_DATA_URL = 'data/news.json';
const ARTICLES_PER_PAGE = 12;
const SUMMARY_PREVIEW_LENGTH = 100;

// ===== Category Configuration =====
const CATEGORY_CONFIG = {
  cognitive: {
    name: 'Cognitive Studies',
    color: '#6366f1',
    keywords: ['cognitive', 'cognition', 'brain', 'neural', 'intelligence', 'thinking', 'memory', 'learning', 'neuro']
  },
  fossils: {
    name: 'Fossils & Remains',
    color: '#f59e0b',
    keywords: ['fossil', 'fossils', 'remains', 'skeleton', 'bone', 'skull', 'hominin', 'hominid', 'neanderthal', 'denisovan', 'pleistocene', 'paleontology']
  },
  tools: {
    name: 'Tools & Technology',
    color: '#10b981',
    keywords: ['tool', 'tools', 'technology', 'stone', 'axe', 'spear', 'arrow', 'fire', 'crafting', 'manufacturing', 'lithic', 'artifacts']
  },
  art: {
    name: 'Art & Symbolism',
    color: '#ec4899',
    keywords: ['art', 'symbol', 'symbolism', 'cave', 'painting', 'drawing', 'carving', 'ornament', 'bead', 'jewelry', 'ritual', 'burial', 'grave']
  },
  genetics: {
    name: 'Genetics',
    color: '#3b82f6',
    keywords: ['genetic', 'genetics', 'dna', 'gene', 'genome', 'evolution', 'ancestry', 'heritage', 'mitochondrial', 'y-chromosome']
  },
  behavior: {
    name: 'Behavior & Society',
    color: '#8b5cf6',
    keywords: ['behavior', 'society', 'social', 'culture', 'communication', 'language', 'hunting', 'gathering', 'settlement', 'migration']
  }
};

// ===== Source Configuration =====
const SOURCE_CONFIG = {
  arxiv: { name: 'arXiv', color: '#1f4e79' },
  sciencedaily: { name: 'ScienceDaily', color: '#ff6b35' },
  sapiens: { name: 'SAPIENS', color: '#00a99d' },
  heritagedaily: { name: 'HeritageDaily', color: '#7b68ee' },
  plosone: { name: 'PLOS ONE', color: '#0099cc' }
};

// ===== State =====
let state = {
  newsItems: [],
  filteredItems: [],
  currentPage: 1,
  searchQuery: '',
  selectedCategories: [],
  selectedSources: [],
  selectedTimeRange: 'all',
  theme: localStorage.getItem('theme') || 'dark',
  bookmarks: JSON.parse(localStorage.getItem('bookmarks')) || []
};

// ===== DOM Elements =====
const elements = {
  newsGrid: document.getElementById('newsGrid'),
  searchInput: document.getElementById('searchInput'),
  themeToggle: document.getElementById('themeToggle'),
  filterChips: document.getElementById('filterChips'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo'),
  totalArticles: document.getElementById('totalArticles'),
  totalSources: document.getElementById('totalSources'),
  lastUpdated: document.getElementById('lastUpdated'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage'),
  mobileMenuToggle: document.getElementById('mobileMenuToggle'),
  mobileMenu: document.getElementById('mobileMenu')
};

// ===== Utility Functions =====
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getReadingTime(text) {
  const words = text?.split(/\s+/).length || 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function truncateText(text, length = SUMMARY_PREVIEW_LENGTH) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function getCategoryFromText(text) {
  const lowerText = text.toLowerCase();
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        return key;
      }
    }
  }
  return 'default';
}

function getSourceKey(url) {
  if (!url) return 'unknown';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('arxiv')) return 'arxiv';
  if (lowerUrl.includes('sciencedaily')) return 'sciencedaily';
  if (lowerUrl.includes('sapiens')) return 'sapiens';
  if (lowerUrl.includes('heritagedaily')) return 'heritagedaily';
  if (lowerUrl.includes('plos')) return 'plosone';
  return 'unknown';
}

function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, duration);
}

// ===== Theme Management =====
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  elements.themeToggle.innerHTML = state.theme === 'dark' ? '&#127774;' : '&#128269;';
  localStorage.setItem('theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  showToast(`Switched to ${state.theme} mode`);
}

// ===== News Card Rendering =====
function createNewsCard(item, index) {
  const category = item.category || getCategoryFromText(item.title + ' ' + (item.summary || ''));
  const sourceKey = getSourceKey(item.link);
  const sourceConfig = SOURCE_CONFIG[sourceKey] || SOURCE_CONFIG.unknown;
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.cognitive;
  
  const isBookmarked = state.bookmarks.includes(item.link);
  const cardId = `card-${index}`;
  
  const card = document.createElement('article');
  card.className = 'news-card';
  card.dataset.category = category;
  card.dataset.source = sourceKey;
  card.dataset.date = item.date || '';
  card.dataset.title = item.title.toLowerCase();
  card.dataset.summary = (item.summary || '').toLowerCase();
  
  card.innerHTML = `
    <div class="news-card-header">
      <h3 class="news-card-title">
        <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
      </h3>
      <button class="news-card-bookmark ${isBookmarked ? 'active' : ''}" 
              data-link="${item.link}"
              title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
        ${isBookmarked ? '★' : '☆'}
      </button>
    </div>
    
    <div class="news-card-meta">
      <span class="category-tag ${category}">${categoryConfig.name}</span>
      <span class="source-tag source-${sourceKey}">${sourceConfig.name}</span>
      <span class="time-tag">${formatDate(item.date)}</span>
      ${item.authors ? `<span>by ${item.authors}</span>` : ''}
    </div>
    
    <div class="news-card-summary short" id="${cardId}-short">
      ${truncateText(item.summary, SUMMARY_PREVIEW_LENGTH)}
    </div>
    <div class="news-card-summary full" id="${cardId}-full" style="display: none;">
      ${item.summary || 'No summary available.'}
    </div>
    
    <button class="expand-btn" data-card-id="${cardId}">
      Show more
    </button>
    
    <div class="news-card-footer">
      <div class="news-card-actions">
        <button class="share-btn" data-url="${item.link}" data-title="${item.title}" title="Share">
          Share
        </button>
      </div>
      <span class="reading-time">${getReadingTime(item.summary)}</span>
    </div>
  `;
  
  return card;
}

function renderNewsCards() {
  const start = (state.currentPage - 1) * ARTICLES_PER_PAGE;
  const end = start + ARTICLES_PER_PAGE;
  const pageItems = state.filteredItems.slice(start, end);
  
  elements.newsGrid.innerHTML = '';
  
  if (pageItems.length === 0) {
    elements.newsGrid.innerHTML = `
      <div class="empty-state">
        <p>No articles match your filters.</p>
        <button class="btn-primary" onclick="clearAllFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }
  
  pageItems.forEach((item, index) => {
    const card = createNewsCard(item, start + index);
    elements.newsGrid.appendChild(card);
  });
  
  // Add expand functionality
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.cardId;
      const short = document.getElementById(`${cardId}-short`);
      const full = document.getElementById(`${cardId}-full`);
      
      if (short.style.display === 'none') {
        short.style.display = 'block';
        full.style.display = 'none';
        btn.textContent = 'Show more';
        btn.classList.remove('expanded');
      } else {
        short.style.display = 'none';
        full.style.display = 'block';
        btn.textContent = 'Show less';
        btn.classList.add('expanded');
      }
    });
  });
  
  // Add bookmark functionality
  document.querySelectorAll('.news-card-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const link = btn.dataset.link;
      const isBookmarked = state.bookmarks.includes(link);
      
      if (isBookmarked) {
        state.bookmarks = state.bookmarks.filter(b => b !== link);
        btn.classList.remove('active');
        btn.textContent = '☆';
        showToast('Bookmark removed');
      } else {
        state.bookmarks.push(link);
        btn.classList.add('active');
        btn.textContent = '★';
        showToast('Article bookmarked');
      }
      
      localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
    });
  });
  
  // Add share functionality
  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      const title = btn.dataset.title;
      const shareText = `Check out this article: ${title}\n${url}`;
      
      if (navigator.share) {
        navigator.share({
          title: title,
          text: shareText,
          url: url
        }).catch(err => {
          console.log('Share failed:', err);
        });
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText);
        showToast('Link copied to clipboard!');
      }
    });
  });
}

// ===== Filter Management =====
function applyFilters() {
  let filtered = [...state.newsItems];
  
  // Search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(item => 
      (item.title || '').toLowerCase().includes(query) ||
      (item.summary || '').toLowerCase().includes(query) ||
      (item.authors || '').toLowerCase().includes(query)
    );
  }
  
  // Category filter
  if (state.selectedCategories.length > 0) {
    filtered = filtered.filter(item => {
      const category = item.category || getCategoryFromText(item.title + ' ' + (item.summary || ''));
      return state.selectedCategories.includes(category);
    });
  }
  
  // Source filter
  if (state.selectedSources.length > 0) {
    filtered = filtered.filter(item => {
      const sourceKey = getSourceKey(item.link);
      return state.selectedSources.includes(sourceKey);
    });
  }
  
  // Time range filter
  if (state.selectedTimeRange !== 'all') {
    const now = new Date();
    let daysBack = 0;
    
    switch (state.selectedTimeRange) {
      case 'day': daysBack = 1; break;
      case 'week': daysBack = 7; break;
      case 'month': daysBack = 30; break;
    }
    
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    filtered = filtered.filter(item => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
  }
  
  state.filteredItems = filtered;
  state.currentPage = 1;
  
  updatePagination();
  renderNewsCards();
  updateFilterChips();
  updateStats();
}

function addFilter(type, value) {
  if (type === 'category') {
    if (!state.selectedCategories.includes(value)) {
      state.selectedCategories.push(value);
    }
  } else if (type === 'source') {
    if (!state.selectedSources.includes(value)) {
      state.selectedSources.push(value);
    }
  } else if (type === 'time') {
    state.selectedTimeRange = value;
  }
  applyFilters();
}

function removeFilter(type, value) {
  if (type === 'category') {
    state.selectedCategories = state.selectedCategories.filter(c => c !== value);
  } else if (type === 'source') {
    state.selectedSources = state.selectedSources.filter(s => s !== value);
  } else if (type === 'time') {
    state.selectedTimeRange = 'all';
  }
  applyFilters();
}

function clearAllFilters() {
  state.searchQuery = '';
  state.selectedCategories = [];
  state.selectedSources = [];
  state.selectedTimeRange = 'all';
  elements.searchInput.value = '';
  applyFilters();
  showToast('All filters cleared');
}

function updateFilterChips() {
  elements.filterChips.innerHTML = '';
  
  // Add search chip if query exists
  if (state.searchQuery) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      Search: "${state.searchQuery}"
      <span class="remove-btn" onclick="removeFilter('search', '')">×</span>
    `;
    elements.filterChips.appendChild(chip);
  }
  
  // Add category chips
  state.selectedCategories.forEach(cat => {
    const config = CATEGORY_CONFIG[cat] || { name: cat };
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      ${config.name}
      <span class="remove-btn" onclick="removeFilter('category', '${cat}')">×</span>
    `;
    elements.filterChips.appendChild(chip);
  });
  
  // Add source chips
  state.selectedSources.forEach(src => {
    const config = SOURCE_CONFIG[src] || { name: src };
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      ${config.name}
      <span class="remove-btn" onclick="removeFilter('source', '${src}')">×</span>
    `;
    elements.filterChips.appendChild(chip);
  });
  
  // Add time chip
  if (state.selectedTimeRange !== 'all') {
    const timeNames = { day: 'Last 24h', week: 'Last Week', month: 'Last Month' };
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      ${timeNames[state.selectedTimeRange] || state.selectedTimeRange}
      <span class="remove-btn" onclick="removeFilter('time', '')">×</span>
    `;
    elements.filterChips.appendChild(chip);
  }
  
  // Show/hide clear button
  const hasFilters = state.searchQuery || 
                     state.selectedCategories.length > 0 || 
                     state.selectedSources.length > 0 || 
                     state.selectedTimeRange !== 'all';
  elements.clearFiltersBtn.style.display = hasFilters ? 'block' : 'none';
}

function updatePagination() {
  const totalPages = Math.ceil(state.filteredItems.length / ARTICLES_PER_PAGE);
  
  elements.pageInfo.textContent = `Page ${state.currentPage} of ${Math.max(1, totalPages)}`;
  
  elements.prevPage.disabled = state.currentPage <= 1;
  elements.nextPage.disabled = state.currentPage >= totalPages;
}

function updateStats() {
  const uniqueSources = new Set(state.newsItems.map(item => getSourceKey(item.link)));
  const latestDate = state.newsItems.length > 0 ? 
    new Date(Math.max(...state.newsItems.map(i => new Date(i.date || 0).getTime()))).toLocaleDateString() : 'Never';
  
  elements.totalArticles.textContent = state.newsItems.length;
  elements.totalSources.textContent = uniqueSources.size;
  elements.lastUpdated.textContent = latestDate;
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    state.currentPage = 1;
    applyFilters();
  });
  
  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Clear filters button
  elements.clearFiltersBtn.addEventListener('click', clearAllFilters);
  
  // Pagination
  elements.prevPage.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderNewsCards();
      updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  elements.nextPage.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredItems.length / ARTICLES_PER_PAGE);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderNewsCards();
      updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  // Mobile menu toggle
  elements.mobileMenuToggle.addEventListener('click', () => {
    elements.mobileMenu.classList.toggle('active');
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.mobileMenu.contains(e.target) && 
        !elements.mobileMenuToggle.contains(e.target)) {
      elements.mobileMenu.classList.remove('active');
    }
  });
  
  // Dropdown menu items (desktop)
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const category = item.dataset.category;
      const source = item.dataset.source;
      const time = item.dataset.time;
      
      if (category) addFilter('category', category);
      if (source) addFilter('source', source);
      if (time) addFilter('time', time);
    });
  });
  
  // Mobile menu items
  document.querySelectorAll('.mobile-link[data-category], .mobile-link[data-source], .mobile-link[data-time]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const category = item.dataset.category;
      const source = item.dataset.source;
      const time = item.dataset.time;
      
      if (category) addFilter('category', category);
      if (source) addFilter('source', source);
      if (time) addFilter('time', time);
      
      elements.mobileMenu.classList.remove('active');
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      elements.mobileMenu.classList.remove('active');
    }
    if (e.key === '/' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      elements.searchInput.focus();
    }
  });
}

// ===== Data Loading =====
async function loadNewsData() {
  try {
    const response = await fetch(NEWS_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    let data = await response.json();
    
    // Auto-categorize items
    data = data.map(item => ({
      ...item,
      category: item.category || getCategoryFromText(item.title + ' ' + (item.summary || ''))
    }));
    
    // Sort by date, newest first
    data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    
    state.newsItems = data;
    state.filteredItems = data;
    
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error loading news:', error);
    elements.newsGrid.innerHTML = `
      <div class="error-state">
        <p>Could not load news data.</p>
        <button class="btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// ===== Global Functions (for HTML onclick) =====
window.clearAllFilters = clearAllFilters;
window.removeFilter = (type, value) => {
  if (type === 'search') {
    state.searchQuery = '';
    elements.searchInput.value = '';
  }
  removeFilter(type, value);
};

// ===== Initialize =====
function init() {
  applyTheme();
  setupEventListeners();
  loadNewsData();
}

// Start the app
init();
