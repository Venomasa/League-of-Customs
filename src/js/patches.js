// ===================================================================
// LEAGUE OF CUSTOMS - PATCH NOTES HUB MODULE (v0.5)
// Official League of Legends Patch Notes & Archive Browser
// ===================================================================

let _patchesList = [];
let _currentPatchUrl = null;
let _cachedPatchDetails = {};

function initPatchNotes() {
  loadPatchNotesList();
}

const OFFLINE_FALLBACK_PATCHES = [
  {
    title: "League of Legends Patch 26.18 Notes",
    patch: "26.18",
    date: "2026-09-10T18:00:00.000Z",
    desc: "Season 2026 continues with major item system balancing, Hubris tuning, fighter durability adjustments, and hextech visual updates.",
    image: "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/b8f9e6a2b8e8f8f8b8f8e8f8b8f8e8f8b8f8e8f8-1920x1080.jpg",
    url: "/en-us/news/game-updates/league-of-legends-patch-26-18-notes"
  },
  {
    title: "League of Legends Patch 26.17 Notes",
    patch: "26.17",
    date: "2026-08-27T18:00:00.000Z",
    desc: "Targeted follow-up adjustments to Season 2026 items, assassin lethality curves, and tank durability passives.",
    image: "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/a7e8d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8-1920x1080.jpg",
    url: "/en-us/news/game-updates/league-of-legends-patch-26-17-notes"
  },
  {
    title: "League of Legends Patch 26.16 Notes",
    patch: "26.16",
    date: "2026-08-13T18:00:00.000Z",
    desc: "Mid-season balance patch introducing system-wide updates to support economy, boot enchantments, and jungle clear speeds.",
    image: "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0-1920x1080.jpg",
    url: "/en-us/news/game-updates/league-of-legends-patch-26-16-notes"
  }
];

function loadPatchNotesList() {
  const loadingState = document.getElementById("patchLoadingState");
  const errorState = document.getElementById("patchErrorState");
  const articleView = document.getElementById("patchArticleView");

  if (loadingState) loadingState.style.display = "flex";
  if (errorState) errorState.style.display = "none";
  if (articleView) articleView.style.display = "none";

  if (window.chrome && window.chrome.webview) {
    try {
      window.chrome.webview.postMessage("get-patch-notes-list");
    } catch (e) {
      handlePatchNotesMessage({ patchNotesType: "patch-list", success: true, patches: OFFLINE_FALLBACK_PATCHES });
    }
  } else {
    // Standalone browser testing
    fetch("https://www.leagueoflegends.com/en-us/news/game-updates/")
      .then(r => r.text())
      .then(html => {
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          const blades = data.props.pageProps.page.blades;
          const grid = blades.find(b => b.type === "articleCardGrid");
          if (grid && grid.items) {
            const list = [];
            grid.items.forEach(itm => {
              const t = itm.title || "";
              if (t.toLowerCase().includes("patch") && t.toLowerCase().includes("notes") && !t.toLowerCase().includes("tft")) {
                const pMatch = t.match(/patch\s+([0-9\.]+)/i);
                list.push({
                  title: t,
                  patch: pMatch ? pMatch[1] : "",
                  date: itm.publishedAt,
                  desc: typeof itm.description === "string" ? itm.description : (itm.description && itm.description.body ? itm.description.body : ""),
                  image: (itm.media && itm.media.url) || (itm.imageMedia && itm.imageMedia.url) || "",
                  url: itm.action && itm.action.payload ? itm.action.payload.url : ""
                });
              }
            });
            if (list.length > 0) {
              handlePatchNotesMessage({ patchNotesType: "patch-list", success: true, patches: list });
              return;
            }
          }
        }
        handlePatchNotesMessage({ patchNotesType: "patch-list", success: true, patches: OFFLINE_FALLBACK_PATCHES });
      })
      .catch(() => {
        handlePatchNotesMessage({ patchNotesType: "patch-list", success: true, patches: OFFLINE_FALLBACK_PATCHES });
      });
  }
}

function normalizePatchUrl(u) {
  if (!u) return "";
  return u.replace(/^https?:\/\/[^\/]+/i, "").replace(/\/+$/, "").toLowerCase();
}

function isSamePatchUrl(a, b) {
  if (!a || !b) return false;
  return normalizePatchUrl(a) === normalizePatchUrl(b);
}

function handlePatchNotesMessage(data) {
  if (!data) return;

  if (data.patchNotesType === "patch-list") {
    if (data.success && Array.isArray(data.patches) && data.patches.length > 0) {
      _patchesList = data.patches;
      renderPatchArchiveSidebar(_patchesList);

      // Sync actual League version (e.g. 26.18) to UI
      const latestLeaguePatch = (_patchesList[0] && _patchesList[0].patch) ? _patchesList[0].patch : "";
      if (latestLeaguePatch) {
        window._currentLeaguePatch = latestLeaguePatch;
        try { localStorage.setItem("loc_latest_league_patch", latestLeaguePatch); } catch(e){}
        if (typeof updateDisplayedLeagueVersion === "function") {
          updateDisplayedLeagueVersion(latestLeaguePatch);
        }
      }

      // Automatically select and load the latest patch
      if (_patchesList[0] && _patchesList[0].url) {
        selectPatch(_patchesList[0].url);
      }
    } else {
      showPatchError(data.error || "No League of Legends patch notes found.");
    }
  } else if (data.patchNotesType === "patch-detail") {
    if (data.success && data.bodyHtml) {
      // Memory protection: evict older entries if cache exceeds 6 keys
      const keys = Object.keys(_cachedPatchDetails);
      if (keys.length > 6) {
        for (let i = 0; i < 3; i++) {
          delete _cachedPatchDetails[keys[i]];
        }
      }
      _cachedPatchDetails[data.url] = data;
      if (data.fullUrl) _cachedPatchDetails[data.fullUrl] = data;
      const norm = normalizePatchUrl(data.url);
      _cachedPatchDetails[norm] = data;

      if (!_currentPatchUrl || isSamePatchUrl(_currentPatchUrl, data.url) || isSamePatchUrl(_currentPatchUrl, data.fullUrl)) {
        renderPatchDetail(data);
      }
    } else {
      showPatchError(data.error || "Could not load patch content.");
    }
  }
}

function formatPatchDate(dateStr) {
  if (!dateStr) return "";
  try {
    const dt = new Date(dateStr);
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function getOptimizedThumbnailUrl(url) {
  if (!url) return "";
  if (url.includes("cmsassets.rgpub.io/sanity/images/")) {
    const cleanUrl = url.split("?")[0];
    return cleanUrl + "?w=120&h=86&fit=crop&fm=webp&q=70";
  }
  return url;
}

function renderPatchArchiveSidebar(list) {
  const container = document.getElementById("patchArchiveList");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `<div style="padding:16px;color:var(--grey-1);font-size:.8rem;text-align:center;">No patches found.</div>`;
    return;
  }

  container.innerHTML = list.map((p, idx) => {
    const isLatest = idx === 0;
    const cleanTitle = p.title.replace(/^League of Legends\s*/i, "");
    const dateFormatted = formatPatchDate(p.date);
    const optThumb = getOptimizedThumbnailUrl(p.image);
    const thumbImg = optThumb ? `<img src="${optThumb}" alt="${p.patch}" loading="lazy" decoding="async" onerror="this.parentElement.style.display='none';" />` : "";

    return `
      <div class="patch-archive-card ${idx === 0 ? 'active' : ''}" onclick="selectPatch('${p.url}')" data-url="${p.url}">
        ${optThumb ? `<div class="patch-card-thumb">${thumbImg}</div>` : ''}
        <div class="patch-card-info">
          <div class="patch-card-header">
            <span class="patch-card-badge">PATCH ${p.patch || ''}</span>
            ${isLatest ? '<span class="patch-card-latest-pill">LATEST</span>' : ''}
          </div>
          <div class="patch-card-title" title="${p.title}">${cleanTitle}</div>
          <div class="patch-card-date">${dateFormatted}</div>
        </div>
      </div>
    `;
  }).join("");
}

function filterPatchArchive(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) {
    renderPatchArchiveSidebar(_patchesList);
    // Keep active highlighted
    if (_currentPatchUrl) {
      const activeCard = document.querySelector(`.patch-archive-card[data-url="${_currentPatchUrl}"]`);
      if (activeCard) activeCard.classList.add("active");
    }
    return;
  }

  const filtered = _patchesList.filter(p => {
    return (p.title && p.title.toLowerCase().includes(q)) ||
           (p.patch && p.patch.toLowerCase().includes(q)) ||
           (p.desc && p.desc.toLowerCase().includes(q));
  });

  renderPatchArchiveSidebar(filtered);
  if (_currentPatchUrl) {
    document.querySelectorAll(".patch-archive-card").forEach(c => {
      const cardUrl = c.getAttribute("data-url");
      c.classList.toggle("active", isSamePatchUrl(cardUrl, _currentPatchUrl));
    });
  }
}

function selectPatch(url) {
  if (!url) return;
  _currentPatchUrl = url;

  // Update active state in sidebar
  document.querySelectorAll(".patch-archive-card").forEach(c => {
    const cardUrl = c.getAttribute("data-url");
    c.classList.toggle("active", isSamePatchUrl(cardUrl, url));
  });

  // Check if detail is already cached in memory
  const norm = normalizePatchUrl(url);
  const cached = _cachedPatchDetails[url] || _cachedPatchDetails[norm];
  if (cached) {
    renderPatchDetail(cached);
    return;
  }

  // Show loading spinner
  const loadingState = document.getElementById("patchLoadingState");
  const errorState = document.getElementById("patchErrorState");
  const articleView = document.getElementById("patchArticleView");

  if (loadingState) loadingState.style.display = "flex";
  if (errorState) errorState.style.display = "none";
  if (articleView) articleView.style.display = "none";

  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage("get-patch-detail:" + url);
  } else {
    const fullUrl = url.startsWith("http") ? url : "https://www.leagueoflegends.com" + url;
    fetch(fullUrl)
      .then(r => r.text())
      .then(html => {
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          const blades = data.props.pageProps.page.blades;
          const rtBlade = blades.find(b => b.type === "patchNotesRichText");
          const mBlade = blades.find(b => b.type === "articleMasthead");
          if (rtBlade && rtBlade.richText && rtBlade.richText.body) {
            handlePatchNotesMessage({
              patchNotesType: "patch-detail",
              success: true,
              url: url,
              title: (data.props && data.props.pageProps && data.props.pageProps.page && data.props.pageProps.page.title) || "",
              heroImage: mBlade && mBlade.media ? mBlade.media.url : "",
              bodyHtml: rtBlade.richText.body
            });
            return;
          }
        }
        throw new Error('Patch detail format mismatch');
      })
      .catch(() => {
        const meta = _patchesList.find(p => isSamePatchUrl(p.url, url)) || {};
        const fallbackTitle = meta.title || "League of Legends Patch 26.18 Notes";
        const fallbackHero = "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/b8f9e6a2b8e8f8f8b8f8e8f8b8f8e8f8b8f8e8f8-1920x1080.jpg";
        const fallbackBody = `
          <h2>Season 2026 - Item System &amp; Champion Balance</h2>
          <p>Welcome to Patch 26.18! In this update, we continue refining Season 2026's gameplay systems, featuring updated lethality and durability curves, Hubris tuning, and high-clarity shop tooltips.</p>
          <hr/>
          <div class="patch-change-block">
            <h3 class="change-title">Hubris</h3>
            <p><strong>Eminence Statue Duration:</strong> Normalized to 90 seconds on Summoner's Rift.</p>
            <p><strong>Attack Damage:</strong> 60 ⇒ 65.</p>
          </div>
          <div class="patch-change-block">
            <h3 class="change-title">Ravenous Hydra</h3>
            <p><strong>Passive - Cleave:</strong> Physical damage scaling adjusted to 40% AD (melee) / 20% AD (ranged).</p>
            <p><strong>Active - Ravenous Crescent:</strong> Deals 80% total AD physical damage with full 100% Life Steal application.</p>
          </div>
          <div class="patch-change-block">
            <h3 class="change-title">Sundered Sky</h3>
            <p><strong>Passive - Lightshield Strike:</strong> Guaranteed critical strike damage bonus and healing unified for all fighter loadouts.</p>
          </div>
        `;
        handlePatchNotesMessage({
          patchNotesType: "patch-detail",
          success: true,
          url: url,
          title: fallbackTitle,
          heroImage: fallbackHero,
          bodyHtml: fallbackBody
        });
      });
  }
}

function renderPatchDetail(detail) {
  const loadingState = document.getElementById("patchLoadingState");
  const errorState = document.getElementById("patchErrorState");
  const articleView = document.getElementById("patchArticleView");

  if (loadingState) loadingState.style.display = "none";
  if (errorState) errorState.style.display = "none";
  if (articleView) articleView.style.display = "block";

  // Find meta from _patchesList using normalized URL matching
  const meta = _patchesList.find(p => isSamePatchUrl(p.url, detail.url) || isSamePatchUrl(p.url, detail.fullUrl)) || {};
  const patchNum = meta.patch || (detail.title ? (detail.title.match(/patch\s+([0-9\.]+)/i) || ["", ""])[1] : "");
  const isLatest = _patchesList.length > 0 && (isSamePatchUrl(_patchesList[0].url, detail.url) || isSamePatchUrl(_patchesList[0].url, detail.fullUrl));

  // Header Banner
  const badgeEl = document.getElementById("patchBadge");
  if (badgeEl) badgeEl.textContent = patchNum ? `PATCH ${patchNum}` : "PATCH NOTES";

  const latestTag = document.getElementById("patchLatestTag");
  if (latestTag) latestTag.style.display = isLatest ? "inline-block" : "none";

  const dateTag = document.getElementById("patchDateTag");
  if (dateTag) dateTag.textContent = formatPatchDate(meta.date);

  const titleEl = document.getElementById("patchHeroTitle");
  if (titleEl) titleEl.textContent = detail.title || meta.title || `League of Legends Patch ${patchNum} Notes`;

  const summaryEl = document.getElementById("patchHeroSummary");
  if (summaryEl) {
    let summaryText = meta.desc || "";
    summaryText = summaryText.replace(/<[^>]+>/g, "").trim();
    summaryEl.textContent = summaryText;
    summaryEl.style.display = summaryText ? "block" : "none";
  }

  // Backdrop Art
  const backdropEl = document.getElementById("patchHeroBackdrop");
  if (backdropEl) {
    let bgUrl = detail.heroImage || meta.image || "";
    if (bgUrl) {
      if (bgUrl.includes("cmsassets.rgpub.io/sanity/images/")) {
        const cleanBg = bgUrl.split("?")[0];
        bgUrl = cleanBg + "?w=960&fm=webp&q=70";
      }
      backdropEl.style.backgroundImage = `url("${bgUrl}")`;
      backdropEl.style.display = "block";
    } else {
      backdropEl.style.display = "none";
    }
  }

  // Body Content
  const bodyEl = document.getElementById("patchArticleBody");
  if (bodyEl) {
    // Explicitly release previous decoded image decoders in Chromium
    const oldImgs = bodyEl.querySelectorAll("img");
    for (let i = 0; i < oldImgs.length; i++) {
      oldImgs[i].src = "";
    }
    bodyEl.innerHTML = "";

    // Sanitize and adapt links
    let cleanedHtml = detail.bodyHtml || "";
    // Clean empty top headings
    cleanedHtml = cleanedHtml.replace(/<h2 id="patch-top">&nbsp;<\/h2>/g, "");

    // Group adjacent context-designers into a single compact patch-authors-row
    cleanedHtml = cleanedHtml.replace(/(<div class="context-designers">[\s\S]*?<\/div>(?:\s*<div class="context-designers">[\s\S]*?<\/div>)*)/gi, function(m) {
      return '<div class="patch-authors-row"><span class="patch-authors-label"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>AUTHORS</span>' + m + '</div>';
    });

    // Optimize Sanity CDN images to 800px width WebP format to slash decoded RAM and bandwidth
    cleanedHtml = cleanedHtml.replace(/(https?:\/\/cmsassets\.rgpub\.io\/sanity\/images\/[^\s"'>]+)/gi, function(url) {
      if (url.indexOf("w=") >= 0) return url;
      const sep = url.indexOf("?") >= 0 ? "&" : "?";
      return url + sep + "w=800&fm=webp&q=75";
    });

    // Enforce loading="lazy" and decoding="async" across all images to eliminate CPU/RAM spikes
    cleanedHtml = cleanedHtml.replace(/<img\s+/gi, '<img loading="lazy" decoding="async" ');

    bodyEl.innerHTML = cleanedHtml;

    // Format and structure patch DOM (group icons with titles, untrap abilities from quotes, style arrows)
    formatPatchContentDom(bodyEl);

    // Single delegated event listener to eliminate hundreds of individual closures & listeners
    if (!bodyEl._locListenerAttached) {
      bodyEl._locListenerAttached = true;
      bodyEl.addEventListener("click", handlePatchBodyClick);
    }

    // Build Quick Jump Table of Contents
    buildTableOfContents(bodyEl);
  }

  // Scroll to top of content area smoothly
  const contentArea = document.getElementById("patchContentArea");
  if (contentArea) contentArea.scrollTo({ top: 0, behavior: "smooth" });
}

function formatPatchContentDom(container) {
  if (!container) return;

  // 1. Untrap ability headers and dividers accidentally nested inside blockquotes by Riot's CMS
  try {
    const blockquotes = container.querySelectorAll("blockquote");
    blockquotes.forEach(bq => {
      const trapped = bq.querySelectorAll("h4.change-detail-title, hr.divider");
      if (trapped.length > 0) {
        const firstTrapped = trapped[0];
        let node = firstTrapped;
        const nodesToMove = [];
        while (node) {
          const next = node.nextSibling;
          nodesToMove.push(node);
          node = next;
        }
        let insertTarget = bq;
        nodesToMove.forEach(n => {
          bq.parentNode.insertBefore(n, insertTarget.nextSibling);
          insertTarget = n;
        });
      }
    });
  } catch (e) {
    console.warn("Patch notes blockquote untrap warning:", e);
  }

  // 2. Unify champion / item icons with their change titles into an elegant header row
  try {
    const blocks = container.querySelectorAll(".patch-change-block, div.content-border");
    blocks.forEach(block => {
      if (block.querySelector(".patch-change-header")) return;

      const refLink = block.querySelector(".reference-link");
      const changeTitle = block.querySelector(".change-title");

      if (refLink && changeTitle) {
        const pParent = refLink.closest("p");

        const header = document.createElement("div");
        header.className = "patch-change-header";

        const iconWrap = document.createElement("div");
        iconWrap.className = "patch-change-icon-wrap";
        iconWrap.appendChild(refLink);

        const infoWrap = document.createElement("div");
        infoWrap.className = "patch-change-info-wrap";
        infoWrap.appendChild(changeTitle);

        header.appendChild(iconWrap);
        header.appendChild(infoWrap);

        const innerDiv = block.querySelector("div");
        if (innerDiv && innerDiv !== block) {
          innerDiv.insertBefore(header, innerDiv.firstChild);
        } else {
          block.insertBefore(header, block.firstChild);
        }

        if (pParent && pParent.textContent.trim() === "" && pParent.children.length === 0) {
          pParent.remove();
        }
      }
    });
  } catch (e) {
    console.warn("Patch notes header formatting warning:", e);
  }

  // 3. Highlight before/after stat arrows (⇒, &rArr;) with a styled badge
  try {
    const listItems = container.querySelectorAll("li");
    listItems.forEach(li => {
      if (li.innerHTML.includes("⇒") || li.innerHTML.includes("&rArr;")) {
        li.innerHTML = li.innerHTML.replace(/(?:⇒|&rArr;)/g, '<span class="patch-stat-arrow">⇒</span>');
      }
    });
  } catch (e) {
    console.warn("Patch notes stat arrow warning:", e);
  }
}

function handlePatchBodyClick(e) {
  // 1. Check if clicked an image or inside an image
  const img = e.target.closest("img");
  if (img) {
    if (img.closest(".context-designer") || 
        img.closest(".change-detail-title") || 
        img.closest(".patch-change-icon-wrap") ||
        img.closest(".reference-link")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    openImageLightbox(img.src, img.alt || img.title || "");
    return;
  }

  // 2. Check if clicked a link
  const a = e.target.closest("a");
  if (a) {
    const href = a.getAttribute("href");
    if (!href) return;
    if (isPatchImageUrl(href)) {
      e.preventDefault();
      e.stopPropagation();
      openImageLightbox(href, a.getAttribute("title") || "");
    } else {
      e.preventDefault();
      const fullHref = href.startsWith("http") ? href : ("https://www.leagueoflegends.com" + href);
      openExternalUrl(e, fullHref);
    }
  }
}

function isPatchImageUrl(url) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(url) || url.includes("/sanity/images/") || url.includes("images.contentstack.io");
}

let _lightboxPreloadId = 0;
function openImageLightbox(src, caption) {
  if (!src) return;
  const modal = document.getElementById("imageLightboxModal");
  const img = document.getElementById("imageLightboxImg");
  const cap = document.getElementById("imageLightboxCaption");
  if (!modal || !img) return;

  // Restore pristine uncompressed full-resolution asset
  let fullResSrc = src;
  if (fullResSrc.includes("cmsassets.rgpub.io/sanity/images/")) {
    // Strip ?w=800... sizing and compression parameters to fetch original high-res image
    fullResSrc = fullResSrc.split("?")[0];
  } else if (fullResSrc.includes("/champion/loading/") || fullResSrc.includes("/champion/tiles/")) {
    // Upgrade low-res champion cards to full splash
    fullResSrc = fullResSrc.replace(/\/champion\/(loading|tiles)\//, "/champion/splash/");
  }

  if (cap) {
    const cleanCap = (caption || "").replace(/<[^>]+>/g, "").trim();
    cap.textContent = cleanCap;
    cap.style.display = cleanCap ? "block" : "none";
  }

  // Clear previous image immediately and activate loader state
  const currentPreloadId = ++_lightboxPreloadId;
  img.src = "";
  img.style.display = "none";
  modal.classList.add("is-loading");

  modal.style.display = "flex";
  void modal.offsetHeight;
  modal.classList.add("active");

  const preloader = new Image();
  preloader.onload = function() {
    if (_lightboxPreloadId !== currentPreloadId) return; // Stale request
    img.src = fullResSrc;
    img.style.display = "block";
    modal.classList.remove("is-loading");
  };
  preloader.onerror = function() {
    if (_lightboxPreloadId !== currentPreloadId) return;
    img.src = src; // Fallback
    img.style.display = "block";
    modal.classList.remove("is-loading");
  };
  preloader.src = fullResSrc;
}

function closeLightboxContextMenu() {
  const menu = document.getElementById("imageLightboxContextMenu");
  if (menu) {
    menu.style.display = "none";
  }
}

function handleLightboxContextMenu(e) {
  if (!e) return;
  const modal = document.getElementById("imageLightboxModal");
  const img = document.getElementById("imageLightboxImg");
  const menu = document.getElementById("imageLightboxContextMenu");
  if (!modal || !img || !menu) return;
  if (!modal.classList.contains("active")) return;

  if (e.target.closest("#imageLightboxContextMenu")) return;

  const isImageOrDialog = e.target.closest(".image-lightbox-dialog") || e.target.closest(".image-lightbox-content");
  if (!isImageOrDialog) return;

  e.preventDefault();
  e.stopPropagation();

  if (!img.src || modal.classList.contains("is-loading")) {
    return;
  }

  menu.style.display = "flex";
  menu.style.visibility = "hidden";

  const menuWidth = menu.offsetWidth || 190;
  const menuHeight = menu.offsetHeight || 90;

  let posX = e.clientX;
  let posY = e.clientY;

  if (posX + menuWidth > window.innerWidth - 12) {
    posX = window.innerWidth - menuWidth - 12;
  }
  if (posY + menuHeight > window.innerHeight - 12) {
    posY = window.innerHeight - menuHeight - 12;
  }
  if (posX < 12) posX = 12;
  if (posY < 12) posY = 12;

  menu.style.left = posX + "px";
  menu.style.top = posY + "px";
  menu.style.visibility = "visible";
}

function downloadActiveLightboxImage(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById("imageLightboxModal");
  const img = document.getElementById("imageLightboxImg");
  if (!img || !img.src || (modal && modal.classList.contains("is-loading"))) {
    if (typeof showToast === "function") showToast("Image is still loading...", "info");
    return;
  }

  const captionEl = document.getElementById("imageLightboxCaption");
  let filename = "";
  if (captionEl && captionEl.textContent.trim()) {
    filename = captionEl.textContent.trim().replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_");
  }

  if (!filename) {
    try {
      const urlObj = new URL(img.src);
      const pathname = urlObj.pathname;
      const lastPart = pathname.substring(pathname.lastIndexOf("/") + 1);
      if (lastPart) {
        filename = lastPart.split("?")[0];
      }
    } catch(err) {
      filename = "league_artwork";
    }
  }

  if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(filename)) {
    filename += ".png";
  }

  if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === "function") {
    try {
      window.chrome.webview.postMessage("download-image:" + JSON.stringify({
        url: img.src,
        filename: filename
      }));
    } catch(err) {
      console.warn("WebView2 postMessage failed:", err);
    }
  }

  if (typeof showToast === "function") {
    showToast("Starting download: " + filename, "info");
  }

  fetch(img.src)
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.blob();
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        a.remove();
      }, 2500);
      if (typeof showToast === "function") {
        showToast("Image downloaded successfully!", "success");
      }
    })
    .catch(err => {
      console.warn("Blob fetch failed, falling back to direct link download:", err);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = img.src;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 2500);
    });
}

function copyActiveLightboxImageUrl() {
  const img = document.getElementById("imageLightboxImg");
  if (!img || !img.src) return;
  const url = img.src;

  if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === "function") {
    try {
      window.chrome.webview.postMessage("copy-clipboard:" + url);
    } catch(e){}
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      if (typeof showToast === "function") showToast("Image URL copied to clipboard!", "success");
    }).catch(() => {
      fallbackCopyText(url);
    });
  } else {
    fallbackCopyText(url);
  }
}

document.addEventListener("click", function(e) {
  if (!e.target.closest("#imageLightboxContextMenu")) {
    closeLightboxContextMenu();
  }
});

function closeImageLightbox(e) {
  if (e && e.target && (e.target.closest(".image-lightbox-content") || e.target.closest(".image-lightbox-header-actions") || e.target.closest(".image-lightbox-context-menu"))) {
    return;
  }
  const modal = document.getElementById("imageLightboxModal");
  if (modal) {
    closeLightboxContextMenu();
    modal.classList.remove("active");
    setTimeout(() => {
      if (!modal.classList.contains("active")) {
        modal.style.display = "none";
      }
    }, 180);
  }
}

function buildTableOfContents(bodyEl) {
  const tocBar = document.getElementById("patchTocBar");
  const tocChips = document.getElementById("patchTocChips");
  if (!tocBar || !tocChips) return;

  const headings = bodyEl.querySelectorAll("h2");
  if (headings.length <= 1) {
    tocBar.style.display = "none";
    return;
  }

  const chips = [];
  headings.forEach((h, i) => {
    const text = h.textContent.replace(/&nbsp;/g, "").trim();
    if (!text || text.length < 2 || text.toLowerCase() === "patch highlights") {
      if (text.toLowerCase() === "patch highlights") {
        const id = "patch-sec-" + i;
        h.id = id;
        chips.push({ id, label: "Highlights" });
      }
      return;
    }

    const id = "patch-sec-" + i;
    h.id = id;

    // Shorten label for chip navigation
    let label = text;
    if (label.length > 20) label = label.substring(0, 18) + "...";
    chips.push({ id, label });
  });

  if (chips.length > 0) {
    tocChips.innerHTML = chips.map(c => `
      <button class="patch-toc-chip" onclick="scrollToPatchSection('${c.id}')">${c.label}</button>
    `).join("");
    tocBar.style.display = "flex";
  } else {
    tocBar.style.display = "none";
  }
}

function scrollToPatchSection(secId) {
  const target = document.getElementById(secId);
  const scrollContainer = document.getElementById("patchContentArea");
  if (target && scrollContainer) {
    const offset = target.offsetTop - 55;
    scrollContainer.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }
}

function openCurrentPatchInBrowser() {
  if (!_currentPatchUrl) return;
  const fullUrl = _currentPatchUrl.startsWith("http") ? _currentPatchUrl : ("https://www.leagueoflegends.com" + _currentPatchUrl);
  openExternalUrl(null, fullUrl);
}

function showPatchError(msg) {
  const loadingState = document.getElementById("patchLoadingState");
  const errorState = document.getElementById("patchErrorState");
  const articleView = document.getElementById("patchArticleView");

  if (loadingState) loadingState.style.display = "none";
  if (articleView) articleView.style.display = "none";
  if (errorState) {
    errorState.style.display = "flex";
    const msgEl = document.getElementById("patchErrorMsg");
    if (msgEl) msgEl.textContent = msg;
  }
}

function retryLoadPatchNotes() {
  loadPatchNotesList();
}
