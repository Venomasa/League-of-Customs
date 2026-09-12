(function(){

      window._splashDismissed = false;

      window._dismissSplashScreenImmediate = function(){

        if(window._splashDismissed) return;

        window._splashDismissed = true;

        var splash = document.getElementById("appSplashScreen");

        if(splash){

          splash.classList.add("splash-fade-out");

          setTimeout(function(){ splash.style.display = "none"; }, 350);

        }

      };

      // Guaranteed top-level failsafe: Dismiss after 2.2s under any circumstance

      setTimeout(function(){

        if(typeof window._dismissSplashScreenImmediate === "function"){

          window._dismissSplashScreenImmediate();

        }

      }, 2200);

    })();


function switchAppTab(tab){

  const tabs = ["patches", "profile", "randomizer"];

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

    if(statusEl) statusEl.textContent = `New update (${data.version}) found! Downloading...`;

    if(barEl) barEl.style.width = "55%";

  } else if(data.status === "downloading"){

    _isAutoUpdating = true;

    const pct = data.progress || 0;

    const mappedPct = 55 + Math.round((pct / 100) * 40);

    if(statusEl) statusEl.textContent = `Updating to ${data.version}... ${pct}%`;

    if(barEl) barEl.style.width = mappedPct + "%";

  } else if(data.status === "installing"){

    _isAutoUpdating = true;

    if(statusEl) statusEl.textContent = `Installing update (${data.version})... Restarting...`;

    if(barEl) barEl.style.width = "100%";

  } else if(data.status === "up-to-date" || data.status === "error" || data.status === "no-installer-asset"){

    if(_autoUpdateResolve){

      _autoUpdateResolve();

      _autoUpdateResolve = null;

    }

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

function updateDisplayedLeagueVersion(ver){

  let leaguePatch = window._currentLeaguePatch;
  if(!leaguePatch){
    try { leaguePatch = localStorage.getItem("loc_latest_league_patch"); } catch(e){}
  }

  // If a valid 2-segment League patch (e.g. "26.18") is supplied, store it
  if(ver && typeof ver === "string"){
    const clean = ver.trim();
    const parts = clean.split(".");
    if(parts.length === 2 || clean.startsWith("26.") || clean.startsWith("14.")){
      leaguePatch = clean;
      window._currentLeaguePatch = clean;
      try { localStorage.setItem("loc_latest_league_patch", clean); } catch(e){}
    }
  }

  const finalVer = leaguePatch || "26.18";

  // Titlebar
  const tbNum = document.getElementById("titlebarVersion") || document.querySelector(".titlebar-version .v-num");
  if(tbNum) {
    tbNum.innerHTML = `v0.5 <span class="v-patch">(LoL ${finalVer})</span>`;
  } else {
    const tbEl = document.querySelector(".titlebar-version");
    if(tbEl) tbEl.innerHTML = `<span class="v-num">v0.5 <span class="v-patch">(LoL ${finalVer})</span></span>`;
  }

  // Modal About Card
  const modalMetaEl = document.querySelector(".about-update-meta");
  if(modalMetaEl) modalMetaEl.innerHTML = `Installed Version: <span class="meta-gold">v0.5</span> &bull; Game Patch: <span class="meta-blue">LoL ${finalVer}</span>`;

  // Modal Footer
  const modalFooterVer = document.getElementById("modalFooterVersion");
  if(modalFooterVer) modalFooterVer.innerHTML = `v0.5 <span class="v-patch">(LoL ${finalVer})</span>`;

  

  // Splash Tag

  const splashTag = document.getElementById("splashPatchTag");

  if(splashTag) splashTag.textContent = `v0.5 (LoL ${finalVer}) • LIVE SYNC ENGINE`;

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

  

  // Persist cleansed and updated items to localStorage

  try{

    localStorage.setItem("loc_dynamic_lol_data", JSON.stringify({

      version: LOL_DATA.version,

      items: LOL_DATA.items,

      champions: LOL_DATA.champions

    }));

  }catch(e){}

  

  if(addedCount > 0){

    console.log(`Live Sync: Added ${addedCount} new items to randomizer pool.`);

  }

}

// Backwards compatibility alias

const mergeNewItemsIntoPool = syncLiveItemsIntoPool;

function mergeNewChampionsIntoPool(champsObj){

  if(!champsObj || typeof champsObj !== "object") return;

  const existingIds = new Set(LOL_DATA.champions.map(c => (c.id || "").toLowerCase()));

  let addedCount = 0;

  

  Object.keys(champsObj).forEach(cKey => {

    const c = champsObj[cKey];

    if(!c || !c.id) return;

    const idLower = c.id.toLowerCase();

    if(existingIds.has(idLower)) return;

    

    LOL_DATA.champions.push({

      id: c.id,

      name: c.name || c.id,

      title: c.title || "",

      roles: (c.tags && c.tags.length) ? c.tags : ["Fighter"],

      lanes: ["Mid", "Top"] // default fallback lanes

    });

    existingIds.add(idLower);

    addedCount++;

  });

  

  if(addedCount > 0){

    console.log(`Live Sync: Added ${addedCount} new champions to randomizer pool.`);

  }

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

      

      // Persist to local cache

      try{

        localStorage.setItem("loc_dynamic_lol_data", JSON.stringify({

          version: latestPatch,

          items: LOL_DATA.items,

          champions: LOL_DATA.champions

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

    }

  } else {

    // Offline or network timeout

    if(barEl) barEl.style.width = "82%";

    if(statusEl) statusEl.textContent = `Offline Mode: Loaded LoL ${LOL_DATA.version}`;

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

  window._splashSafetyTimer = setTimeout(() => {

    if(!_isAutoUpdating){

      dismissSplashScreen();

    }

  }, 3000);

  

  try {

    // Step 1: Initialize Core

    updateSplash("Initializing Hextech Core...", 22);

    await new Promise(r => setTimeout(r, 200));

    

    // Step 2: Real live sync via C# native bridge

    updateSplash("Connecting to Riot DataDragon...", 45);

    

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

    

    // Await real C# response (or 1.4s max race)

    await Promise.race([

      syncWaitPromise,

      new Promise(r => setTimeout(r, 1400))

    ]);

    

    // Step 3: Live Sync Auto-Update Check

    updateSplash("Checking for updates...", 60);

    const updateWaitPromise = new Promise(resolve => {

      _autoUpdateResolve = resolve;

    });

    if(window.chrome && window.chrome.webview){

      window.chrome.webview.postMessage("check-auto-update");

    }

    // Wait up to 1.2s for response. If update is found, _isAutoUpdating becomes true

    await Promise.race([

      updateWaitPromise,

      new Promise(r => setTimeout(r, 1200))

    ]);

    if(_isAutoUpdating){

      // If downloading/installing update, keep splash active until installer restarts app

      return;

    }

    

    // Step 4: Ready

    updateSplash("Ready. Welcome, Summoner.", 100);

    await new Promise(r => setTimeout(r, 300));

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


function initApp(){

  if(window._appInitialized) return;

  window._appInitialized = true;

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

