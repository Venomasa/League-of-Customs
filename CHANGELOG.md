# Changelog

All notable changes to **League of Customs** are documented here.

## [v0.6] — 2026-09-12

### Added
- **Hextech Wiki (Champions, Items & Runes Armory)**:
  - Added a dedicated 4th major tab `Wiki` to the League of Customs client with sub-navigation for Champions, Items, and Runes.
  - **Champions Archive**: Complete 173+ champion roster with live instant search, role/lane filters, lore biographies, regional faction hero covers matching champion origin lore, tactical rating meters, base stats grid, interactive abilities kit (Passive + Q, W, E, R with official League stat icons for Ability Haste, Mana Cost, and Range), and full skin splash gallery.
  - **Items Armory**: Full searchable item catalog with category/tier filters (Legendary, Epic, Basic, Starter, Boots), stat modifiers (AD, AP, Armor, MR, Health, Haste, Vamp, etc.), Summoner's Rift map availability filters, official League game patch display (`PATCH 26.18`), and interactive recipe trees with individual combine costs in parentheses `[Total (Combine)]` formatted after the official League Wiki.
  - **Runes Reforged**: Streamlined 5-path explorer (Precision, Domination, Sorcery, Resolve, Inspiration) with keystones, 3 minor rune tiers, and official stat shards (Offense, Flex, Defense) positioned directly beneath path tabs.
  - **Zero-Bloat Caching**: Built-in C# disk caching at `%LocalAppData%\LeagueOfCustoms\wiki_cache\` for instant sub-millisecond offline loading and minimal RAM usage.
- **Hextech Lightbox & High-Resolution Artwork Downloader**:
  - Fullscreen high-resolution artwork viewer for exploring champion skins and patch notes images with asynchronous preloading and Hextech loading spinner.
  - Custom right-click context menu with **"Download Full Image"** and **"Copy Image Link"**, plus a dedicated top-right **DOWNLOAD** button, saving high-resolution artwork directly into the Windows `Downloads` folder with duplicate collision renaming `(1)`, `(2)`.
- **Instant Match Scoreboard Caching (< 1ms)**:
  - Implemented a two-tier caching architecture (in-memory JavaScript map + persistent disk cache at `%LocalAppData%\LeagueOfCustoms\cache\scoreboards\`) for 10-player match scoreboards.
  - Because completed matches are immutable, repeated clicks on any match scoreboard render instantaneously with zero network latency.
- **Predictive Background Match Prefetching**:
  - The client automatically prefetches the full 10-player scoreboard for the player's latest match 250ms after match history renders, guaranteeing an instant (< 0.05ms perceived) scoreboard reveal upon click.
- **Summoner Profile Session Caching (5-Min TTL) & Hextech Refresh**:
  - In-memory session cache with a 5-minute time-to-live for summoner profile queries. Switching between favorite profiles or tabs is now instantaneous.
  - Added Hextech Refresh button (`🔄`) next to Search allowing players to bypass cache and force a fresh lookup anytime.
- **HTTP Keep-Alive & Socket Connection Pooling**:
  - Configured C# `.NET` `ServicePointManager` and `HttpWebRequest.KeepAlive` for `mcp-api.op.gg`, maintaining open sockets and saving ~200–350ms of TCP/TLS handshake overhead per call.
- **Hextech Context Menu & Lightbox**:
  - Integrated custom League client-styled context menu supporting Cut, Copy, Paste, and Select All with keyboard shortcuts across input fields and text selections.
### Fixed
- **Resilient Live Sync & Auto-Updater on Slow Connections**:
  - Fixed an issue where the background auto-updater could abort `WebClient` downloads on slow or high-latency internet connections due to premature object disposal during asynchronous streaming.
  - Implemented network stall protection and graceful error recovery: if network drops or times out during startup sync, the application smoothly transitions into the program instead of hanging or locking the splash screen.
- **LCU Rune Page Injection & Champion Special Characters**:
  - Sanitized rune page names to remove apostrophes, ampersands, and punctuation (e.g. `Cho'Gath` -> `LoC - ChoGath`, `Kai'Sa` -> `LoC - KaiSa`, `Nunu & Willump` -> `LoC - Nunu Willump`), strictly adhering to Riot LCU's perk name regex `^[a-zA-Z0-9 _.-]{1,25}$`.
  - Fixed LCU `PUT /lol-perks/v1/pages/{id}` by stripping client-computed read-only fields (`isDeletable`, `isActive`, `id`), allowing clean in-place updates.
  - Resolved active-page deletion rejection by safely switching `/lol-perks/v1/currentpage` to a default non-deletable page (e.g. IDs 50–54) before deleting, completely eliminating duplicate pages and slot exhaustion lockups.
  - Added automatic cleanup of any leftover duplicate `LoC` pages, guaranteeing strictly ONE dedicated page.
  - Synchronized all 5 perk trees with live official DataDragon IDs.
- **Patch Notes Sidebar & Multi-Page RAM Optimization**:
  - **Sidebar Thumbnail Downscaling (4K/7K to 120x86 WebP)**: Transformed all patch archive sidebar thumbnails from massive 1080p, 4K, and 7K splash art (which previously took up to 115 MB of decoded RAM per thumbnail) down to cropped 120x86 WebP (~2.9 KB, ~38 KB RAM). Combined with CSS `content-visibility: auto` on `.patch-archive-card`, scrolling through the 50+ archive cards now takes under 2 MB of RAM total instead of hundreds of megabytes.
  - Converted Riot Sanity CDN images dynamically to lightweight 800px WebP format (`?w=800&fm=webp&q=75`), reducing image network transfer by **97.6%** (from 1 MB to 24 KB) and uncompressed bitmap RAM footprint by **>80%** per image.
  - Explicitly cleared previous DOM images (`img.src = ""`) before mounting a new patch, freeing decoded image surfaces from Chromium memory.
  - Capped in-memory patch detail retention to 3 patches and enabled `_webView.CoreWebView2.MemoryUsageTargetLevel = CoreWebView2MemoryUsageTargetLevel.Low;` to aggressively trim inactive caches.
  - Eliminated sticky `backdrop-filter: blur(8px)` on `.patch-toc-bar`, replaced hero blur with hardware-accelerated transform layers, and enforced `loading="lazy"` and `decoding="async"`.
  - Added a 4-hour disk cache TTL to `FetchPatchNotesListJson()` in C#, making the patch notes list load in **0.2 ms** from disk on startup without hitting Riot's web servers repeatedly.


## [v0.5] — 2026-09-12

### Added
- **Official League of Legends Patch Notes Hub**:
  - Introduced a dedicated Home / Landing page as the primary client tab showcasing the latest live League of Legends balance changes directly from Riot Games.
  - Interactive patch viewer featuring hero masthead backdrop artwork, patch release summaries, and a quick-jump Table of Contents (TOC) bar for champion buffs, nerfs, items, systems, and upcoming skins.
  - Searchable Patch Archive sidebar with instant filtering to explore and read past League patches offline or online.
  - Local persistent caching in `%LocalAppData%\LeagueOfCustoms\patches\` ensuring near-instantaneous load times on subsequent launches.
  - Direct one-click navigation to open official Riot patch articles in the default browser.
- **2x Accelerated Summoner Profile & Match History Queries**:
  - Implemented parallelized profile data scraping and match extraction, cutting OP.GG lookup duration from ~10s down to ~4-5s.
- **Hextech UI & Header Polish**:
  - Cleaned up titlebar and modal footer version indicators (`v0.5 (LoL <patch>)`), eliminating the redundant "VERSION" label prefix.
  - Decoupled application logic into clean modular JavaScript architecture (`patches.js`, `profile.js`, `custom_match.js`, `solo_randomizer.js`, `lol_data.js`, `app.js`).

## [v0.4] — 2026-09-11

### Added
- **Direct Client Loadout & Rune Injector (`INJECT TO CLIENT`)**:
  - Injects complete builds, spells, and runes directly into the League Client via LCU API.
  - Automatically creates, updates, and activates a dedicated `League of Customs: [Champion]` rune page and custom in-game shop build (`LeagueOfCustoms.json`).
  - Automatically hovers/pre-selects the rolled champion and sets summoner spells when in active Champion Select.
  - Interactive Rune Page Slot Selector: When all custom rune page slots are full, opens an interactive Hextech modal allowing the player to select which existing page to replace.
- **Anti-Repeat Smart Shuffle Engine**:
  - Memory-backed randomization preventing back-to-back duplicate streaks across champions (last 10), primary rune trees (last 2), keystones (last 4), secondary trees (last 2), minor runes (last 5), stat shards, boots (last 2), and core items (last 15).
  - Applied across both Master Roll and individual mini-reroll buttons (`Reroll Champ`, `Reroll Runes`, `Reroll Items`, `Reroll Spells`), with persistent toggle state in local storage.
- **Solo Randomizer Layout Polish**:
  - Vertical summoner spell stack keeping equipment compact and ensuring all 7 items (Starter, Boots, 5 Core items) sit on a single horizontal row without wrapping.
  - Stabilized champion hero card with fixed height (`112px`) and single-line text truncation with tooltips, eliminating screen jitter during rapid rolls.
- **Live Riot DataDragon 16.18.1 Sync**:
  - Synchronizes latest League of Legends patch version, new champions, and legendary items from Riot DataDragon on startup, automatically caching and merging new items/champions into the randomizer pool.
  - Updated active Summoner's Rift legendary item catalog to 105 verified items, including all 9 Season 2026 legendaries, with runtime pruning of removed/disabled items.
- **Seamless Silent Auto-Updater & Hextech Startup Splash**:
  - Authentic League client-style Hextech splash screen with gold crest, rotating ring animation, and live progress bar.
  - Automatic background GitHub release checker on launch: streams newer installer packages into `%TEMP%`, silently executes the installer (`/SILENT`), and automatically restarts into the updated version without manual intervention.
- **Authentic Champion Mastery Podium & Profile Redesign**:
  - Reorganized the Profile Overview page with an authentic League client podium highlighting the player's top 3 lifetime mastered champions with official client crests (`mastery-1.png` to `mastery-10.png`), high-res portraits, rank badges, and points.
  - 2-column grid showcasing ranks #4 to #15, and ranked split statistics.
  - Profile Three-Dots Action Menu (`⋮`) with bookmarked Favorites modal and auto-loading Default Profile on launch.
- **10-Player Match Scoreboard & Combat Performance Analytics**:
  - End-of-game 5v5 scoreboard with canonical lane ordering (`TOP` → `JUNGLE` → `MID` → `ADC` → `SUPPORT`) and official CommunityDragon position crests.
  - Team objective metrics (Towers destroyed, Dragons slain, total kills) and player healing output meters.
  - Dedicated "Stats" sub-tab in Profile calculating combat KPIs (Win Rate, Average KDA, Damage Dealt, Damage Taken, Healing), lane distribution, and champion performance analytics across recent matches.
  - Dynamic Match History pagination ("Load More Games") fetching older matches dynamically.

### Fixed
- **Champion Key Resolution & Asset Loading**:
  - Resolved avatar and icon loading for champions with non-standard Riot keys (Wukong -> `MonkeyKing`, Renata Glasc -> `Renata`, Nunu & Willump -> `Nunu`, Cho'Gath -> `Chogath`, Dr. Mundo -> `DrMundo`, etc.) with numeric ID fallbacks routing to CommunityDragon.
- **Match Scoreboard 5 vs 5 Complete Participant Parsing**:
  - Fixed parsing discrepancy where the search subject's stats class format differed from other players, ensuring all 10 participants render reliably across Blue and Red teams.
- **Item Build & Boots Pool Cleanliness**:
  - Permanently removed Symbiotic Soles (`#3010`) from Summoner's Rift boots pool, keeping it strictly to the 6 standard Rift boots.
  - Corrected corrupted item IDs and purged Arena-exclusive prismatic items from Summoner's Rift builds.

---

## [v0.3] — 2026-09-10

### Added
- **Reorganized Solo Randomizer Layout**: Positioned Summoner Spells directly adjacent to Item Build in a combined equipment card beside the Champion, with Runes Reforged spanning full width cleanly underneath.
- **Latest Data Dragon 16.18.1 Assets**: Updated to live Data Dragon `16.18.1` supporting all **173 champions** (including Smolder, Aurora, Ambessa, Mel) with verified lane mappings, S15/16 items, and current runes/shards.
- **Match History in Profile**: Integrated recent match history directly inside the Profile page powered by OP.GG MCP (`lol_list_summoner_matches`), displaying Victory/Defeat, champion avatars, KDA, items, and game durations.
- **Installer Smart Upgrade**: Enhanced `Setup.exe` with automatic detection of prior installations via registry, seamlessly switching to Update mode to upgrade older versions to v0.3.
- **Role-Specific Champion Randomization**: Optional lane-appropriate champion assignment for Custom and Team Randomizers (Top to Top, Jungle to Jungle, Mid to Mid, ADC to ADC, Support to Support).
- **Randomizer Sub-Pages**: Dedicated sub-navigation for Custom Randomizer (5v5), Team Randomizer (1–5 players), and Solo Randomizer (Ultimate Challenge).
- **Instant Avatar Loading**: High-speed square champion avatars replacing heavy splash images in Solo challenge.
- **Role Reroll & Mode Preservation**: Changing role or switching mode in Solo Randomizer adapts starter and spells without resetting champions, runes, or items.

---

## [v0.2] — 2026-09-10

### Added
- **Summoner Profile Search**: Live player profile search by Riot ID (`Name#Tag`) across 11 global regions.
- **Ranked Divisions & Win Rates**: Displays live Solo/Duo and Flex tiers, LP, win rates, and official medal crests.
- **Ranked Champion Stats**: Top played champions with games, KDA, and win rate pills.
- **Champion Mastery Showcase**: Displays top masteries with official Riot portraits, mastery levels, and formatted points.
- **Client Navigation Tabs**: Top navigation bar for seamless switching between **Profile** (default landing), **Match History**, and **Team Randomizer**.
- **External OP.GG Link**: Direct button to view the full summoner profile on OP.GG.
- **Installer & Portable Packages v0.2**: Upgraded Windows setup installer and portable zip packages.

### Fixed
- **UI & Modal Outlines**: Fixed About modal close button overlapping the gold border outlines.
- **LCU Client Reader**: Resolved file-sharing and process elevation issues when auto-connecting to the League client.
- **Encoding Cleanup**: Fixed character encoding across player counts, slots, and buttons.

---

## [v0.1] — 2026-09-09 *(Initial Release)*

### Core Features
- **Authentic Hextech UI**: Frameless desktop window with Obsidian Blue, Abyss Gold, and Riot typography.
- **Game Modes**: Summoner's Rift (Top, Jungle, Mid, ADC, Support) and ARAM mode with seamless mode switching.
- **League Client Integration**: Direct local LCU connector to auto-import custom lobby rosters.
- **Smart Surplus Balancing**: Fair team balancing with extra player assignment and spectator benching.
- **Multi-Source Roster Input**: Paste lobby chat logs, enter manual summoner lists, or quick-paste from clipboard.
- **One-Click Discord Export**: Instant match formatting for Discord chat.
- **Standalone Windows Packages**: Portable executable and full desktop installer with shortcuts.
