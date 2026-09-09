<div align="center">

  <img src="assets/app.png" alt="League of Customs Logo" width="130" />

  # LEAGUE OF CUSTOMS
  ### Authentic League of Legends Hextech Companion & Team Randomizer

  [![Version](https://img.shields.io/badge/version-v0.1-c89b3c.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)
  [![Platform](https://img.shields.io/badge/platform-Windows-0ac8b9.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)
  [![Framework](https://img.shields.io/badge/.NET-4.0+-785a28.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)
  [![UI](https://img.shields.io/badge/Engine-WebView2-e84057.svg?style=for-the-badge)](https://github.com/Venomasa/League-of-Customs)

  <p align="center">
    <b>A lightweight, standalone desktop companion crafted specifically for League of Legends custom games, in-houses, tournaments, and community lobbies.</b>
  </p>

</div>

---

## Overview

**League of Customs** is built from the ground up to look, feel, and behave like an official extension of the **League of Legends Client**. Designed for tournament organizers, Discord communities, and friend groups playing customs, it eliminates lobby management headaches with direct League Client integration, automated chat log parsing, and instant team randomization.

---

## Key Features

### 1. Authentic Hextech UI & Audio-Visual Design
- **Official Hextech Palette**: Crafted with Obsidian Blue (`#010a13`), Deep Abyss (`#0a1428`), and Magic Gold trim (`#c89b3c`).
- **Cinzel & Riot Typography**: Authentic typography matching official client headers, buttons, and badges.
- **Custom Window Chrome**: Frameless borderless desktop window with custom drag area, minimize, close, and about modal.
- **Dark Scrollbars**: Custom Hextech scrollbars across all inputs, eliminating default white browser scrollbars.

### 2. Game Modes: Summoner's Rift & ARAM
- **Rift (Roles)**: Automatically balances and assigns official lane positions (**Top, Jungle, Mid, ADC, Support**) with Riot role crests.
- **ARAM Mode**: Adapts teams into Howling Abyss roster format (**ARAM 1, ARAM 2, ARAM 3...**) with official ARAM map crests.
- **Seamless Mode Switch**: Toggle between Rift and ARAM on the fly without losing or re-shuffling your generated teams.

### 3. Direct LoL Client Integration (LCU Memory API)
- Click **"Read from LoL Client"** to automatically connect to your running League Client.
- Reads custom lobby members straight from the local Riot client without third-party services or manual typing.

### 4. "Don't Leave Anyone Behind" (Smart Surplus Balancing)
- When player count is odd and under 10 (e.g. 7 or 9 players), the leftover player is assigned as a bonus player (`+1`) so everyone gets to play.
- Strictly respects League's 5v5 maximum: player counts $\ge 10$ are capped at 5 players per team, routing surplus players directly to **Spectators / Bench**.

### 5. Multi-Source Roster Input
- **League Lobby Chat**: Paste your lobby chat logs directly. Joins, leaves, and custom `+ Summoner` additions are parsed and calculated in real time.
- **Manual Roster**: Type or paste player names (one per line or comma-separated). Ignores comments (`#` or `//`).
- **Clipboard Quick-Paste**: Dedicated buttons to paste and randomize in a single click.
- **Riot #Tag Stripping**: Toggle to hide or show Riot ID `#TAG`s across all displays.

### 6. One-Click Discord Export
- Format your generated match into clean Discord Markdown with one click:
```markdown
**RIFT MATCH — 5v5**

**BLUE TEAM (5)**
  Top: PlayerOne
  Jungle: PlayerTwo
  Mid: PlayerThree
  ADC: PlayerFour
  Support: PlayerFive

**RED TEAM (5)**
  Top: PlayerSix
  Jungle: PlayerSeven
  Mid: PlayerEight
  ADC: PlayerNine
  Support: PlayerTen

Bench: PlayerEleven
```

---

## Project Structure

```
League-of-Customs/
│
├── assets/                  # High-resolution icons & graphics
│   ├── app.ico              # Windows multi-size icon (16x16 to 256x256)
│   ├── app.png              # High-resolution emblem crest (500x500)
│   └── icons/               # Authentic Riot position & mode PNGs
│       ├── icon-top.png
│       ├── icon-jungle.png
│       ├── icon-middle.png
│       ├── icon-bottom.png
│       ├── icon-utility.png
│       ├── icon-aram.png
│       └── icon-fill.png
│
├── src/                     # Core application source code
│   ├── index.html           # Hextech client UI (HTML5, CSS3, ES6)
│   ├── LeagueOfCustoms.cs   # Native C# WinForms host & direct LCU connector
│   └── Installer/           # Windows Installer & Uninstaller source
│       ├── Setup.cs         # Hextech installer with shortcuts & registration
│       └── Uninstall.cs     # Clean uninstaller
│
├── LeagueOfCustoms.exe      # Standalone compiled portable executable
├── build_exe.bat            # Fast app build script (csc.exe)
├── build_installer.py       # Full release packager (Installer + Portable ZIP)
├── README.md                # Project documentation
├── .gitignore               # Git ignore rules
├── Microsoft.Web.WebView2.Core.dll
├── Microsoft.Web.WebView2.WinForms.dll
└── WebView2Loader.dll
```

---

## Download & Installation

You can get **League of Customs** in two ways:

### Option A: Windows Installer (Recommended)
Automatically sets up desktop and Start menu shortcuts and registers in Windows Add/Remove Programs:
- 🚀 **[Download LeagueOfCustoms-Setup-v0.1.exe](https://github.com/Venomasa/League-of-Customs/releases/download/v0.1/LeagueOfCustoms-Setup-v0.1.exe)**

### Option B: Portable ZIP (No Installation Required)
Extract anywhere and run directly from the folder:
- 📦 **[Download LeagueOfCustoms-v0.1-Portable.zip](https://github.com/Venomasa/League-of-Customs/releases/download/v0.1/LeagueOfCustoms-v0.1-Portable.zip)**

> 📌 All releases and version changelogs are available on the **[GitHub Releases Page](https://github.com/Venomasa/League-of-Customs/releases/latest)**.

---

## How to Use

1. Launch **League of Customs** (via shortcut or portable executable).
2. Open a League of Legends custom lobby in the client.
3. In League of Customs, click **"Read from LoL Client"** (or paste your custom lobby chat / summoner list).
4. Select your mode (**Summoner's Rift** or **ARAM**).
5. Click **"Randomize Teams"**!
6. Click **"Copy Discord Format"** to share the balanced teams with your lobby or Discord channel.

> **System Requirements**: Windows 10 or Windows 11 with the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (already built into Windows 10/11).


---

## Building from Source

The project compiles with Windows' built-in .NET compiler (`csc.exe`). No heavy IDE or SDK installation required:

1. Edit your changes in `src/index.html` or `src/LeagueOfCustoms.cs`.
2. Double-click:
   **`build_exe.bat`**
3. Your updated `LeagueOfCustoms.exe` will be compiled and ready in seconds.

---

## Creator & Community

- **Project Creator**: **Venomasa**
- **GitHub**: [@Venomasa](https://github.com/Venomasa)
- **Discord**: `venomasa`
- **Riot / LoL ID**: `Heaven Venerable#REFIN`

---

## Legal Disclaimer

*League of Customs isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.*
