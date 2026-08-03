# MediaSnap — Universal Media Downloader

> Download video, audio & images from **1000+ sites** in the highest possible quality — 4K video, 320kbps MP3, original images.

![MediaSnap Hero](public/hero_bg.jpg)

---

## ✨ Features

- 🎬 **4K / 8K video** download (best quality available)
- 🎵 **MP3 320kbps** audio extraction via ffmpeg
- 📸 **Original images** from Pinterest, Instagram, etc.
- 📺 **1000+ supported sites** via yt-dlp
- ⚡ **Streaming delivery** — no disk buffering, instant start
- 🎨 **Glassmorphism dark UI** with real-time progress
- 📋 **Session download history**
- 🐳 **Docker-ready** for cloud deployment

---

## 🌐 Supported Platforms (partial list)

| Platform | Formats |
|----------|---------|
| YouTube | 4K/8K MP4, MP3 |
| Instagram | Video, Reels, Images |
| TikTok | Video (no watermark) |
| SoundCloud | MP3 320kbps |
| Pinterest | Original images |
| Facebook | Video |
| Twitter / X | Video, GIFs |
| Vimeo | Up to 4K |
| Dailymotion | Video |
| Twitch | Clips, VODs |
| Reddit | Videos |
| Bilibili | Video |
| + 1000 more | — |

---

## 🛠 Prerequisites

### yt-dlp
```bash
# macOS (Homebrew)
brew install yt-dlp

# Linux
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# pip (any OS)
pip install yt-dlp
```

### ffmpeg
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (winget)
winget install ffmpeg
```

---

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
# or with auto-reload:
npm run dev

# 3. Open in browser
open http://localhost:3000
```

---

## ☁️ Deploy to Cloud

### Option A: Railway (Recommended — Free tier available)

1. Push this project to a GitHub repo
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your repo — Railway auto-detects the `Dockerfile`
4. Click **Deploy** — your URL will be assigned (e.g. `https://mediasnap-production.up.railway.app`)

The `railway.toml` file is already configured.

### Option B: Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New** → **Web Service**
3. Connect your repo — Render reads `render.yaml` automatically
4. Click **Create Web Service**

### Option C: Any Docker Host (VPS, DigitalOcean, Fly.io, etc.)

```bash
# Build
docker build -t mediasnap .

# Run
docker run -p 3000:3000 mediasnap
```

---

## 🏗 Project Structure

```
yt downloader/
├── server.js          # Express backend (yt-dlp bridge)
├── package.json
├── Dockerfile         # Docker image: Node + yt-dlp + ffmpeg
├── railway.toml       # Railway deployment config
├── render.yaml        # Render deployment config
└── public/
    ├── index.html     # Glassmorphism UI
    ├── style.css      # Dark theme + animations
    ├── app.js         # Frontend logic
    └── hero_bg.jpg    # Background image
```

---

## ⚠️ Legal Disclaimer

- Only download **publicly accessible** content you have the legal right to download.
- Respect copyright laws and platform Terms of Service.
- The authors are not responsible for misuse of this tool.

---

## 🙏 Credits

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — the download engine
- [ffmpeg](https://ffmpeg.org) — audio/video processing
