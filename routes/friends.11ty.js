const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

// ── Config ──
const FEED_TIMEOUT = 12000;
const MAX_PER_FEED = 20;          // Max items per feed to prevent unbounded fetching
const ITEMS_PER_PAGE = 10;          // Articles per page
const GLOBAL_TIMEOUT = 30000;
const SUMMARY_LEN = 160;

const FALLBACK_PATHS = [
  '/feed.xml', '/feed/', '/rss/', '/rss.xml', '/atom.xml',
  '/index.xml', '/feed', '/rss', '/atom',
  '/blog/feed.xml', '/blog/rss.xml',
];

const FAVICON_SVG = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-cloud-drizzle' viewBox='0 0 16 16'%3E%3Cpath d='M4.158 12.025a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m-3.5 1.5a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m.747-8.498a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 11H13a3 3 0 0 0 .405-5.973M8.5 2a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4 4 0 0 1 8.5 2'/%3E%3C/svg%3E`;

const parser = new Parser({
  timeout: FEED_TIMEOUT,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ExyoneBlog-friend-feed/1.0; +https://exyone.ee)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
  customFields: { item: [['updated', 'updated'], ['published', 'published']] },
});

// ── Utilities ──
async function tryFetch(url) {
  try { return await parser.parseURL(url); } catch { return null; }
}

async function discoverFeed(configuredUrl) {
  const direct = await tryFetch(configuredUrl);
  if (direct) return { feed: direct, usedUrl: configuredUrl };

  let origin;
  try { origin = new URL(configuredUrl).origin; }
  catch { throw new Error('Invalid URL: ' + configuredUrl); }

  for (const p of FALLBACK_PATHS) {
    const candidate = origin + p;
    if (candidate === configuredUrl) continue;
    const feed = await tryFetch(candidate);
    if (feed) return { feed, usedUrl: candidate };
  }
  throw new Error('No feed found at ' + configuredUrl);
}

function parseItemDate(item) {
  const raw = item.isoDate || item.pubDate || item.updated || item.published || item.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function esc(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function fmtTimeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days < 30) return days + ' 天前';
  if (days < 365) return Math.floor(days / 30) + ' 个月前';
  return Math.floor(days / 365) + ' 年前';
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timed out: ' + label)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// ── Styles (CSS variable-driven neumorphism) ──
function buildStyles() {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}

:root{
  /* Base colors — light/dark shades derived from --bg */
  --bg:#dfe6ef;
  --fg:#2b3a4f;
  --muted:#6b7d94;
  --accent:#3b82f6;
  --card:#dfe6ef;
  --neu-light:#f5fbff;      /* Highlight (~8% lighter than bg) */
  --neu-dark:#bccada;       /* Shadow (~12% darker than bg) */
  /* Depth levels */
  --depth-card:8px;
  --depth-card-blur:18px;
  --depth-btn:5px;
  --depth-btn-blur:12px;
  --radius-card:24px;
  --radius-btn:14px;
  --radius-pill:999px;
  --gap:1.35rem;
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#1a2332;
    --fg:#e6edf6;
    --muted:#8294ac;
    --accent:#60a5fa;
    --card:#1a2332;
    --neu-light:#222c3e;
    --neu-dark:#10181f;
  }
}

body{
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
  background:var(--bg);
  color:var(--fg);
  line-height:1.65;
  min-height:100vh;
}

/* ── Container ── */
.fe-wrap{max-width:860px;margin:0 auto;padding:2.5rem 1.25rem 3rem}

/* ── Header ── */
.fe-head{
  display:flex;align-items:center;justify-content:space-between;
  gap:1rem;margin-bottom:1.75rem;flex-wrap:wrap;
}
.fe-head__left{display:flex;align-items:center;gap:.85rem}
.fe-head__icon{
  width:44px;height:44px;border-radius:var(--radius-btn);
  background:var(--card);color:var(--accent);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-head__icon svg{width:22px;height:22px}
.fe-head__title{font-size:1.15rem;font-weight:700;letter-spacing:-.02em;line-height:1.2}
.fe-head__sub{font-size:.75rem;color:var(--muted);margin-top:2px}
.fe-head__back{
  font-size:.8125rem;color:var(--muted);text-decoration:none;
  padding:.55rem 1.1rem;border-radius:var(--radius-pill);
  background:var(--card);white-space:nowrap;
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-head__back:hover{color:var(--accent)}
.fe-head__back:active{
  box-shadow:inset var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             inset calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}

/* ── Stats bar ── */
.fe-stats{
  display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.75rem;
  font-size:.78rem;color:var(--muted);
}
.fe-stat{
  display:inline-flex;align-items:center;gap:.5rem;
  padding:.5rem 1rem;border-radius:var(--radius-pill);background:var(--card);
  box-shadow:inset 3px 3px 7px var(--neu-dark),inset -3px -3px 7px var(--neu-light);
}
.fe-stat strong{color:var(--fg);font-weight:600}

/* ── Article grid ── */
.fe-page{display:none;gap:var(--gap);grid-template-columns:repeat(2,1fr)}
.fe-page--active{display:grid}
@media(max-width:640px){.fe-page{grid-template-columns:1fr}}

.fe-item{
  position:relative;
  padding:1.35rem 1.5rem;
  border-radius:var(--radius-card);
  background:var(--card);
  box-shadow:var(--depth-card) var(--depth-card) var(--depth-card-blur) var(--neu-dark),
             calc(var(--depth-card)*-1) calc(var(--depth-card)*-1) var(--depth-card-blur) var(--neu-light);
  overflow:hidden;
}
.fe-item::after{
  content:"";position:absolute;inset:0;border-radius:inherit;
  box-shadow:0 14px 30px rgba(59,130,246,.18),0 6px 14px var(--neu-dark);
  opacity:0;pointer-events:none;
}
.fe-item:hover::after{opacity:1}

.fe-item__title{font-size:.95rem;font-weight:600;line-height:1.45}
.fe-item__title a{color:var(--fg);text-decoration:none}
.fe-item__title a:hover{color:var(--accent)}

.fe-item__summary{
  margin-top:.55rem;font-size:.78rem;color:var(--muted);line-height:1.55;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;
}

.fe-item__meta{
  display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;
  margin-top:.85rem;padding-top:.75rem;
  font-size:.7rem;color:var(--muted);
  border-top:1px solid color-mix(in srgb,var(--neu-dark) 40%,transparent);
}
.fe-item__src{
  font-weight:600;color:var(--fg);
  max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.fe-item__dot{opacity:.5}
.fe-item__time{white-space:nowrap}

/* ── Pagination ── */
.fe-pag{
  display:flex;align-items:center;justify-content:center;gap:1rem;
  margin-top:1.75rem;
}
.fe-pag__btn{
  font-size:.8125rem;padding:.55rem 1.25rem;border:none;border-radius:var(--radius-btn);
  background:var(--card);color:var(--fg);cursor:pointer;
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-pag__btn:hover:not(:disabled){color:var(--accent)}
.fe-pag__btn:active:not(:disabled){
  box-shadow:inset var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             inset calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-pag__btn:disabled{opacity:.4;cursor:not-allowed}
.fe-pag__info{font-size:.75rem;color:var(--muted);min-width:120px;text-align:center}

/* ── Note / Empty state ── */
.fe-note{
  font-size:.78rem;color:var(--muted);margin-top:1.25rem;
  padding:.85rem 1.1rem;border-radius:var(--radius-btn);background:var(--card);
  box-shadow:inset 4px 4px 9px var(--neu-dark),inset -4px -4px 9px var(--neu-light);
}
.fe-empty{
  text-align:center;padding:3.5rem 1.5rem;color:var(--muted);
  border-radius:var(--radius-card);background:var(--card);margin-top:1rem;
  box-shadow:inset 6px 6px 14px var(--neu-dark),inset -6px -6px 14px var(--neu-light);
}
.fe-empty__icon{
  width:56px;height:56px;margin:0 auto 1rem;border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:var(--accent);
  background:var(--card);
  box-shadow:var(--depth-btn) var(--depth-btn) var(--depth-btn-blur) var(--neu-dark),
             calc(var(--depth-btn)*-1) calc(var(--depth-btn)*-1) var(--depth-btn-blur) var(--neu-light);
}
.fe-empty__icon svg{width:26px;height:26px}
.fe-empty__text{font-size:.9rem}

/* ── Footer ── */
.fe-foot{
  text-align:center;font-size:.72rem;color:var(--muted);
  margin-top:2.5rem;padding-top:1.5rem;
  border-top:1px solid color-mix(in srgb,var(--neu-dark) 30%,transparent);
}

@media(prefers-contrast:high){
  :root{--neu-dark:rgba(0,0,0,.55);--neu-light:rgba(255,255,255,.7)}
  .fe-item,.fe-head__back,.fe-pag__btn,.fe-head__icon{
    border:1px solid currentColor;box-shadow:none;
  }
  .fe-item::after{display:none}
}
`;
}

// ── HTML fragment builders ──
function buildHead() {
  const iconHref = `data:image/svg+xml,${FAVICON_SVG}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>友链动态</title>
<meta name="robots" content="index,follow">
<meta name="apple-mobile-web-app-title" content="EXYONE@BLOG:~$">
<meta name="application-name" content="EXYONE@BLOG:~$">
<meta name="theme-color" content="#dfe6ef" media="(prefers-color-scheme:light)">
<meta name="theme-color" content="#1a2332" media="(prefers-color-scheme:dark)">
<link rel="apple-touch-icon" href="${iconHref}">
<link rel="apple-touch-icon-precomposed" href="${iconHref}">
<link rel="icon" type="image/svg+xml" href="${iconHref}">
<link rel="shortcut icon" href="${iconHref}">
<style>${buildStyles()}</style>
</head>`;
}

const ICON_CLOUD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M4.158 12.025a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m-3.5 1.5a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317m.747-8.498a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 11H13a3 3 0 0 0 .405-5.973M8.5 2a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4 4 0 0 1 8.5 2"/></svg>`;

function buildCard(item) {
  const summary = item.content
    ? `<p class="fe-item__summary">${esc(item.content)}</p>` : '';
  return `<article class="fe-item">
  <h3 class="fe-item__title"><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></h3>
  ${summary}
  <div class="fe-item__meta">
    <span class="fe-item__src" title="${esc(item.siteName)}">${esc(item.siteName)}</span>
    <span class="fe-item__dot">·</span>
    <time class="fe-item__time">${fmtDate(item.date)}　${fmtTimeAgo(item.date)}</time>
  </div>
</article>`;
}

function buildPagesHtml(pages) {
  return pages.map((pageItems, idx) => {
    const itemsHtml = pageItems.map(buildCard).join('\n');
    return `<div class="fe-page${idx === 0 ? ' fe-page--active' : ''}">\n${itemsHtml}\n</div>`;
  }).join('\n');
}

function buildPaginationHtml(totalPages, totalArticles) {
  if (totalPages <= 1) return '';
  return `<div class="fe-pag" id="fe-pag">
  <button class="fe-pag__btn" data-page="prev" disabled>&lsaquo; 上一页</button>
  <span class="fe-pag__info">第 <span id="fe-page-num">1</span> / ${totalPages} 页 · 共 ${totalArticles} 篇</span>
  <button class="fe-pag__btn" data-page="next">下一页 &rsaquo;</button>
</div>`;
}

function buildEmptyState(errors) {
  const text = errors.length
    ? '暂无友链动态，请检查订阅源配置'
    : '暂无友链动态';
  return `<div class="fe-empty">
  <div class="fe-empty__icon">${ICON_CLOUD}</div>
  <p class="fe-empty__text">${text}</p>
</div>`;
}

function buildScript() {
  return `<script>
(function(){
  var pages=Array.prototype.slice.call(document.querySelectorAll(".fe-page"));
  if(pages.length<=1)return;
  var numEl=document.getElementById("fe-page-num");
  var bar=document.getElementById("fe-pag");
  var prevBtn=bar.querySelector('[data-page="prev"]');
  var nextBtn=bar.querySelector('[data-page="next"]');
  var cur=0;
  function render(){
    pages.forEach(function(p,i){p.classList.toggle("fe-page--active",i===cur)});
    numEl.textContent=cur+1;
    prevBtn.disabled=cur===0;
    nextBtn.disabled=cur===pages.length-1;
  }
  bar.addEventListener("click",function(e){
    var t=e.target.closest(".fe-pag__btn");
    if(!t||t.disabled)return;
    var d=t.getAttribute("data-page");
    if(d==="prev"&&cur>0)cur--;
    else if(d==="next"&&cur<pages.length-1)cur++;
    else return;
    render();
  });
  document.addEventListener("keydown",function(e){
    if(e.key==="ArrowLeft"&&cur>0){cur--;render();}
    else if(e.key==="ArrowRight"&&cur<pages.length-1){cur++;render();}
  });
})();
</script>`;
}

// ── Main generator ──
async function generateFriendsPage(dataDir, outputDir) {
  const jsonPath = path.join(dataDir, 'friends.json');
  let feedUrls;
  try {
    feedUrls = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    console.log('\n[friends] friends.json not found, skipping\n');
    return;
  }
  if (!Array.isArray(feedUrls) || feedUrls.length === 0) {
    console.log('\n[friends] friends.json is empty, skipping\n');
    return;
  }

  console.log(`\n[friends] Fetching ${feedUrls.length} friend feed(s)...`);
  const allItems = [];
  const errors = [];
  const sourcesOk = [];

  const fetchTask = (async () => {
    for (const url of feedUrls) {
      console.log('[friends] fetching:', url);
      try {
        const { feed, usedUrl } = await discoverFeed(url);
        const siteUrl = (feed.link || usedUrl).replace(/\/+$/, '');
        const siteName = feed.title || usedUrl;
        const tip = usedUrl !== url ? ` (→ ${usedUrl})` : '';
        const items = feed.items || [];
        console.log(` ✓ ${siteName} — ${items.length} posts${tip}`);

        const sorted = [...items].sort((a, b) => {
          const da = parseItemDate(a), db = parseItemDate(b);
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return db.getTime() - da.getTime();
        });

        for (const item of sorted.slice(0, MAX_PER_FEED)) {
          const pubDate = parseItemDate(item);
          allItems.push({
            title: item.title || '(无标题)',
            url: item.link || siteUrl,
            date: pubDate,
            siteName,
            siteUrl,
            content: item.contentSnippet
              ? item.contentSnippet.replace(/\s+/g, ' ').trim().slice(0, SUMMARY_LEN)
              : '',
          });
        }
        sourcesOk.push(siteName);
      } catch (err) {
        console.log(' ✗ ' + err.message);
        errors.push(url);
      }
    }
  })();

  try {
    await withTimeout(fetchTask, GLOBAL_TIMEOUT, 'feed fetching (global)');
    console.log(`[friends] Done, ${allItems.length} posts total\n`);
  } catch {
    console.log(`[friends] ⚠ Global timeout (${GLOBAL_TIMEOUT}ms), collected ${allItems.length} posts, continuing\n`);
  }

  // Global sort
  allItems.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });

  // Paginate
  const pages = [];
  for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
    pages.push(allItems.slice(i, i + ITEMS_PER_PAGE));
  }
  const totalPages = pages.length;

  // Assemble HTML
  const body = allItems.length
    ? buildPagesHtml(pages) + buildPaginationHtml(totalPages, allItems.length)
    : buildEmptyState(errors);

  const errorsHtml = errors.length
    ? `<p class="fe-note">${errors.length} 个订阅源暂时无法访问</p>` : '';

  const html = `${buildHead()}
<body>
<div class="fe-wrap">
  <header class="fe-head">
    <div class="fe-head__left">
      <div class="fe-head__icon">${ICON_CLOUD}</div>
      <div>
        <div class="fe-head__title">友链动态</div>
        <div class="fe-head__sub">聚合朋友站点的最新文章</div>
      </div>
    </div>
    <a href="/" class="fe-head__back">← 返回主页</a>
  </header>

  <div class="fe-stats">
    <span class="fe-stat"><strong>${allItems.length}</strong> 篇文章</span>
    <span class="fe-stat"><strong>${sourcesOk.length}</strong> / ${feedUrls.length} 源在线</span>
    <span class="fe-stat"><strong>${totalPages || 0}</strong> 页</span>
  </div>

  ${body}
  ${errorsHtml}

  <p class="fe-foot">Exyone Blog · 友链动态 · 每 ${Math.ceil(GLOBAL_TIMEOUT / 1000)}s 抓取</p>
</div>
${totalPages > 1 ? buildScript() : ''}
</body>
</html>`;

  const outPath = path.join(outputDir, 'friends', 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('[friends] Written to ' + outPath + '\n');
}

// ── Eleventy render stub (actual page written by afterBuild) ──
const FriendsPage = class {
  data() {
    return {
      permalink: '/friends/',
      eleventyExcludeFromCollections: true,
    };
  }
  render() {
    return `${buildHead()}
<body>
<div class="fe-wrap">
  <div class="fe-empty">
    <div class="fe-empty__icon">${ICON_CLOUD}</div>
    <p class="fe-empty__text">友链动态加载中，请稍后刷新…</p>
  </div>
</div>
</body>
</html>`;
  }
};

module.exports = FriendsPage;
module.exports.generateFriendsPage = generateFriendsPage;
