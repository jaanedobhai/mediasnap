# ── Stage 1: Base image with Node + yt-dlp + ffmpeg ──────────
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp via pip into a venv
RUN python3 -m venv /opt/ytdlp-venv \
    && /opt/ytdlp-venv/bin/pip install --no-cache-dir --upgrade yt-dlp

# Make yt-dlp available globally
RUN ln -s /opt/ytdlp-venv/bin/yt-dlp /usr/local/bin/yt-dlp

# ── Stage 2: App ──────────────────────────────────────────────
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
