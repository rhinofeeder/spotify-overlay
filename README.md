# Spotify Overlay

A lightweight, personal overlay that shows your currently playing Spotify track, including album art, track title,
artist, and a progress bar. Built with Node.js, Express, and vanilla JS for easy integration with OBS or other streaming
software.

---

## Features

- Displays album art, track title, and artist
- Progress bar showing track progress
- Configurable refresh/polling interval via `.env`
- Minimalist design with configurable styling for stream overlays

---

## Spotify App Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Log in with your Spotify account.
3. Click **Create an App**.
4. Fill in the app name and description (these are personal, so anything works).
5. Once created, save your **Client ID** and **Client Secret** for your `.env` file later.
6. Under **Edit Settings**, add the following to **Redirect URIs**: `http://127.0.0.1:3001/callback`
7. Save the changes.

---

## Quick Start

**Simple setup - no coding required, just a few commands:**

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/) (choose the LTS version). This is a simple
installer - just click through it.

### 2. Download this project

**Option A:** Download as ZIP (no git required)

- Click the green "Code" button on GitHub → "Download ZIP"
- Extract the ZIP file to a folder on your computer

**Option B:** Clone with git

```bash
git clone https://github.com/RhinoFeeder/spotify-overlay.git
cd spotify-overlay
```

### 3. Install dependencies

Open a terminal/command prompt in the project folder and run:

```bash
npm install
```

### 4. Set up Spotify credentials

1. Follow the [Spotify App Setup](#spotify-app-setup) section above to get your CLIENT_ID and CLIENT_SECRET
2. Copy `.env.example` to `.env`
3. Fill in your CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI in the `.env` file (leave REFRESH_TOKEN empty for now)

### 5. Get your refresh token

Start the server:

```bash
npm start
```

Open your browser and go to `http://127.0.0.1:3001/setup`

Authorize the app with Spotify - you'll see your refresh token displayed on the page.

Copy the token and add it to your `.env` file, then restart the server.

### 6. Add to OBS

Add a Browser Source in OBS and set the URL to `http://127.0.0.1:3001/overlay.html`

---

## Customization

Want to modify the overlay design? All styling is in `overlay.html` - it's just HTML, CSS, and vanilla JavaScript. The
server code is in `server.js`.

## Configuration

- POLL_INTERVAL_MS in `.env`: controls how frequently the overlay fetches the currently playing track (default 3000ms)
- Overlay styling can be customized in `.env` with the following optional properties:
    - `OVERLAY_BG_COLOR`: background color of the overlay (supports any CSS color, default black)
    - `TEXT_COLOR`: color of track title/artist text (default white)
    - `PROGRESS_BAR_COLOR`: color of the progress bar (default #1DB954)

## Notes

- This overlay is designed for personal use, but feel free to fork it for your own setup
- Make sure your Spotify token has the correct scopes (user-read-playback-state)