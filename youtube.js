/* ===================================================================
   POROSH — AUTOMATED VIDEO FEED
   Zero manual video entry. This script resolves the channel, pulls
   the latest uploads + live stats, and renders everything into
   #video-grid and the hero/stats counters.

   HOW TO GET FULL ACCURACY (recommended, takes 2 minutes):
   1. Get a free YouTube Data API v3 key: https://console.cloud.google.com/
      -> "APIs & Services" -> enable "YouTube Data API v3" -> Credentials -> API key
   2. Paste it into CONFIG.API_KEY below.
   Without a key, the site still works fully — it automatically falls
   back to the channel's public RSS feed (via rss2json) for videos,
   and to a best-effort scrape for subscriber/view counts. Both are
   read-only and require no login.
   =================================================================== */

const POROSH_YT_CONFIG = {
  // The channel's public handle (no "@" needed here).
  CHANNEL_HANDLE: 'poroshyt',

  // OPTIONAL: hardcode the resolved UC... channel ID once you know it —
  // this skips a network round-trip on every page load and is the most
  // reliable option. Leave blank to auto-resolve from the handle above.
  CHANNEL_ID: '',

  // OPTIONAL: paste a YouTube Data API v3 key here for exact stats
  // (subscribers / total views / video count) and the most reliable
  // upload list. Leave blank to use the free RSS fallback only.
  API_KEY: '',

  MAX_VIDEOS: 6,

  // Public CORS proxy + RSS->JSON convertor used only when no API key
  // is supplied. No auth, no key required.
  RSS2JSON_ENDPOINT: 'https://api.rss2json.com/v1/api.json?rss_url=',
  CORS_PROXY: 'https://api.allorigins.win/raw?url=',
};

(function () {
  const grid = document.getElementById('video-grid');
  const errorBox = document.getElementById('video-error');

  init().catch((err) => {
    console.warn('[porosh:youtube] falling back to static state —', err);
    showError();
  });

  async function init() {
    const channelId = await resolveChannelId();
    if (!channelId) throw new Error('Could not resolve channel ID');

    const [videos, stats] = await Promise.all([
      getVideos(channelId),
      getStats(channelId),
    ]);

    if (!videos || !videos.length) throw new Error('No videos returned');

    renderVideos(videos);
    applyStats(stats);
  }

  /* ---------------- channel resolution ---------------- */

  async function resolveChannelId() {
    const cfg = POROSH_YT_CONFIG;
    if (cfg.CHANNEL_ID) return cfg.CHANNEL_ID;

    const cacheKey = `porosh_channel_id_${cfg.CHANNEL_HANDLE}`;
    const cached = safeStorageGet(cacheKey);
    if (cached) return cached;

    // Preferred: Data API v3 forHandle lookup (needs API_KEY).
    if (cfg.API_KEY) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${cfg.CHANNEL_HANDLE}&key=${cfg.API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const id = data?.items?.[0]?.id;
        if (id) {
          safeStorageSet(cacheKey, id);
          return id;
        }
      } catch (e) { /* fall through to scrape */ }
    }

    // Fallback: scrape the public channel page for its canonical
    // channel ID via a CORS proxy. Read-only, no auth.
    try {
      const pageUrl = `https://www.youtube.com/@${cfg.CHANNEL_HANDLE}`;
      const res = await fetch(cfg.CORS_PROXY + encodeURIComponent(pageUrl));
      const html = await res.text();
      const match = html.match(/"channelId":"(UC[\w-]{22})"/);
      if (match && match[1]) {
        safeStorageSet(cacheKey, match[1]);
        return match[1];
      }
    } catch (e) { /* no-op, handled by caller */ }

    return null;
  }

  /* ---------------- videos ---------------- */

  async function getVideos(channelId) {
    const cfg = POROSH_YT_CONFIG;

    if (cfg.API_KEY) {
      try {
        const uploadsPlaylist = 'UU' + channelId.slice(2); // UC... -> UU... uploads playlist
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylist}&maxResults=${cfg.MAX_VIDEOS}&key=${cfg.API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.items?.length) {
          return data.items.map((item) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnail:
              item.snippet.thumbnails?.maxres?.url ||
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url,
            publishedAt: item.snippet.publishedAt,
          }));
        }
      } catch (e) { /* fall through to RSS */ }
    }

    // RSS fallback via rss2json — no key required.
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(cfg.RSS2JSON_ENDPOINT + encodeURIComponent(rssUrl));
    const data = await res.json();
    if (!data?.items?.length) return null;

    return data.items.slice(0, cfg.MAX_VIDEOS).map((item) => {
      const videoId = extractVideoId(item);
      return {
        id: videoId,
        title: item.title,
        thumbnail: videoId
          ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          : item.thumbnail,
        publishedAt: item.pubDate,
      };
    }).filter((v) => v.id);
  }

  function extractVideoId(rssItem) {
    if (rssItem.guid) {
      const guidMatch = String(rssItem.guid).match(/([\w-]{11})$/);
      if (guidMatch) return guidMatch[1];
    }
    if (rssItem.link) {
      const linkMatch = String(rssItem.link).match(/[?&]v=([\w-]{11})/);
      if (linkMatch) return linkMatch[1];
    }
    return null;
  }

  /* ---------------- stats ---------------- */

  async function getStats(channelId) {
    const cfg = POROSH_YT_CONFIG;

    if (cfg.API_KEY) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${cfg.API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const s = data?.items?.[0]?.statistics;
        if (s) {
          return {
            subscribers: Number(s.subscriberCount) || 0,
            views: Number(s.viewCount) || 0,
            videos: Number(s.videoCount) || 0,
          };
        }
      } catch (e) { /* fall through to scrape */ }
    }

    // Best-effort scrape of the public "about" page for headline
    // numbers when no API key is available. If this fails, counters
    // simply stay hidden rather than showing a wrong number.
    try {
      const pageUrl = `https://www.youtube.com/@${cfg.CHANNEL_HANDLE}/about`;
      const res = await fetch(cfg.CORS_PROXY + encodeURIComponent(pageUrl));
      const html = await res.text();

      const subMatch = html.match(/"subscriberCountText":\{"simpleText":"([\d.,]+[KM]?) subscribers"/);
      const videoMatch = html.match(/"videoCountText":\{"runs":\[\{"text":"([\d,]+)"/);

      return {
        subscribers: subMatch ? parseAbbreviatedNumber(subMatch[1]) : null,
        views: null,
        videos: videoMatch ? parseInt(videoMatch[1].replace(/,/g, ''), 10) : null,
      };
    } catch (e) {
      return { subscribers: null, views: null, videos: null };
    }
  }

  function parseAbbreviatedNumber(str) {
    const cleaned = str.replace(/,/g, '');
    const mult = cleaned.endsWith('K') ? 1000 : cleaned.endsWith('M') ? 1000000 : 1;
    return Math.round(parseFloat(cleaned) * mult);
  }

  /* ---------------- render ---------------- */

  function renderVideos(videos) {
    grid.innerHTML = '';
    videos.forEach((video, i) => {
      const card = document.createElement('article');
      card.className = 'video-card reveal-up';
      card.style.transitionDelay = `${i * 40}ms`;
      card.setAttribute('data-video-id', video.id);
      card.setAttribute('data-tilt', '');

      card.innerHTML = `
        <div class="video-card__thumb-wrap">
          <img class="video-card__thumb" src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy" />
          <div class="video-card__play">
            <span class="video-card__play-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7-11-7Z"/></svg>
            </span>
          </div>
        </div>
        <div class="video-card__body">
          <h3 class="video-card__title">${escapeHtml(video.title)}</h3>
          <span class="video-card__meta">${formatDate(video.publishedAt)}</span>
        </div>
      `;

      card.addEventListener('click', () => openModal(video.id));
      grid.appendChild(card);
    });

    document.dispatchEvent(new CustomEvent('porosh:videosRendered'));
  }

  function applyStats(stats) {
    if (!stats) return;
    const setters = [
      { selector: '.hero-stat__num', keys: ['subscribers', 'views', 'videos'] },
      { selector: '.stat-card__num', keys: ['subscribers', 'views', 'videos', 'videos'] },
    ];

    setters.forEach(({ selector, keys }) => {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach((node, i) => {
        const key = keys[i];
        const value = stats[key];
        if (value === null || value === undefined) return;
        node.setAttribute('data-target', value);
        node.setAttribute('data-suffix', key === 'subscribers' || key === 'views' ? '+' : '');
      });
    });

    document.dispatchEvent(new CustomEvent('porosh:statsReady'));
  }

  function showError() {
    grid.querySelectorAll('.video-card--skeleton').forEach((el) => el.remove());
    if (errorBox) errorBox.classList.remove('hidden');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function safeStorageGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function safeStorageSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) { /* no-op */ }
  }

  /* ---------------- lightbox modal ---------------- */

  function openModal(videoId) {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-modal-iframe');
    if (!modal || !iframe) return;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  window.PoroshCloseVideoModal = function () {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-modal-iframe');
    if (!modal || !iframe) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    iframe.src = '';
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', window.PoroshCloseVideoModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.PoroshCloseVideoModal();
  });
})();
