/* ==========================================

   SOLO RANDOMIZER LOGIC (Ultimate Challenge)

   ========================================== */

let soloMode = false; // false = Rift, true = ARAM

let soloState = {

  champ: null,

  role: "Mid",

  runes: null,

  items: null,

  spells: null

};

function setSoloMode(isAram){

  if(soloMode === isAram) return;

  soloMode = isAram;

  document.getElementById("soloModeRift").classList.toggle("active", !isAram);

  document.getElementById("soloModeAram").classList.toggle("active", isAram);

  if(!soloState.champ){

    rollSoloChallenge();

    return;

  }

  if(soloMode){

    soloState.role = "ARAM";

  } else {

    soloState.role = RIFT_ROLES[Math.floor(secureRandom() * RIFT_ROLES.length)];

  }

  adaptSoloStarterAndItems();

  adaptSoloSpells();

  renderSoloChallenge();

  showToast(`Switched mode to ${isAram ? 'ARAM' : "Summoner's Rift"}`);

}

function adaptSoloStarterAndItems(){

  if(!soloState.items){

    rollSoloItemsLogic();

    return;

  }

  const isJungle = (!soloMode && soloState.role === 'Jungle');

  const isSupport = (!soloMode && soloState.role === 'Support');

  const curStarter = soloState.items.starter;

  let needNewStarter = false;

  if(soloMode){

    if(!curStarter || curStarter.mode !== 'aram') needNewStarter = true;

  } else if(isJungle){

    if(!curStarter || curStarter.role !== 'Jungle') needNewStarter = true;

  } else if(isSupport){

    if(!curStarter || curStarter.role !== 'Support') needNewStarter = true;

  } else {

    if(!curStarter || curStarter.mode !== 'rift' || curStarter.role) needNewStarter = true;

  }

  if(needNewStarter){

    let validStarters = LOL_DATA.starters.filter(s => {

      if(soloMode) return s.mode === 'aram' || s.mode === 'both';

      if(isJungle) return s.role === 'Jungle';

      if(isSupport) return s.role === 'Support';

      return s.mode === 'rift' && !s.role;

    });

    if(validStarters.length > 0){

      soloState.items.starter = validStarters[Math.floor(secureRandom() * validStarters.length)];

    }

  }

  const targetCoreCount = isSupport ? 4 : 5;

  let core = soloState.items.coreItems || [];

  if(core.length > targetCoreCount){

    soloState.items.coreItems = core.slice(0, targetCoreCount);

  } else if(core.length < targetCoreCount){

    const usedIds = new Set(core.map(i => i.id));

    const available = LOL_DATA.items.filter(i => !usedIds.has(i.id));

    while(core.length < targetCoreCount && available.length > 0){

      const picked = available.splice(Math.floor(secureRandom() * available.length), 1)[0];

      core.push(picked);

      usedIds.add(picked.id);

    }

    soloState.items.coreItems = core;

  }

}

function adaptSoloSpells(){

  if(!soloState.spells || soloState.spells.length < 2){

    rollSoloSpellsLogic();

    return;

  }

  const isJungle = (!soloMode && soloState.role === 'Jungle');

  const validSpells = LOL_DATA.spells.filter(s => soloMode ? (s.mode === 'aram' || s.mode === 'both') : (s.mode === 'rift' || s.mode === 'both'));

  const smite = LOL_DATA.spells.find(s => s.id === 'SummonerSmite');

  const flash = LOL_DATA.spells.find(s => s.id === 'SummonerFlash') || validSpells[0];

  let s1 = soloState.spells[0];

  let s2 = soloState.spells[1];

  if(soloMode){

    if(s1.id === 'SummonerSmite' || s1.id === 'SummonerTeleport'){

      s1 = validSpells.find(s => s.id !== s2.id && (s.id === 'SummonerSnowball' || s.id === 'SummonerFlash')) || validSpells[0];

    }

    if(s2.id === 'SummonerSmite' || s2.id === 'SummonerTeleport' || s2.id === s1.id){

      s2 = validSpells.find(s => s.id !== s1.id) || validSpells[1];

    }

  } else if(isJungle){

    if(s1.id !== 'SummonerSmite'){

      if(s2.id === 'SummonerSmite'){

        s2 = s1;

        s1 = smite || s2;

      } else {

        s1 = smite || flash;

      }

    }

    if(s2.id === 'SummonerSmite'){

      s2 = validSpells.find(s => s.id !== 'SummonerSmite' && s.id !== s1.id) || flash;

    }

  } else {

    if(s1.id === 'SummonerSmite' || s1.id === 'SummonerSnowball'){

      s1 = (s2.id === flash.id) ? (validSpells.find(s => s.id === 'SummonerDot' || (s.id !== 'SummonerSmite' && s.id !== s2.id)) || validSpells[0]) : flash;

    }

    if(s2.id === 'SummonerSmite' || s2.id === 'SummonerSnowball' || s2.id === s1.id){

      s2 = validSpells.find(s => s.id !== 'SummonerSmite' && s.id !== 'SummonerSnowball' && s.id !== s1.id) || validSpells[1];

    }

  }

  soloState.spells = [s1, s2];

}


/* ==========================================

   ANTI-REPEAT / SMART SHUFFLE ENGINE

   ========================================== */

let antiRepeatEnabled = (function(){

  try {

    const val = localStorage.getItem("loc_anti_repeat");

    return val !== "false";

  } catch(e){

    return true;

  }

})();

const antiRepeatHistory = {

  champions: [],

  starters: [],

  boots: [],

  coreItems: [],

  primaryTrees: [],

  keystones: [],

  secondaryTrees: [],

  minorRunes: [],

  shards: {

    offense: null,

    flex: null,

    defense: null

  },

  spells: []

};

function toggleAntiRepeat(){

  antiRepeatEnabled = !antiRepeatEnabled;

  try {

    localStorage.setItem("loc_anti_repeat", antiRepeatEnabled ? "true" : "false");

  } catch(e){}

  updateAntiRepeatUI();

  showToast(antiRepeatEnabled ? "🛡️ Anti-Repeat: ON (Prevents duplicate streaks)" : "🎲 Anti-Repeat: OFF (Pure memoryless random)");

}

function updateAntiRepeatUI(){

  const btn = document.getElementById("btnAntiRepeat");

  if(btn){

    btn.classList.toggle("active", antiRepeatEnabled);

    btn.innerHTML = antiRepeatEnabled ? `

      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

      <span>Anti-Repeat: ON</span>

    ` : `

      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>

      <span>Anti-Repeat: OFF</span>

    `;

    btn.title = antiRepeatEnabled ? "Anti-Repeat is Active: Prevents back-to-back duplicate items, boots, runes, and champions" : "Anti-Repeat is Disabled: Pure memoryless random";

  }

}

function rollSoloChallenge(commitHistory = true){

  if(LOL_DATA.champions && LOL_DATA.champions.length > 0){

    let champPool = LOL_DATA.champions;

    if(antiRepeatEnabled && antiRepeatHistory.champions.length > 0){

      const filtered = champPool.filter(c => !antiRepeatHistory.champions.includes(c.id));

      if(filtered.length > 0) champPool = filtered;

    }

    soloState.champ = champPool[Math.floor(secureRandom() * champPool.length)];

    if(antiRepeatEnabled && commitHistory && soloState.champ){

      antiRepeatHistory.champions.push(soloState.champ.id);

      if(antiRepeatHistory.champions.length > 8) antiRepeatHistory.champions.shift();

    }

  }

  if(soloMode){

    soloState.role = "ARAM";

  } else {

    soloState.role = RIFT_ROLES[Math.floor(secureRandom() * RIFT_ROLES.length)];

  }

  rollSoloRunesLogic(commitHistory);

  rollSoloItemsLogic(commitHistory);

  rollSoloSpellsLogic(commitHistory);

  renderSoloChallenge();

}


function rollSoloRunesLogic(commitHistory = true){

  if(!LOL_DATA.runes || LOL_DATA.runes.length < 2) return;

  let availableTrees = LOL_DATA.runes;

  if(antiRepeatEnabled && antiRepeatHistory.primaryTrees.length > 0){

    const filtered = availableTrees.filter(t => !antiRepeatHistory.primaryTrees.includes(t.id));

    if(filtered.length >= 2) availableTrees = filtered;

  }

  const trees = shuffle(availableTrees);

  const primaryTree = trees[0];

  // Secondary tree: cannot be primaryTree, and avoid recent secondary trees

  let availableSec = LOL_DATA.runes.filter(t => t.id !== primaryTree.id);

  if(antiRepeatEnabled && antiRepeatHistory.secondaryTrees.length > 0){

    const filteredSec = availableSec.filter(t => !antiRepeatHistory.secondaryTrees.includes(t.id));

    if(filteredSec.length > 0) availableSec = filteredSec;

  }

  const secondaryTree = shuffle(availableSec)[0];

  // Keystone: avoid recent keystones

  let availableKeystones = primaryTree.keystones;

  if(antiRepeatEnabled && antiRepeatHistory.keystones.length > 0){

    const filteredK = availableKeystones.filter(k => !antiRepeatHistory.keystones.includes(k.id));

    if(filteredK.length > 0) availableKeystones = filteredK;

  }

  const keystone = availableKeystones[Math.floor(secureRandom() * availableKeystones.length)];

  // Primary Minors: 1 from each slot, avoiding minor runes from recent history where alternatives exist

  const primaryMinors = primaryTree.slots.map(slot => {

    let pool = slot;

    if(antiRepeatEnabled && antiRepeatHistory.minorRunes.length > 0){

      const filteredM = pool.filter(r => !antiRepeatHistory.minorRunes.includes(r.id));

      if(filteredM.length > 0) pool = filteredM;

    }

    return pool[Math.floor(secureRandom() * pool.length)];

  });

  // Secondary Minors: 2 slots from secondary tree

  const shuffledSecSlots = shuffle(secondaryTree.slots);

  const secMinors = [shuffledSecSlots[0], shuffledSecSlots[1]].map(slot => {

    let pool = slot;

    if(antiRepeatEnabled && antiRepeatHistory.minorRunes.length > 0){

      const filteredM = pool.filter(r => !antiRepeatHistory.minorRunes.includes(r.id));

      if(filteredM.length > 0) pool = filteredM;

    }

    return pool[Math.floor(secureRandom() * pool.length)];

  });

  // Shards: offense, flex, defense, avoiding previous shards if possible

  const pickShard = (category, pool) => {

    let available = pool;

    if(antiRepeatEnabled && antiRepeatHistory.shards && antiRepeatHistory.shards[category]){

      const filtered = available.filter(s => s.id !== antiRepeatHistory.shards[category]);

      if(filtered.length > 0) available = filtered;

    }

    return available[Math.floor(secureRandom() * available.length)];

  };

  const shards = {

    offense: pickShard('offense', LOL_DATA.shards.offense),

    flex: pickShard('flex', LOL_DATA.shards.flex),

    defense: pickShard('defense', LOL_DATA.shards.defense)

  };

  if(antiRepeatEnabled && commitHistory){

    if(primaryTree){

      antiRepeatHistory.primaryTrees.push(primaryTree.id);

      if(antiRepeatHistory.primaryTrees.length > 2) antiRepeatHistory.primaryTrees.shift();

    }

    if(keystone){

      antiRepeatHistory.keystones.push(keystone.id);

      if(antiRepeatHistory.keystones.length > 4) antiRepeatHistory.keystones.shift();

    }

    if(secondaryTree){

      antiRepeatHistory.secondaryTrees.push(secondaryTree.id);

      if(antiRepeatHistory.secondaryTrees.length > 2) antiRepeatHistory.secondaryTrees.shift();

    }

    antiRepeatHistory.minorRunes = [

      ...primaryMinors.map(r => r.id),

      ...secMinors.map(r => r.id)

    ];

    antiRepeatHistory.shards = {

      offense: shards.offense.id,

      flex: shards.flex.id,

      defense: shards.defense.id

    };

  }

  soloState.runes = {

    primaryTree,

    keystone,

    primaryMinors,

    secondaryTree,

    secMinors,

    shards

  };

}

function rollSoloItemsLogic(commitHistory = true){

  const isJungle = (!soloMode && soloState.role === 'Jungle');

  const isSupport = (!soloMode && soloState.role === 'Support');

  let validStarters = LOL_DATA.starters.filter(s => {

    if(soloMode) return s.mode === 'aram' || s.mode === 'both';

    if(isJungle) return s.role === 'Jungle';

    if(isSupport) return s.role === 'Support';

    return s.mode === 'rift' && !s.role;

  });

  if(validStarters.length === 0) validStarters = LOL_DATA.starters;

  

  let starterPool = validStarters;

  if(antiRepeatEnabled && antiRepeatHistory.starters.length > 0){

    const filteredStarters = starterPool.filter(s => !antiRepeatHistory.starters.includes(s.id));

    if(filteredStarters.length > 0) starterPool = filteredStarters;

  }

  const starter = starterPool[Math.floor(secureRandom() * starterPool.length)];

  let bootsPool = LOL_DATA.boots;

  if(antiRepeatEnabled && antiRepeatHistory.boots.length > 0){

    const filteredBoots = bootsPool.filter(b => !antiRepeatHistory.boots.includes(b.id));

    if(filteredBoots.length > 0) bootsPool = filteredBoots;

  }

  const boots = bootsPool[Math.floor(secureRandom() * bootsPool.length)];

  const targetCoreCount = isSupport ? 4 : 5;

  let itemsPool = LOL_DATA.items;

  if(antiRepeatEnabled && antiRepeatHistory.coreItems.length > 0){

    const filteredItems = itemsPool.filter(it => !antiRepeatHistory.coreItems.includes(it.id));

    if(filteredItems.length >= targetCoreCount * 2) itemsPool = filteredItems;

  }

  const shuffledItems = shuffle(itemsPool);

  const coreItems = shuffledItems.slice(0, targetCoreCount);

  if(antiRepeatEnabled && commitHistory){

    if(starter){

      antiRepeatHistory.starters.push(starter.id);

      if(antiRepeatHistory.starters.length > 2) antiRepeatHistory.starters.shift();

    }

    if(boots){

      antiRepeatHistory.boots.push(boots.id);

      if(antiRepeatHistory.boots.length > 2) antiRepeatHistory.boots.shift();

    }

    if(coreItems.length > 0){

      coreItems.forEach(it => antiRepeatHistory.coreItems.push(it.id));

      while(antiRepeatHistory.coreItems.length > 15){

        antiRepeatHistory.coreItems.shift();

      }

    }

  }

  soloState.items = {

    starter,

    boots,

    coreItems

  };

}

function rollSoloSpellsLogic(commitHistory = true){

  let s1, s2;

  const validSpells = LOL_DATA.spells.filter(s => soloMode ? (s.mode === 'aram' || s.mode === 'both') : (s.mode === 'rift' || s.mode === 'both'));

  if(!soloMode && soloState.role === 'Jungle'){

    s1 = LOL_DATA.spells.find(s => s.id === 'SummonerSmite') || validSpells[0];

    let nonSmite = validSpells.filter(s => s.id !== 'SummonerSmite');

    if(antiRepeatEnabled && antiRepeatHistory.spells.length > 0){

      const filtered = nonSmite.filter(s => !antiRepeatHistory.spells.includes(s.id));

      if(filtered.length > 0) nonSmite = filtered;

    }

    s2 = nonSmite[Math.floor(secureRandom() * nonSmite.length)];

  } else {

    let nonSmite = validSpells.filter(s => s.id !== 'SummonerSmite');

    let sh = shuffle(nonSmite);

    if(antiRepeatEnabled && antiRepeatHistory.spells.length > 0 && sh.length >= 3){

      const filtered = sh.filter(s => !antiRepeatHistory.spells.includes(s.id));

      if(filtered.length >= 2){

        s1 = filtered[0];

        s2 = filtered[1];

      } else if(filtered.length === 1){

        s1 = filtered[0];

        s2 = sh.find(s => s.id !== s1.id);

      } else {

        s1 = sh[0];

        s2 = sh[1];

      }

    } else {

      s1 = sh[0];

      s2 = sh[1];

    }

  }

  if(antiRepeatEnabled && commitHistory && s1 && s2){

    antiRepeatHistory.spells = [s1.id, s2.id];

  }

  soloState.spells = [s1, s2];

}

function rerollSoloChamp(){

  if(LOL_DATA.champions && LOL_DATA.champions.length > 0){

    let pool = LOL_DATA.champions.filter(c => c.id !== soloState.champ?.id);

    if(antiRepeatEnabled && antiRepeatHistory.champions.length > 0){

      const filtered = pool.filter(c => !antiRepeatHistory.champions.includes(c.id));

      if(filtered.length > 0) pool = filtered;

    }

    soloState.champ = pool[Math.floor(secureRandom() * pool.length)];

    if(antiRepeatEnabled && soloState.champ){

      antiRepeatHistory.champions.push(soloState.champ.id);

      if(antiRepeatHistory.champions.length > 8) antiRepeatHistory.champions.shift();

    }

    renderSoloChallenge();

    showToast(`Rerolled Champion: ${soloState.champ.name}`);

  }

}

function rerollSoloRole(){

  if(soloMode){

    showToast("Role is ARAM in Howling Abyss");

    return;

  }

  const pool = RIFT_ROLES.filter(r => r !== soloState.role);

  soloState.role = pool[Math.floor(secureRandom() * pool.length)];

  // Only adapt role-dependent starter and spells without rerolling champ, runes, or items!

  adaptSoloStarterAndItems();

  adaptSoloSpells();

  renderSoloChallenge();

  showToast(`Rerolled Role: ${soloState.role}`);

}

function rerollSoloRunes(){

  rollSoloRunesLogic(true);

  renderSoloChallenge();

  showToast("Rerolled Runes");

}

function rerollSoloItems(){

  rollSoloItemsLogic(true);

  renderSoloChallenge();

  showToast("Rerolled Item Build");

}

function rerollSoloSpells(){

  rollSoloSpellsLogic(true);

  renderSoloChallenge();

  showToast("Rerolled Summoner Spells");

}


function animateAndRollSolo(){

  const btn = document.getElementById("btnSoloRollAll");

  if(btn) btn.style.opacity = ".65";

  let step = 0;

  const iv = setInterval(() => {

    // Intermediate animation: visual roll only, DO NOT overwrite user's anti-repeat history!

    rollSoloChallenge(false);

    step++;

    if(step >= 6){

      clearInterval(iv);

      // Final roll: apply full anti-repeat logic and commit to history

      rollSoloChallenge(true);

      if(btn) btn.style.opacity = "1";

      showToast("Ultimate Challenge Ready!");

    }

  }, 50);

}

function renderSoloChallenge(){

  if(!soloState.champ) return;

  const avatarImg = document.getElementById("soloChampAvatar");

  const roleIcon = document.getElementById("soloRoleIcon");

  const roleText = document.getElementById("soloRoleText");

  const champName = document.getElementById("soloChampName");

  const champTitle = document.getElementById("soloChampTitle");

  const champTags = document.getElementById("soloChampTags");

  const c = soloState.champ;

  if(avatarImg){

    const cKey = getChampionInternalKey(c.name || c.id);

    avatarImg.src = getChampionIconUrl(c.name, c.key || c.id);

    avatarImg.alt = c.name;

    avatarImg.onerror = function(){

      if(this.src.indexOf('communitydragon') !== -1){

        this.src = `https://ddragon.leagueoflegends.com/cdn/16.18.1/img/champion/${cKey}.png`;

      } else if(this.src.indexOf('ddragon') !== -1){

        this.src = `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${cKey}.png`;

      }

    };

  }

  if(roleIcon) roleIcon.src = getRoleIcon(soloState.role);

  if(roleText) roleText.innerText = soloState.role;

  if(champName){ champName.innerText = c.name; champName.title = c.name; }

  if(champTitle){ const t = c.title ? `the ${c.title.replace(/^the\s+/i, '')}` : ""; champTitle.innerText = t; champTitle.title = t; }

  if(champTags) champTags.innerHTML = (c.roles || []).join(' &bull; ');

  const runesBox = document.getElementById("soloRunesContent");

  if(runesBox && soloState.runes){

    const r = soloState.runes;

    const primIcon = `https://ddragon.leagueoflegends.com/cdn/img/${r.primaryTree.icon}`;

    const secIcon = `https://ddragon.leagueoflegends.com/cdn/img/${r.secondaryTree.icon}`;

    const ksIcon = `https://ddragon.leagueoflegends.com/cdn/img/${r.keystone.icon}`;

    let primMinorsHtml = "";

    r.primaryMinors.forEach(m => {

      primMinorsHtml += `

        <div class="rune-minor-row">

          <img class="rune-minor-icon" src="https://ddragon.leagueoflegends.com/cdn/img/${m.icon}" alt="${escapeHtml(m.name)}" />

          <span class="rune-minor-name">${escapeHtml(m.name)}</span>

        </div>

      `;

    });

    let secMinorsHtml = "";

    r.secMinors.forEach(m => {

      secMinorsHtml += `

        <div class="rune-minor-row">

          <img class="rune-minor-icon" src="https://ddragon.leagueoflegends.com/cdn/img/${m.icon}" alt="${escapeHtml(m.name)}" />

          <span class="rune-minor-name">${escapeHtml(m.name)}</span>

        </div>

      `;

    });

    runesBox.innerHTML = `

      <div class="rune-tree-column">

        <div class="rune-tree-head">

          <img class="rune-tree-icon" src="${primIcon}" alt="${r.primaryTree.name}"/>

          <span>${r.primaryTree.name} (Primary)</span>

        </div>

        <div class="rune-keystone-row">

          <img class="rune-keystone-icon" src="${ksIcon}" alt="${r.keystone.name}"/>

          <span class="rune-keystone-name">${r.keystone.name}</span>

        </div>

        <div class="rune-minors-list">

          ${primMinorsHtml}

        </div>

      </div>

      <div class="rune-tree-column">

        <div class="rune-tree-head">

          <img class="rune-tree-icon" src="${secIcon}" alt="${r.secondaryTree.name}"/>

          <span>${r.secondaryTree.name} (Secondary)</span>

        </div>

        <div class="rune-minors-list">

          ${secMinorsHtml}

        </div>

        <div class="rune-shards-title">Stat Shards</div>

        <div class="rune-shards-list">

          <div class="rune-shard-row">

            <div class="rune-shard-icon-wrap">

              <img class="rune-shard-icon" src="${getStatShardIcon(r.shards.offense.id)}" alt="${escapeHtml(r.shards.offense.name)}"/>

            </div>

            <span class="rune-shard-type">Offense</span>

            <span class="rune-shard-val">${escapeHtml(r.shards.offense.name)}</span>

          </div>

          <div class="rune-shard-row">

            <div class="rune-shard-icon-wrap">

              <img class="rune-shard-icon" src="${getStatShardIcon(r.shards.flex.id)}" alt="${escapeHtml(r.shards.flex.name)}"/>

            </div>

            <span class="rune-shard-type">Flex</span>

            <span class="rune-shard-val">${escapeHtml(r.shards.flex.name)}</span>

          </div>

          <div class="rune-shard-row">

            <div class="rune-shard-icon-wrap">

              <img class="rune-shard-icon" src="${getStatShardIcon(r.shards.defense.id)}" alt="${escapeHtml(r.shards.defense.name)}"/>

            </div>

            <span class="rune-shard-type">Defense</span>

            <span class="rune-shard-val">${escapeHtml(r.shards.defense.name)}</span>

          </div>

        </div>

      </div>

    `;

  }

  const itemsBox = document.getElementById("soloItemsGrid");

  if(itemsBox && soloState.items){

    const it = soloState.items;

    let itemsHtml = `

      <div class="solo-item-card starter">

        <span class="solo-item-type-tag">Starter</span>

        <img class="solo-item-img" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${it.starter.id}.png" alt="${escapeHtml(it.starter.name)}"/>

        <span class="solo-item-name">${escapeHtml(it.starter.name)}</span>

      </div>

      <div class="solo-item-card boots">

        <span class="solo-item-type-tag">Boots</span>

        <img class="solo-item-img" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${it.boots.id}.png" alt="${escapeHtml(it.boots.name)}"/>

        <span class="solo-item-name">${escapeHtml(it.boots.name)}</span>

      </div>

    `;

    it.coreItems.forEach((item, idx) => {

      itemsHtml += `

        <div class="solo-item-card">

          <span class="solo-item-type-tag">Core Item ${idx+1}</span>

          <img class="solo-item-img" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/item/${item.id}.png" alt="${escapeHtml(item.name)}"/>

          <span class="solo-item-name">${escapeHtml(item.name)}</span>

        </div>

      `;

    });

    itemsBox.innerHTML = itemsHtml;

  }

  const spellsBox = document.getElementById("soloSpellsBox");

  if(spellsBox && soloState.spells && soloState.spells.length >= 2){

    spellsBox.innerHTML = soloState.spells.map((s, idx) => `

      <div class="solo-spell-card">

        <img class="solo-spell-img" src="https://ddragon.leagueoflegends.com/cdn/16.18.1/img/spell/${s.id}.png" alt="${escapeHtml(s.name)}"/>

        <div>

          <div style="font-size:.56rem;color:var(--gold-2);font-family:'Cinzel',serif;font-weight:700;line-height:1.1;letter-spacing:.5px;">SPELL ${idx+1}</div>

          <div class="solo-spell-name">${escapeHtml(s.name)}</div>

        </div>

      </div>

    `).join("");

  }

}

function copySoloDiscord(){

  if(!soloState.champ){

    showToast("Roll challenge first");

    return;

  }

  const c = soloState.champ;

  const r = soloState.runes;

  const it = soloState.items;

  const sp = soloState.spells;

  let text = `**SOLO CHALLENGE — ${c.name} (${soloState.role})**\n\n`;

  text += `**Role**: ${soloState.role}\n`;

  text += `**Champion**: ${c.name}, ${c.title}\n`;

  if(r){

    const pMinors = r.primaryMinors.map(m => m.name).join(", ");

    const sMinors = r.secMinors.map(m => m.name).join(", ");

    text += `**Runes**: ${r.primaryTree.name} (${r.keystone.name}, ${pMinors}) + ${r.secondaryTree.name} (${sMinors})\n`;

    text += `**Shards**: ${r.shards.offense.name} / ${r.shards.flex.name} / ${r.shards.defense.name}\n`;

  }

  if(it){

    const core = it.coreItems.map(i => i.name).join(", ");

    text += `**Build**: ${it.starter.name} | ${it.boots.name} | ${core}\n`;

  }

  if(sp){

    text += `**Spells**: ${sp[0].name} + ${sp[1].name}\n`;

  }

  copyContact(text, "Solo challenge copied for Discord");

}

// Robust application bootstrap (runs on DOM ready without waiting for remote fonts or images)

