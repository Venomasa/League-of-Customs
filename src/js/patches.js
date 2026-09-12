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
      showPatchError("Failed to communicate with application bridge: " + e.message);
    }
  } else {
    // Fallback for standalone browser testing
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
            handlePatchNotesMessage({ patchNotesType: "patch-list", success: true, patches: list });
          }
        }
      })
      .catch(err => {
        showPatchError("Could not load patch notes: " + err.message);
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
    const thumbImg = p.image ? `<img src="${p.image}" alt="${p.patch}" onerror="this.parentElement.style.display='none';" />` : "";

    return `
      <div class="patch-archive-card ${idx === 0 ? 'active' : ''}" onclick="selectPatch('${p.url}')" data-url="${p.url}">
        ${p.image ? `<div class="patch-card-thumb">${thumbImg}</div>` : ''}
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
              title: data.props.pageProps.page.title || "",
              heroImage: mBlade && mBlade.media ? mBlade.media.url : "",
              bodyHtml: rtBlade.richText.body
            });
          }
        }
      })
      .catch(err => {
        showPatchError("Could not load patch detail: " + err.message);
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
    const bgUrl = detail.heroImage || meta.image || "";
    if (bgUrl) {
      backdropEl.style.backgroundImage = `url("${bgUrl}")`;
      backdropEl.style.display = "block";
    } else {
      backdropEl.style.display = "none";
    }
  }

  // Body Content
  const bodyEl = document.getElementById("patchArticleBody");
  if (bodyEl) {
    // Sanitize and adapt links
    let cleanedHtml = detail.bodyHtml || "";
    // Clean empty top headings
    cleanedHtml = cleanedHtml.replace(/<h2 id="patch-top">&nbsp;<\/h2>/g, "");

    // Group adjacent context-designers into a single compact patch-authors-row
    cleanedHtml = cleanedHtml.replace(/(<div class="context-designers">[\s\S]*?<\/div>(?:\s*<div class="context-designers">[\s\S]*?<\/div>)*)/gi, function(m) {
      return '<div class="patch-authors-row"><span class="patch-authors-label"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>AUTHORS</span>' + m + '</div>';
    });

    bodyEl.innerHTML = cleanedHtml;

    // Attach click listeners to links and images
    bodyEl.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href");
      const imgInside = a.querySelector("img");
      if (imgInside || isPatchImageUrl(href)) {
        const imgUrl = (imgInside ? imgInside.src : "") || href;
        const caption = (imgInside ? (imgInside.alt || imgInside.title) : "") || a.getAttribute("title") || "";
        a.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          openImageLightbox(imgUrl, caption);
        };
      } else if (href) {
        a.setAttribute("target", "_blank");
        a.onclick = (e) => {
          e.preventDefault();
          const fullHref = href.startsWith("http") ? href : ("https://www.leagueoflegends.com" + href);
          openExternalUrl(e, fullHref);
        };
      }
    });

    // Make all standalone content images clickable to view in lightbox
    bodyEl.querySelectorAll("img").forEach(img => {
      if (img.closest(".context-designer") || img.closest(".change-detail-title")) return;
      img.classList.add("patch-zoomable-img");
      img.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openImageLightbox(img.src, img.alt || img.title || "");
      };
    });

    // Build Quick Jump Table of Contents
    buildTableOfContents(bodyEl);
  }

  // Scroll to top of content area smoothly
  const contentArea = document.getElementById("patchContentArea");
  if (contentArea) contentArea.scrollTo({ top: 0, behavior: "smooth" });
}

function isPatchImageUrl(url) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(url) || url.includes("/sanity/images/") || url.includes("images.contentstack.io");
}

function openImageLightbox(src, caption) {
  if (!src) return;
  const modal = document.getElementById("imageLightboxModal");
  const img = document.getElementById("imageLightboxImg");
  const cap = document.getElementById("imageLightboxCaption");
  if (!modal || !img) return;

  img.src = src;
  if (cap) {
    const cleanCap = (caption || "").replace(/<[^>]+>/g, "").trim();
    cap.textContent = cleanCap;
    cap.style.display = cleanCap ? "block" : "none";
  }
  modal.style.display = "flex";
  void modal.offsetHeight;
  modal.classList.add("active");
}

function closeImageLightbox(e) {
  if (e && e.target && e.target.closest(".image-lightbox-content")) {
    return;
  }
  const modal = document.getElementById("imageLightboxModal");
  if (modal) {
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
