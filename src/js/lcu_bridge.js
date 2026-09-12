let isTeamLcuPending = false;

async function readFromLolClient(){

  isTeamLcuPending = false;

  const btn=document.getElementById("lcuBtn"),status=document.getElementById("lcuStatus");

  btn.disabled=true;btn.innerText="Connecting...";status.className="lcu-status";status.innerHTML="Connecting to League Client...";

  if(window.chrome&&window.chrome.webview){

    // Safety timeout — re-enable the button if C# never replies (e.g. League not running)

    const t=setTimeout(()=>{

      if(btn.disabled){

        btn.disabled=false;btn.innerText="Read from LoL Client";

        status.className="lcu-status err";

        status.innerHTML="No response from League Client. Make sure League is running with an open lobby.";

      }

    },6000);

    // Store timeout so handleLobbyResult can cancel it

    btn._lcuTimeout=t;

    window.chrome.webview.postMessage("get-lobby");

    return;

  }

  try{

    const targetUrl=window.location.origin.startsWith("http")?(window.location.origin+"/lobby-members"):"http://127.0.0.1:9137/lobby-members";

    const resp=await fetch(targetUrl,{signal:AbortSignal.timeout(4000)});

    if(!resp.ok)throw new Error(`HTTP ${resp.status}`);const data=await resp.json();

    handleLobbyResult(data);

  }catch(e){

    status.className="lcu-status err";

    status.innerHTML=e.name==="TimeoutError"||e.message.includes("fetch")?"Could not connect to League Client. Make sure League is running with an open lobby.":e.message;

    btn.disabled=false;btn.innerText="Read from LoL Client";

  }

}

function handleLobbyResult(data){

  if(isTeamLcuPending){

    isTeamLcuPending = false;

    const teamBtn = document.getElementById("btnTeamLcu");

    if(teamBtn){

      if(teamBtn._lcuTimeout){ clearTimeout(teamBtn._lcuTimeout); teamBtn._lcuTimeout = null; }

      teamBtn.disabled = false;

      teamBtn.innerText = "Read from LoL Client";

    }

    if(!data) return;

    if(data.error){

      showToast(data.error);

    } else if(data.players && data.players.length > 0){

      clearTeamInputs();

      data.players.slice(0, 5).forEach((p, idx) => {

        const inp = document.getElementById("squadInput" + idx);

        if(inp) inp.value = p;

      });

      animateAndRandomizeTeam();

      showToast(`Loaded ${Math.min(data.players.length, 5)} players from LoL Client`);

    } else {

      showToast("Lobby is empty. Make sure players have joined.");

    }

    return;

  }

  const btn=document.getElementById("lcuBtn"),status=document.getElementById("lcuStatus");

  // Cancel the safety timeout if C# responded in time

  if(btn && btn._lcuTimeout){clearTimeout(btn._lcuTimeout);btn._lcuTimeout=null;}

  if(btn){ btn.disabled=false; btn.innerText="Read from LoL Client"; }

  if(!data)return;

  if(data.error){

    status.className="lcu-status err";status.innerHTML=data.error;

  }else if(data.players&&data.players.length>0){

    switchInputMode("manual");

    document.getElementById("manualInput").value=data.players.join("\n");

    updateStats();

    animateAndRandomize();

    status.className="lcu-status ok";

    status.innerHTML=`Loaded ${data.players.length} players from lobby.`;

    showToast(`${data.players.length} players loaded`);

  }else{

    status.className="lcu-status err";

    status.innerHTML="Lobby is empty. Make sure players have joined.";

  }

}


async function readFromLolClientForTeam(){

  const btn = document.getElementById("btnTeamLcu");

  if(btn){

    btn.disabled = true;

    btn.innerText = "Connecting...";

  }

  isTeamLcuPending = true;

  if(window.chrome && window.chrome.webview){

    const t = setTimeout(() => {

      if(btn && btn.disabled){

        btn.disabled = false;

        btn.innerText = "Read from LoL Client";

        isTeamLcuPending = false;

        showToast("No response from League Client. Make sure League is running with an open lobby.");

      }

    }, 6000);

    btn._lcuTimeout = t;

    window.chrome.webview.postMessage("get-lobby");

    return;

  }

  try {

    const targetUrl = window.location.origin.startsWith("http") ? (window.location.origin + "/lobby-members") : "http://127.0.0.1:9137/lobby-members";

    const resp = await fetch(targetUrl, { signal: AbortSignal.timeout(4000) });

    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();

    handleLobbyResult(data);

  } catch(e) {

    if(btn){

      btn.disabled = false;

      btn.innerText = "Read from LoL Client";

    }

    isTeamLcuPending = false;

    showToast("Could not connect to League Client. Make sure League is running with an open lobby.");

  }

}


function openRunePageSelectModal(pages, champName){

  const modal = document.getElementById("runePageSelectModal");

  const list = document.getElementById("runePageListContainer");

  const nameEl = document.getElementById("runeModalChampName");

  if(!modal || !list) return;

  if(nameEl) nameEl.innerText = champName || (soloState && soloState.champ && soloState.champ.name) || "Champion";

  list.innerHTML = "";

  if(!pages || !pages.length){

    list.innerHTML = `<div style="text-align:center;padding:24px;color:#a09b8c;">No custom rune pages available to replace.</div>`;

  } else {

    pages.forEach(p => {

      const tree = RUNE_TREE_DATA[p.primaryStyleId] || { name: "Rune Tree", icon: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/runesicon.png" };

      const row = document.createElement("div");

      row.className = "loc-modal-item";

      row.onclick = () => confirmReplaceRunePage(p.id);

      const isCurrent = p.current || p.isActive;

      row.innerHTML = `

        <div class="loc-modal-item-left">

          <img class="loc-modal-tree-icon" src="${tree.icon}" alt="${tree.name}" onerror="this.style.opacity=0.3" />

          <div class="loc-modal-page-info">

            <div class="loc-modal-page-name">

              ${escapeHtml(p.name)}

              ${isCurrent ? '<span class="loc-modal-active-badge">ACTIVE</span>' : ''}

            </div>

            <div class="loc-modal-page-sub">${tree.name} Path</div>

          </div>

        </div>

        <button class="loc-modal-replace-btn" onclick="event.stopPropagation(); confirmReplaceRunePage(${p.id})">REPLACE</button>

      `;

      list.appendChild(row);

    });

  }

  modal.style.display = "flex";

}

function closeRunePageSelectModal(){

  const modal = document.getElementById("runePageSelectModal");

  if(modal) modal.style.display = "none";

}

function onRunePageOverlayClick(e){

  if(e.target && e.target.id === "runePageSelectModal"){

    closeRunePageSelectModal();

  }

}

function confirmReplaceRunePage(pageId, pageName){

  closeRunePageSelectModal();

  injectSoloLoadoutToClient(pageId);

}


function injectSoloLoadoutToClient(replacePageId = 0){

  if(!soloState || !soloState.champ || !soloState.runes || !soloState.items){

    showToast("Please roll a champion first!");

    return;

  }

  const btn = document.getElementById("btnSoloInject");

  const txt = document.getElementById("btnSoloInjectText");

  if(btn) {

    btn.classList.add("loading");

    if(txt) txt.innerText = "INJECTING...";

  }

  const r = soloState.runes;

  const it = soloState.items;

  const sp = soloState.spells || [];

  const selectedPerkIds = [

    r.keystone.id,

    ...r.primaryMinors.map(m => m.id),

    ...r.secMinors.map(m => m.id),

    r.shards.offense.id,

    r.shards.flex.id,

    r.shards.defense.id

  ];

  const payload = {

    championName: soloState.champ.name || soloState.champ.id,

    championId: soloState.champ.key || soloState.champ.id,

    role: soloState.role,

    mode: soloMode ? "aram" : "rift",

    primaryTreeId: r.primaryTree.id,

    secondaryTreeId: r.secondaryTree.id,

    selectedPerkIds: selectedPerkIds,

    starterId: it.starter ? it.starter.id : 1055,

    bootsId: it.boots ? it.boots.id : 3006,

    coreItemIds: it.coreItems ? it.coreItems.map(i => i.id) : [],

    spell1Id: sp[0] ? sp[0].key : 4,

    spell2Id: sp[1] ? sp[1].key : 14,

    replacePageId: replacePageId || 0

  };

  const msg = "inject-solo-loadout:" + JSON.stringify(payload);

  if(window.chrome && window.chrome.webview){

    window.chrome.webview.postMessage(msg);

  } else if(window.location.origin.startsWith("http")){

    fetch("/inject-solo-loadout", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(payload)

    })

    .then(res => res.json())

    .then(data => handleInjectResult(data))

    .catch(err => {

      handleInjectResult({ success: false, error: "Network error: " + err.message });

    });

  } else {

    handleInjectResult({ success: false, error: "WebView2 bridge unavailable." });

  }

}

function handleInjectResult(data){

  const btn = document.getElementById("btnSoloInject");

  const txt = document.getElementById("btnSoloInjectText");

  if(btn) {

    btn.classList.remove("loading");

    if(txt) txt.innerText = "INJECT TO CLIENT";

  }

  if(data && data.requiresPageSelection){

    openRunePageSelectModal(data.pages, data.championName);

    return;

  }

  if(data && data.success){

    let toastMsg = `⚔️ Injected: League of Customs - ${data.championName}!`;

    if(data.champHovered){

      toastMsg += " • Champion selected in Champ Select!";

    }

    if(data.spellsInjected){

      toastMsg += " • Spells updated!";

    } else if(data.inChampSelect === false) {

      toastMsg += " (Runes & Build ready)";

    }

    showToast(toastMsg);

  } else {

    showToast(data && data.error ? data.error : "Failed to inject loadout to League Client.");

  }

}

