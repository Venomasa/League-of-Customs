# Changelog

All notable changes to **League of Customs** are documented here.

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
