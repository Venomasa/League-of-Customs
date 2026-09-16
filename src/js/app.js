(function(){

      window._splashDismissed = false;

      // Top-level dismiss helper
      window._dismissSplashScreenImmediate = function(){
        if(window._splashDismissed) return;
        window._splashDismissed = true;
        var splash = document.getElementById("appSplashScreen");
        if(splash){
          splash.classList.add("splash-fade-out");
          setTimeout(function(){ splash.style.display = "none"; }, 350);
        }
      };
    })();


function switchAppTab(tab){
  const tabs = ["patches", "profile", "randomizer", "wiki"];
  const mainContent = document.querySelector(".main-content");
  if(mainContent){
    mainContent.style.overflowY = (tab === "patches") ? "hidden" : "auto";
  }
  tabs.forEach(t => {
    const btn = document.getElementById("navTab" + t.charAt(0).toUpperCase() + t.slice(1));
    const page = document.getElementById("page" + t.charAt(0).toUpperCase() + t.slice(1));
    if(btn) btn.classList.toggle("active", t === tab);
    if(page) page.classList.toggle("active", t === tab);
  });
  if(tab === "wiki" && typeof initWiki === "function"){
    initWiki();
  }
}

function openExternalUrl(e, url){
  if(e) e.preventDefault();
  if(!url || url === "#") return;
  if(window.chrome && window.chrome.webview){
    window.chrome.webview.postMessage("open-url:" + url);
  } else {
    window.open(url, "_blank");
  }
}

if(window.chrome&&window.chrome.webview){
  window.chrome.webview.addEventListener("message",function(e){
    try{
      const data=typeof e.data==="string"?JSON.parse(e.data):e.data;
      if(data && data.injectType === "solo-loadout"){
        handleInjectResult(data);
      }else if(data && data.wikiType){
        if(typeof handleWikiIpcMessage === "function"){
          handleWikiIpcMessage(data);
        }
      }else if(data && data.patchNotesType){

        handlePatchNotesMessage(data);

      }else if(data && data.profileType === "opgg"){

        handleProfileResult(data);

      }else if(data && data.gameDetailType === "opgg"){

        renderScoreboard(data);

      }else if(data && data.moreMatchesType === "opgg"){

        handleMoreMatchesResult(data);

      }else if(data && data.syncType === "live-data-sync"){

      handleLiveDataSyncResult(data);

    }else if(data && data.clipboardType === "clipboard-text"){

      if(window._pendingPasteTarget && typeof data.text === "string"){

        insertTextAtTarget(window._pendingPasteTarget, data.text);

        window._pendingPasteTarget = null;

      }

    }else if(data && data.lightboxType === "open-image"){

      if(typeof openImageLightbox === "function"){

        openImageLightbox(data.url, "");

      }

    }else if(data && data.type === "image-downloaded"){

      if(data.success){

        if(typeof showToast === "function") showToast("Image saved to Downloads folder!", "success");

      }else if(data.error){

        if(typeof showToast === "function") showToast("Download error: " + data.error, "error");

      }

    }else if(data && data.autoUpdate !== undefined){

      handleAutoUpdateMessage(data);

    }else if(data && data.userDataType === "user-data-loaded"){

      try{

        const parsed = JSON.parse(data.data || "{}");

        if(parsed.favorites && Array.isArray(parsed.favorites) && parsed.favorites.length > 0){

          localStorage.setItem("loc_favorite_profiles", JSON.stringify(parsed.favorites));

        }

        if(parsed.defaultProfile && parsed.defaultProfile.name){

          localStorage.setItem("loc_default_profile", JSON.stringify(parsed.defaultProfile));

        }

        checkAndAutoLoadDefaultProfile();

      }catch(err){}

    }else if(data && data.masteryType === "championmastery"){

        handleMasteryResult(data);

      }else if(data && (data.players || data.error)){

        handleLobbyResult(data);

      }

    }catch(err){}

  });

}

function minimizeAppWindow(){

  if(window.chrome&&window.chrome.webview){

    window.chrome.webview.postMessage("minimize");

  }else if(window.location.origin.startsWith("http")){

    fetch("/window/minimize").catch(function(){});

  }

}

function closeAppWindow(){

  if(window.chrome&&window.chrome.webview){

    window.chrome.webview.postMessage("close");

  }else if(window.location.origin.startsWith("http")){

    fetch("/window/close").catch(function(){});

  }

  try{window.close();}catch(e){}

}

// ===================================================================
// HEXTECH CONTEXT MENU (Copy / Cut / Paste / Select All)
// ===================================================================
let _ctxTarget = null;
let _ctxSelectedText = "";
window._pendingPasteTarget = null;

function copyTextToClipboard(text) {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function(){});
    }
  } catch(e) {}
  if (window.chrome && window.chrome.webview) {
    try { window.chrome.webview.postMessage("copy-clipboard:" + text); } catch(e){}
  }
}

function insertTextAtTarget(target, text) {
  if (!target) return;
  target.focus();
  if (typeof target.selectionStart === "number" && typeof target.selectionEnd === "number") {
    const s = target.selectionStart;
    const e = target.selectionEnd;
    const val = target.value;
    target.value = val.substring(0, s) + text + val.substring(e);
    target.selectionStart = target.selectionEnd = s + text.length;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    try { document.execCommand("insertText", false, text); } catch(err){}
  }
}

function hideHextechContextMenu() {
  const menu = document.getElementById("hextechContextMenu");
  if (menu) {
    menu.classList.remove("active");
    menu.style.display = "none";
  }
  _ctxTarget = null;
  _ctxSelectedText = "";
}

function ctxExecuteCopy() {
  let text = "";
  if (_ctxTarget && (_ctxTarget.tagName === "INPUT" || _ctxTarget.tagName === "TEXTAREA")) {
    const s = _ctxTarget.selectionStart;
    const e = _ctxTarget.selectionEnd;
    if (s !== e) {
      text = _ctxTarget.value.substring(s, e);
    }
  }
  if (!text) {
    text = _ctxSelectedText || (window.getSelection() ? window.getSelection().toString() : "");
  }
  if (text) {
    copyTextToClipboard(text);
  }
  hideHextechContextMenu();
}

function ctxExecuteCut() {
  if (!_ctxTarget || (_ctxTarget.tagName !== "INPUT" && _ctxTarget.tagName !== "TEXTAREA")) {
    hideHextechContextMenu();
    return;
  }
  const s = _ctxTarget.selectionStart;
  const e = _ctxTarget.selectionEnd;
  if (s !== e && !_ctxTarget.readOnly && !_ctxTarget.disabled) {
    const text = _ctxTarget.value.substring(s, e);
    copyTextToClipboard(text);
    _ctxTarget.value = _ctxTarget.value.substring(0, s) + _ctxTarget.value.substring(e);
    _ctxTarget.selectionStart = _ctxTarget.selectionEnd = s;
    _ctxTarget.dispatchEvent(new Event("input", { bubbles: true }));
    _ctxTarget.dispatchEvent(new Event("change", { bubbles: true }));
  }
  hideHextechContextMenu();
}

async function ctxExecutePaste() {
  const target = _ctxTarget;
  hideHextechContextMenu();
  if (!target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")) return;
  if (target.readOnly || target.disabled) return;

  target.focus();
  let text = "";
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      text = await navigator.clipboard.readText();
    }
  } catch(e) {}

  if (text) {
    insertTextAtTarget(target, text);
    return;
  }

  // Fallback to C# Bridge
  if (window.chrome && window.chrome.webview) {
    window._pendingPasteTarget = target;
    try { window.chrome.webview.postMessage("read-clipboard"); } catch(e){}
  }
}

function ctxExecuteSelectAll() {
  if (_ctxTarget && (_ctxTarget.tagName === "INPUT" || _ctxTarget.tagName === "TEXTAREA")) {
    _ctxTarget.focus();
    _ctxTarget.select();
  }
  hideHextechContextMenu();
}

document.addEventListener("contextmenu", function(e) {
  const sel = window.getSelection();
  const selectedText = sel ? sel.toString().trim() : "";
  const target = e.target;
  const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
  const isEditable = isInput && !target.readOnly && !target.disabled;

  if (!isInput && !selectedText) {
    e.preventDefault();
    hideHextechContextMenu();
    return;
  }

  e.preventDefault();
  _ctxTarget = target;
  _ctxSelectedText = selectedText;

  const menu = document.getElementById("hextechContextMenu");
  if (!menu) return;

  const cutEl = document.getElementById("ctxCut");
  const copyEl = document.getElementById("ctxCopy");
  const pasteEl = document.getElementById("ctxPaste");
  const selectAllEl = document.getElementById("ctxSelectAll");
  const dividerEl = document.getElementById("ctxDivider");

  if (isInput) {
    const hasSelection = typeof target.selectionStart === "number" && target.selectionStart !== target.selectionEnd;
    if (cutEl) {
      cutEl.style.display = "flex";
      cutEl.classList.toggle("disabled", !isEditable || !hasSelection);
    }
    if (copyEl) {
      copyEl.style.display = "flex";
      copyEl.classList.toggle("disabled", !hasSelection);
    }
    if (pasteEl) {
      pasteEl.style.display = isEditable ? "flex" : "none";
      pasteEl.classList.remove("disabled");
    }
    if (dividerEl) dividerEl.style.display = "block";
    if (selectAllEl) {
      selectAllEl.style.display = "flex";
      selectAllEl.classList.toggle("disabled", !target.value || target.value.length === 0);
    }
  } else {
    if (cutEl) cutEl.style.display = "none";
    if (copyEl) {
      copyEl.style.display = "flex";
      copyEl.classList.remove("disabled");
    }
    if (pasteEl) pasteEl.style.display = "none";
    if (dividerEl) dividerEl.style.display = "none";
    if (selectAllEl) selectAllEl.style.display = "none";
  }

  menu.style.display = "block";
  menu.classList.add("active");

  const menuW = menu.offsetWidth || 175;
  const menuH = menu.offsetHeight || 135;
  let posX = e.clientX;
  let posY = e.clientY;

  if (posX + menuW > window.innerWidth - 8) {
    posX = window.innerWidth - menuW - 8;
  }
  if (posY + menuH > window.innerHeight - 8) {
    posY = window.innerHeight - menuH - 8;
  }

  menu.style.left = Math.max(8, posX) + "px";
  menu.style.top = Math.max(8, posY) + "px";
});

document.addEventListener("click", function(e) {
  if (!e.target.closest("#hextechContextMenu")) {
    hideHextechContextMenu();
  }
});
document.addEventListener("scroll", hideHextechContextMenu, true);
window.addEventListener("resize", hideHextechContextMenu);
window.addEventListener("blur", hideHextechContextMenu);
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    hideHextechContextMenu();
    if (typeof closeImageLightbox === "function") {
      closeImageLightbox();
    }
  }
});

(function initTitlebarDrag(){

  var tb=document.getElementById("appTitlebar");

  if(!tb)return;

  tb.addEventListener("mousedown",function(e){

    if(e.target.closest(".win-btn")||e.button!==0)return;

    if(window.chrome&&window.chrome.webview){

      window.chrome.webview.postMessage("drag");

      e.preventDefault();

      return;

    }

    var startX=e.screenX,startY=e.screenY;

    function onMove(ev){

      var dx=ev.screenX-startX,dy=ev.screenY-startY;

      if(dx!==0||dy!==0){

        startX=ev.screenX;startY=ev.screenY;

        try{window.moveBy(dx,dy);}catch(err){}

      }

    }

    function onUp(){

      window.removeEventListener("mousemove",onMove);

      window.removeEventListener("mouseup",onUp);

    }

    window.addEventListener("mousemove",onMove);

    window.addEventListener("mouseup",onUp);

    e.preventDefault();

  });

})();

window.addEventListener("beforeunload",function(){

  if(window.location.origin.startsWith("http")){

    try{navigator.sendBeacon("/exit");}catch(err){}

  }

});

function copyContact(text,msg){

  if(window.chrome&&window.chrome.webview){

    window.chrome.webview.postMessage("copy-clipboard:"+text);

  }

  if(navigator.clipboard&&navigator.clipboard.writeText){

    navigator.clipboard.writeText(text).catch(()=>{});

  }

  showToast(msg||"Copied to clipboard!");

}


function showToast(msg){const t=document.getElementById("toast");t.innerText=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500);}


function openAboutModal(){

  var m=document.getElementById("aboutModal");

  if(m)m.classList.add("open");

}

function closeAboutModal(){

  var m=document.getElementById("aboutModal");

  if(m)m.classList.remove("open");

}

function onOverlayClick(e){

  if(e.target&&e.target.id==="aboutModal"){

    closeAboutModal();

  }

}

function openExternalLink(e,url){

  e.preventDefault();

  if(window.chrome&&window.chrome.webview){

    window.chrome.webview.postMessage("open-url:"+url);

  }else{

    window.open(url,"_blank");

  }

}

document.addEventListener("keydown",e=>{

  if(e.key==="Escape"){

    closeAboutModal();

    return;

  }

  if(e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT")return;

  if(e.code==="Space"||e.code==="Enter"){e.preventDefault();animateAndRandomize();}

});


let _autoUpdateResolve = null;

let _isAutoUpdating = false;

function handleAutoUpdateMessage(data){

  if(!data) return;

  const statusEl = document.getElementById("splashStatusText");

  const barEl = document.getElementById("splashProgressBar");

  

  if(data.status === "found"){
    _isAutoUpdating = true;
    if(window._splashSafetyTimer){
      clearTimeout(window._splashSafetyTimer);
      window._splashSafetyTimer = null;
    }
    const sizeMb = data.size ? ` (${(data.size / 1048576).toFixed(1)} MB)` : "";
    if(statusEl) statusEl.textContent = `New update (${data.version}) found! Downloading${sizeMb}...`;
    if(barEl) barEl.style.width = "55%";

    // Safety timeout for download: 45s maximum to avoid freezing on stalled connection
    if(window._updateDownloadTimer) clearTimeout(window._updateDownloadTimer);
    window._updateDownloadTimer = setTimeout(() => {
      if(_isAutoUpdating){
        console.warn("Auto-update download timed out. Proceeding to app.");
        _isAutoUpdating = false;
        if(statusEl) statusEl.textContent = "Starting League of Customs...";
        dismissSplashScreen();
      }
    }, 45000);

  } else if(data.status === "downloading"){
    _isAutoUpdating = true;
    const pct = data.progress || 0;
    const mappedPct = 55 + Math.round((pct / 100) * 40);
    if(statusEl) statusEl.textContent = `Updating to ${data.version}... ${pct}%`;
    if(barEl) barEl.style.width = mappedPct + "%";

  } else if(data.status === "installing"){
    _isAutoUpdating = true;
    if(window._updateDownloadTimer) clearTimeout(window._updateDownloadTimer);
    if(statusEl) statusEl.textContent = `Installing update (${data.version})... Restarting...`;
    if(barEl) barEl.style.width = "100%";

  } else if(data.status === "up-to-date" || data.status === "no-installer-asset"){
    _isAutoUpdating = false;
    if(_autoUpdateResolve){
      _autoUpdateResolve();
      _autoUpdateResolve = null;
    }

  } else if(data.status === "error"){
    _isAutoUpdating = false;
    if(window._updateDownloadTimer) clearTimeout(window._updateDownloadTimer);
    if(_autoUpdateResolve){
      _autoUpdateResolve();
      _autoUpdateResolve = null;
    }
    // Graceful recovery: proceed to app instead of getting stuck on splash screen
    if(statusEl) statusEl.textContent = "Ready. Welcome, Summoner.";
    if(barEl) barEl.style.width = "100%";
    setTimeout(() => {
      dismissSplashScreen();
    }, 350);
  }
}

// ==========================================================================

// SEMANTIC VERSIONING & LIVE SYNC ENGINE

// ==========================================================================

function parseSemVer(str){

  if(!str) return [0, 0, 0];

  const clean = str.toString().replace(/^v/i, '').trim();

  const parts = clean.split(/[.-]/).map(p => parseInt(p, 10) || 0);

  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];

}

function isNewerVersion(latest, current){

  const [lMaj, lMin, lPatch] = parseSemVer(latest);

  const [cMaj, cMin, cPatch] = parseSemVer(current);

  if (lMaj > cMaj) return true;

  if (lMaj < cMaj) return false;

  if (lMin > cMin) return true;

  if (lMin < cMin) return false;

  return lPatch > cPatch;

}

function toOfficialLeaguePatch(ver){
  if(ver && typeof ver === "string"){
    const clean = ver.trim();
    const parts = clean.split(".");
    if(parts.length >= 2){
      let major = parts[0];
      const minor = parts[1];
      // Map Data Dragon internal version (16.x) to official League of Legends season patch (26.x)
      if(major === "16") major = "26";
      return `${major}.${minor}`;
    }
    if(clean.startsWith("16.")) return "26." + clean.substring(3);
    if(clean.startsWith("26.")) return clean;
  }
  if(window._currentLeaguePatch && typeof window._currentLeaguePatch === "string"){
    const cp = window._currentLeaguePatch.trim();
    if(cp.startsWith("16.")) return "26." + cp.substring(3);
    if(cp.startsWith("26.")) return cp;
  }
  try{
    const stored = localStorage.getItem("loc_latest_league_patch");
    if(stored && typeof stored === "string"){
      const sp = stored.trim();
      if(sp.startsWith("16.")) return "26." + sp.substring(3);
      if(sp.startsWith("26.")) return sp;
    }
  }catch(e){}
  return "26.18";
}
window.toOfficialLeaguePatch = toOfficialLeaguePatch;

function updateDisplayedLeagueVersion(ver){

  const finalVer = toOfficialLeaguePatch(ver);

  window._currentLeaguePatch = finalVer;
  try { localStorage.setItem("loc_latest_league_patch", finalVer); } catch(e){}

  // Titlebar
  const tbNum = document.getElementById("titlebarVersion") || document.querySelector(".titlebar-version .v-num");
  if(tbNum) {
    tbNum.innerHTML = `v0.7.0 <span class="v-patch">(LoL ${finalVer})</span>`;
  } else {
    const tbEl = document.querySelector(".titlebar-version");
    if(tbEl) tbEl.innerHTML = `<span class="v-num">v0.7.0 <span class="v-patch">(LoL ${finalVer})</span></span>`;
  }

  // Modal About Card
  const modalMetaEl = document.querySelector(".about-update-meta");
  if(modalMetaEl) modalMetaEl.innerHTML = `Installed Version: <span class="meta-gold">v0.7.0</span> &bull; Game Patch: <span class="meta-blue">LoL ${finalVer}</span>`;

  // Modal Footer
  const modalFooterVer = document.getElementById("modalFooterVersion");
  if(modalFooterVer) modalFooterVer.innerHTML = `v0.7.0 <span class="v-patch">(LoL ${finalVer})</span>`;

  // Splash Tag
  const splashTag = document.getElementById("splashPatchTag");
  if(splashTag) splashTag.textContent = `v0.7.0 (LoL ${finalVer}) • AUTONOMOUS LIVE ENGINE`;

  // Items Page Shop Badges
  const lolShopSidebarPatch = document.getElementById("lolShopSidebarPatch");
  if(lolShopSidebarPatch) lolShopSidebarPatch.innerText = finalVer;
  const lolShopPatchTag = document.getElementById("lolShopPatchTag");
  if(lolShopPatchTag) lolShopPatchTag.innerText = "PATCH " + finalVer;

}

function loadCachedDynamicLolData(){

  try{

    const cached = localStorage.getItem("loc_dynamic_lol_data");

    if(cached){

      const parsed = JSON.parse(cached);

      if(parsed && parsed.version){

        LOL_DATA.version = parsed.version;

        if(Array.isArray(parsed.items) && parsed.items.length > 0){

          // Clean removed items from stale cache (e.g. Trailblazer, Opportunity)

          LOL_DATA.items = parsed.items.filter(it => it.id !== 3002 && it.id !== 6701);

        }

        if(Array.isArray(parsed.champions) && parsed.champions.length >= LOL_DATA.champions.length){

          LOL_DATA.champions = parsed.champions;

        }

        if(Array.isArray(parsed.runes) && parsed.runes.length >= 2){
          LOL_DATA.runes = parsed.runes;
        }

        if(Array.isArray(parsed.starters) && parsed.starters.length > 0){
          LOL_DATA.starters = parsed.starters;
        }

        if(Array.isArray(parsed.boots) && parsed.boots.length >= 4){
          LOL_DATA.boots = parsed.boots;
        }

        if(Array.isArray(parsed.spells) && parsed.spells.length >= 8){
          LOL_DATA.spells = parsed.spells;
        }

        updateDisplayedLeagueVersion(parsed.version);

      }

    }

  }catch(e){}

}

function syncLiveItemsIntoPool(itemsObj){

  if(!itemsObj || typeof itemsObj !== "object") return;

  

  // 1. Filter out any items in LOL_DATA.items that have been removed or disabled in the store

  const prevCount = LOL_DATA.items.length;

  LOL_DATA.items = LOL_DATA.items.filter(it => {

    // Explicitly purged items

    if(it.id === 3002 || it.id === 6701) return false;

    const item = itemsObj[it.id] || itemsObj[String(it.id)];

    if(!item) return false; // Not in live Riot item catalog

    if(item.inStore === false) return false; // Removed from store

    if(item.gold && item.gold.purchasable === false) return false; // Not purchasable

    if(item.maps && item.maps["11"] === false) return false; // Not on Summoner's Rift

    return true;

  });

  const removedCount = prevCount - LOL_DATA.items.length;

  if(removedCount > 0){

    console.log(`Live Sync: Pruned ${removedCount} removed items from pool.`);

  }

  // 2. Add any new legendary items present in Riot's live patch

  const existingIds = new Set(LOL_DATA.items.map(i => Number(i.id)));

  let addedCount = 0;

  

  Object.keys(itemsObj).forEach(idStr => {

    const id = Number(idStr);

    if(idStr.length !== 4) return; // Standard Summoner's Rift items are 4 digits

    const item = itemsObj[idStr];

    if(!item || existingIds.has(id)) return;

    

    const isSR = item.maps && item.maps["11"] === true;

    const inStore = item.inStore !== false;

    const purchasable = !item.gold || item.gold.purchasable !== false;

    const totalGold = (item.gold && item.gold.total) ? item.gold.total : 0;

    const isLegendary = totalGold >= 2200 && (!item.into || item.into.length === 0);

    const notBootsOrConsumable = !item.tags || (!item.tags.includes("Boots") && !item.tags.includes("Consumable") && !item.tags.includes("Trinket"));

    

    if(isSR && inStore && purchasable && isLegendary && notBootsOrConsumable && item.name){

      LOL_DATA.items.push({ id: id, name: item.name });

      existingIds.add(id);

      addedCount++;

    }

  });

  LOL_DATA.items.sort((a, b) => a.name.localeCompare(b.name));

  // 3. Sync starter items from Riot live patch
  if (Array.isArray(LOL_DATA.starters)) {
    const existingStarterIds = new Set(LOL_DATA.starters.map(s => Number(s.id)));
    const STARTER_NAMES = ['doran', 'cull', 'dark seal', 'tear', 'atlas', 'hatchling', 'pup', 'seedling'];
    Object.keys(itemsObj).forEach(idStr => {
      const id = Number(idStr);
      if (existingStarterIds.has(id)) return;
      const item = itemsObj[idStr];
      if (!item || !item.name) return;
      const isSR = item.maps && item.maps["11"] === true;
      const inStore = item.inStore !== false;
      const purchasable = !item.gold || item.gold.purchasable !== false;
      const totalGold = (item.gold && item.gold.total) ? item.gold.total : 0;
      const lowerName = item.name.toLowerCase();
      if (isSR && inStore && purchasable && totalGold <= 500 && (!item.from || item.from.length === 0)) {
        if (STARTER_NAMES.some(kw => lowerName.includes(kw))) {
          LOL_DATA.starters.push({ id: id, name: item.name, mode: 'rift' });
          existingStarterIds.add(id);
        }
      }
    });
  }

  // Persist cleansed and updated items to localStorage
  try{
    localStorage.setItem("loc_dynamic_lol_data", JSON.stringify({
      version: LOL_DATA.version,
      items: LOL_DATA.items,
      champions: LOL_DATA.champions,
      runes: LOL_DATA.runes,
      starters: LOL_DATA.starters
    }));
  }catch(e){}
  
  if(addedCount > 0){
    console.log(`Live Sync: Added ${addedCount} new items to randomizer pool.`);
  }
}

function syncLiveRunesIntoPool(runesArr){
  if(!Array.isArray(runesArr) || runesArr.length < 2) return;
  const normalized = runesArr.map(tree => {
    const slots = tree.slots || [];
    const isDDragonFormat = slots.length > 0 && slots[0] && Array.isArray(slots[0].runes);
    const keystones = isDDragonFormat ? slots[0].runes : (tree.keystones || []);
    const minorSlots = isDDragonFormat
      ? slots.slice(1).map(s => Array.isArray(s) ? s : (s.runes || []))
      : (tree.slots || []);
    return {
      id: tree.id,
      name: tree.name,
      icon: tree.icon,
      keystones: keystones,
      slots: minorSlots
    };
  });
  LOL_DATA.runes = normalized;
  try{
    localStorage.setItem("loc_dynamic_lol_data", JSON.stringify({
      version: LOL_DATA.version,
      items: LOL_DATA.items,
      champions: LOL_DATA.champions,
      runes: LOL_DATA.runes
    }));
  }catch(e){}
  console.log(`Live Sync: Synchronized ${normalized.length} rune trees into randomizer pool.`);
}

function syncLiveChampionsIntoPool(champsObj) {
  if (!champsObj || typeof champsObj !== "object") return;
  if (!Array.isArray(LOL_DATA.champions)) LOL_DATA.champions = [];
  const existingIds = new Set(LOL_DATA.champions.map(c => (c.id || "").toLowerCase()));
  let addedCount = 0;

  Object.keys(champsObj).forEach(cKey => {
    const c = champsObj[cKey];
    if (!c || !c.id) return;
    const idLower = c.id.toLowerCase();
    if (existingIds.has(idLower)) return;

    // Smart lane deduction based on Riot tags
    const tags = Array.isArray(c.tags) ? c.tags : ["Fighter"];
    const lanes = [];
    if (tags.includes("Marksman")) lanes.push("ADC");
    if (tags.includes("Support")) lanes.push("Support");
    if (tags.includes("Assassin")) {
      lanes.push("Mid");
      if (tags.includes("Fighter")) lanes.push("Jungle");
    }
    if (tags.includes("Mage") && !lanes.includes("Mid")) lanes.push("Mid");
    if (tags.includes("Tank")) {
      if (!lanes.includes("Top")) lanes.push("Top");
      if (!lanes.includes("Support") && tags.includes("Support")) lanes.push("Support");
      if (tags.includes("Fighter") && !lanes.includes("Jungle")) lanes.push("Jungle");
    }
    if (tags.includes("Fighter")) {
      if (!lanes.includes("Top")) lanes.push("Top");
      if (!lanes.includes("Jungle")) lanes.push("Jungle");
    }
    if (lanes.length === 0) lanes.push("Mid", "Top");

    const newChamp = {
      id: c.id,
      name: c.name || c.id,
      title: c.title || "",
      roles: tags,
      lanes: lanes,
      key: Number(c.key) || 0
    };

    LOL_DATA.champions.push(newChamp);
    existingIds.add(idLower);
    addedCount++;

    // Register alias in CHAMPION_INTERNAL_KEYS if defined
    if (typeof CHAMPION_INTERNAL_KEYS !== "undefined") {
      const cleanName = (c.name || c.id).toLowerCase();
      CHAMPION_INTERNAL_KEYS[cleanName] = c.id;
      CHAMPION_INTERNAL_KEYS[idLower] = c.id;
    }
  });

  if (addedCount > 0) {
    LOL_DATA.champions.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Live Sync: Added ${addedCount} new champions to randomizer pool with auto-assigned lanes.`);
  }
}

// Backwards compatibility alias
const mergeNewChampionsIntoPool = syncLiveChampionsIntoPool;

function syncLiveBootsIntoPool(itemsObj) {
  if (!itemsObj || typeof itemsObj !== "object") return;
  const bootsList = [];
  const existingBootIds = new Set();

  Object.keys(itemsObj).forEach(idStr => {
    const it = itemsObj[idStr];
    if (!it || !it.name) return;
    const isBoot = it.tags && it.tags.includes("Boots");
    const isCompleted = (!it.into || it.into.length === 0) && it.gold && it.gold.total >= 900;
    const isSR = !it.maps || it.maps["11"] === true;
    const inStore = it.inStore !== false;
    if (isBoot && isCompleted && isSR && inStore) {
      bootsList.push({ id: Number(idStr), name: it.name });
      existingBootIds.add(Number(idStr));
    }
  });

  if (bootsList.length >= 4) {
    bootsList.sort((a, b) => a.name.localeCompare(b.name));
    LOL_DATA.boots = bootsList;
    console.log(`Live Sync: Synchronized ${bootsList.length} boots into randomizer.`);
  }
}

function syncLiveSpellsIntoPool(spellsObj) {
  if (!spellsObj || typeof spellsObj !== "object") return;
  const spellsList = [];

  Object.keys(spellsObj).forEach(sKey => {
    const s = spellsObj[sKey];
    if (!s || !s.modes || !Array.isArray(s.modes)) return;
    const isClassic = s.modes.includes("CLASSIC");
    const isAram = s.modes.includes("ARAM");
    if (!isClassic && !isAram) return;

    const mode = (isClassic && isAram) ? "both" : (isClassic ? "rift" : "aram");
    const isJungle = s.id === "SummonerSmite" || (s.name && s.name.toLowerCase().includes("smite"));
    spellsList.push({
      id: s.id,
      name: s.name,
      key: Number(s.key) || 0,
      mode: mode,
      jungleOnly: isJungle || undefined
    });
  });

  if (spellsList.length >= 8) {
    LOL_DATA.spells = spellsList;
    console.log(`Live Sync: Synchronized ${spellsList.length} summoner spells into randomizer.`);
  }
}

function persistLiveLolData() {
  try {
    localStorage.setItem("loc_dynamic_lol_data", JSON.stringify({
      version: LOL_DATA.version,
      items: LOL_DATA.items,
      champions: LOL_DATA.champions,
      runes: LOL_DATA.runes,
      starters: LOL_DATA.starters,
      boots: LOL_DATA.boots,
      spells: LOL_DATA.spells
    }));
  } catch (e) {}
}

async function syncLiveLolData(){

  try{

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), 3500);

    

    const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", { signal: controller.signal });

    clearTimeout(timeoutId);

    if(!vRes.ok) return;

    const versions = await vRes.json();

    if(!versions || !versions.length) return;

    const latestPatch = versions[0];

    

    updateDisplayedLeagueVersion(latestPatch);

    

    if(LOL_DATA.version !== latestPatch){

      console.log(`Live Sync: Upgrading League data from ${LOL_DATA.version} to ${latestPatch}`);

      LOL_DATA.version = latestPatch;

      

      // Fetch latest items

      try{

        const itemRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/data/en_US/item.json`);

        if(itemRes.ok){

          const itemJson = await itemRes.json();

          if(itemJson && itemJson.data) mergeNewItemsIntoPool(itemJson.data);

        }

      }catch(err){}

      

      // Fetch latest champions

      try{

        const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/data/en_US/champion.json`);

        if(champRes.ok){

          const champJson = await champRes.json();

          if(champJson && champJson.data) mergeNewChampionsIntoPool(champJson.data);

        }

      }catch(err){}

      

      // Fetch latest runes

      try{

        const runesRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/data/en_US/runesReforged.json`);

        if(runesRes.ok){

          const runesJson = await runesRes.json();

          if(Array.isArray(runesJson)) syncLiveRunesIntoPool(runesJson);

        }

      }catch(err){}

      

      // Persist to local cache

      try{

        localStorage.setItem("loc_dynamic_lol_data", JSON.stringify({

          version: latestPatch,

          items: LOL_DATA.items,

          champions: LOL_DATA.champions,

          runes: LOL_DATA.runes,

          starters: LOL_DATA.starters

        }));

      }catch(err){}

    }

  }catch(e){

    console.warn("Live sync completed or offline fallback used:", e.message);

  }

}

// ==========================================================================

// REAL C# BACKED LIVE SYNC & SPLASH PROGRESSION

// ==========================================================================

let _splashDismissed = false;

let _liveSyncPromiseResolve = null;

function dismissSplashScreen(){

  if(typeof window._dismissSplashScreenImmediate === "function"){

    window._dismissSplashScreenImmediate();

    return;

  }

  if(_splashDismissed) return;

  _splashDismissed = true;

  const splashEl = document.getElementById("appSplashScreen");

  if(splashEl){

    splashEl.classList.add("splash-fade-out");

    setTimeout(() => {

      splashEl.style.display = "none";

    }, 400);

  }

}

function handleLiveDataSyncResult(data){
  if(!data) return;
  const statusEl = document.getElementById("splashStatusText");
  const barEl = document.getElementById("splashProgressBar");
  
  if(data.success && data.latestPatch){
    const patch = data.latestPatch;
    updateDisplayedLeagueVersion(patch);
    
    if(barEl) barEl.style.width = "82%";
    if(statusEl) statusEl.textContent = `Live League Patch: ${patch} Verified`;
    
    if(data.itemsData){
      syncLiveItemsIntoPool(data.itemsData);
      syncLiveBootsIntoPool(data.itemsData);
    }
    if(data.championsData){
      syncLiveChampionsIntoPool(data.championsData);
    }
    if(data.runesData){
      syncLiveRunesIntoPool(data.runesData);
    }
    if(data.spellsData){
      syncLiveSpellsIntoPool(data.spellsData);
    }

    persistLiveLolData();

    if(data.forced){
      showToast("Live Engine: All caches cleared & re-synchronized with Riot CDN!");
      if(typeof updateSettingsLiveStatus === "function") updateSettingsLiveStatus(true);
      const btn = document.getElementById("btnForceResync");
      if(btn){
        btn.disabled = false;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> FORCE RE-SYNC & CLEAR CACHE`;
      }
    }
  } else {
    // Offline or network timeout
    if(barEl) barEl.style.width = "82%";
    if(statusEl) statusEl.textContent = `Offline Mode: Loaded LoL ${LOL_DATA.version}`;
    if(data.forced){
      showToast("Force re-sync failed: " + (data.error || "network error"), "error");
      if(typeof updateSettingsLiveStatus === "function") updateSettingsLiveStatus(false);
      const btn = document.getElementById("btnForceResync");
      if(btn){
        btn.disabled = false;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> FORCE RE-SYNC & CLEAR CACHE`;
      }
    }
  }
  
  if(_liveSyncPromiseResolve){
    _liveSyncPromiseResolve(data);
    _liveSyncPromiseResolve = null;
  }
}

async function runAppStartupSync(){

  const statusEl = document.getElementById("splashStatusText");

  const barEl = document.getElementById("splashProgressBar");

  

  function updateSplash(msg, pct){

    if(statusEl) statusEl.textContent = msg;

    if(barEl) barEl.style.width = pct + "%";

  }

  

  // Hard safety timeout: Never trap user for more than 3.0s unless actively auto-updating

  // Hard safety timeout: Never trap user for more than 4.2s unless actively auto-updating
  window._splashSafetyTimer = setTimeout(() => {
    if(!_isAutoUpdating){
      dismissSplashScreen();
    }
  }, 4200);

  try {
    // Step 1: Initialize Core
    updateSplash("Initializing Hextech Core...", 25);
    await new Promise(r => setTimeout(r, 150));

    // Step 2: Real live sync via C# native bridge
    updateSplash("Connecting to Riot DataDragon...", 48);

    const syncWaitPromise = new Promise(resolve => {
      _liveSyncPromiseResolve = resolve;
    });

    if(window.chrome && window.chrome.webview){
      window.chrome.webview.postMessage("sync-live-data:" + (LOL_DATA.version || "16.18.1"));
    } else {
      fetch("https://ddragon.leagueoflegends.com/api/versions.json")
        .then(r => r.json())
        .then(v => handleLiveDataSyncResult({ success: true, latestPatch: v[0] }))
        .catch(err => handleLiveDataSyncResult({ success: false, error: err.message }));
    }

    // Await real C# response (or 1.8s max race on slow connections)
    await Promise.race([
      syncWaitPromise,
      new Promise(r => setTimeout(r, 1800))
    ]);

    // Step 3: Live Sync Auto-Update Check
    updateSplash("Checking for updates...", 68);

    const updateWaitPromise = new Promise(resolve => {
      _autoUpdateResolve = resolve;
    });

    if(window.chrome && window.chrome.webview){
      window.chrome.webview.postMessage("check-auto-update");
    }

    // Wait up to 2.2s for response. If update is found, _isAutoUpdating becomes true
    await Promise.race([
      updateWaitPromise,
      new Promise(r => setTimeout(r, 2200))
    ]);

    if(_isAutoUpdating){
      // If downloading/installing update, keep splash active until installer restarts app
      return;
    }

    // Step 4: Ready
    updateSplash("Ready. Welcome, Summoner.", 100);
    await new Promise(r => setTimeout(r, 250));

  } catch(e) {
    console.error("Startup error:", e);
  } finally {
    if(!_isAutoUpdating){
      if(window._splashSafetyTimer){
        clearTimeout(window._splashSafetyTimer);
        window._splashSafetyTimer = null;
      }
      dismissSplashScreen();
    }
  }
}


// ==========================================================================
// GENERAL SETTINGS & LIVE SYNC ENGINE MANAGER (v0.7.0)
// ==========================================================================

const DEFAULT_SETTINGS = {
  defaultMode: "rift",         // "rift" | "aram"
  autoCopyDiscord: false,     // boolean
  rollAnimation: "normal",    // "normal" | "instant"
  soundEnabled: true,         // boolean
  autoConnectLcu: true        // boolean
};

let APP_SETTINGS = Object.assign({}, DEFAULT_SETTINGS);

function loadAppSettings() {
  try {
    const saved = localStorage.getItem("loc_user_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      APP_SETTINGS = Object.assign({}, DEFAULT_SETTINGS, parsed);
    }
  } catch (e) {}
  applyAppSettings();
}

function saveAppSettings() {
  try {
    localStorage.setItem("loc_user_settings", JSON.stringify(APP_SETTINGS));
  } catch (e) {}
}

function applyAppSettings() {
  // 1. Default mode for solo randomizer
  if (APP_SETTINGS.defaultMode === "aram" && typeof setSoloMode === "function" && typeof soloMode !== "undefined" && !soloMode) {
    try { setSoloMode(true); } catch(e){}
  }

  // 2. Sound
  window._locSoundEnabled = APP_SETTINGS.soundEnabled;

  // 3. Roll animation
  window._locFastRoll = (APP_SETTINGS.rollAnimation === "instant");

  // 4. Update UI controls if modal elements exist
  const defModeRift = document.getElementById("settingDefaultModeRift");
  const defModeAram = document.getElementById("settingDefaultModeAram");
  if (defModeRift && defModeAram) {
    defModeRift.checked = (APP_SETTINGS.defaultMode === "rift");
    defModeAram.checked = (APP_SETTINGS.defaultMode === "aram");
  }

  const autoDiscordToggle = document.getElementById("settingAutoDiscord");
  if (autoDiscordToggle) autoDiscordToggle.checked = !!APP_SETTINGS.autoCopyDiscord;

  const animSpeedSelect = document.getElementById("settingAnimSpeed");
  if (animSpeedSelect) animSpeedSelect.value = APP_SETTINGS.rollAnimation;

  const sfxToggle = document.getElementById("settingSfx");
  if (sfxToggle) sfxToggle.checked = !!APP_SETTINGS.soundEnabled;

  const lcuAutoToggle = document.getElementById("settingLcuAuto");
  if (lcuAutoToggle) lcuAutoToggle.checked = !!APP_SETTINGS.autoConnectLcu;
}

function onSettingChange(key, value) {
  APP_SETTINGS[key] = value;
  saveAppSettings();
  applyAppSettings();
  showToast("Setting saved", "success");
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  applyAppSettings();
  updateSettingsLiveStatus();
  modal.classList.add("open");
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.classList.remove("open");
}

function updateSettingsLiveStatus(isOnline) {
  const patchEl = document.getElementById("settingsLivePatch");
  if (patchEl) {
    const v = window._currentLeaguePatch || (typeof LOL_DATA !== 'undefined' ? LOL_DATA.version : '16.18.1');
    patchEl.textContent = `LoL ${v}`;
  }
  const statusBadge = document.getElementById("settingsSyncBadge");
  if (statusBadge) {
    statusBadge.className = "settings-status-badge " + (isOnline !== false ? "status-online" : "status-offline");
    statusBadge.innerHTML = isOnline !== false ? `<span class="dot-pulse"></span> Riot Data Dragon: Active` : `<span class="dot-pulse red"></span> Offline Fallback`;
  }
  const champsCountEl = document.getElementById("settingsChampsCount");
  if (champsCountEl && typeof LOL_DATA !== 'undefined' && LOL_DATA.champions) {
    champsCountEl.textContent = LOL_DATA.champions.length + " Champions";
  }
  const itemsCountEl = document.getElementById("settingsItemsCount");
  if (itemsCountEl && typeof LOL_DATA !== 'undefined' && LOL_DATA.items) {
    itemsCountEl.textContent = LOL_DATA.items.length + " Items";
  }
  const runesCountEl = document.getElementById("settingsRunesCount");
  if (runesCountEl && typeof LOL_DATA !== 'undefined' && LOL_DATA.runes) {
    runesCountEl.textContent = LOL_DATA.runes.length + " Trees";
  }
  const spellsCountEl = document.getElementById("settingsSpellsCount");
  if (spellsCountEl && typeof LOL_DATA !== 'undefined' && LOL_DATA.spells) {
    spellsCountEl.textContent = LOL_DATA.spells.length + " Spells";
  }
}

function triggerForceResync() {
  const btn = document.getElementById("btnForceResync");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-inline"></span> Re-syncing with Riot...`;
  }
  showToast("Purging local caches & downloading fresh live data from Riot...");

  try {
    localStorage.removeItem("loc_dynamic_lol_data");
  } catch(e) {}

  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage("force-resync-cache:" + (LOL_DATA.version || "16.18.1"));
  } else {
    // Browser fallback
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then(r => r.json())
      .then(v => {
        handleLiveDataSyncResult({ success: true, latestPatch: v[0], forced: true });
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> FORCE RE-SYNC & CLEAR CACHE`;
        }
      })
      .catch(err => {
        handleLiveDataSyncResult({ success: false, error: err.message, forced: true });
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> FORCE RE-SYNC & CLEAR CACHE`;
        }
      });
    return;
  }

  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> FORCE RE-SYNC & CLEAR CACHE`;
    }
  }, 5000);
}

function testLcuFromSettings() {
  const btn = document.getElementById("btnTestLcuSettings");
  const status = document.getElementById("settingsLcuStatus");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Checking...";
  }
  if (status) {
    status.className = "lcu-status";
    status.innerHTML = "Querying League Client lockfile...";
  }

  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage("get-lobby");
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Check Connection";
      }
    }, 2500);
  } else {
    if (status) {
      status.className = "lcu-status err";
      status.innerHTML = "Web mode: Native LCU requires desktop app";
    }
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Check Connection";
    }
  }
}

function initApp(){

  if(window._appInitialized) return;

  window._appInitialized = true;

  try { loadAppSettings(); } catch(e){}

  try { loadCachedDynamicLolData(); } catch(e){}

  try { updateStats(); } catch(e){}

  try { renderEmptyInitialSlots(); } catch(e){}

  try { renderEmptyTeamSquad(); } catch(e){}

  try { updateAntiRepeatUI(); } catch(e){}

  try { rollSoloChallenge(); } catch(e){}

  try { checkAndAutoLoadDefaultProfile(); } catch(e){}
  try { switchAppTab('patches'); } catch(e){}
  try { updateDisplayedLeagueVersion(); } catch(e){}
  try { initPatchNotes(); } catch(e){}

  

  if(window.chrome && window.chrome.webview){

    try { window.chrome.webview.postMessage("load-user-data"); } catch(e){}

  }

  

  runAppStartupSync();

}

if(document.readyState === "interactive" || document.readyState === "complete"){

  initApp();

} else {

  document.addEventListener("DOMContentLoaded", initApp);

  window.addEventListener("load", initApp);

}

