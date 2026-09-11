# Changelog

All notable changes to **League of Customs** are documented here.

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
