/**
 * Archaeo News - Client-side news display
 * Fetches pre-processed news from JSON and renders cards
 */

const NEWS_DATA_URL = 'data/news.json';

// Icons as SVGs
const icons = {
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>`,
  book: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>`,
  file: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6M12 18v-6M9 15h6"/>
  </svg>`,
  news: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>`,
  arrow: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>`
};

// Category labels and icons
const categoryConfig = {
  journal: { label: 'Journal', icon: icons.book, color: '#3b82f6' },
  preprint: { label: 'Preprint', icon: icons.file, color: '#8b5cf6' },
  news: { label: 'News', icon: icons.news, color: '#10b981' }
};

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Create news card HTML
function createCard(item) {
  const category = categoryConfig[item.category] || categoryConfig.journal;
  
  return `
    <article class="news-card" data-category="${item.category}">
      <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
      <div class="news-meta">
        <span>${icons.clock} ${item.timeAgo || formatDate(item.date)}</span>
        ${item.authors ? `<span title="Authors">${icons.file} ${item.authors}</span>` : ''}
        <span class="source" title="Source">${category.icon} ${category.label}</span>
        <span class="category">${category.label}</span>
      </div>
      <p class="summary">${item.summary || 'No summary available.'}</p>
      <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="read-more">
        Read more ${icons.arrow}
      </a>
    </article>
  `;
}

// Render news grid
function renderNews(newsItems, filter = 'all') {
  const grid = document.getElementById('newsGrid');
  
  if (!newsItems || newsItems.length === 0) {
    grid.innerHTML = '<div class="empty-state">No news items found. Check back later!</div>';
    return;
  }

  const filteredItems = filter === 'all' 
    ? newsItems 
    : newsItems.filter(item => item.category === filter);

  grid.innerHTML = filteredItems.map(createCard).join('');
}

// Load news data
async function loadNews() {
  try {
    const response = await fetch(NEWS_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const newsItems = await response.json();
    return newsItems;
  } catch (error) {
    console.error('Error loading news:', error);
    // Fallback to cached data or show error
    document.getElementById('newsGrid').innerHTML = `
      <div class="empty-state">
        Could not load news. <button onclick="location.reload()" style="background: var(--accent); border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; color: white;">Retry</button>
      </div>
    `;
    return [];
  }
}

// Setup filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    renderNews(window.newsData, filter);
  });
});

// Setup refresh button
document.getElementById('refreshBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('newsGrid').innerHTML = '<div class="loading">Refreshing</div>';
  loadNews().then(data => {
    window.newsData = data;
    renderNews(data, document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
  });
});

// Initialize
async function init() {
  const newsItems = await loadNews();
  window.newsData = newsItems;
  renderNews(newsItems);
}

// Start the app
init();
