<div align="center">

  <img src="assets/app.png" alt="League of Customs Logo" width="130" />

  # LEAGUE OF CUSTOMS
  ### Authentic League of Legends Hextech Companion & Team Randomizer

  [![Version](https://img.shields.io/badge/version-v0.4-c89b3c.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)
  [![Platform](https://img.shields.io/badge/platform-Windows-0ac8b9.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)
  [![Framework](https://img.shields.io/badge/.NET-4.0+-785a28.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)
  [![UI](https://img.shields.io/badge/Engine-WebView2-e84057.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)

  <p align="center">
    <b>A lightweight, standalone desktop companion crafted specifically for League of Legends custom games and solo challenges.</b>
  </p>

</div>

---

## Download & Installation

You can get **League of Customs** in two ways:

### Option A: Windows Installer (Recommended)
Automatically sets up desktop and Start menu shortcuts and registers in Windows Add/Remove Programs:
- **[Download LeagueOfCustoms-Setup-v0.4.exe](https://github.com/Venomasa/League-of-Customs/releases/download/v0.4/LeagueOfCustoms-Setup-v0.4.exe)**

### Option B: Portable ZIP (No Installation Required)
Extract anywhere and run directly from the folder:
- **[Download LeagueOfCustoms-v0.4-Portable.zip](https://github.com/Venomasa/League-of-Customs/releases/download/v0.4/LeagueOfCustoms-v0.4-Portable.zip)**

> All releases and version changelogs are available on the **[GitHub Releases Page](https://github.com/Venomasa/League-of-Customs/releases)**.

---

## Major Features

- **Solo Challenge & Build Randomizer**: Generates complete role, champion, full rune setup (keystones, minors, stat shards), items (starter, boots, 5 legendaries), and summoner spells powered by an intelligent Anti-Repeat engine.
- **Direct Client Injector (LCU)**: One-click injection of runes, items, and spells directly into your active League client, with automatic page activation, active champion hover, and smart slot replacement.
- **Custom Match & Lobby Randomizer**: Automatically imports custom lobbies via LCU or chat logs, balances teams (5v5, 1v1, ARAM), assigns lane-specific roles, and manages spectator benches.
- **Summoner Profile & Match History**: Look up any Riot ID across 11 regions to inspect ranked tiers, a Top 3 Champion Mastery podium with official client crests, and detailed 10-player match scoreboards.
- **Live Riot DataDragon & Silent Updates**: Automatically syncs the latest League patches, champions, and items on startup, with a seamless silent background auto-updater.
- **One-Click Discord Export**: Copy generated teams or solo challenges pre-formatted with clean Discord markdown for instant sharing.

---

## How to Use

1. **Launch** `LeagueOfCustoms.exe` (or use the desktop shortcut).
2. **Custom Matches**: Click **"Read from LoL Client"** while in a custom lobby (or paste chat), pick your mode, and click **"Randomize Teams"**.
3. **Solo Challenge**: Switch to the **Solo** tab, click **"ROLL ALL"** (or reroll individual parts), and click **"INJECT TO CLIENT"** to load the setup directly into League.
4. **Profile Lookup**: Enter any summoner's `Name#Tag` to view rank tiers, masteries, and recent match scoreboards.

> **System Requirements**: Windows 10 or Windows 11 with the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on Windows 10/11).

---

## Building from Source

Compile in seconds using Windows' built-in .NET compiler (`csc.exe`) without any external IDE:

1. Modify files in `src/`.
2. Run `build_exe.bat`.
3. The executable `LeagueOfCustoms.exe` will be built immediately.

---

## Creator & Community

- **Creator**: **Venomasa** ([@Venomasa](https://github.com/Venomasa))
- **Discord**: `venomasa`
- **LoL ID**: `Heaven Venerable#REFIN`

---

## Legal Disclaimer

*League of Customs isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.*
