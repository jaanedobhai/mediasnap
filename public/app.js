/* ─────────────────────────────────────────────────────────────
   MediaSnap — app.js
   Universal Media Downloader Frontend Logic
───────────────────────────────────────────────────────────── */

'use strict';

// ── DOM refs ──────────────────────────────────────────────────
const urlInput      = document.getElementById('url-input');
const pasteBtn      = document.getElementById('paste-btn');
const fetchBtn      = document.getElementById('fetch-btn');
const platformBadge = document.getElementById('platform-badge');
const errorMsg      = document.getElementById('error-msg');
const mediaSection  = document.getElementById('media-section');
const loadingState  = document.getElementById('loading-state');
const mediaResult   = document.getElementById('media-result');
const mediaThumb    = document.getElementById('media-thumb');
const mediaDuration = document.getElementById('media-duration');
const mediaSite     = document.getElementById('media-site');
const mediaTitle    = document.getElementById('media-title');
const mediaUploader = document.getElementById('media-uploader');
const formatsGrid   = document.getElementById('formats-grid');
const progressWrap  = document.getElementById('progress-wrap');
const progressBar   = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const progressPct   = document.getElementById('progress-pct');
const progressSpeed = document.getElementById('progress-speed');
const historyList   = document.getElementById('history-list');

// ── State ─────────────────────────────────────────────────────
let currentMedia   = null;
let selectedFormat = null;
let downloadHistory = [];

// ── Platform Detection ────────────────────────────────────────
const PLATFORMS = [
  { regex: /youtu\.be|youtube\.com/i,    label: 'YouTube',     emoji: '▶️' },
  { regex: /instagram\.com/i,            label: 'Instagram',   emoji: '📸' },
  { regex: /threads\.net/i,              label: 'Threads',     emoji: '🧵' },
  { regex: /tiktok\.com/i,               label: 'TikTok',      emoji: '🎵' },
  { regex: /soundcloud\.com/i,           label: 'SoundCloud',  emoji: '🎧' },
  { regex: /pinterest\.(com|ca|co|pin\.it)/i, label: 'Pinterest', emoji: '📌' },
  { regex: /facebook\.com|fb\.watch/i,   label: 'Facebook',    emoji: '🎬' },
  { regex: /twitter\.com|x\.com/i,       label: 'Twitter / X', emoji: '🐦' },
  { regex: /vimeo\.com/i,                label: 'Vimeo',       emoji: '🎞' },
  { regex: /dailymotion\.com/i,          label: 'Dailymotion', emoji: '📺' },
  { regex: /twitch\.tv/i,               label: 'Twitch',      emoji: '🎮' },
  { regex: /reddit\.com|redd\.it/i,      label: 'Reddit',      emoji: '💬' },
  { regex: /bilibili\.com/i,            label: 'Bilibili',    emoji: '🎬' },
  { regex: /mixcloud\.com/i,            label: 'Mixcloud',    emoji: '📻' },
];

function detectPlatform(url) {
  try {
    const u = new URL(url);
    return PLATFORMS.find(p => p.regex.test(u.hostname + u.pathname)) || null;
  } catch { return null; }
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

// ── URL Input listeners ───────────────────────────────────────
urlInput.addEventListener('input', onUrlChange);
urlInput.addEventListener('paste', () => setTimeout(onUrlChange, 10));

function onUrlChange() {
  const url = urlInput.value.trim();
  showError(null);

  if (!url) {
    platformBadge.classList.add('hidden');
    return;
  }

  const platform = detectPlatform(url);
  if (platform) {
    platformBadge.innerHTML = `<span class="pb-icon">${platform.emoji}</span> Detected: <strong>${platform.label}</strong>`;
    platformBadge.classList.remove('hidden');
  } else if (isValidUrl(url)) {
    platformBadge.innerHTML = `<span class="pb-icon">🌐</span> Public URL detected`;
    platformBadge.classList.remove('hidden');
  } else {
    platformBadge.classList.add('hidden');
  }
}

// Enter key
urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchBtn.click();
});

// ── Paste button ──────────────────────────────────────────────
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    urlInput.value = text;
    onUrlChange();
  } catch {
    urlInput.focus();
  }
});

// ── Fetch button ──────────────────────────────────────────────
fetchBtn.addEventListener('click', fetchMediaInfo);

async function fetchMediaInfo() {
  const url = urlInput.value.trim();
  if (!url) { showError('Please paste a URL first.'); return; }
  if (!isValidUrl(url)) { showError('That doesn\'t look like a valid URL. Please check and try again.'); return; }

  showError(null);
  setFetchLoading(true);
  showSection('loading');

  try {
    const resp = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    const data = await resp.json();

    if (!resp.ok) { throw new Error(data.error || 'Failed to fetch media info'); }

    currentMedia = data;
    selectedFormat = null;
    renderMediaResult(data);
    showSection('result');
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
    showSection('none');
  } finally {
    setFetchLoading(false);
  }
}

function setFetchLoading(on) {
  fetchBtn.disabled = on;
  fetchBtn.innerHTML = on
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Fetching…`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg> Fetch`;
}

// ── Render Media ──────────────────────────────────────────────
function renderMediaResult(data) {
  // Thumbnail
  if (data.thumbnail) {
    mediaThumb.src = data.thumbnail;
    mediaThumb.alt = data.title;
    mediaThumb.onerror = () => { mediaThumb.style.display = 'none'; };
  } else {
    mediaThumb.style.display = 'none';
  }

  // Duration
  if (data.duration) {
    mediaDuration.textContent = formatDuration(data.duration);
  } else {
    mediaDuration.textContent = '';
  }

  // Site badge
  const platform = detectPlatform(urlInput.value.trim());
  mediaSite.textContent = platform ? `${platform.emoji} ${platform.label}` : (data.website || '🌐 Web');

  // Title & uploader
  mediaTitle.textContent = data.title || 'Untitled';
  mediaUploader.textContent = data.uploader ? `by ${data.uploader}` : '';

  // Format cards
  renderFormats(data.formats || []);
}

function formatDuration(secs) {
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return `${m}:${String(ss).padStart(2,'0')}`;
}

function renderFormats(formats) {
  formatsGrid.innerHTML = '';

  if (formats.length === 0) {
    formatsGrid.innerHTML = '<p style="color:var(--text-3);font-size:0.9rem">No downloadable formats found.</p>';
    return;
  }

  formats.forEach(fmt => {
    const card = document.createElement('div');
    card.className = 'format-card';
    card.id = `fmt-${fmt.id}`;
    card.dataset.formatId = fmt.id;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', '0');

    if (fmt.type === 'image') {
      // Thumbnail card — show a mini preview
      card.innerHTML = `
        <div class="format-thumb-preview" aria-hidden="true">
          <img src="${fmt.thumbnailUrl}" alt="Thumbnail preview" />
          <span class="format-thumb-overlay">🖼</span>
        </div>
        <div class="format-label">${fmt.label}</div>
        <div class="format-quality">${fmt.quality} · ${fmt.ext.toUpperCase()}</div>
        <div class="format-badge">${fmt.badge}</div>
      `;
    } else {
      const icon = fmt.type === 'video' ? '🎬' : '🎧';
      const iconClass = fmt.type === 'video' ? 'video' : 'audio';
      card.innerHTML = `
        <div class="format-type-icon ${iconClass}">${icon}</div>
        <div class="format-label">${fmt.label}</div>
        <div class="format-quality">${fmt.quality}${fmt.ext ? ' · ' + fmt.ext : ''}</div>
        <div class="format-badge">${fmt.badge}</div>
      `;
    }

    card.addEventListener('click', () => selectFormat(fmt, card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFormat(fmt, card); }
    });
    formatsGrid.appendChild(card);
  });

  // Auto-select first format
  const firstCard = formatsGrid.querySelector('.format-card');
  if (firstCard) {
    const firstFmt = formats[0];
    selectFormat(firstFmt, firstCard);
  }

  // Download button
  const existingBtn = document.getElementById('dl-btn');
  if (existingBtn) existingBtn.remove();

  const btn = document.createElement('button');
  btn.id = 'dl-btn';
  btn.className = 'download-btn';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Download`;
  btn.addEventListener('click', startDownload);
  mediaResult.appendChild(btn);
}

function selectFormat(fmt, card) {
  selectedFormat = fmt;
  document.querySelectorAll('.format-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
}

// ── Download ──────────────────────────────────────────────────
async function startDownload() {
  if (!currentMedia || !selectedFormat) return;

  const url = urlInput.value.trim();
  const { id: formatId, label, quality, ext, thumbnailUrl } = selectedFormat;

  // Add to history
  const historyEntry = addToHistory(currentMedia, selectedFormat);

  // Show progress
  progressWrap.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressLabel.textContent = `Downloading ${label}…`;
  progressPct.textContent = '0%';
  progressSpeed.textContent = '';

  const dlBtn = document.getElementById('dl-btn');
  if (dlBtn) dlBtn.disabled = true;

  let downloadUrl;

  if (formatId === 'thumbnail' && thumbnailUrl) {
    // Route through proxy to force file download with correct filename
    downloadUrl = `/api/download-thumbnail?imgUrl=${encodeURIComponent(thumbnailUrl)}&title=${encodeURIComponent(currentMedia.title || 'thumbnail')}`;
  } else {
    downloadUrl = `/api/download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent(formatId)}&title=${encodeURIComponent(currentMedia.title || 'download')}`;
  }

  // Animate progress bar
  simulateProgress();

  // Trigger browser download
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${currentMedia.title || 'download'}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Update history
  setTimeout(() => {
    updateHistoryEntry(historyEntry.id, 'done');
    progressLabel.textContent = '✅ Download started!';
    if (dlBtn) dlBtn.disabled = false;
  }, 2500);
}

let progressInterval = null;
function simulateProgress() {
  let pct = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    // Simulate progress: fast at first, slows down near 90%
    const step = pct < 40 ? 3 : pct < 70 ? 1.5 : pct < 90 ? 0.5 : 0;
    pct = Math.min(pct + step, 92);
    setProgress(pct, 'Streaming…', '');
    if (pct >= 92) clearInterval(progressInterval);
  }, 100);
}

function setProgress(pct, label, speed) {
  const p = Math.round(pct);
  progressBar.style.width = `${p}%`;
  progressBar.closest('[role=progressbar]').setAttribute('aria-valuenow', p);
  progressPct.textContent = `${p}%`;
  if (label) progressLabel.textContent = label;
  if (speed !== undefined) progressSpeed.textContent = speed;
}

// ── Section visibility ────────────────────────────────────────
function showSection(which) {
  mediaSection.classList.remove('hidden');
  loadingState.classList.add('hidden');
  mediaResult.classList.add('hidden');

  if (which === 'loading') loadingState.classList.remove('hidden');
  if (which === 'result')  mediaResult.classList.remove('hidden');
  if (which === 'none')    mediaSection.classList.add('hidden');
}

// ── Error ─────────────────────────────────────────────────────
function showError(msg) {
  if (msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  } else {
    errorMsg.classList.add('hidden');
  }
}

// ── History ───────────────────────────────────────────────────
function addToHistory(media, fmt) {
  const entry = {
    id: Date.now().toString(),
    title: media.title || 'Untitled',
    thumbnail: media.thumbnail || null,
    platform: media.website || '?',
    format: `${fmt.label} · ${fmt.quality}`,
    status: 'downloading',
    ts: new Date().toLocaleTimeString(),
  };
  downloadHistory.unshift(entry);
  renderHistory();
  return entry;
}

function updateHistoryEntry(id, status) {
  const entry = downloadHistory.find(e => e.id === id);
  if (entry) {
    entry.status = status;
    renderHistory();
  }
}

function renderHistory() {
  if (downloadHistory.length === 0) {
    historyList.innerHTML = '<p class="history-empty">Your downloads will appear here</p>';
    return;
  }
  historyList.innerHTML = downloadHistory.map(e => `
    <div class="history-item">
      ${e.thumbnail
        ? `<img class="history-thumb" src="${e.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />`
        : `<div class="history-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem">🎬</div>`}
      <div class="history-info">
        <div class="history-title" title="${escHtml(e.title)}">${escHtml(e.title)}</div>
        <div class="history-meta">${escHtml(e.format)} · ${e.ts}</div>
      </div>
      <span class="history-status ${e.status}">${e.status === 'done' ? '✅ Done' : '⬇ Downloading'}</span>
    </div>
  `).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init: check health ────────────────────────────────────────
(async () => {
  try {
    const r = await fetch('/api/health');
    const data = await r.json();
    if (!data.ytdlp?.ok) {
      showError('⚠️ yt-dlp is not installed on this server. Downloads will not work until it is installed.');
    }
  } catch { /* server might still be starting */ }
})();

// ── Intersection Observer for Animations ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });
});

