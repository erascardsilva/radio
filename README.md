# radiogo - Modern Internet Radio & Local Media Player

[![Get it from the Snap Store](https://snapcraft.io/en/dark/install.svg)](https://snapcraft.io/radiogo)



## Overview

This project is a high-performance, hybrid Media Center built as a desktop application. It seamlessly combines the capabilities of a global internet radio streamer, a YouTube audio extractor, and a local MP3/media player, all wrapped in a sleek, glassmorphism-inspired user interface.

## Core Technologies

- **Backend:** Go (Golang)
- **Framework:** Wails v2 (Bridging Go backend with Web frontend)
- **Frontend:** Vanilla JavaScript, HTML5, and CSS3
- **Bundler:** Vite
- **Media Engine:** HTML5 `<audio>` tag driven by dynamic backend routing.

## Architecture & Features

### 1. Hybrid Streaming Engine
The application fetches live radio station directories asynchronously via a custom Go service. It parses `.m3u8`, `.mp3`, and `.aac` streams natively.

### 2. YouTube Audio Extraction (Video-less Streaming)
To conserve bandwidth and system resources, the player does not embed YouTube video players. Instead, it leverages public instances of the Piped API and Invidious API through a custom backend resolver (`ResolveYouTubeAudio`). 
- **Failover Logic:** The backend contains a robust fallback mechanism testing over 6 different API endpoints.
- **Audio-Only:** Extracts the highest quality `.m4a` or `.webm` audio stream URL and pipes it directly to the frontend HTML5 player.

### 3. Local Media Micro-Server
Due to modern webview security policies (CORS and `file://` protocol restrictions), playing local audio files directly in the frontend is blocked. 
- **Solution:** The Go backend spins up a lightweight, dedicated local HTTP Micro-Server (`127.0.0.1:9099`). 
- When the user selects a local folder via the native OS file dialog, the frontend requests the files via `http://127.0.0.1:9099/musics/<filename>`, completely bypassing webview security restrictions while maintaining a secure sandbox.

### 4. Smart Playlist & State Persistence
- **State Persistence:** Local music directories and custom user radio URLs are saved in the user's local configuration directory (`music_dir.txt` and `radios.json`).
- **Auto-Play & Media Controls:** Custom Vanilla JS logic handles track progression, allowing the user to skip internet radio stations or auto-play through a local directory of `.mp3`, `.wav`, `.flac`, and `.ogg` files just like a traditional media player.

## Build Instructions

Requirements:
- Go 1.20+
- Node.js & NPM
- Wails CLI v2

```bash
# Install Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Build the project for Production (Linux)
wails build
```

The compiled executable will be located in `build/bin/radiogo`.

## Download & Installation

### Linux (Ubuntu, Debian, Fedora, Arch, etc.)
**radiogo** is officially published and available on the **Snap Store**. You can install it securely on any Linux distribution that supports Snaps by running:

```bash
sudo snap install radiogo
```
*(Builds via Github Actions automatically publish new releases directly to the `stable` channel).*

### Windows (.exe) & Linux (.deb / .rpm)
If you prefer standalone installers instead of the Snap Store, you can download the compiled binaries directly from the `installers` directory of this repository.

- **Windows:** [Download radiogo-amd64-installer.exe](./installers/radiogo-amd64-installer.exe?raw=true) (Official NSIS Installer).
- **Debian/Ubuntu:** [Download radiogo_1.0.0_amd64.deb](./installers/radiogo_1.0.0_amd64.deb?raw=true) and install it using `sudo dpkg -i radiogo_1.0.0_amd64.deb`.
- **Red Hat/Fedora:** [Download radiogo-1.0.0-1.x86_64.rpm](./installers/radiogo-1.0.0-1.x86_64.rpm?raw=true) and install it using `sudo rpm -i radiogo-1.0.0-1.x86_64.rpm`.


<br>

**Support this project:** [Donate via PayPal](https://www.paypal.com/ncp/payment/8V6WQCGN6HDCQ)

**Author:**<br> Erasmo Cardoso <br>  Software Engineer | Electronics Technician
