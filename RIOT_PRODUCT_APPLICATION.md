# Riot Games Developer Portal — Product Registration Application

> **Project**: League of Customs  
> **Applicant / Creator**: Venomasa  
> **Repository**: [https://github.com/Venomasa/League-of-Customs](https://github.com/Venomasa/League-of-Customs)  
> **Target Release**: Windows Desktop Application (.NET 4.0+ / WebView2)  
> **Target Status**: Production Application (Personal / Commercial Non-Profit Community Tool)

---

## 1. General Product Information

### Product Name
`League of Customs`

### Short Pitch (1-2 sentences)
A lightweight, 100% free desktop companion designed to elevate custom in-house matches, solo challenges, and theorycrafting for the League of Legends community with instant lobby balancing, offline-cached champion/item wiki, and client rune/item export.

### Product Description
League of Customs is an all-in-one companion utility crafted specifically for League of Legends players who enjoy community custom games, in-house tournaments, casual solo build challenges, and patch theorycrafting. 

Unlike third-party analytics tools focused on competitive ladder stats, League of Customs focuses on the social, casual, and experimental side of League:
1. **Custom Match & Lobby Balancer**: Seamlessly imports players sitting in a custom lobby (or from lobby chat text) and generates fair, randomized 5v5, 1v1, or ARAM team rosters, assigning roles and managing spectator benches without spreadsheet hassles.
2. **Solo Challenge & Build Randomizer**: Creates full randomized, viable setups (Champion, Keystone & Secondary Runes, Item sets, Summoner Spells) to inspire players to test diverse playstyles and champions outside their comfort zone.
3. **Direct Client Integration (LCU)**: Allows players, via an explicit click of a button, to import their generated runes directly to their active client rune page (`/lol-perks/v1`) and save item sets (`/lol-item-sets/v1`), removing the friction of manual configuration.
4. **Hextech Encyclopedia (Champions, Items & Runes Armory)**: Provides an offline-cached, zero-ad reference manual powered by Riot's official Data Dragon, displaying patch notes, ability scaling, recipe trees, and champion skins.
5. **Summoner Profile & Match History**: Quick lookup of rank tiers and recent match history for custom game participants.

---

## 2. Platform & Distribution

* **Platform**: Windows Desktop Application (Windows 10 / Windows 11)
* **Technology Stack**: C# (.NET Framework 4.0+), Microsoft Edge WebView2, Vanilla HTML5 / CSS3 / JavaScript
* **Distribution Method**: 
  * Open-source GitHub Releases (Installer `.exe` and Portable `.zip`)
  * Download URL: `https://github.com/Venomasa/League-of-Customs/releases`
* **Source Code Repository**: `https://github.com/Venomasa/League-of-Customs`

---

## 3. Monetization & Business Model

* **Monetization Model**: **100% Free & Open-Source (Completely Non-Commercial)**
* **Is there a paid tier or paywall?**: No.
* **Are there advertisements?**: No. Zero ads.
* **Are there subscriptions, donations, or in-app currencies?**: No.
* **Does the app feature cryptocurrencies, NFTs, or blockchain technology?**: No.
* **Compliance Statement**: League of Customs strictly adheres to Riot's Monetization Policy. It is distributed free of charge to enrich the community experience.

---

## 4. Game Integrity & Fair Play Policy

### Does the application provide an unfair competitive advantage?
**No.** 
* League of Customs **does not** read or hook into live game memory (`League of Legends.exe`).
* It does not run during active matches, does not display in-game overlays or heads-up timers, and does not alter game files.
* It does not automate gameplay, spellcasting, or decision-making inside Summoner's Rift or Howling Abyss.

### Impact on Game Decisions (Decision Diversity)
* Rather than funneling players into a single high-winrate meta build, the Solo Challenge and Team Randomizer engines actively **encourage decision diversity**, champion variety, and creative play in casual/custom games.

### Player Preconceptions, Toxicity & Shaming
* League of Customs **does not** calculate, estimate, or display hidden MMR or ELO ratings.
* It **does not** rank, shame, or tag players negatively based on winrates or recent performance.
* It does not provide reporting or external evaluation mechanisms.

---

## 5. Technical Architecture & Endpoints Used

### A. Static Assets & Data Ingestion
* **Riot Data Dragon (`ddragon.leagueoflegends.com`)**: Fetches champion kits, splash/loading art, item descriptions, and rune definitions. Implements defensive local caching so assets are not redundantly queried on every launch.
* **Official Patch Feeds**: Displays official League balance notes.

### B. League Client Update (LCU) Local Endpoints
League of Customs accesses the local League client via the local lockfile credentials (HTTPS `127.0.0.1:<port>`) strictly for pre-game custom lobby management and player configuration:
* `GET /lol-lobby/v2/lobby`: Reads player IDs currently sitting in a custom lobby to populate the team randomizer.
* `GET /lol-summoner/v1/summoners/{id}` / `GET /lol-summoner/v2/summoners/puuid/{puuid}`: Resolves player display names and tags for team sorting.
* `GET /lol-perks/v1/pages`, `POST /lol-perks/v1/pages`, `PUT /lol-perks/v1/pages/{id}`: Imports user-approved randomized runes to a client rune page upon explicit player request ("Inject to Client").
* `GET /lol-item-sets/v1/item-sets/{summonerId}/sets`, `PUT /lol-item-sets/v1/item-sets/{summonerId}/sets`: Saves the generated custom build into the player's client item sets.
* `PATCH /lol-champ-select/v1/session/actions/{id}`: Hovers the generated champion in custom champ select (does not lock in).
* `PATCH /lol-champ-select/v1/session/my-selection`: Assigns chosen summoner spells in champ select upon player click.

*Note*: All LCU write actions are exclusively triggered by an intentional, direct button click by the user. No background automation or auto-locking occurs.

### C. Riot Web API (Requested for Production Key)
To replace fallback scrapers with official Riot Web API endpoints for the summoner profile and custom match scoreboard lookup:
* `ACCOUNT-V1` (`/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`)
* `SUMMONER-V4` (`/lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}`)
* `LEAGUE-V4` (`/lol/league/v4/entries/by-summoner/{encryptedSummonerId}`)
* `MATCH-V5` (`/lol/match/v5/matches/by-puuid/{encryptedPUUID}/ids`, `/lol/match/v5/matches/{matchId}`)
* `CHAMPION-MASTERY-V4` (`/lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}/top`)

---

## 6. API Key Security & Backend Proxy Architecture

### How will the API key be secured?
* **Zero Client-Side Keys**: The Riot API key will **NEVER** be embedded, hardcoded, or shipped within the distributed desktop application or client binary (`LeagueOfCustoms.exe`).
* **Dedicated Backend Proxy**: All requests from the desktop client to the Riot Web API are routed through a secure, cloud-hosted backend proxy service over SSL/HTTPS (e.g., Cloudflare Workers / AWS Lambda).
* **Environment Secret**: The Production API key is stored exclusively as an encrypted environment variable on the server side.
* **Server-Side Caching & Defensive Rate Limiting**: The backend proxy handles:
  * Strict response caching (Redis / in-memory cache) to minimize redundant calls to Riot API endpoints and respect rate limits.
  * Request validation and origin throttling to prevent abuse or denial-of-service.
  * Complete obfuscation of the API key from end users, packet inspection, and binary reverse engineering.

---

## 7. Mandatory Legal Boilerplate

The official disclaimer is prominently placed both on the public repository README and directly within the application UI (About / Legal footer):

> *"League of Customs isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."*

---

## 8. App Notes / Message to the Riot Developer Relations Review Team

```text
Dear Riot Developer Relations Team,

We are submitting League of Customs for product registration and API access approval.

League of Customs was created to solve a common problem in the custom games community: organizing in-house 5v5 matches, ARAM tournaments, and fun build challenges with friends without having to maintain external spreadsheets or manually roll dice. 

Key points regarding our compliance & architecture:
1. API Key Security (Backend Proxy): To strictly abide by Riot's Developer Safety policies, the distributed client binary (LeagueOfCustoms.exe) will NEVER contain the API key. All Riot Web API traffic is routed through our secure backend proxy server over HTTPS. The API key is stored strictly server-side as an environment variable, where requests are rate-limited and cached to avoid redundant load on Riot's infrastructure.
2. Purely Pre-Game / Local: The app only operates pre-game. It does not hook into live match memory, has no in-game overlays, and does not alter core gameplay in any way.
3. Promoting Decision Diversity: The Solo Challenge engine and build generator exist to encourage players to discover new champions, off-meta builds, and diverse rune paths in friendly/custom games.
4. Player Respect & Fair Play: We strictly reject player shaming. We do not calculate MMR, do not score or judge players, and do not track toxicity.
5. LCU Interaction: Our client integration follows the standard conventions established for companion tools (like rune and item set export), and every single interaction requires explicit user intent (clicking the "INJECT TO CLIENT" button).
6. Transparency & Free Access: The project is completely free, zero-ad, and open-source.

We are requesting an official Production API Key to transition our profile and match history lookup directly onto official Riot Web API endpoints (Account-V1, Match-V5, League-V4, Champion-Mastery-V4) via our secure proxy.

Thank you for your time, review, and continuous support of community developers!

Best regards,
Venomasa (Developer of League of Customs)
Discord: venomasa
GitHub: https://github.com/Venomasa/League-of-Customs
```
