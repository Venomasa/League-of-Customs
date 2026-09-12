const JOIN_REGEX=/^(?:\[\d{1,2}:\d{2}(?::\d{2})?\]\s*)?(.+?)\s+(?:has\s+)?joined\s+the\s+(?:lobby|room)\.?$/i;

const LEAVE_REGEX=/^(?:\[\d{1,2}:\d{2}(?::\d{2})?\]\s*)?(.+?)\s+(?:has\s+)?left\s+the\s+(?:lobby|room)\.?$/i;

let currentMode="chat",isAram=false,lastMatch=null,isShuffling=false;

function setGameMode(a){

  if(isAram === a) return;

  isAram=a;

  document.getElementById("btnModeRift").classList.toggle("active",!a);

  document.getElementById("btnModeAram").classList.toggle("active",a);

  document.getElementById("rollBtn").innerText=a?"Randomize ARAM":"Randomize Teams";

  updateStats();

  if(lastMatch){

    lastMatch.isAram = a;

    lastMatch.team1.forEach((it, i) => {

      it.role = isAram ? `ARAM ${i + 1}` : (it.bonus ? "Sub" : (RIFT_ROLES[i] || "Sub"));

    });

    lastMatch.team2.forEach((it, i) => {

      it.role = isAram ? `ARAM ${i + 1}` : (it.bonus ? "Sub" : (RIFT_ROLES[i] || "Sub"));

    });

    renderMatch(lastMatch.team1, lastMatch.team2, lastMatch.spectators);

  } else {

    renderEmptyInitialSlots();

  }

}



function switchInputMode(m){currentMode=m;["chat","manual"].forEach(x=>{document.getElementById("tab"+x.charAt(0).toUpperCase()+x.slice(1)+"Btn").classList.toggle("active",m===x);document.getElementById(x+"Section").classList.toggle("active",m===x);});updateStats();}

function parseActiveRoster(){

  const strip=document.getElementById("stripTagsCheck").checked;

  const clean=p=>strip?p.replace(/\s*#\S+$/,"").trim()||p:p;

  if(currentMode==="chat"){

    const lines=document.getElementById("chatInput").value.split("\n");

    const lobby=[];let joins=0,leaves=0;

    for(const line of lines){

      const s=line.trim();if(!s)continue;

      if(s.startsWith("+")){const e=s.slice(1).trim();if(e&&!lobby.some(p=>p.toLowerCase()===e.toLowerCase()))lobby.push(e);continue;}

      const jm=s.match(JOIN_REGEX);if(jm){const p=jm[1].trim();joins++;if(!lobby.some(x=>x.toLowerCase()===p.toLowerCase()))lobby.push(p);continue;}

      const lm=s.match(LEAVE_REGEX);if(lm){const p=lm[1].trim();leaves++;const i=lobby.findIndex(x=>x.toLowerCase()===p.toLowerCase());if(i!==-1)lobby.splice(i,1);}

    }

    return{players:lobby.map(clean),mode:"chat",joins,leaves};

  }else{

    const players=[];

    for(const line of document.getElementById("manualInput").value.split("\n")){

      const s=line.trim();if(!s||s.startsWith("#")||s.startsWith("//"))continue;

      for(const p of s.split(",").map(x=>x.trim()).filter(Boolean)){if(!players.some(e=>e.toLowerCase()===p.toLowerCase()))players.push(p);}

    }

    return{players:players.map(clean),mode:"manual"};

  }

}

function updateStats(){

  const data=parseActiveRoster();

  const banner=document.getElementById("sourceBanner"),summary=document.getElementById("statsSummary");

  const nlb=document.getElementById("noLeftBehindCheck").checked;

  if(data.mode==="chat"){banner.innerText=`League Chat — ${data.joins} joined, ${data.leaves} left`;banner.style.color="var(--blue)";}

  else{banner.innerText="Manual Roster";banner.style.color="var(--gold-2)";}

  const total=data.players.length;

  if(total===0){summary.innerText="—";return;}

  const per=Math.min(5,Math.floor(total/2));

  let surplus=total-per*2;

  const bonus=nlb && surplus===1 && per<5;

  if(bonus) surplus=0;

  const mode=isAram?"ARAM":"Rift";

  summary.innerText=`${mode}  |  ${total} Players  |  ${per}v${per}${bonus?" +1":""}  |  Bench: ${surplus}`;

}

document.getElementById("chatInput").addEventListener("input",updateStats);

document.getElementById("manualInput").addEventListener("input",updateStats);

function secureRandom(){

  if(window.crypto && window.crypto.getRandomValues){

    const buf = new Uint32Array(1);

    window.crypto.getRandomValues(buf);

    return buf[0] / (0xFFFFFFFF + 1);

  }

  return Math.random();

}

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(secureRandom()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function renderMatch(t1,t2,spec){

  document.getElementById("t1HeaderCount").innerText=`${t1.length} Player${t1.length!==1?"s":""}`;

  document.getElementById("t2HeaderCount").innerText=`${t2.length} Player${t2.length!==1?"s":""}`;

  function renderSlots(id,team){

    const box=document.getElementById(id);box.innerHTML="";

    const slots=!isAram?Math.max(team.length,5):team.length;

    for(let i=0;i<slots;i++){

      if(i<team.length){

        const it=team[i];

        const bc=it.bonus?"role-badge bonus-badge":isAram?"role-badge aram-badge":"role-badge";

        const sc=it.bonus?"player-slot bonus":"player-slot";

        const iconSrc=getRoleIcon(it.role);

        let champHtml = "";

        if(it.champ){

          const cName = escapeHtml(it.champ.name);

          const cTitle = escapeHtml(it.champ.title || "");

          const cIcon = getChampionIconUrl(it.champ.name, it.champ.key || it.champ.id);

          const cFallback = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${getChampionInternalKey(it.champ.name || it.champ.id)}.png`;

          champHtml = `<div class="slot-champ-pill" title="${cTitle}"><img class="slot-champ-img" src="${cIcon}" alt="${cName}" onerror="this.src='${cFallback}'"/><span>${cName}</span></div>`;

        }

        box.innerHTML+=`<div class="${sc}"><div class="slot-role"><span class="${bc}"><img class="role-icon" src="${iconSrc}" alt="${it.role}"><span>${it.role}</span></span></div><div class="slot-player">${formatPlayerHtml(it.player)}</div>${champHtml}</div>`;

      }

      else if(!isAram){

        const roleName=RIFT_ROLES[i]||("Slot "+(i+1));

        const iconSrc=getRoleIcon(roleName);

        box.innerHTML+=`<div class="player-slot disabled"><div class="slot-role"><span class="role-badge disabled-badge"><img class="role-icon" src="${iconSrc}" alt="${roleName}"><span>${roleName}</span></span></div><div class="slot-player"><span class="player-name disabled-text">— Open Slot / Sub</span></div></div>`;

      }

    }

  }

  renderSlots("t1Container",t1);renderSlots("t2Container",t2);

  const sh=document.getElementById("specHeader"),sb=document.getElementById("specBody");sb.innerHTML="";

  if(spec.length>0){sh.innerText=`Spectators / Bench  (${spec.length})`;spec.forEach(p=>{sb.innerHTML+=`<div class="spec-pill">${escapeHtml(p)}</div>`;});}

  else{sh.innerText="Spectators / Bench";sb.innerHTML=`<span class="no-spec">All players assigned to teams.</span>`;}

}


function randomizeMatch(){

  const data=parseActiveRoster();const players=data.players;if(players.length<2)return null;

  const nlb=document.getElementById("noLeftBehindCheck").checked;

  const assignChamps = document.getElementById("randomChampsCheck") && document.getElementById("randomChampsCheck").checked;

  const laneSpecific = assignChamps && document.getElementById("laneChampsCustomCheck") && document.getElementById("laneChampsCustomCheck").checked;

  const per=Math.min(5,Math.floor(players.length/2));const active=per*2;const sh=shuffle(players);

  const t1=[],t2=[],spec=[];

  const usedChampIds = new Set();

  function pickChampForCustom(role){

    if(!assignChamps || typeof LOL_DATA === "undefined" || !LOL_DATA.champions || LOL_DATA.champions.length === 0) return null;

    let pool;

    if(laneSpecific && !isAram){

      pool = getCandidateChampionsForRole(role, usedChampIds);

    } else {

      pool = LOL_DATA.champions.filter(c => !usedChampIds.has(c.id));

      if(pool.length === 0) pool = LOL_DATA.champions;

    }

    const chosen = pool[Math.floor(secureRandom() * pool.length)];

    if(chosen) usedChampIds.add(chosen.id);

    return chosen;

  }

  for(let i=0;i<per;i++){

    const r=isAram?`ARAM ${i+1}`:RIFT_ROLES[i];

    const c = pickChampForCustom(r);

    t1.push({role:r,player:sh[i],champ:c});

  }

  for(let i=0;i<per;i++){

    const r=isAram?`ARAM ${i+1}`:RIFT_ROLES[i];

    const c = pickChampForCustom(r);

    t2.push({role:r,player:sh[i+per],champ:c});

  }

  if(sh.length>active){

    const rem=sh.slice(active);

    if(nlb && rem.length===1 && per<5){

      const r = isAram?`ARAM ${per+1}`:"Sub";

      const c = pickChampForCustom(r);

      const e={role:r,player:rem[0],bonus:true,champ:c};

      if(secureRandom()<.5)t1.push(e);else t2.push(e);

    } else {

      spec.push(...rem);

    }

  }

  return{team1:t1,team2:t2,spectators:spec,perTeam:per,isAram,hasChamps:assignChamps};

}

function onToggleRandomChamps(){

  const assignChamps = document.getElementById("randomChampsCheck") && document.getElementById("randomChampsCheck").checked;

  const laneCheck = document.getElementById("laneChampsCustomCheck");

  if(!assignChamps && laneCheck){

    laneCheck.checked = false;

  }

  if(lastMatch){

    if(assignChamps){

      const laneSpecific = laneCheck && laneCheck.checked;

      const usedChampIds = new Set();

      lastMatch.team1.forEach(p => {

        let pool = (laneSpecific && !lastMatch.isAram) ? getCandidateChampionsForRole(p.role, usedChampIds) : LOL_DATA.champions.filter(c => !usedChampIds.has(c.id));

        if(pool.length === 0) pool = LOL_DATA.champions;

        p.champ = pool[Math.floor(secureRandom() * pool.length)];

        if(p.champ) usedChampIds.add(p.champ.id);

      });

      lastMatch.team2.forEach(p => {

        let pool = (laneSpecific && !lastMatch.isAram) ? getCandidateChampionsForRole(p.role, usedChampIds) : LOL_DATA.champions.filter(c => !usedChampIds.has(c.id));

        if(pool.length === 0) pool = LOL_DATA.champions;

        p.champ = pool[Math.floor(secureRandom() * pool.length)];

        if(p.champ) usedChampIds.add(p.champ.id);

      });

      lastMatch.hasChamps = true;

    } else {

      lastMatch.team1.forEach(p => delete p.champ);

      lastMatch.team2.forEach(p => delete p.champ);

      lastMatch.hasChamps = false;

    }

    renderMatch(lastMatch.team1, lastMatch.team2, lastMatch.spectators);

  }

}

function onToggleLaneChampsCustom(){

  const laneCheck = document.getElementById("laneChampsCustomCheck");

  const randomCheck = document.getElementById("randomChampsCheck");

  if(laneCheck && laneCheck.checked && randomCheck && !randomCheck.checked){

    randomCheck.checked = true;

  }

  if(lastMatch && randomCheck && randomCheck.checked){

    const laneSpecific = laneCheck && laneCheck.checked;

    const usedChampIds = new Set();

    lastMatch.team1.forEach(p => {

      let pool = (laneSpecific && !lastMatch.isAram) ? getCandidateChampionsForRole(p.role, usedChampIds) : LOL_DATA.champions.filter(c => !usedChampIds.has(c.id));

      if(pool.length === 0) pool = LOL_DATA.champions;

      p.champ = pool[Math.floor(secureRandom() * pool.length)];

      if(p.champ) usedChampIds.add(p.champ.id);

    });

    lastMatch.team2.forEach(p => {

      let pool = (laneSpecific && !lastMatch.isAram) ? getCandidateChampionsForRole(p.role, usedChampIds) : LOL_DATA.champions.filter(c => !usedChampIds.has(c.id));

      if(pool.length === 0) pool = LOL_DATA.champions;

      p.champ = pool[Math.floor(secureRandom() * pool.length)];

      if(p.champ) usedChampIds.add(p.champ.id);

    });

    renderMatch(lastMatch.team1, lastMatch.team2, lastMatch.spectators);

  }

}

function animateAndRandomize(){

  if(isShuffling)return;

  const data=parseActiveRoster();if(data.players.length<2){showToast("Enter at least 2 players");return;}

  isShuffling=true;const btn=document.getElementById("rollBtn");btn.innerText="Shuffling...";btn.style.opacity=".65";

  let step=0;const iv=setInterval(()=>{const t=randomizeMatch();if(t)renderMatch(t.team1,t.team2,t.spectators);step++;

    if(step>=8){clearInterval(iv);lastMatch=randomizeMatch();if(lastMatch)renderMatch(lastMatch.team1,lastMatch.team2,lastMatch.spectators);btn.innerText=isAram?"Randomize ARAM":"Randomize Teams";btn.style.opacity="1";isShuffling=false;if(lastMatch)showToast(`Teams set — ${lastMatch.team1.length}v${lastMatch.team2.length}`);}

  },40);

}

function onToggleTag(){updateStats();if(lastMatch)renderMatch(lastMatch.team1, lastMatch.team2, lastMatch.spectators);}

async function pasteChatClipboard(){try{const t=await navigator.clipboard.readText();if(t&&t.trim()){document.getElementById("chatInput").value=t;updateStats();animateAndRandomize();showToast("Pasted and randomized");}}catch{showToast("Paste directly into the box (Ctrl+V)");}}

async function pasteManualClipboard(){try{const t=await navigator.clipboard.readText();if(t&&t.trim()){document.getElementById("manualInput").value=t;updateStats();animateAndRandomize();showToast("Pasted and randomized");}}catch{showToast("Paste directly into the box (Ctrl+V)");}}


function renderEmptyInitialSlots(){

  function makeEmpty(id){

    const box=document.getElementById(id);if(!box)return;

    box.innerHTML="";

    for(let i=0;i<5;i++){

      const roleName=isAram?`ARAM ${i+1}`:RIFT_ROLES[i];

      const iconSrc=getRoleIcon(roleName);

      box.innerHTML+=`<div class="player-slot disabled"><div class="slot-role"><span class="role-badge disabled-badge"><img class="role-icon" src="${iconSrc}" alt="${roleName}"><span>${roleName}</span></span></div><div class="slot-player"><span class="player-name disabled-text">— Open Slot / Sub</span></div></div>`;

    }

  }

  makeEmpty("t1Container");

  makeEmpty("t2Container");

}

function resetDisplay(){

  renderEmptyInitialSlots();

  document.getElementById("specBody").innerHTML=`<span class="no-spec">No spectators</span>`;

  document.getElementById("specHeader").innerText="Spectators / Bench";

  document.getElementById("t1HeaderCount").innerText="— Players";

  document.getElementById("t2HeaderCount").innerText="— Players";

}

function clearChat(){document.getElementById("chatInput").value="";lastMatch=null;updateStats();resetDisplay();}

function clearManual(){document.getElementById("manualInput").value="";lastMatch=null;updateStats();resetDisplay();}


function copyDiscord(){

  if(!lastMatch){showToast("Randomize teams first");return;}

  const{team1,team2,spectators}=lastMatch;const t1=team1.length,t2=team2.length;

  let text=`**${isAram?"ARAM":"RIFT"} MATCH — ${t1}v${t2}**\n\n**BLUE TEAM (${t1})**\n`;

  team1.forEach(i=>text+=`  ${i.role}: ${i.player}${i.champ ? " ("+i.champ.name+")" : ""}${i.bonus?" [+]":""}\n`);

  text+=`\n**RED TEAM (${t2})**\n`;

  team2.forEach(i=>text+=`  ${i.role}: ${i.player}${i.champ ? " ("+i.champ.name+")" : ""}${i.bonus?" [+]":""}\n`);

  if(spectators.length>0)text+=`\nBench: ${spectators.join(", ")}`;

  copyContact(text,"Copied for Discord");

}


/* =========================================================================

   RANDOMIZER SUB-PAGES (Custom / Team / Solo) & ADVANCED GENERATORS

   ========================================================================= */

let currentRandomizerSubTab = 'custom';

function switchRandomizerSubTab(subTab){

  currentRandomizerSubTab = subTab;

  ['custom', 'team', 'solo'].forEach(t => {

    const btn = document.getElementById('subTab' + t.charAt(0).toUpperCase() + t.slice(1));

    const page = document.getElementById('subPage' + t.charAt(0).toUpperCase() + t.slice(1));

    if(btn) btn.classList.toggle('active', t === subTab);

    if(page) page.classList.toggle('active', t === subTab);

  });

  if(subTab === 'team' && (!teamSquad || teamSquad.length === 0)){

    initTeamRandomizerDefaults();

  }

  if(subTab === 'solo' && !soloState.champ){

    rollSoloChallenge();

  }

}

/* ==========================================

   TEAM RANDOMIZER LOGIC (1-5 Squad Members)

   ========================================== */

let teamSquad = [];

let isTeamAram = false;

let teamTarget = 'both'; // 'both', 'roles', 'champs'

let isTeamShuffling = false;

function setTeamMode(aram){

  isTeamAram = aram;

  document.getElementById("btnTeamModeRift").classList.toggle("active", !aram);

  document.getElementById("btnTeamModeAram").classList.toggle("active", aram);

  if(teamSquad && teamSquad.length > 0){

    teamSquad.forEach((s, i) => {

      s.role = isTeamAram ? `ARAM ${i+1}` : (RIFT_ROLES[i] || `Slot ${i+1}`);

    });

    renderTeamSquad();

  }

}

function setTeamTarget(target){

  teamTarget = target;

  ['both', 'roles', 'champs'].forEach(t => {

    const btn = document.getElementById("btnTeamTarget" + t.charAt(0).toUpperCase() + t.slice(1));

    if(btn) btn.classList.toggle("active", t === target);

  });

}

function getTeamPlayerInputs(){

  const players = [];

  for(let i=0; i<5; i++){

    const el = document.getElementById("squadInput" + i);

    if(el && el.value.trim()) players.push(el.value.trim());

  }

  return players;

}

function initTeamRandomizerDefaults(){

  const existing = getTeamPlayerInputs();

  if(existing.length === 0){

    const chatRoster = parseActiveRoster();

    if(chatRoster && chatRoster.players && chatRoster.players.length > 0){

      chatRoster.players.slice(0, 5).forEach((p, idx) => {

        const inp = document.getElementById("squadInput" + idx);

        if(inp) inp.value = p;

      });

    }

  }

  randomizeTeamSquad(false);

}

function updateTeamSquadFromInputs(){

  const inputs = getTeamPlayerInputs();

  if(!teamSquad || teamSquad.length === 0 || inputs.length !== teamSquad.length){

    randomizeTeamSquad(false);

  } else {

    teamSquad = inputs.map((name, i) => {

      const prev = teamSquad[i];

      return {

        player: name,

        role: prev ? prev.role : (isTeamAram ? `ARAM ${i+1}` : (RIFT_ROLES[i] || `Slot ${i+1}`)),

        champ: prev ? prev.champ : (LOL_DATA.champions ? LOL_DATA.champions[i % LOL_DATA.champions.length] : null)

      };

    });

    renderTeamSquad();

  }

}

function randomizeTeamSquad(isAnimate = true){

  const rawPlayers = getTeamPlayerInputs();

  if(rawPlayers.length === 0){

    if(isAnimate) showToast("Enter at least 1 player in the squad");

    renderEmptyTeamSquad();

    return;

  }

  const count = rawPlayers.length;

  const roles = isTeamAram 

    ? Array.from({length: count}, (_, i) => `ARAM ${i+1}`)

    : RIFT_ROLES.slice(0, count);

  const laneSpecific = document.getElementById("laneChampsTeamCheck") && document.getElementById("laneChampsTeamCheck").checked;

  const usedChampIds = new Set();

  function pickChampForTeamSlot(role){

    if(!LOL_DATA.champions || LOL_DATA.champions.length === 0) return null;

    let pool;

    if(laneSpecific && !isTeamAram){

      pool = getCandidateChampionsForRole(role, usedChampIds);

    } else {

      pool = LOL_DATA.champions.filter(c => !usedChampIds.has(c.id));

      if(pool.length === 0) pool = LOL_DATA.champions;

    }

    const chosen = pool[Math.floor(secureRandom() * pool.length)];

    if(chosen) usedChampIds.add(chosen.id);

    return chosen;

  }

  let newSquad = [];

  if(teamTarget === 'both'){

    const shuffledPlayers = shuffle(rawPlayers);

    newSquad = shuffledPlayers.map((p, i) => {

      const r = roles[i] || `Slot ${i+1}`;

      const c = pickChampForTeamSlot(r);

      return { player: p, role: r, champ: c };

    });

  } else if(teamTarget === 'roles'){

    const shuffledPlayers = shuffle(rawPlayers);

    newSquad = shuffledPlayers.map((p, i) => {

      const oldSlot = teamSquad.find(s => s.player.toLowerCase() === p.toLowerCase());

      const r = roles[i] || `Slot ${i+1}`;

      let c = oldSlot ? oldSlot.champ : null;

      if(laneSpecific && !isTeamAram && c && Array.isArray(c.lanes)){

        const targetLane = getTargetLaneFromRole(r);

        if(targetLane && !c.lanes.includes(targetLane)){

          c = pickChampForTeamSlot(r);

        } else if(c){

          usedChampIds.add(c.id);

        }

      } else if(c){

        usedChampIds.add(c.id);

      } else {

        c = pickChampForTeamSlot(r);

      }

      return { player: p, role: r, champ: c };

    });

  } else if(teamTarget === 'champs'){

    newSquad = rawPlayers.map((p, i) => {

      const oldSlot = teamSquad[i];

      const r = oldSlot ? oldSlot.role : (roles[i] || `Slot ${i+1}`);

      const c = pickChampForTeamSlot(r);

      return { player: p, role: r, champ: c };

    });

  }

  teamSquad = newSquad;

  renderTeamSquad();

}

function onToggleLaneChampsTeam(){

  if(teamSquad && teamSquad.length > 0){

    const laneSpecific = document.getElementById("laneChampsTeamCheck") && document.getElementById("laneChampsTeamCheck").checked;

    if(laneSpecific && !isTeamAram){

      const usedChampIds = new Set();

      teamSquad.forEach(s => {

        let pool = getCandidateChampionsForRole(s.role, usedChampIds);

        s.champ = pool[Math.floor(secureRandom() * pool.length)];

        if(s.champ) usedChampIds.add(s.champ.id);

      });

      renderTeamSquad();

      showToast("Assigned lane-specific champions to squad");

    }

  }

}

function animateAndRandomizeTeam(){

  if(isTeamShuffling) return;

  const rawPlayers = getTeamPlayerInputs();

  if(rawPlayers.length === 0){

    showToast("Enter at least 1 player");

    return;

  }

  isTeamShuffling = true;

  const btn = document.getElementById("btnRollTeam");

  btn.innerText = "Shuffling...";

  btn.style.opacity = ".65";

  let step = 0;

  const iv = setInterval(() => {

    randomizeTeamSquad(false);

    step++;

    if(step >= 6){

      clearInterval(iv);

      randomizeTeamSquad(false);

      btn.innerText = "Randomize Team";

      btn.style.opacity = "1";

      isTeamShuffling = false;

      showToast(`Squad randomized (${teamSquad.length} Players)`);

    }

  }, 45);

}

function rerollTeamSlotChamp(index){

  if(!teamSquad || !teamSquad[index] || !LOL_DATA.champions) return;

  const laneSpecific = document.getElementById("laneChampsTeamCheck") && document.getElementById("laneChampsTeamCheck").checked;

  const usedChampIds = new Set(teamSquad.filter((s, i) => i !== index && s.champ).map(s => s.champ.id));

  let pool;

  if(laneSpecific && !isTeamAram){

    pool = getCandidateChampionsForRole(teamSquad[index].role, usedChampIds);

  } else {

    pool = LOL_DATA.champions.filter(c => !usedChampIds.has(c.id) && c.id !== teamSquad[index].champ?.id);

    if(pool.length === 0) pool = LOL_DATA.champions;

  }

  teamSquad[index].champ = pool[Math.floor(secureRandom() * pool.length)];

  renderTeamSquad();

  showToast(`Rerolled ${teamSquad[index].player}'s champion: ${teamSquad[index].champ.name}`);

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

function renderEmptyTeamSquad(){

  const container = document.getElementById("teamSquadContainer");

  const countHeader = document.getElementById("teamSquadHeaderCount");

  if(countHeader) countHeader.innerText = "0 Players";

  if(container) container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--grey-2);font-style:italic;font-size:.84rem;">Enter squad members on the left and click "Randomize Team".</div>`;

}

function renderTeamSquad(){

  const container = document.getElementById("teamSquadContainer");

  const countHeader = document.getElementById("teamSquadHeaderCount");

  if(!container) return;

  if(!teamSquad || teamSquad.length === 0){

    renderEmptyTeamSquad();

    return;

  }

  if(countHeader) countHeader.innerText = `${teamSquad.length} Player${teamSquad.length !== 1 ? "s" : ""}`;

  container.innerHTML = "";

  const strip = document.getElementById("teamStripTagsCheck") && document.getElementById("teamStripTagsCheck").checked;

  teamSquad.forEach((s, idx) => {

    let displayName = s.player;

    if(strip) displayName = displayName.replace(/\s*#\S+$/,"").trim() || displayName;

    const iconSrc = getRoleIcon(s.role);

    const bc = isTeamAram ? "role-badge aram-badge" : "role-badge";

    let champHtml = "";

    if(s.champ){

      const cIcon = getChampionIconUrl(s.champ.name, s.champ.key || s.champ.id);

      const cFallback = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${getChampionInternalKey(s.champ.name || s.champ.id)}.png`;

      champHtml = `<div class="slot-champ-pill" title="${escapeHtml(s.champ.title||'')}"><img class="slot-champ-img" src="${cIcon}" alt="${escapeHtml(s.champ.name)}" onerror="this.src='${cFallback}'"/><span>${escapeHtml(s.champ.name)}</span></div>`;

    } else {

      champHtml = `<span style="color:var(--grey-2);font-size:.75rem;font-style:italic;">No Champion</span>`;

    }

    container.innerHTML += `

      <div class="player-slot" style="grid-template-columns: 126px 1fr auto 36px;">

        <div class="slot-role">

          <span class="${bc}">

            <img class="role-icon" src="${iconSrc}" alt="${s.role}">

            <span>${s.role}</span>

          </span>

        </div>

        <div class="slot-player">

          <span class="player-name" title="${escapeHtml(s.player)}">${escapeHtml(displayName)}</span>

        </div>

        <div>${champHtml}</div>

        <div style="text-align:center;">

          <button class="slot-reroll-btn" onclick="rerollTeamSlotChamp(${idx})" title="Reroll this champion">

            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>

          </button>

        </div>

      </div>

    `;

  });

}

async function pasteTeamClipboard(){

  try {

    const text = await navigator.clipboard.readText();

    if(text && text.trim()){

      const lines = text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

      clearTeamInputs();

      lines.slice(0, 5).forEach((p, idx) => {

        const inp = document.getElementById("squadInput" + idx);

        if(inp) inp.value = p;

      });

      animateAndRandomizeTeam();

      showToast("Pasted and randomized squad");

    }

  } catch {

    showToast("Paste directly into player boxes");

  }

}

function clearTeamInputs(){

  for(let i=0; i<5; i++){

    const inp = document.getElementById("squadInput" + i);

    if(inp) inp.value = "";

  }

  teamSquad = [];

  renderEmptyTeamSquad();

}

function copyTeamDiscord(){

  if(!teamSquad || teamSquad.length === 0){

    showToast("Randomize squad first");

    return;

  }

  const modeName = isTeamAram ? "ARAM" : "SUMMONER'S RIFT";

  let text = `**TEAM SQUAD — ${teamSquad.length} Players (${modeName})**\n\n`;

  teamSquad.forEach(s => {

    text += `  **${s.role}**: ${s.player}${s.champ ? " (" + s.champ.name + ")" : ""}\n`;

  });

  copyContact(text, "Squad copied for Discord");

}

