function searchProfile(){

  const nameInput = document.getElementById("profNameInput");

  const tagInput = document.getElementById("profTagInput");

  const regionSelect = document.getElementById("profRegionSelect");

  const btn = document.getElementById("profSearchBtn");

  const status = document.getElementById("profStatus");

  let name = nameInput.value.trim();

  let tag = tagInput.value.trim().replace(/^#/, "");

  const region = regionSelect.value.trim().toLowerCase();

  // If user typed Name#Tag all in the first input box

  if(name.includes("#")){

    const hashIndex = name.indexOf("#");

    const parsedTag = name.substring(hashIndex + 1).trim();

    name = name.substring(0, hashIndex).trim();

    if(parsedTag) tag = parsedTag;

    nameInput.value = name;

    tagInput.value = tag;

  }

  if(!name || !tag){

    showToast("Please enter both Summoner Name and Tag");

    return;

  }

  btn.disabled = true;

  btn.innerHTML = `<svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg> SEARCHING...`;

  status.className = "profile-status-bar show loading";

  status.innerHTML = `Fetching ${escapeHtml(name)} #${escapeHtml(tag)} (${region.toUpperCase()}) from OP.GG...`;

  const msg = `get-profile:${name}|${tag}|${region}`;

  if(window.chrome && window.chrome.webview){

    window.chrome.webview.postMessage(msg);

  } else {

    status.className = "profile-status-bar show error";

    status.innerHTML = "Desktop bridge required to query OP.GG API.";

    btn.disabled = false;

    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> SEARCH`;

  }

}

function handleProfileResult(data){

  const btn = document.getElementById("profSearchBtn");

  const status = document.getElementById("profStatus");

  if(btn){

    btn.disabled = false;

    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> SEARCH`;

  }

  if(data.error){

    status.className = "profile-status-bar show error";

    status.innerHTML = `Error: ${escapeHtml(data.error)}`;

    showToast(data.error);

    return;

  }

  status.className = "profile-status-bar";

  status.innerHTML = "";

  currentProfileData = data;

  const welcomeCard = document.getElementById("profWelcomeCard");

  const resultCard = document.getElementById("profResultCard");

  if(welcomeCard) welcomeCard.style.display = "none";

  if(resultCard) resultCard.classList.add("active");

  updateProfileMenuState();

  document.getElementById("profDisplayName").innerText = data.gameName || "Unknown";

  document.getElementById("profDisplayTag").innerText = `#${data.tagLine || ""}`;

  document.getElementById("profDisplayRegion").innerText = (data.region || "EUNE").toUpperCase();

  document.getElementById("profLevelBadge").innerText = `Lv. ${data.level || 1}`;

  if(data.iconUrl) document.getElementById("profIconImg").src = data.iconUrl;

  const opggUrl = `https://op.gg/lol/summoners/${data.region}/${encodeURIComponent(data.gameName)}-${encodeURIComponent(data.tagLine)}`;

  const linkBtn = document.getElementById("profOpggLink");

  if(linkBtn) linkBtn.href = opggUrl;

  // Solo Rank

  const soloTierEl = document.getElementById("profSoloTier");

  const soloDivStr = (data.soloDivision && data.soloDivision > 0) ? ` ${data.soloDivision}` : "";

  const soloLpStr = (data.soloLP !== undefined && data.soloTier !== "UNRANKED") ? ` <span>${data.soloLP} LP</span>` : "";

  soloTierEl.innerHTML = `${data.soloTier || "UNRANKED"}${soloDivStr}${soloLpStr}`;

  document.getElementById("profSoloRecord").innerText = `${data.soloWin || 0}W ${data.soloLose || 0}L`;

  const soloTotal = (data.soloWin || 0) + (data.soloLose || 0);

  const soloWr = soloTotal > 0 ? Math.round((data.soloWin / soloTotal) * 100) : 0;

  document.getElementById("profSoloWr").innerText = `${soloWr}% Win Rate`;

  if(data.soloMedalUrl) document.getElementById("profSoloMedal").src = data.soloMedalUrl;

  // Flex Rank

  const flexTierEl = document.getElementById("profFlexTier");

  const flexDivStr = (data.flexDivision && data.flexDivision > 0) ? ` ${data.flexDivision}` : "";

  const flexLpStr = (data.flexLP !== undefined && data.flexTier !== "UNRANKED") ? ` <span>${data.flexLP} LP</span>` : "";

  flexTierEl.innerHTML = `${data.flexTier || "UNRANKED"}${flexDivStr}${flexLpStr}`;

  document.getElementById("profFlexRecord").innerText = `${data.flexWin || 0}W ${data.flexLose || 0}L`;

  const flexTotal = (data.flexWin || 0) + (data.flexLose || 0);

  const flexWr = flexTotal > 0 ? Math.round((data.flexWin / flexTotal) * 100) : 0;

  document.getElementById("profFlexWr").innerText = `${flexWr}% Win Rate`;

  if(data.flexMedalUrl) document.getElementById("profFlexMedal").src = data.flexMedalUrl;

  // Most Played Champions

  const champsContainer = document.getElementById("profChampsList");

  champsContainer.innerHTML = "";

  if(data.champions && data.champions.length > 0){

    data.champions.forEach(c => {

      const cleanName = getChampionInternalKey(c.name);

      const primaryIcon = getChampionIconUrl(c.name, c.id);

      const fallbackDDragon = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cleanName}.png`;

      const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cleanName}.png`;

      const wrClass = c.winrate >= 55 ? "high" : c.winrate >= 48 ? "mid" : "low";

      champsContainer.innerHTML += `

        <div class="profile-champ-row">

          <img class="profile-champ-icon" src="${primaryIcon}" alt="${escapeHtml(c.name)}" onerror="if(this.src!=='${fallbackDDragon}'){this.src='${fallbackDDragon}';}else{this.src='${fallbackOpgg}';}" />

          <div class="profile-champ-details">

            <div class="profile-champ-name">${escapeHtml(c.name)}</div>

            <div class="profile-champ-meta">

              <span>${c.play} Games &bull; ${c.kda} KDA</span>

              <span class="profile-champ-wr ${wrClass}">${c.winrate}%</span>

            </div>

          </div>

        </div>

      `;

    });

  } else {

    champsContainer.innerHTML = `<span style="color:var(--grey-1);font-size:.8rem;">No ranked champion data available.</span>`;

  }

  // Auto-fetch champion mastery data

  const top3Container = document.getElementById("profMasteryTop3");

  const masteryContainer = document.getElementById("profMasteryList");

  if(top3Container) top3Container.innerHTML = "";

  if(masteryContainer) {

    masteryContainer.innerHTML = `<div style="color:var(--grey-1);font-size:.8rem;padding:8px 0;"><svg class="spin-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg>Loading champion mastery & crests...</div>`;

  }

  if(window.chrome && window.chrome.webview){

    window.chrome.webview.postMessage(`get-mastery:${data.gameName}|${data.tagLine}|${data.region}`);

  }

  // Render match history if present

  renderProfileMatches(data.matches || []);

  renderProfileStats();

  showToast(`Profile loaded: ${data.gameName}`);

}

function getMasteryCrestUrl(level){

  const lvl = Math.max(1, Math.min(Number(level) || 1, 10));

  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/mastery-${lvl}.png`;

}

function handleMasteryResult(data){

  const top3Container = document.getElementById("profMasteryTop3");

  const listContainer = document.getElementById("profMasteryList");

  if(!top3Container && !listContainer) return;

  if(top3Container) top3Container.innerHTML = "";

  if(listContainer) listContainer.innerHTML = "";

  if(data.error || !data.champions || data.champions.length === 0){

    if(listContainer){

      listContainer.innerHTML = `<span style="color:var(--grey-1);font-size:.8rem;">${escapeHtml(data.error || "No mastery data found.")}</span>`;

    }

    return;

  }

  const champs = data.champions;

  const top3 = champs.slice(0, 3);

  const remaining = champs.slice(3);

  // Render Top 3 Showcase Podium

  if(top3Container){

    let top3Html = "";

    const rankLabels = ["★ TOP 1", "TOP 2", "TOP 3"];

    top3.forEach((c, idx) => {

      const cleanName = getChampionInternalKey(c.name);

      const primaryIcon = getChampionIconUrl(c.name, c.id);

      const fallbackDDragon = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cleanName}.png`;

      const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cleanName}.png`;

      const lvl = c.level || 1;

      const crestUrl = getMasteryCrestUrl(lvl);

      const formattedPts = Number(c.points || 0).toLocaleString();

      const rankNum = idx + 1;

      top3Html += `

        <div class="mastery-top-card rank-${rankNum}">

          <span class="mastery-rank-tag">${rankLabels[idx] || `TOP ${rankNum}`}</span>

          <div class="mastery-avatar-wrap">

            <img class="mastery-top-avatar" src="${primaryIcon}" alt="${escapeHtml(c.name)}" onerror="if(this.src!=='${fallbackDDragon}'){this.src='${fallbackDDragon}';}else{this.src='${fallbackOpgg}';}" />

          </div>

          <div class="mastery-top-name">${escapeHtml(c.name)}</div>

          <div class="mastery-crest-wrap" title="Mastery Level ${lvl} Crest">

            <img class="mastery-crest-img" src="${crestUrl}" alt="Mastery Level ${lvl}" onerror="this.style.display='none'" />

          </div>

          <div class="mastery-level-pill">LEVEL ${lvl}</div>

          <div class="mastery-points-val">${formattedPts} PTS</div>

        </div>

      `;

    });

    top3Container.innerHTML = top3Html;

  }

  // Render Remaining Champions (#4 to #10)

  if(listContainer){

    if(remaining.length === 0 && top3.length === 0){

      listContainer.innerHTML = `<span style="color:var(--grey-1);font-size:.8rem;">No mastery data found.</span>`;

    } else {

      let remHtml = "";

      remaining.forEach((c, idx) => {

        const cleanName = getChampionInternalKey(c.name);

        const primaryIcon = getChampionIconUrl(c.name, c.id);

        const fallbackDDragon = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cleanName}.png`;

        const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cleanName}.png`;

        const lvl = c.level || 1;

        const crestUrl = getMasteryCrestUrl(lvl);

        const formattedPts = Number(c.points || 0).toLocaleString();

        const rankNum = idx + 4;

        remHtml += `

          <div class="mastery-row-card">

            <span class="mastery-row-rank">#${rankNum}</span>

            <img class="mastery-row-avatar" src="${primaryIcon}" alt="${escapeHtml(c.name)}" onerror="if(this.src!=='${fallbackDDragon}'){this.src='${fallbackDDragon}';}else{this.src='${fallbackOpgg}';}" />

            <div class="mastery-row-info">

              <div class="mastery-row-name">${escapeHtml(c.name)}</div>

              <div class="mastery-row-meta">

                <span class="mastery-row-pts">${formattedPts} pts</span>

              </div>

            </div>

            <div class="mastery-row-crest-wrap" title="Mastery Level ${lvl}">

              <img class="mastery-row-crest-img" src="${crestUrl}" alt="Mastery ${lvl}" onerror="this.style.display='none'" />

              <span class="mastery-row-lvl-tag">LVL ${lvl}</span>

            </div>

          </div>

        `;

      });

      listContainer.innerHTML = remHtml;

    }

  }

}

let currentProfileSubTab = 'overview';

function switchProfileSubTab(subTab){

  currentProfileSubTab = subTab;

  ['overview', 'matches', 'stats'].forEach(t => {

    const btn = document.getElementById('profSubTab' + t.charAt(0).toUpperCase() + t.slice(1));

    const page = document.getElementById('profSubPage' + t.charAt(0).toUpperCase() + t.slice(1));

    if(btn) btn.classList.toggle('active', t === subTab);

    if(page) page.classList.toggle('active', t === subTab);

  });

  if(subTab === 'stats'){

    renderProfileStats();

  }

}


function toggleMatchCard(idx){

  const card = document.getElementById("matchCard_" + idx);

  if(card){

    card.classList.toggle("expanded");

  }

}

let allLoadedMatches = [];

let visibleMatchesCount = 5;

let currentScoreboardMatchIdx = 0;

function renderProfileMatches(matches){

  const container = document.getElementById("profMatchesList");

  const pill = document.getElementById("profMatchesSummaryPill");

  if(!container) return;

  allLoadedMatches = matches || [];

  visibleMatchesCount = Math.min(5, allLoadedMatches.length);

  // Close detail and scoreboard views if open

  closeMatchDetail();

  closeMatchScoreboard();

  if(!allLoadedMatches || allLoadedMatches.length === 0){

    if(pill) pill.innerText = "";

    document.getElementById("profLoadMoreContainer").style.display = "none";

    container.innerHTML = `<div style="color:var(--grey-2);font-size:.8rem;padding:12px 0;font-style:italic;">No recent matches found for this summoner.</div>`;

    return;

  }

  const wins = allLoadedMatches.filter(m => m.win === true).length;

  const losses = allLoadedMatches.length - wins;

  const wr = allLoadedMatches.length > 0 ? Math.round((wins / allLoadedMatches.length) * 100) : 0;

  if(pill){

    pill.innerText = `Last ${allLoadedMatches.length} Matches • ${wins}W ${losses}L (${wr}% WR)`;

  }

  renderMatchCards();

}

function renderMatchCards(){

  const container = document.getElementById("profMatchesList");

  const loadMoreContainer = document.getElementById("profLoadMoreContainer");

  const loadMoreText = document.getElementById("profLoadMoreText");

  const loadMoreBtn = document.getElementById("profLoadMoreBtn");

  if(!container) return;

  const currentSlice = allLoadedMatches.slice(0, visibleMatchesCount);

  let html = "";

  currentSlice.forEach((m, idx) => {

    const isWin = m.win === true;

    const cleanChamp = getChampionInternalKey(m.championName);

    const champIcon = getChampionIconUrl(m.championName, m.championId);

    const fallbackDDragon = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cleanChamp}.png`;

    const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cleanChamp}.png`;

    const kills = m.kills || 0;

    const deaths = m.deaths || 0;

    const assists = m.assists || 0;

    const kdaRatio = deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2) + ":1";

    let itemsHtml = "";

    const itemsList = m.items || [];

    for(let i = 0; i < 7; i++){

      const itemId = itemsList[i];

      if(itemId && itemId > 0){

        itemsHtml += `<img class="match-item-thumb" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${itemId}.png" alt="Item ${itemId}" onerror="this.style.opacity='0.2'" title="Item #${itemId}" />`;

      } else {

        itemsHtml += `<div class="match-item-empty"></div>`;

      }

    }

    const mvpBadge = (m.opScoreRank === 1) ? `<span class="badge-mvp" style="margin-left:4px;">MVP</span>` : "";

    const multiKillBadge = m.multiKill ? `<span class="badge-multikill" style="margin-left:4px;">${escapeHtml(m.multiKill)}</span>` : "";

    html += `

      <div id="matchCard_${idx}" class="match-card ${isWin ? 'win' : 'lose'}" onclick="openMatchDetail(${idx})" title="Click to view match details">

        <div class="match-summary">

          <div class="match-meta-col">

            <span class="match-queue-tag">${escapeHtml(m.queue || "Normal")}</span>

            <span class="match-time-ago">${escapeHtml(m.timeAgo || "")}</span>

          </div>

          <div class="match-champ-col">

            <img class="match-champ-img" src="${champIcon}" alt="${escapeHtml(m.championName)}" onerror="this.src='${fallbackOpgg}'" />

            <div class="match-champ-info">

              <span class="match-champ-name">${escapeHtml(m.championName || "Unknown")}</span>

              <span class="match-champ-lvl">Level ${m.championLevel || 1}</span>

            </div>

          </div>

          <div class="match-kda-col">

            <span class="match-kda-score">${kills} / <span style="color:#ef4444">${deaths}</span> / ${assists}</span>

            <span class="match-kda-ratio">${kdaRatio} KDA</span>

          </div>

          <div class="match-items-col">

            ${itemsHtml}

          </div>

          <div class="match-result-col">

            <div class="match-result-text">${isWin ? 'VICTORY' : 'DEFEAT'}</div>

            <div class="match-dur-text">${escapeHtml(m.duration || "")}</div>

          </div>

          <div class="match-actions-col">

            <button type="button" class="match-btn match-btn-detail" onclick="event.stopPropagation(); openMatchDetail(${idx})" title="View Solo Stats & Build">

              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>

              <span>Details</span>

            </button>

            <button type="button" class="match-btn match-btn-scoreboard" onclick="event.stopPropagation(); openScoreboard(${idx})" title="View League End-of-Game Scoreboard">

              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7"/><path d="M14 14.66V17c0 .55.45 1 1 1h2"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>

              <span>Scoreboard</span>

            </button>

          </div>

        </div>

      </div>

    `;

  });

  container.innerHTML = html;

  // Handle Load More Button

  if(loadMoreContainer){

    loadMoreContainer.style.display = "block";

    if(loadMoreBtn) loadMoreBtn.disabled = false;

    if(loadMoreText) loadMoreText.innerText = "LOAD MORE GAMES";

  }

}

function loadMoreMatches(){

  // If we have hidden matches already loaded in cache, display them first

  if(visibleMatchesCount < allLoadedMatches.length){

    visibleMatchesCount = Math.min(visibleMatchesCount + 5, allLoadedMatches.length);

    renderMatchCards();

    return;

  }

  // Otherwise, fetch more matches from OP.GG API

  const btn = document.getElementById("profLoadMoreBtn");

  const text = document.getElementById("profLoadMoreText");

  if(btn) btn.disabled = true;

  if(text) text.innerHTML = `<svg class="spin-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg> FETCHING MORE GAMES...`;

  const oldest = allLoadedMatches[allLoadedMatches.length - 1];

  const endedAt = oldest ? (oldest.createdAt || "") : "";

  if(currentProfileData && window.chrome && window.chrome.webview){

    window.chrome.webview.postMessage(`get-more-matches:${currentProfileData.gameName}|${currentProfileData.tagLine}|${currentProfileData.region}|${endedAt}`);

  }

}

function handleMoreMatchesResult(data){

  const btn = document.getElementById("profLoadMoreBtn");

  const text = document.getElementById("profLoadMoreText");

  if(btn) btn.disabled = false;

  if(text) text.innerText = "LOAD MORE GAMES";

  if(data.error){

    showToast("Could not load more matches: " + data.error);

    return;

  }

  const newMatches = data.matches || [];

  if(newMatches.length === 0){

    if(text) text.innerText = "NO MORE MATCHES AVAILABLE";

    if(btn) btn.disabled = true;

    showToast("No older matches available for this summoner.");

    return;

  }

  // Deduplicate against allLoadedMatches by gameId or createdAt

  const existingKeys = new Set(allLoadedMatches.map(m => m.gameId || m.createdAt));

  const added = [];

  newMatches.forEach(m => {

    const key = m.gameId || m.createdAt;

    if(!existingKeys.has(key)){

      existingKeys.add(key);

      added.push(m);

    }

  });

  if(added.length === 0){

    if(text) text.innerText = "NO MORE MATCHES AVAILABLE";

    if(btn) btn.disabled = true;

    showToast("All available matches are already loaded.");

    return;

  }

  allLoadedMatches = allLoadedMatches.concat(added);

  visibleMatchesCount += added.length;

  renderMatchCards();

  showToast(`Loaded ${added.length} additional matches.`);

}

function openMatchDetail(idx){

  const m = allLoadedMatches[idx];

  if(!m) return;

  const listView = document.getElementById("profMatchListView");

  const detailView = document.getElementById("profMatchDetailView");

  const scoreboardView = document.getElementById("profMatchScoreboardView");

  if(!listView || !detailView) return;

  if(scoreboardView) scoreboardView.style.display = "none";

  const isWin = m.win === true;

  const cleanChamp = getChampionInternalKey(m.championName);

  const champIcon = getChampionIconUrl(m.championName, m.championId);

  const fallbackDDragon = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cleanChamp}.png`;

  const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cleanChamp}.png`;

  const kills = m.kills || 0;

  const deaths = m.deaths || 0;

  const assists = m.assists || 0;

  const kdaRatio = deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2) + ":1";

  // Item names helper

  const getItemName = (itemId, rawName) => {

    if (TRINKET_NAMES_MAP[itemId]) return TRINKET_NAMES_MAP[itemId];

    if (rawName && !rawName.startsWith("Item #") && !rawName.startsWith("Trinket #")) return rawName;

    if (typeof LOL_DATA !== 'undefined' && LOL_DATA.items) {

      const found = LOL_DATA.items.find(it => it.id === itemId);

      if (found) return found.name;

      const foundBoot = LOL_DATA.boots.find(b => b.id === itemId);

      if (foundBoot) return foundBoot.name;

      const foundStarter = LOL_DATA.starters.find(s => s.id === itemId);

      if (foundStarter) return foundStarter.name;

    }

    return rawName || (itemId ? `Item #${itemId}` : "Empty Slot");

  };

  // 1. Summoner Spells (D & F)

  let spellsDetailHtml = "";

  const spellsList = m.spells || [];

  if (spellsList.length === 0) {

    spellsDetailHtml = `<div class="solo-spell-card empty"><span class="solo-spell-name-txt" style="color:var(--grey-3);">None</span></div>`;

  } else {

    spellsList.forEach((spId, spIdx) => {

      const spKey = SUMMONER_SPELL_ICONS[spId] || ("Spell " + spId);

      const spNiceName = SUMMONER_SPELL_NAMES[spId] || spKey.replace('Summoner','');

      const keyLabel = spIdx === 0 ? "D" : "F";

      spellsDetailHtml += `

        <div class="solo-spell-card" title="${escapeHtml(spNiceName)} [${keyLabel}]">

          <div class="solo-spell-img-wrap">

            <img class="solo-spell-img-large" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/spell/${spKey}.png" alt="${spKey}" onerror="this.style.opacity='0.2'" />

            <span class="solo-spell-key-badge">${keyLabel}</span>

          </div>

          <div class="solo-spell-meta">

            <span class="solo-spell-name-txt">${escapeHtml(spNiceName)}</span>

            <span class="solo-spell-sub-txt">Spell ${spIdx + 1}</span>

          </div>

        </div>

      `;

    });

  }

  // 2. Core Items (Slots 1 to 6)

  let coreItemsHtml = "";

  const itemsList = m.items || [];

  const itemNamesList = m.itemNames || [];

  for (let i = 0; i < 6; i++) {

    const itemId = itemsList[i];

    const rawName = itemNamesList[i];

    const itemName = getItemName(itemId, rawName);

    if (itemId && itemId > 0) {

      coreItemsHtml += `

        <div class="solo-item-slot-box" title="${escapeHtml(itemName)}">

          <div class="solo-item-tag">SLOT ${i + 1}</div>

          <div class="solo-item-img-frame">

            <img class="solo-item-img-large" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${itemId}.png" alt="${escapeHtml(itemName)}" onerror="this.onerror=null;this.src='https://opgg-static.akamaized.net/meta/images/lol/latest/item/${itemId}.png';" />

          </div>

          <span class="solo-item-label">${escapeHtml(itemName)}</span>

        </div>

      `;

    } else {

      coreItemsHtml += `

        <div class="solo-item-slot-box empty" title="Empty Slot">

          <div class="solo-item-tag empty">SLOT ${i + 1}</div>

          <div class="solo-item-img-frame empty">

            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(200,155,60,0.25)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>

          </div>

          <span class="solo-item-label empty">Empty</span>

        </div>

      `;

    }

  }

  // 3. Trinket (Slot 7)

  const trinketId = itemsList[6] || 0;

  const trinketRaw = itemNamesList[6];

  const trinketName = trinketId ? getItemName(trinketId, trinketRaw) : "Trinket / Ward";

  let trinketHtml = "";

  if (trinketId && trinketId > 0) {

    trinketHtml = `

      <div class="solo-item-slot-box trinket" title="${escapeHtml(trinketName)}">

        <div class="solo-item-tag trinket">WARD</div>

        <div class="solo-item-img-frame trinket">

          <img class="solo-item-img-large" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${trinketId}.png" alt="${escapeHtml(trinketName)}" onerror="this.onerror=null;this.src='https://opgg-static.akamaized.net/meta/images/lol/latest/item/${trinketId}.png';" />

        </div>

        <span class="solo-item-label trinket">${escapeHtml(trinketName)}</span>

      </div>

    `;

  } else {

    trinketHtml = `

      <div class="solo-item-slot-box trinket empty" title="Empty Trinket Slot">

        <div class="solo-item-tag trinket empty">WARD</div>

        <div class="solo-item-img-frame trinket empty">

          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>

        </div>

        <span class="solo-item-label empty">None</span>

      </div>

    `;

  }

  const maxDmgRef = Math.max(m.damageDealt || 1, m.damageTaken || 1, 40000);

  const dmgPct = Math.min(100, Math.round(((m.damageDealt || 0) / maxDmgRef) * 100));

  const takenPct = Math.min(100, Math.round(((m.damageTaken || 0) / maxDmgRef) * 100));

  const mvpTag = (m.opScoreRank === 1) ? `<span class="badge-mvp">MVP</span>` : "";

  const multiKillTag = m.multiKill ? `<span class="badge-multikill">${escapeHtml(m.multiKill)}</span>` : "";

  const opScoreDisplay = (m.opScore && m.opScore > 0) ? `<div style="font-family:'Cinzel',serif;font-size:1.15rem;font-weight:800;color:var(--gold-1);">${m.opScore.toFixed(1)} <span style="font-size:.65rem;color:var(--grey-2);font-weight:normal;">OP SCORE</span></div>` : "";

  detailView.innerHTML = `

    <!-- Top Bar: Back Button + Switch to Scoreboard -->

    <div class="match-detail-top-bar">

      <button type="button" class="match-back-btn" onclick="closeMatchDetail()">

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>

        BACK TO MATCH HISTORY

      </button>

      <button type="button" class="match-back-btn" onclick="openScoreboard(${idx})" style="background:rgba(59,130,246,.15);border-color:rgba(59,130,246,.4);color:#60a5fa;">

        <span>VIEW FULL SCOREBOARD</span>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

      </button>

    </div>

    <!-- Hero Banner -->

    <div class="match-hero-banner ${isWin ? 'win' : 'lose'}">

      <div class="match-hero-left">

        <div class="match-hero-champ-box">

          <img class="match-hero-champ-img" src="${champIcon}" alt="${escapeHtml(m.championName)}" onerror="if(this.src!=='${fallbackDDragon}'){this.src='${fallbackDDragon}';}else{this.src='${fallbackOpgg}';}" />

          <span class="match-hero-level">${m.championLevel || 1}</span>

        </div>

        <div>

          <div class="match-hero-title">${escapeHtml(m.championName || "Champion")}</div>

          <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">

            <span class="match-hero-result ${isWin ? 'win' : 'lose'}">${isWin ? 'VICTORY' : 'DEFEAT'}</span>

            <span style="color:var(--grey-2);font-size:.75rem;">• ${escapeHtml(m.queue || "Normal")} • ${escapeHtml(m.duration || "")} • ${escapeHtml(m.timeAgo || "")}</span>

            ${mvpTag}

            ${multiKillTag}

          </div>

          <div class="match-hero-kda">${kills} / <span style="color:#ef4444">${deaths}</span> / ${assists} <span style="font-size:.8rem;color:var(--gold-2);margin-left:8px;">${kdaRatio} KDA</span></div>

        </div>

      </div>

      <div style="text-align:right;">

        ${opScoreDisplay}

        ${m.opScoreRank ? `<div style="font-size:.72rem;color:var(--grey-2);font-family:'Cinzel',serif;margin-top:2px;">Rank #${m.opScoreRank} in Match</div>` : ""}

      </div>

    </div>

    <!-- Unified Build & Loadout Card (Spells + 6 Core Items + Trinket) -->

    <div class="solo-loadout-card">

      <div class="match-detail-card-title">

        <div style="display:flex;align-items:center;gap:8px;">

          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

            <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>

            <path d="M13 19l6-6"/>

            <path d="M16 16l4 4"/>

            <path d="M19 21l2-2"/>

          </svg>

          <span>Build & Loadout</span>

        </div>

        <span style="font-size:.65rem;color:var(--gold-2);font-family:'Roboto',sans-serif;font-weight:600;letter-spacing:0.5px;">

          2 Spells • 6 Core Items • Trinket

        </span>

      </div>

      <div class="solo-loadout-wrapper">

        <!-- 1. Summoner Spells -->

        <div class="solo-loadout-section solo-spells-section">

          <div class="solo-section-subtitle">

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>

            <span>Summoner Spells</span>

          </div>

          <div class="solo-spells-grid">

            ${spellsDetailHtml}

          </div>

        </div>

        <!-- Divider -->

        <div class="solo-loadout-divider"></div>

        <!-- 2. Core Items (Slots 1-6) -->

        <div class="solo-loadout-section solo-core-items-section">

          <div class="solo-section-subtitle">

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>

            <span>Core Items (Slots 1–6)</span>

          </div>

          <div class="solo-items-row">

            ${coreItemsHtml}

          </div>

        </div>

        <!-- Mini Divider -->

        <div class="solo-loadout-divider mini"></div>

        <!-- 3. Trinket Slot -->

        <div class="solo-loadout-section solo-trinket-section">

          <div class="solo-section-subtitle trinket-title">

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>

            <span>Trinket / Ward</span>

          </div>

          <div class="solo-trinket-wrap">

            ${trinketHtml}

          </div>

        </div>

      </div>

    </div>

    <!-- Detailed Stat Cards Grid -->

    <div class="match-detail-grid">

      <!-- Card 1: Combat & KDA -->

      <div class="match-detail-card">

        <div class="match-detail-card-title">

          <span>Combat & KDA</span>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M22 12h-4"/><path d="M6 12H2"/><path d="M12 6V2"/><path d="M12 22v-4"/></svg>

        </div>

        <div class="match-detail-row"><span class="match-detail-label">Kills</span><span class="match-detail-value">${kills}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Deaths</span><span class="match-detail-value" style="color:#ef4444;">${deaths}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Assists</span><span class="match-detail-value">${assists}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">KDA Ratio</span><span class="match-detail-value" style="color:var(--gold-1);">${kdaRatio}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Killing Spree</span><span class="match-detail-value">${m.killingSpree || 0}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Largest Multi-Kill</span><span class="match-detail-value">${escapeHtml(m.multiKill || "None")}</span></div>

      </div>

      <!-- Card 2: Damage & Healing -->

      <div class="match-detail-card">

        <div class="match-detail-card-title">

          <span>Damage & Healing</span>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>

        </div>

        <div style="margin-bottom:8px;">

          <div class="match-detail-row"><span class="match-detail-label">Damage to Champions</span><span class="match-detail-value" style="color:#f87171;">${Number(m.damageDealt || 0).toLocaleString()}</span></div>

          <div class="match-stat-bar-bg"><div class="match-stat-bar-fill dmg" style="width:${dmgPct}%;"></div></div>

        </div>

        <div style="margin-bottom:8px;">

          <div class="match-detail-row"><span class="match-detail-label">Damage Taken</span><span class="match-detail-value" style="color:#60a5fa;">${Number(m.damageTaken || 0).toLocaleString()}</span></div>

          <div class="match-stat-bar-bg"><div class="match-stat-bar-fill taken" style="width:${takenPct}%;"></div></div>

        </div>

        <div class="match-detail-row"><span class="match-detail-label">Critical Strike Damage</span><span class="match-detail-value">${Number(m.critDamage || 0).toLocaleString()}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Total Healing</span><span class="match-detail-value" style="color:#34d399;">${Number(m.heal || 0).toLocaleString()}</span></div>

      </div>

      <!-- Card 3: Farming & Economy -->

      <div class="match-detail-card">

        <div class="match-detail-card-title">

          <span>Farming & Economy</span>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 6v12"/><path d="M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5"/></svg>

        </div>

        <div class="match-detail-row"><span class="match-detail-label">Total Minions (CS)</span><span class="match-detail-value" style="color:var(--gold-1);">${m.cs || 0}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">CS Per Minute</span><span class="match-detail-value">${m.csPerMin || 0} CS/m</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Lane Minions</span><span class="match-detail-value">${m.laneCs || 0}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Jungle Monsters</span><span class="match-detail-value">${m.jungleCs || 0}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Total Gold Earned</span><span class="match-detail-value" style="color:#fbbf24;">${Number(m.gold || 0).toLocaleString()} g</span></div>

      </div>

      <!-- Card 4: Vision & Utility -->

      <div class="match-detail-card">

        <div class="match-detail-card-title">

          <span>Vision & Utility</span>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>

        </div>

        <div class="match-detail-row"><span class="match-detail-label">Wards Placed</span><span class="match-detail-value">${m.wardsPlaced || 0}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Control Wards Purchased</span><span class="match-detail-value" style="color:#c084fc;">${m.controlWards || 0}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Crowd Control (CC) Time</span><span class="match-detail-value">${m.ccDuration || 0}s</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Assigned Role</span><span class="match-detail-value">${escapeHtml(m.position || "Unknown")}</span></div>

        <div class="match-detail-row"><span class="match-detail-label">Assigned Team</span><span class="match-detail-value">${escapeHtml(m.team || "Unknown")}</span></div>

      </div>

    </div>

  `;

  listView.style.display = "none";

  detailView.style.display = "block";

}

function closeMatchDetail(){

  const listView = document.getElementById("profMatchListView");

  const detailView = document.getElementById("profMatchDetailView");

  if(listView) listView.style.display = "block";

  if(detailView) detailView.style.display = "none";

}

function openScoreboard(idx){

  currentScoreboardMatchIdx = idx;

  const m = allLoadedMatches[idx];

  if(!m) return;

  const listView = document.getElementById("profMatchListView");

  const detailView = document.getElementById("profMatchDetailView");

  const scoreboardView = document.getElementById("profMatchScoreboardView");

  if(listView) listView.style.display = "none";

  if(detailView) detailView.style.display = "none";

  if(scoreboardView){

    scoreboardView.style.display = "block";

    scoreboardView.innerHTML = `

      <div class="match-detail-top-bar">

        <button type="button" class="match-back-btn" onclick="closeMatchScoreboard()">

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>

          BACK TO MATCH HISTORY

        </button>

        <button type="button" class="match-back-btn" onclick="openMatchDetail(${idx})" style="background:rgba(200,155,60,.12);border-color:var(--gold-3);color:var(--gold-1);">

          <span>VIEW SOLO STATS</span>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

        </button>

      </div>

      <div style="text-align:center;padding:70px 20px;color:var(--gold-1);font-family:'Cinzel',serif;font-size:.92rem;letter-spacing:1.5px;">

        <svg class="spin-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:block;margin:0 auto 16px auto;"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg>

        FETCHING FULL END-OF-GAME SCOREBOARD...

      </div>

    `;

  }

  if(window.chrome && window.chrome.webview && currentProfileData){

    const gameId = m.gameId || "";

    const createdAt = m.createdAt || "";

    window.chrome.webview.postMessage(`get-game-detail:${gameId}|${createdAt}|${currentProfileData.gameName}|${currentProfileData.tagLine}|${currentProfileData.region}`);

  }

}

function closeMatchScoreboard(){

  const listView = document.getElementById("profMatchListView");

  const scoreboardView = document.getElementById("profMatchScoreboardView");

  if(listView) listView.style.display = "block";

  if(scoreboardView) scoreboardView.style.display = "none";

}

function renderScoreboard(data){

  const scoreboardView = document.getElementById("profMatchScoreboardView");

  if(!scoreboardView) return;

  if(data.error){

    scoreboardView.innerHTML = `

      <div class="match-detail-top-bar">

        <button type="button" class="match-back-btn" onclick="closeMatchScoreboard()">

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>

          BACK TO MATCH HISTORY

        </button>

      </div>

      <div style="text-align:center;padding:50px 20px;color:#ef4444;font-family:'Cinzel',serif;">

        <div style="font-size:1.1rem;font-weight:800;margin-bottom:8px;">Failed to Load Scoreboard</div>

        <div style="font-size:.8rem;color:var(--grey-2);">${escapeHtml(data.error)}</div>

      </div>

    `;

    return;

  }

  const teams = data.teams || [];

  if(teams.length === 0){

    scoreboardView.innerHTML = `

      <div class="match-detail-top-bar">

        <button type="button" class="match-back-btn" onclick="closeMatchScoreboard()">

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>

          BACK TO MATCH HISTORY

        </button>

      </div>

      <div style="text-align:center;padding:50px 20px;color:var(--grey-2);font-family:'Cinzel',serif;">

        No team participant data returned for this match.

      </div>

    `;

    return;

  }

  const m = allLoadedMatches[currentScoreboardMatchIdx] || {};

  // Find max damage dealt, damage taken & healing across all 10 players for proportional bars

  let maxDmgDealt = 1;

  let maxDmgTaken = 1;

  let maxHeal = 1;

  let blueTeamKills = 0, blueTeamGold = 0;

  let redTeamKills = 0, redTeamGold = 0;

  const profileName = (data.profileGameName || (currentProfileData && currentProfileData.gameName) || "").toLowerCase();

  let ownerParticipant = null;

  let ownerTeam = null;

  teams.forEach(t => {

    const isBlue = (t.key || "").toUpperCase() === "BLUE";

    let tKills = t.teamKills || 0;

    let tGold = t.gold || 0;

    (t.participants || []).forEach(p => {

      if((p.damageDealt || 0) > maxDmgDealt) maxDmgDealt = p.damageDealt;

      if((p.damageTaken || 0) > maxDmgTaken) maxDmgTaken = p.damageTaken;

      if((p.heal || 0) > maxHeal) maxHeal = p.heal;

      if(!t.teamKills) tKills += (p.kills || 0);

      if(!t.gold) tGold += (p.gold || 0);

      const pName = (p.gameName || "").toLowerCase();

      if(profileName && (pName === profileName || pName.indexOf(profileName) !== -1 || profileName.indexOf(pName) !== -1)){

        if(!ownerParticipant){

          ownerParticipant = p;

          ownerTeam = t;

        }

      }

    });

    if(isBlue){ blueTeamKills = tKills; blueTeamGold = tGold; }

    else { redTeamKills = tKills; redTeamGold = tGold; }

  });

  // Authentic League Turret SVG Icon (replaces emoji)

  const turretSvg = `<svg class="sb-turret-svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2h16v3h-2v2h1v4h-2v9h2v2H3v-2h2v-9H3V7h1V5H2V2h2zm2 2v1h12V4H6zm1 3v2h10V7H7zm1 4v7h8v-7H8zm2 2h4v3h-4v-3z"/></svg>`;

  // Owner hero showcase banner

  let ownerBannerHtml = "";

  if(ownerParticipant && ownerTeam){

    const champIcon = getChampionIconUrl(ownerParticipant.championName, ownerParticipant.championId);

    const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${getChampionInternalKey(ownerParticipant.championName)}.png`;

    const isWin = ownerTeam.isWin === true;

    const teamKey = (ownerTeam.key || "BLUE").toUpperCase();

    ownerBannerHtml = `

      <div class="sb-owner-banner">

        <div class="sb-owner-left">

          <div class="sb-owner-champ-box">

            <img class="sb-owner-champ-img" src="${champIcon}" alt="${escapeHtml(ownerParticipant.championName)}" onerror="this.src='${fallbackOpgg}'" />

            <span class="sb-owner-champ-lvl">${ownerParticipant.level || 1}</span>

          </div>

          <div>

            <div class="sb-owner-title">

              <span>${escapeHtml(ownerParticipant.gameName || data.profileGameName || "Summoner")}</span>

              ${ownerParticipant.tagLine ? `<span class="sb-owner-tag">#${escapeHtml(ownerParticipant.tagLine)}</span>` : ""}

              <span class="sb-owner-team-tag ${teamKey.toLowerCase()}">${teamKey} TEAM</span>

              <span class="sb-team-result-badge ${isWin ? 'win' : 'lose'}">${isWin ? 'VICTORY' : 'DEFEAT'}</span>

            </div>

            <div class="sb-owner-kda-line">

              <span class="sb-owner-kda-score">${ownerParticipant.kills} / <span style="color:#ef4444;">${ownerParticipant.deaths}</span> / ${ownerParticipant.assists}</span>

              <span class="sb-owner-kda-ratio">${ownerParticipant.kda} KDA</span>

              ${ownerParticipant.opScoreRank === 1 ? '<span class="badge-mvp" style="margin-left:6px;">MVP</span>' : ''}

              <span style="color:var(--grey-2);font-size:.7rem;margin-left:4px;">&bull; ${escapeHtml(ownerParticipant.championName || "")} &bull; ${escapeHtml(ownerParticipant.position || "")}</span>

            </div>

          </div>

        </div>

        <div class="sb-owner-metrics">

          <div class="sb-metric-pill">

            <span class="sb-metric-lbl">Damage Dealt</span>

            <span class="sb-metric-val" style="color:#f87171;">${Number(ownerParticipant.damageDealt||0).toLocaleString()}</span>

          </div>

          <div class="sb-metric-pill">

            <span class="sb-metric-lbl">Damage Taken</span>

            <span class="sb-metric-val" style="color:#60a5fa;">${Number(ownerParticipant.damageTaken||0).toLocaleString()}</span>

          </div>

          <div class="sb-metric-pill">

            <span class="sb-metric-lbl">Total Healing</span>

            <span class="sb-metric-val" style="color:#34d399;">${Number(ownerParticipant.heal||0).toLocaleString()}</span>

          </div>

          <div class="sb-metric-pill">

            <span class="sb-metric-lbl">Team Towers</span>

            <span class="sb-metric-val" style="color:#fbbf24;display:inline-flex;align-items:center;gap:3px;">${turretSvg} <span>${ownerTeam.towerKills || 0}</span></span>

          </div>

          <div class="sb-metric-pill">

            <span class="sb-metric-lbl">CS & Gold</span>

            <span class="sb-metric-val" style="color:var(--gold-1);">${ownerParticipant.cs||0} CS • ${((ownerParticipant.gold||0)/1000).toFixed(1)}k</span>

          </div>

        </div>

      </div>

    `;

  }

  const SB_LANE_ORDER = {

    'TOP': 1,

    'JUNGLE': 2,

    'MID': 3,

    'MIDDLE': 3,

    'ADC': 4,

    'BOTTOM': 4,

    'BOT': 4,

    'SUPPORT': 5,

    'UTILITY': 5,

    'NONE': 6

  };

  let teamsHtml = "";

  teams.forEach(t => {

    const isBlue = (t.key || "").toUpperCase() === "BLUE";

    const teamClass = isBlue ? "blue" : "red";

    const teamTitle = isBlue ? "Blue Team" : "Red Team";

    const isWin = t.isWin === true;

    const towerKills = t.towerKills !== undefined ? t.towerKills : 0;

    const tKills = isBlue ? blueTeamKills : redTeamKills;

    const tGold = isBlue ? blueTeamGold : redTeamGold;

    // Sort participants by lane hierarchy: TOP -> JUNGLE -> MID -> ADC -> SUPPORT

    const sortedParticipants = [...(t.participants || [])].sort((a, b) => {

      const oA = SB_LANE_ORDER[(a.position || "").toUpperCase()] || 99;

      const oB = SB_LANE_ORDER[(b.position || "").toUpperCase()] || 99;

      return oA - oB;

    });

    let playersHtml = "";

    sortedParticipants.forEach(p => {

      const champIcon = getChampionIconUrl(p.championName, p.championId);

      const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${getChampionInternalKey(p.championName)}.png`;

      const kills = p.kills || 0;

      const deaths = p.deaths || 0;

      const assists = p.assists || 0;

      const kdaRatio = deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2) + ":1";

      const pDmgDealt = p.damageDealt || 0;

      const pDmgTaken = p.damageTaken || 0;

      const pHeal = p.heal || 0;

      const dealtPct = Math.min(100, Math.round((pDmgDealt / maxDmgDealt) * 100));

      const takenPct = Math.min(100, Math.round((pDmgTaken / maxDmgTaken) * 100));

      const healPct = Math.min(100, Math.round((pHeal / maxHeal) * 100));

      const pName = (p.gameName || "").toLowerCase();

      const isMe = profileName && (pName === profileName || pName.indexOf(profileName) !== -1 || profileName.indexOf(pName) !== -1);

      const mvpBadge = (p.opScoreRank === 1) ? `<span class="badge-mvp" style="font-size:.58rem;padding:1px 6px;margin-left:6px;">MVP</span>` : "";

      const meBadge = isMe ? `<span class="badge-me">YOU</span>` : "";

      const laneIconUrl = getPositionIconUrl(p.position);

      const laneLogoHtml = laneIconUrl ? `

        <div class="sb-lane-badge" title="${escapeHtml(p.position || '')} Lane">

          <img class="sb-lane-icon" src="${laneIconUrl}" alt="${escapeHtml(p.position || '')}"/>

          <span class="sb-lane-text">${escapeHtml(p.position || '')}</span>

        </div>

      ` : (p.position ? `<div class="sb-lane-badge"><span class="sb-lane-text">${escapeHtml(p.position)}</span></div>` : '');

      // 7 Item build slots

      let itemsHtml = "";

      const pItems = p.items || [];

      const pItemNames = p.itemNames || [];

      for(let i = 0; i < 7; i++){

        const itemId = pItems[i];

        const itemName = pItemNames[i] || (itemId ? `Item #${itemId}` : "Empty Slot");

        if(itemId && itemId > 0){

          itemsHtml += `<img class="sb-item-slot" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${itemId}.png" alt="${escapeHtml(itemName)}" title="${escapeHtml(itemName)}" onerror="this.style.opacity='0.2'" />`;

        } else {

          itemsHtml += `<div class="sb-item-empty"></div>`;

        }

      }

      playersHtml += `

        <div class="sb-player-item ${isMe ? 'is-me' : ''}">

          <div class="sb-player-top">

            <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">

              <div class="sb-player-champ-box">

                <img class="sb-player-champ-img" src="${champIcon}" alt="${escapeHtml(p.championName)}" onerror="this.src='${fallbackOpgg}'" />

                <span class="sb-player-champ-lvl">${p.level || 1}</span>

              </div>

              <div class="sb-player-identity">

                ${laneLogoHtml}

                <div class="sb-player-summoner" style="${isMe ? 'color:var(--gold-1);font-weight:800;' : ''}">

                  ${escapeHtml(p.gameName || "Unknown")}${p.tagLine ? `<span style="color:var(--grey-2);font-weight:normal;font-size:.65rem;margin-left:3px;">#${escapeHtml(p.tagLine)}</span>` : ""}

                  ${meBadge}

                  ${mvpBadge}

                </div>

                <div class="sb-player-champ-title">${escapeHtml(p.championName || "")}</div>

              </div>

            </div>

            <div class="sb-player-kda-box">

              <div class="sb-player-kda-nums">${kills} / <span style="color:#ef4444;">${deaths}</span> / ${assists}</div>

              <div class="sb-player-kda-ratio">${kdaRatio} KDA</div>

            </div>

          </div>

          <!-- Comparative Damage Dealt, Taken & Healing Progress Bars -->

          <div class="sb-player-bars">

            <div class="sb-bar-wrap">

              <div class="sb-bar-label">

                <span>Dmg Dealt</span>

                <span class="sb-bar-label-val" style="color:#f87171;">${Number(pDmgDealt).toLocaleString()}</span>

              </div>

              <div class="sb-bar-bg">

                <div class="sb-bar-fill dmg-dealt" style="width:${dealtPct}%;"></div>

              </div>

            </div>

            <div class="sb-bar-wrap">

              <div class="sb-bar-label">

                <span>Dmg Taken</span>

                <span class="sb-bar-label-val" style="color:#60a5fa;">${Number(pDmgTaken).toLocaleString()}</span>

              </div>

              <div class="sb-bar-bg">

                <div class="sb-bar-fill dmg-taken" style="width:${takenPct}%;"></div>

              </div>

            </div>

            <div class="sb-bar-wrap">

              <div class="sb-bar-label">

                <span>Healing</span>

                <span class="sb-bar-label-val" style="color:#34d399;">${Number(pHeal).toLocaleString()}</span>

              </div>

              <div class="sb-bar-bg">

                <div class="sb-bar-fill dmg-heal" style="width:${healPct}%;"></div>

              </div>

            </div>

          </div>

          <!-- Items Row + CS & Gold -->

          <div class="sb-player-bottom">

            <div class="sb-player-items-row">

              ${itemsHtml}

            </div>

            <div class="sb-player-stats-mini">

              <div>CS: <span>${p.cs || 0}</span></div>

              <div>Gold: <span style="color:#fbbf24;">${((p.gold || 0) / 1000).toFixed(1)}k</span></div>

              <div>Towers: <span style="color:#fbbf24;display:inline-flex;align-items:center;gap:3px;">${turretSvg} <span>${towerKills}</span></span></div>

            </div>

          </div>

        </div>

      `;

    });

    teamsHtml += `

      <div class="sb-team-card ${teamClass}">

        <div class="sb-team-header">

          <div class="sb-team-name">

            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>

            <span>${teamTitle}</span>

            <span style="font-size:.72rem;color:var(--grey-2);margin-left:6px;font-family:sans-serif;display:inline-flex;align-items:center;gap:4px;">

              (${tKills} Kills &bull; ${turretSvg} ${towerKills} Towers &bull; ${((tGold)/1000).toFixed(1)}k Gold)

            </span>

          </div>

          <span class="sb-team-result-badge ${isWin ? 'win' : 'lose'}">${isWin ? 'VICTORY' : 'DEFEAT'}</span>

        </div>

        <div class="sb-players-list">

          ${playersHtml}

        </div>

      </div>

    `;

  });

  const queueBadge = m.queue || "MATCH";

  const durationBadge = m.duration || "";

  scoreboardView.innerHTML = `

    <!-- Top Navigation Bar -->

    <div class="match-detail-top-bar">

      <button type="button" class="match-back-btn" onclick="closeMatchScoreboard()">

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>

        BACK TO MATCH HISTORY

      </button>

      <button type="button" class="match-back-btn" onclick="openMatchDetail(${currentScoreboardMatchIdx})" style="background:rgba(200,155,60,.12);border-color:var(--gold-3);color:var(--gold-1);">

        <span>VIEW SOLO STATS</span>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

      </button>

    </div>

    <!-- Match Overview Bar: Game Mode, Duration, Kill & Gold Comparison -->

    <div class="sb-match-overview-bar">

      <div style="display:flex;align-items:center;gap:8px;">

        <span class="sb-match-badge queue">${escapeHtml(queueBadge)}</span>

        ${durationBadge ? `<span class="sb-match-badge duration">${escapeHtml(durationBadge)}</span>` : ''}

      </div>

      <div class="sb-match-score-compare">

        <span class="sb-score-blue">${blueTeamKills} Kills &bull; ${((blueTeamGold)/1000).toFixed(1)}k Gold</span>

        <span class="sb-score-vs">VS</span>

        <span class="sb-score-red">${redTeamKills} Kills &bull; ${((redTeamGold)/1000).toFixed(1)}k Gold</span>

      </div>

    </div>

    <!-- Spotlight Banner for Profile Owner -->

    ${ownerBannerHtml}

    <!-- Dual Team Scoreboard Grid (Blue Team vs Red Team) -->

    <div class="scoreboard-teams-row sb-teams-container">

      ${teamsHtml}

    </div>

  `;

}

function renderProfileStats(){

  const container = document.getElementById("profStatsContent");

  if(!container) return;

  if(!allLoadedMatches || allLoadedMatches.length === 0){

    container.innerHTML = `

      <div class="empty-page-container" style="padding:40px 20px;">

        <svg class="empty-page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">

          <line x1="18" y1="20" x2="18" y2="10" stroke="#c89b3c"/>

          <line x1="12" y1="20" x2="12" y2="4" stroke="#0ac8b9"/>

          <line x1="6" y1="20" x2="6" y2="14" stroke="#c89b3c"/>

        </svg>

        <div class="empty-page-title">Performance Stats & Analytics</div>

        <div class="empty-page-sub">Search a summoner above or load match history to compute combat intensity, win rates, and lane analytics.</div>

      </div>

    `;

    return;

  }

  const N = allLoadedMatches.length;

  const wins = allLoadedMatches.filter(m => m.win === true).length;

  const losses = N - wins;

  const winRate = Math.round((wins / N) * 100);

  let totalKills = 0, totalDeaths = 0, totalAssists = 0;

  let totalDmgDealt = 0, totalDmgTaken = 0, totalHeal = 0;

  let totalCs = 0, totalCsPerMin = 0, totalGold = 0;

  let totalWards = 0, totalControlWards = 0;

  let mvpCount = 0;

  let pentaCount = 0, quadraCount = 0, tripleCount = 0, doubleCount = 0;

  let maxDmgMatch = null;

  const roleMap = { "TOP": { games: 0, wins: 0 }, "JUNGLE": { games: 0, wins: 0 }, "MID": { games: 0, wins: 0 }, "ADC": { games: 0, wins: 0 }, "SUPPORT": { games: 0, wins: 0 } };

  const champMap = {};

  allLoadedMatches.forEach(m => {

    const k = m.kills || 0;

    const d = m.deaths || 0;

    const a = m.assists || 0;

    totalKills += k;

    totalDeaths += d;

    totalAssists += a;

    const dmg = m.damageDealt || 0;

    totalDmgDealt += dmg;

    totalDmgTaken += (m.damageTaken || 0);

    totalHeal += (m.heal || 0);

    if(!maxDmgMatch || dmg > (maxDmgMatch.damageDealt || 0)){

      maxDmgMatch = m;

    }

    totalCs += (m.cs || 0);

    totalCsPerMin += (m.csPerMin || 0);

    totalGold += (m.gold || 0);

    totalWards += (m.wardsPlaced || 0);

    totalControlWards += (m.controlWards || 0);

    if(m.opScoreRank === 1) mvpCount++;

    if(m.multiKill === "Penta Kill") pentaCount++;

    else if(m.multiKill === "Quadra Kill") quadraCount++;

    else if(m.multiKill === "Triple Kill") tripleCount++;

    else if(m.multiKill === "Double Kill") doubleCount++;

    const pos = (m.position || "").toUpperCase();

    if(roleMap[pos]){

      roleMap[pos].games++;

      if(m.win === true) roleMap[pos].wins++;

    }

    const cName = m.championName || "Unknown";

    if(!champMap[cName]){

      champMap[cName] = { name: cName, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, dmg: 0, cs: 0, gold: 0 };

    }

    champMap[cName].games++;

    if(m.win === true) champMap[cName].wins++;

    champMap[cName].kills += k;

    champMap[cName].deaths += d;

    champMap[cName].assists += a;

    champMap[cName].dmg += dmg;

    champMap[cName].cs += (m.cs || 0);

    champMap[cName].gold += (m.gold || 0);

  });

  const avgKills = (totalKills / N).toFixed(1);

  const avgDeaths = (totalDeaths / N).toFixed(1);

  const avgAssists = (totalAssists / N).toFixed(1);

  const overallKda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2);

  const avgDmgDealt = Math.round(totalDmgDealt / N);

  const avgDmgTaken = Math.round(totalDmgTaken / N);

  const avgHeal = Math.round(totalHeal / N);

  const avgCs = Math.round(totalCs / N);

  const avgCsPerMin = (totalCsPerMin / N).toFixed(1);

  const avgGold = Math.round(totalGold / N);

  const avgWards = (totalWards / N).toFixed(1);

  const avgControlWards = (totalControlWards / N).toFixed(1);

  // Lanes HTML

  const roleDisplayNames = { "TOP": "Top", "JUNGLE": "Jungle", "MID": "Mid", "ADC": "Bot (ADC)", "SUPPORT": "Support" };

  const roleIconKeys = { "TOP": "top", "JUNGLE": "jungle", "MID": "middle", "ADC": "bottom", "SUPPORT": "utility" };

  let rolesHtml = "";

  Object.keys(roleMap).forEach(rk => {

    const rd = roleMap[rk];

    const rWr = rd.games > 0 ? Math.round((rd.wins / rd.games) * 100) : 0;

    const rIcon = ROLE_ICONS[roleIconKeys[rk]] || "";

    rolesHtml += `

      <div class="stats-role-card">

        ${rIcon ? `<img class="stats-role-icon" src="${rIcon}" alt="${rk}" />` : `<div style="width:32px;height:32px;border-radius:50%;background:#1e2d45;display:flex;align-items:center;justify-content:center;color:var(--gold-1);font-weight:800;">${rk[0]}</div>`}

        <div class="stats-role-info">

          <div class="stats-role-name">${roleDisplayNames[rk]}</div>

          <div class="stats-role-meta">${rd.games} Games • <span style="color:${rWr>=50?'#34d399':'#f87171'};font-weight:700;">${rWr}% WR</span></div>

          <div class="stats-meter-bg" style="height:3px;margin-top:4px;">

            <div class="stats-meter-fill win" style="width:${rWr}%;"></div>

          </div>

        </div>

      </div>

    `;

  });

  // Champions Table

  const champsList = Object.values(champMap).sort((a,b) => b.games - a.games);

  let champsRows = "";

  champsList.forEach(c => {

    const cWr = Math.round((c.wins / c.games) * 100);

    const cKda = c.deaths > 0 ? ((c.kills + c.assists) / c.deaths).toFixed(2) : (c.kills + c.assists).toFixed(2);

    const cAvgK = (c.kills / c.games).toFixed(1);

    const cAvgD = (c.deaths / c.games).toFixed(1);

    const cAvgA = (c.assists / c.games).toFixed(1);

    const cAvgDmg = Math.round(c.dmg / c.games);

    const cAvgCs = Math.round(c.cs / c.games);

    const cAvgGold = Math.round(c.gold / c.games);

    const cleanChamp = getChampionInternalKey(c.name);

    const champIcon = getChampionIconUrl(c.name, c.id);

    const fallbackDDragon = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cleanChamp}.png`;

    const fallbackOpgg = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cleanChamp}.png`;

    champsRows += `

      <tr>

        <td style="display:flex;align-items:center;gap:8px;">

          <img src="${champIcon}" alt="${escapeHtml(c.name)}" onerror="if(this.src!=='${fallbackDDragon}'){this.src='${fallbackDDragon}';}else{this.src='${fallbackOpgg}';}" style="width:28px;height:28px;border-radius:3px;border:1px solid var(--gold-3);object-fit:cover;" />

          <span style="font-family:'Cinzel',serif;font-weight:700;">${escapeHtml(c.name)}</span>

        </td>

        <td>${c.games}</td>

        <td>

          <div style="display:flex;align-items:center;gap:6px;">

            <span style="font-weight:700;color:${cWr>=50?'#34d399':'#f87171'};">${cWr}%</span>

            <span style="color:var(--grey-2);font-size:.65rem;">(${c.wins}W ${c.games - c.wins}L)</span>

          </div>

        </td>

        <td>

          <div style="font-weight:700;">${cKda}:1 KDA</div>

          <div style="font-size:.65rem;color:var(--grey-2);">${cAvgK} / ${cAvgD} / ${cAvgA}</div>

        </td>

        <td style="color:#f87171;font-weight:700;">${cAvgDmg.toLocaleString()}</td>

        <td>${cAvgCs}</td>

        <td style="color:#fbbf24;">${(cAvgGold/1000).toFixed(1)}k</td>

      </tr>

    `;

  });

  const summonerTitle = currentProfileData && currentProfileData.gameName ? `${escapeHtml(currentProfileData.gameName)}#${escapeHtml(currentProfileData.tagLine||'')}` : "Summoner";

  container.innerHTML = `

    <div class="stats-container">

      <!-- Analytics Header Banner -->

      <div class="stats-header-banner">

        <div>

          <div class="stats-header-title">PERFORMANCE ANALYTICS &bull; ${summonerTitle}</div>

          <div class="stats-header-sub">Comprehensive statistics computed across your last ${N} matches.</div>

        </div>

        <div style="text-align:right;">

          <div style="font-family:'Cinzel',serif;font-size:1.1rem;font-weight:800;color:${winRate>=50?'#34d399':'#f87171'};">${winRate}% WIN RATE</div>

          <div style="font-size:.72rem;color:var(--grey-2);">${wins} Wins &bull; ${losses} Losses</div>

        </div>

      </div>

      <!-- 4 Core Performance KPI Cards -->

      <div class="stats-kpi-grid">

        <!-- Card 1: Win Rate & Outcomess -->

        <div class="stats-kpi-card">

          <div class="stats-kpi-title">

            <span>Win Rate & Outcomes</span>

            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>

          </div>

          <div class="stats-kpi-main-val" style="color:${winRate>=50?'#34d399':'#f87171'};">${winRate}%</div>

          <div class="stats-meter-wrap">

            <div class="stats-meter-bg"><div class="stats-meter-fill win" style="width:${winRate}%;"></div></div>

          </div>

          <div class="stats-metric-row" style="margin-top:6px;"><span class="stats-metric-lbl">Total Matches</span><span class="stats-metric-val">${N}</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Victories / Defeats</span><span class="stats-metric-val">${wins}W / ${losses}L</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">MVP Awards</span><span class="stats-metric-val" style="color:var(--gold-1);">${mvpCount} MVP${mvpCount===1?'':'s'}</span></div>

        </div>

        <!-- Card 2: Combat & KDA -->

        <div class="stats-kpi-card">

          <div class="stats-kpi-title">

            <span>Combat & KDA Ratio</span>

            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M22 12h-4"/><path d="M6 12H2"/><path d="M12 6V2"/><path d="M12 22v-4"/></svg>

          </div>

          <div class="stats-kpi-main-val" style="color:var(--gold-1);">${overallKda} <span style="font-size:.7rem;color:var(--grey-2);font-weight:normal;">KDA</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Average K / D / A</span><span class="stats-metric-val">${avgKills} / <span style="color:#ef4444">${avgDeaths}</span> / ${avgAssists}</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Total Kills / Deaths</span><span class="stats-metric-val">${totalKills} / ${totalDeaths}</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Multi-Kills</span><span class="stats-metric-val">${pentaCount ? pentaCount+' Penta ' : ''}${quadraCount ? quadraCount+' Quadra ' : ''}${tripleCount ? tripleCount+' Triple ' : ''}${doubleCount ? doubleCount+' Double' : (pentaCount||quadraCount||tripleCount?'':'0')}</span></div>

        </div>

        <!-- Card 3: Damage & Healing Output -->

        <div class="stats-kpi-card">

          <div class="stats-kpi-title">

            <span>Damage & Healing / Game</span>

            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>

          </div>

          <div class="stats-metric-row">

            <span class="stats-metric-lbl">Avg Damage Dealt</span>

            <span class="stats-metric-val" style="color:#f87171;">${avgDmgDealt.toLocaleString()}</span>

          </div>

          <div class="stats-meter-bg"><div class="stats-meter-fill dmg" style="width:${Math.min(100, Math.round((avgDmgDealt/40000)*100))}%;"></div></div>

          <div class="stats-metric-row" style="margin-top:6px;">

            <span class="stats-metric-lbl">Avg Damage Taken</span>

            <span class="stats-metric-val" style="color:#60a5fa;">${avgDmgTaken.toLocaleString()}</span>

          </div>

          <div class="stats-meter-bg"><div class="stats-meter-fill taken" style="width:${Math.min(100, Math.round((avgDmgTaken/40000)*100))}%;"></div></div>

          <div class="stats-metric-row" style="margin-top:6px;">

            <span class="stats-metric-lbl">Avg Healing Done</span>

            <span class="stats-metric-val" style="color:#34d399;">${avgHeal.toLocaleString()}</span>

          </div>

          <div class="stats-meter-bg"><div class="stats-meter-fill heal" style="width:${Math.min(100, Math.round((avgHeal/20000)*100))}%;"></div></div>

          ${maxDmgMatch ? `<div class="stats-metric-row" style="margin-top:4px;"><span class="stats-metric-lbl">Peak Damage</span><span class="stats-metric-val" style="color:var(--gold-1);">${Number(maxDmgMatch.damageDealt||0).toLocaleString()} (${escapeHtml(maxDmgMatch.championName)})</span></div>` : ''}

        </div>

        <!-- Card 4: Economy & Map Control -->

        <div class="stats-kpi-card">

          <div class="stats-kpi-title">

            <span>Farming & Map Control</span>

            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 6v12"/></svg>

          </div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Avg Minions (CS)</span><span class="stats-metric-val" style="color:var(--gold-1);">${avgCs} CS</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">CS Per Minute</span><span class="stats-metric-val">${avgCsPerMin} CS/m</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Avg Gold Earned</span><span class="stats-metric-val" style="color:#fbbf24;">${avgGold.toLocaleString()} g</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Avg Wards Placed</span><span class="stats-metric-val">${avgWards}</span></div>

          <div class="stats-metric-row"><span class="stats-metric-lbl">Avg Control Wards</span><span class="stats-metric-val" style="color:#c084fc;">${avgControlWards}</span></div>

        </div>

      </div>

      <!-- Role Distribution Section -->

      <div class="stats-section-heading">

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>

        <span>LANE & ROLE DISTRIBUTION</span>

      </div>

      <div class="stats-roles-grid">

        ${rolesHtml}

      </div>

      <!-- Champions Breakdown Table -->

      <div class="stats-section-heading" style="margin-top:12px;">

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>

        <span>CHAMPION PERFORMANCE IN RECENT MATCHES</span>

      </div>

      <div class="stats-champs-table-wrap">

        <table class="stats-champs-table">

          <thead>

            <tr>

              <th>Champion</th>

              <th>Games</th>

              <th>Win Rate</th>

              <th>KDA Ratio</th>

              <th>Avg Damage</th>

              <th>Avg CS</th>

              <th>Avg Gold</th>

            </tr>

          </thead>

          <tbody>

            ${champsRows}

          </tbody>

        </table>

      </div>

    </div>

  `;

}


/* ==========================================

   PROFILE FAVORITES & DEFAULT PROFILE SYSTEM

   ========================================== */

function getFavoriteProfiles(){

  try{

    const raw = localStorage.getItem("loc_favorite_profiles");

    return raw ? JSON.parse(raw) : [];

  }catch(e){

    return [];

  }

}

function saveFavoriteProfiles(list){

  try{

    localStorage.setItem("loc_favorite_profiles", JSON.stringify(list));

  }catch(e){}

}

function getDefaultProfile(){

  try{

    const raw = localStorage.getItem("loc_default_profile");

    return raw ? JSON.parse(raw) : null;

  }catch(e){

    return null;

  }

}

function isCurrentProfileFavorite(){

  if(!currentProfileData) return false;

  const favs = getFavoriteProfiles();

  const cName = (currentProfileData.gameName || "").toLowerCase();

  const cTag = (currentProfileData.tagLine || "").toLowerCase();

  const cReg = (currentProfileData.region || "").toLowerCase();

  return favs.some(f => (f.name||"").toLowerCase() === cName && (f.tag||"").toLowerCase() === cTag && (f.region||"").toLowerCase() === cReg);

}

function isCurrentProfileDefault(){

  if(!currentProfileData) return false;

  const def = getDefaultProfile();

  if(!def) return false;

  const cName = (currentProfileData.gameName || "").toLowerCase();

  const cTag = (currentProfileData.tagLine || "").toLowerCase();

  const cReg = (currentProfileData.region || "").toLowerCase();

  return (def.name||"").toLowerCase() === cName && (def.tag||"").toLowerCase() === cTag && (def.region||"").toLowerCase() === cReg;

}

function updateProfileMenuState(){

  const favSvg = document.getElementById("profFavSvg");

  const favText = document.getElementById("profFavText");

  const defSvg = document.getElementById("profDefaultSvg");

  const defText = document.getElementById("profDefaultText");

  const defBadge = document.getElementById("profDefaultBadge");

  const isFav = isCurrentProfileFavorite();

  const isDef = isCurrentProfileDefault();

  if(favSvg){

    favSvg.setAttribute("fill", isFav ? "var(--gold-1)" : "none");

    favSvg.style.color = isFav ? "var(--gold-1)" : "var(--gold-3)";

  }

  if(favText) favText.innerText = isFav ? "Remove from Favorites" : "Save to Favorites";

  if(defSvg){

    defSvg.setAttribute("fill", isDef ? "rgba(200,155,60,0.35)" : "none");

    defSvg.style.color = isDef ? "var(--gold-1)" : "var(--gold-3)";

  }

  if(defText) defText.innerText = isDef ? "Remove Default Profile" : "Set as Default Profile";

  if(defBadge) defBadge.style.display = isDef ? "inline-flex" : "none";

}

function toggleProfileMenu(e){

  e.stopPropagation();

  const menu = document.getElementById("profDropdownMenu");

  if(!menu) return;

  const isOpen = menu.style.display === "flex";

  menu.style.display = isOpen ? "none" : "flex";

  if(!isOpen) updateProfileMenuState();

}

document.addEventListener("click", function(e){

  const menu = document.getElementById("profDropdownMenu");

  if(menu && menu.style.display === "flex"){

    if(!e.target.closest(".profile-menu-wrap")){

      menu.style.display = "none";

    }

  }

});

function toggleCurrentFavorite(){

  if(!currentProfileData) return;

  const favs = getFavoriteProfiles();

  const cName = currentProfileData.gameName;

  const cTag = currentProfileData.tagLine;

  const cReg = currentProfileData.region;

  const idx = favs.findIndex(f => (f.name||"").toLowerCase() === cName.toLowerCase() && (f.tag||"").toLowerCase() === cTag.toLowerCase() && (f.region||"").toLowerCase() === cReg.toLowerCase());

  if(idx >= 0){

    favs.splice(idx, 1);

    saveFavoriteProfiles(favs);

    showToast(`Removed ${cName}#${cTag} from favorites`);

  }else{

    favs.unshift({

      name: cName,

      tag: cTag,

      region: cReg,

      iconUrl: currentProfileData.profileImageUrl || "",

      level: currentProfileData.level || 1

    });

    saveFavoriteProfiles(favs);

    showToast(`⭐ Saved ${cName}#${cTag} to favorites!`);

  }

  updateProfileMenuState();

  const menu = document.getElementById("profDropdownMenu");

  if(menu) menu.style.display = "none";

}

function toggleCurrentDefault(){

  if(!currentProfileData) return;

  const cName = currentProfileData.gameName;

  const cTag = currentProfileData.tagLine;

  const cReg = currentProfileData.region;

  if(isCurrentProfileDefault()){

    localStorage.removeItem("loc_default_profile");

    showToast(`Removed default profile setting`);

  }else{

    localStorage.setItem("loc_default_profile", JSON.stringify({

      name: cName,

      tag: cTag,

      region: cReg

    }));

    showToast(`👤 ${cName}#${cTag} set as Default Profile! (Auto-loads on launch)`);

  }

  updateProfileMenuState();

  const menu = document.getElementById("profDropdownMenu");

  if(menu) menu.style.display = "none";

}

function openFavoritesModal(){

  const modal = document.getElementById("favoritesModal");

  const menu = document.getElementById("profDropdownMenu");

  if(menu) menu.style.display = "none";

  if(modal){

    renderFavoritesList();

    modal.classList.add("open");

  }

}

function closeFavoritesModal(){

  const modal = document.getElementById("favoritesModal");

  if(modal) modal.classList.remove("open");

}

function onFavoritesOverlayClick(e){

  if(e.target && e.target.id === "favoritesModal"){

    closeFavoritesModal();

  }

}

function renderFavoritesList(){

  const container = document.getElementById("favoritesListContainer");

  const countBadge = document.getElementById("favCountBadge");

  if(!container) return;

  const favs = getFavoriteProfiles();

  const def = getDefaultProfile();

  if(countBadge) countBadge.innerText = favs.length;

  if(favs.length === 0){

    container.innerHTML = `

      <div class="fav-empty-box">

        <div style="margin-bottom:10px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold-2)" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>

        <div style="font-family:'Cinzel',serif;font-weight:800;color:var(--gold-1);font-size:.9rem;margin-bottom:6px;">No Favorites Saved Yet</div>

        <div style="color:var(--grey-2);font-size:.74rem;line-height:1.45;max-width:320px;margin:0 auto;">Search any summoner profile and click the three dots (⋮) in the top-right banner to bookmark them here or set them as your default profile.</div>

      </div>

    `;

    return;

  }

  let html = "";

  favs.forEach((f) => {

    const isDef = def && (def.name||"").toLowerCase() === (f.name||"").toLowerCase() && (def.tag||"").toLowerCase() === (f.tag||"").toLowerCase() && (def.region||"").toLowerCase() === (f.region||"").toLowerCase();

    const avatar = f.iconUrl || "https://opgg-static.akamaized.net/meta/images/profile_icons/profileIcon1.jpg";

    html += `

      <div class="fav-item-card ${isDef ? 'is-default' : ''}">

        <div class="fav-item-left" onclick="loadFavoriteProfile('${escapeHtml(f.name)}', '${escapeHtml(f.tag)}', '${escapeHtml(f.region)}')">

          <div class="fav-avatar-wrap">

            <img class="fav-avatar-img" src="${avatar}" alt="${escapeHtml(f.name)}" onerror="this.src='https://opgg-static.akamaized.net/meta/images/profile_icons/profileIcon1.jpg'" />

            ${f.level ? `<span class="fav-level-tag">Lv.${f.level}</span>` : ''}

          </div>

          <div class="fav-meta">

            <div class="fav-name-row">

              <span class="fav-name">${escapeHtml(f.name)}</span>

              <span class="fav-tag">#${escapeHtml(f.tag)}</span>

              <span class="fav-region-pill">${escapeHtml((f.region||"eune").toUpperCase())}</span>

            </div>

            <div class="fav-sub-info" style="margin-top:2px;">

              ${isDef ? '<span class="fav-default-tag">★ DEFAULT PROFILE</span>' : '<span style="color:var(--grey-2);font-size:.65rem;">Click to load profile</span>'}

            </div>

          </div>

        </div>

        <div class="fav-actions">

          ${!isDef ? `

            <button class="fav-action-btn set-default" onclick="setDefaultFromFavorites('${escapeHtml(f.name)}', '${escapeHtml(f.tag)}', '${escapeHtml(f.region)}')" title="Set as Default (Auto-loads on launch)">

              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Make Default</span>

            </button>

          ` : `

            <button class="fav-action-btn is-default" onclick="unsetDefaultFromFavorites()" title="Current default profile">

              <span>✓ Default</span>

            </button>

          `}

          <button class="fav-action-btn delete" onclick="removeFavoriteProfile('${escapeHtml(f.name)}', '${escapeHtml(f.tag)}', '${escapeHtml(f.region)}')" title="Remove from Favorites">

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>

          </button>

        </div>

      </div>

    `;

  });

  container.innerHTML = html;

}

function loadFavoriteProfile(name, tag, region){

  closeFavoritesModal();

  document.getElementById("profNameInput").value = name;

  document.getElementById("profTagInput").value = tag;

  if(region) document.getElementById("profRegionSelect").value = region.toLowerCase();

  searchProfile();

}

function setDefaultFromFavorites(name, tag, region){

  localStorage.setItem("loc_default_profile", JSON.stringify({ name, tag, region }));

  showToast(`👤 ${name}#${tag} set as Default Profile!`);

  renderFavoritesList();

  updateProfileMenuState();

}

function unsetDefaultFromFavorites(){

  localStorage.removeItem("loc_default_profile");

  showToast(`Removed default profile`);

  renderFavoritesList();

  updateProfileMenuState();

}

function removeFavoriteProfile(name, tag, region){

  const favs = getFavoriteProfiles();

  const idx = favs.findIndex(f => (f.name||"").toLowerCase() === name.toLowerCase() && (f.tag||"").toLowerCase() === tag.toLowerCase() && (f.region||"").toLowerCase() === region.toLowerCase());

  if(idx >= 0){

    favs.splice(idx, 1);

    saveFavoriteProfiles(favs);

    showToast(`Removed ${name}#${tag} from favorites`);

    renderFavoritesList();

    updateProfileMenuState();

  }

}

function checkAndAutoLoadDefaultProfile(){

  const def = getDefaultProfile();

  if(def && def.name && def.tag){

    const nameInput = document.getElementById("profNameInput");

    const tagInput = document.getElementById("profTagInput");

    const regSelect = document.getElementById("profRegionSelect");

    if(nameInput) nameInput.value = def.name;

    if(tagInput) tagInput.value = def.tag;

    if(regSelect && def.region) regSelect.value = def.region.toLowerCase();

    searchProfile();

  }

}


function syncUserDataToDisk(){

  try{

    const favs = getFavoriteProfiles();

    const def = getDefaultProfile();

    const payload = JSON.stringify({ favorites: favs, defaultProfile: def });

    if(window.chrome && window.chrome.webview){

      window.chrome.webview.postMessage("save-user-data:" + payload);

    }

  }catch(e){}

}

