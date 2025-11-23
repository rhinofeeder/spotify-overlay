import path from "path"
import {fileURLToPath} from "url"
import express from "express"
import cors from "cors"
import axios from "axios"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REDIRECT_URI) {
    console.error("Missing required environment variables.")
    console.error("Please set CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI in your .env file")
    process.exit(1)
}

const app = express()
app.use(cors())
app.use(express.static(path.join(__dirname)))
const port = process.env.PORT || 3001

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS) || 3000
let accessToken = null
let currentTrack = null

async function refreshAccessToken() {
    try {
        const res = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: process.env.REFRESH_TOKEN,
            }),
            {
                auth: {
                    username: process.env.CLIENT_ID,
                    password: process.env.CLIENT_SECRET,
                },
            }
        )
        accessToken = res.data.access_token
    } catch (err) {
        console.error("Error refreshing access token:", err.response?.data || err.message)
    }
}

async function getCurrentlyPlaying() {
    if (!accessToken) await refreshAccessToken()

    try {
        const res = await axios.get(
            "https://api.spotify.com/v1/me/player/currently-playing",
            {headers: {Authorization: `Bearer ${accessToken}`}}
        )

        if (res.status === 204 || !res.data.item) return null

        const track = res.data.item
        return {
            title: track.name,
            artist: track.artists.map(a => a.name).join(", "),
            albumArt: track.album?.images?.[0]?.url || null,
            durationMs: track.duration_ms,
            progressMs: res.data.progress_ms,
            isPlaying: res.data.is_playing,
        }
    } catch (err) {
        if (err.response) {
            if (err.response.status === 401) {
                // Token expired, refresh and retry
                await refreshAccessToken()
                return getCurrentlyPlaying()
            }
            if (err.response.status === 429) {
                // Rate limited
                const retryAfter = parseInt(err.response.headers['retry-after'] || '1', 10) * 1000
                console.warn(`Rate limited. Retrying after ${retryAfter} ms`)
                await new Promise(r => setTimeout(r, retryAfter))
                return getCurrentlyPlaying()
            }
        }
        console.error("Error fetching currently playing track:", err.response?.data || err.message)
        return null
    }
}

async function pollSpotify() {
    currentTrack = await getCurrentlyPlaying()
    setTimeout(pollSpotify, POLL_INTERVAL)
}

// Overlay JSON endpoint
app.get("/current", (req, res) => {
    if (!currentTrack) return res.json({playing: false})
    res.json({playing: true, ...currentTrack})
})

// Endpoint to provide config (poll interval) to frontend
app.get("/config", (req, res) => {
    res.json({
        pollInterval: POLL_INTERVAL,
        overlayBgColor: process.env.OVERLAY_BG_COLOR || 'black',
        textColor: process.env.TEXT_COLOR || 'white',
        progressBarColor: process.env.PROGRESS_BAR_COLOR || '#1DB954'
    })
})

// OAuth setup routes
app.get("/setup", (req, res) => {
    const scopes = "user-read-playback-state"
    const authUrl =
        `https://accounts.spotify.com/authorize?` +
        `client_id=${process.env.CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(scopes)}`

    res.redirect(authUrl)
})

app.get("/callback", async (req, res) => {
    const code = req.query.code
    if (!code) {
        return res.send("No code received from Spotify. <a href='/setup'>Try again</a>")
    }

    try {
        const tokenRes = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: process.env.REDIRECT_URI,
            }),
            {
                auth: {
                    username: process.env.CLIENT_ID,
                    password: process.env.CLIENT_SECRET,
                },
            }
        )

        const refreshToken = tokenRes.data.refresh_token
        res.send(`
            <html>
            <head><title>Spotify Overlay - Setup Complete</title></head>
            <body style="font-family: sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
                <h1>🎉 Setup Complete!</h1>
                <p>Copy this refresh token and add it to your .env file:</p>
                <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-wrap: break-word;">${refreshToken}</pre>
                <p><strong>Next steps:</strong></p>
                <ol>
                    <li>Open your .env file</li>
                    <li>Set REFRESH_TOKEN to the value above</li>
                    <li>Restart the server</li>
                    <li>Add http://127.0.0.1:${port}/overlay.html as a Browser Source in OBS</li>
                </ol>
                <p>You can close this window once you've saved the token.</p>
            </body>
            </html>
        `)
    } catch (err) {
        console.error(err.response?.data || err.message)
        res.send(`Error exchanging code for token: ${err.message}. <a href='/setup'>Try again</a>`)
    }
})

app.listen(port, () => {
    console.log(`Spotify overlay server running at http://127.0.0.1:${port}`)
    if (process.env.REFRESH_TOKEN) {
        void pollSpotify()
    } else {
        console.log(`\n⚠️  SETUP REQUIRED ⚠️`)
        console.log(`No REFRESH_TOKEN found in your .env file.`)
        console.log(`\nTo complete setup:`)
        console.log(`  1. Visit http://127.0.0.1:${port}/setup in your browser`)
        console.log(`  2. Authorize with Spotify`)
        console.log(`  3. Copy the refresh token from the page`)
        console.log(`  4. Add it to your .env file (REFRESH_TOKEN=...)`)
        console.log(`  5. Restart this server (Ctrl+C, then npm start)\n`)
    }
})

process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...')
    process.exit(0)
})