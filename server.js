const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const checks = await Promise.all([
    checkBinary('yt-dlp', ['--version']),
    checkBinary('ffmpeg', ['-version']),
  ]);
  res.json({
    ok: checks.every(c => c.ok),
    ytdlp: checks[0],
    ffmpeg: checks[1],
  });
});

function checkBinary(name, args) {
  return new Promise(resolve => {
    const proc = spawn(name, args);
    let version = '';
    proc.stdout.on('data', d => (version += d.toString()));
    proc.stderr.on('data', d => (version += d.toString()));
    proc.on('close', code => {
      resolve({ ok: code === 0, version: version.split('\n')[0].trim() });
    });
    proc.on('error', () => resolve({ ok: false, version: 'not found' }));
  });
}

// ─── Media Info ──────────────────────────────────────────────────────────────
app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--extractor-args', 'youtube:player_client=default,ios',
    '--socket-timeout', '30',
    url,
  ];

  const proc = spawn('yt-dlp', args);
  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', d => (stdout += d.toString()));
  proc.stderr.on('data', d => (stderr += d.toString()));

  proc.on('close', code => {
    if (code !== 0) {
      const errMsg = stderr.includes('Unsupported URL')
        ? 'This URL is not supported. Make sure it is a public media URL.'
        : stderr.split('\n').filter(Boolean).pop() || 'Failed to fetch media info';
      return res.status(400).json({ error: errMsg });
    }
    try {
      // yt-dlp can output multiple JSON lines for playlists; take first
      const info = JSON.parse(stdout.trim().split('\n')[0]);
      const formats = buildFormatList(info);
      res.json({
        id: info.id,
        title: info.title || 'Untitled',
        thumbnail: info.thumbnail || null,
        duration: info.duration || null,
        uploader: info.uploader || info.channel || null,
        website: info.extractor_key || null,
        description: (info.description || '').slice(0, 200),
        formats,
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse media info' });
    }
  });

  proc.on('error', () =>
    res.status(500).json({ error: 'yt-dlp not found. Is it installed?' })
  );
});

function buildFormatList(info) {
  const list = [];

  // Best video (up to 4K/8K)
  const videoFormats = (info.formats || [])
    .filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  const seenRes = new Set();
  for (const f of videoFormats) {
    const label = `${f.height}p`;
    if (seenRes.has(label)) continue;
    seenRes.add(label);
    list.push({
      id: `video_${f.height}`,
      type: 'video',
      label: `Video ${getResLabel(f.height)}`,
      quality: label,
      ext: 'mp4',
      height: f.height,
      badge: f.height >= 2160 ? '4K' : f.height >= 1080 ? 'FHD' : f.height >= 720 ? 'HD' : 'SD',
    });
    if (list.filter(x => x.type === 'video').length >= 5) break;
  }

  // MP3 audio
  list.push({
    id: 'audio_mp3',
    type: 'audio',
    label: 'Audio MP3',
    quality: '320kbps',
    ext: 'mp3',
    badge: '320K',
  });

  // Best audio (original codec)
  const hasAudio = (info.formats || []).some(
    f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')
  );
  if (hasAudio) {
    list.push({
      id: 'audio_best',
      type: 'audio',
      label: 'Audio (Original)',
      quality: 'lossless',
      ext: info.audio_ext || 'm4a',
      badge: 'HQ',
    });
  }

  // If no video formats found (image sites, audio-only sites), just keep audio
  if (videoFormats.length === 0 && list.filter(x => x.type === 'video').length === 0) {
    // Try adding a generic best-video fallback anyway
    if (info.ext && !['mp3', 'm4a', 'ogg', 'flac', 'wav', 'opus'].includes(info.ext)) {
      list.unshift({
        id: 'video_best',
        type: 'video',
        label: 'Best Quality Video',
        quality: 'best',
        ext: 'mp4',
        height: null,
        badge: 'BEST',
      });
    }
  }

  // Thumbnail
  if (info.thumbnail) {
    list.push({
      id: 'thumbnail',
      type: 'image',
      label: 'Thumbnail',
      quality: 'original',
      ext: 'jpg',
      badge: 'IMG',
      thumbnailUrl: info.thumbnail,
    });
  }

  return list;
}

function getResLabel(h) {
  if (h >= 4320) return '8K Ultra HD';
  if (h >= 2160) return '4K Ultra HD';
  if (h >= 1440) return '2K QHD';
  if (h >= 1080) return 'Full HD';
  if (h >= 720) return 'HD';
  if (h >= 480) return '480p';
  return `${h}p SD`;
}

// ─── Download ─────────────────────────────────────────────────────────────────
app.get('/api/download', (req, res) => {
  const { url, formatId, title } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const safeTitle = (title || 'download').replace(/[^a-zA-Z0-9\-_ ]/g, '').trim() || 'download';
  let args;
  let filename;
  let contentType;

  const commonFlags = [
    '--no-playlist',
    '--no-warnings',
    '--extractor-args', 'youtube:player_client=default,ios',
  ];

  if (formatId === 'audio_mp3') {
    filename = `${safeTitle}.mp3`;
    contentType = 'audio/mpeg';
    args = [
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',            // VBR best → 320 kbps
      ...commonFlags,
      '-o', '-',                         // output to stdout
      url,
    ];
  } else if (formatId === 'audio_best') {
    filename = `${safeTitle}.m4a`;
    contentType = 'audio/mp4';
    args = [
      '-f', 'bestaudio',
      ...commonFlags,
      '-o', '-',
      url,
    ];
  } else if (formatId && formatId.startsWith('video_')) {
    const height = formatId === 'video_best' ? null : formatId.replace('video_', '');
    filename = `${safeTitle}.mp4`;
    contentType = 'video/mp4';
    const fmtSelector = height
      ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
      : 'bestvideo+bestaudio/best';
    args = [
      '-f', fmtSelector,
      '--merge-output-format', 'mp4',
      ...commonFlags,
      '-o', '-',
      url,
    ];
  } else {
    // fallback: best
    filename = `${safeTitle}.mp4`;
    contentType = 'video/mp4';
    args = [
      '-f', 'bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      ...commonFlags,
      '-o', '-',
      url,
    ];
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if used

  const proc = spawn('yt-dlp', args);

  proc.stdout.pipe(res);

  let stderrBuf = '';
  proc.stderr.on('data', d => {
    stderrBuf += d.toString();
  });

  req.on('close', () => {
    proc.kill('SIGTERM');
  });

  proc.on('error', err => {
    console.error('yt-dlp spawn error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'yt-dlp not found' });
    }
  });

  proc.on('close', code => {
    if (code !== 0 && !res.writableEnded) {
      console.error('yt-dlp exited with code', code, stderrBuf);
    }
  });
});

// ─── Thumbnail Proxy ─────────────────────────────────────────────────────────
app.get('/api/download-thumbnail', (req, res) => {
  const { imgUrl, title } = req.query;
  if (!imgUrl) return res.status(400).json({ error: 'imgUrl is required' });

  let decodedUrl;
  try { decodedUrl = decodeURIComponent(imgUrl); } catch { decodedUrl = imgUrl; }

  const safeTitle = (title || 'thumbnail').replace(/[^a-zA-Z0-9\-_ ]/g, '').trim() || 'thumbnail';
  const ext = decodedUrl.split('?')[0].match(/\.(webp|png|gif|jpeg|jpg)$/i)?.[1] || 'jpg';
  const filename = `${safeTitle}_thumbnail.${ext}`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg');

  const client = decodedUrl.startsWith('https') ? https : http;
  client.get(decodedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, imgRes => {
    if (imgRes.statusCode !== 200) {
      return res.status(502).json({ error: `Failed to fetch thumbnail (${imgRes.statusCode})` });
    }
    imgRes.pipe(res);
  }).on('error', err => {
    console.error('Thumbnail proxy error:', err);
    if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch thumbnail' });
  });

  req.on('close', () => {});
});

// ─── SSE Progress ─────────────────────────────────────────────────────────────
app.get('/api/progress', (req, res) => {
  const { url, formatId } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = data => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  let args;
  if (formatId === 'audio_mp3') {
    args = ['-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0', '--no-playlist', '--newline', '--progress', '--no-warnings', '--skip-download', '--print', 'after_move:filepath', url];
  } else if (formatId === 'audio_best') {
    args = ['-f', 'bestaudio', '--no-playlist', '--newline', '--progress', '--no-warnings', '--skip-download', '--print', 'after_move:filepath', url];
  } else {
    const height = (formatId || '').replace('video_', '');
    const fmtSelector = height && formatId !== 'video_best'
      ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
      : 'bestvideo+bestaudio/best';
    args = ['-f', fmtSelector, '--merge-output-format', 'mp4', '--no-playlist', '--newline', '--progress', '--no-warnings', '--skip-download', '--print', 'after_move:filepath', url];
  }

  // Use --simulate to get progress without downloading
  const progressArgs = [
    '--newline',
    '--progress',
    '--no-warnings',
    '--no-playlist',
    '--simulate',
    url,
  ];

  const proc = spawn('yt-dlp', progressArgs);
  let buffer = '';

  proc.stderr.on('data', d => {
    buffer += d.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const m = line.match(/(\d+\.?\d*)%\s+of\s+([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)/);
      if (m) {
        send({ type: 'progress', percent: parseFloat(m[1]), size: m[2], speed: m[3] });
      }
    }
  });

  proc.on('close', () => {
    send({ type: 'done' });
    res.end();
  });

  req.on('close', () => proc.kill('SIGTERM'));
});

// ─── Catch-all → SPA ─────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Universal Media Downloader running at http://localhost:${PORT}`);
});
