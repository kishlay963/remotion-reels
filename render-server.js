const express = require("express");
const multer = require("multer");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3456;

// File mappings: form field -> public filename
const FILE_MAP = {
  mainImage: "1.png",
  endImage: "end.png",
  video: "fourdances.mp4",
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, "public"),
  filename: (req, file, cb) => {
    const mapped = FILE_MAP[file.fieldname];
    if (mapped) return cb(null, mapped);
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

let sseClients = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Serve UI ─────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reel Renderer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d0d0d; color: #e0e0e0; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
  .container { width: 100%; max-width: 520px; background: #1a1a1a; border-radius: 12px; padding: 32px; border: 1px solid #2a2a2a; }
  h1 { font-size: 22px; margin-bottom: 8px; font-weight: 600; }
  .subtitle { color: #888; font-size: 13px; margin-bottom: 28px; }
  .section { margin-bottom: 20px; }
  .section label { display: block; font-size: 13px; font-weight: 500; color: #aaa; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  input[type="file"] { width: 100%; padding: 10px; background: #222; border: 1px dashed #444; border-radius: 6px; color: #ccc; cursor: pointer; font-size: 13px; }
  input[type="file"]:hover { border-color: #666; }
  input[type="text"] { width: 100%; padding: 10px 12px; background: #222; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; font-size: 14px; }
  input[type="text"]:focus { outline: none; border-color: #8b5cf6; }
  .quality-row { display: flex; gap: 12px; }
  .quality-btn { flex: 1; padding: 10px; border: 1px solid #333; border-radius: 6px; background: #222; color: #ccc; cursor: pointer; text-align: center; font-size: 14px; font-weight: 500; transition: all 0.15s; }
  .quality-btn:hover { border-color: #666; }
  .quality-btn.active { background: #8b5cf6; border-color: #8b5cf6; color: #fff; }
  .render-btn { width: 100%; padding: 14px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
  .render-btn:hover { background: #7c3aed; }
  .render-btn:disabled { background: #333; color: #666; cursor: not-allowed; }
  .log-area { margin-top: 20px; background: #0a0a0a; border-radius: 8px; padding: 16px; height: 300px; overflow-y: auto; font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; border: 1px solid #222; }
  .log-area .info { color: #a78bfa; }
  .log-area .progress { color: #60a5fa; }
  .log-area .success { color: #34d399; }
  .log-area .error { color: #f87171; }
  .log-area .warn { color: #fbbf24; }
  .status { font-size: 13px; margin-top: 8px; color: #888; min-height: 20px; }
  .file-status { font-size: 11px; color: #666; margin-top: 2px; }
  .file-status.ok { color: #34d399; }
</style>
</head>
<body>
<div class="container">
  <h1>Reel Renderer</h1>
  <p class="subtitle">Upload assets &mdash; captions auto-aligned via Whisper</p>

  <form id="renderForm" enctype="multipart/form-data">
    <div class="section">
      <label>Main Image (1.png)</label>
      <input type="file" id="mainImage" name="mainImage" accept="image/*">
      <div class="file-status" id="mainImageStatus"></div>
    </div>
    <div class="section">
      <label>End Image (end.png)</label>
      <input type="file" id="endImage" name="endImage" accept="image/*">
      <div class="file-status" id="endImageStatus"></div>
    </div>
    <div class="section">
      <label>Video (fourdances.mp4)</label>
      <input type="file" id="video" name="video" accept="video/*">
      <div class="file-status" id="videoStatus"></div>
    </div>
    <div class="section">
      <label>Quality</label>
      <div class="quality-row">
        <div class="quality-btn active" data-quality="low" onclick="setQuality('low', this)">Low (fast preview)</div>
        <div class="quality-btn" data-quality="full" onclick="setQuality('full', this)">Full (1080p)</div>
      </div>
    </div>
    <div class="section">
      <label>Output Folder</label>
      <input type="text" id="outputDir" placeholder="e.g. C:\\Users\\Kairav\\Desktop\\output">
    </div>
    <button type="submit" class="render-btn" id="renderBtn">Transcribe + Render</button>
    <div class="status" id="status"></div>
  </form>

  <div class="log-area" id="log"></div>
</div>

<script>
  let quality = 'low';
  let rendering = false;

  function setQuality(q, el) {
    quality = q;
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  function log(msg, cls) {
    const el = document.getElementById('log');
    const span = document.createElement('span');
    span.className = cls || '';
    span.textContent = msg + '\\n';
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;
  }

  function setStatus(msg) {
    document.getElementById('status').textContent = msg;
  }

  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', () => {
      const statusId = input.id + 'Status';
      const file = input.files[0];
      if (file) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        document.getElementById(statusId).textContent = file.name + ' (' + sizeMB + ' MB)';
        document.getElementById(statusId).className = 'file-status ok';
      }
    });
  });

  async function readFileAsBlob(file) {
    const buf = await file.arrayBuffer();
    return new Blob([buf], { type: file.type });
  }

  document.getElementById('renderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (rendering) return;

    const outputDir = document.getElementById('outputDir').value.trim();
    if (!outputDir) { log('ERROR: Please enter an output folder', 'error'); return; }

    const mainFile = document.getElementById('mainImage').files[0];
    const endFile = document.getElementById('endImage').files[0];
    const videoFile = document.getElementById('video').files[0];

    let missing = [];
    if (!mainFile) missing.push('Main Image');
    if (!endFile) missing.push('End Image');
    if (!videoFile) missing.push('Video');
    if (missing.length) { log('ERROR: Missing: ' + missing.join(', '), 'error'); return; }

    rendering = true;
    const btn = document.getElementById('renderBtn');
    btn.disabled = true;
    btn.textContent = 'Working...';
    document.getElementById('log').innerHTML = '';
    setStatus('Reading files...');

    // Read files into memory to avoid ERR_UPLOAD_FILE_CHANGED
    const [mainBlob, endBlob, videoBlob] = await Promise.all([
      readFileAsBlob(mainFile),
      readFileAsBlob(endFile),
      readFileAsBlob(videoFile),
    ]);

    const formData = new FormData();
    formData.append('mainImage', mainBlob, mainFile.name);
    formData.append('endImage', endBlob, endFile.name);
    formData.append('video', videoBlob, videoFile.name);
    formData.append('quality', quality);
    formData.append('outputDir', outputDir);

    setStatus('Uploading...');

    try {
      const resp = await fetch('/render', { method: 'POST', body: formData });
      if (!resp.ok) { log('ERROR: Server error ' + resp.status, 'error'); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'log') log(data.msg, data.cls);
            if (data.type === 'done') { log(data.msg, 'success'); setStatus('Done'); }
            if (data.type === 'error') { log(data.msg, 'error'); setStatus('Failed'); }
            if (data.type === 'status') setStatus(data.msg);
          } catch {}
        }
      }
    } catch (err) {
      log('ERROR: ' + err.message, 'error');
      setStatus('Failed');
    } finally {
      rendering = false;
      btn.disabled = false;
      btn.textContent = 'Transcribe + Render';
    }
  });
</script>
</body>
</html>`);
});

// ── SSE endpoint ─────────────────────────────────────────────────
app.get("/progress", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  sseClients.push(res);
  req.on("close", () => { sseClients = sseClients.filter(c => c !== res); });
});

function broadcast(data) {
  sseClients.forEach(c => {
    try { c.write("data: " + JSON.stringify(data) + "\n\n"); } catch {}
  });
}

// ── Whisper transcription helper ─────────────────────────────────
function transcribeVideo(send) {
  return new Promise((resolve, reject) => {
    const videoPath = path.join(__dirname, "public", "fourdances.mp4");
    send({ type: "log", msg: "Running Whisper transcription...", cls: "info" });
    send({ type: "status", msg: "Transcribing audio..." });

    // Check if whisper is available
    try {
      execSync('python -c "import whisper"', { stdio: "ignore" });
    } catch {
      return reject(new Error("Python whisper module not installed. Run: pip install openai-whisper"));
    }

    const child = spawn("python", ["-c", `
import whisper, json, sys

model = whisper.load_model("medium")
result = model.transcribe(r"${videoPath.replace(/\\/g, "\\\\")}", word_timestamps=True)

# Output just the word-level timings as JSON
words = []
for seg in result["segments"]:
    for w in seg.get("words", []):
        words.append({"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)})

print(json.dumps(words))
`]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", d => { stdout += d.toString(); });
    child.stderr.on("data", d => {
      const text = d.toString();
      stderr += text;
      // Whisper logs progress to stderr
      const match = text.match(/(\d+)%/);
      if (match) send({ type: "log", msg: "Whisper: " + match[1] + "%", cls: "progress" });
    });

    child.on("close", code => {
      if (code !== 0) return reject(new Error("Whisper failed: " + stderr.slice(-500)));

      try {
        let words;
        // Find the JSON array in stdout (last line is the JSON dump)
        const lines = stdout.trim().split("\n");
        for (let i = lines.length - 1; i >= 0; i--) {
          try { words = JSON.parse(lines[i]); break; } catch {}
        }
        if (!words || !Array.isArray(words)) return reject(new Error("Failed to parse Whisper output"));

        send({ type: "log", msg: "Transcribed " + words.length + " words", cls: "success" });
        resolve(words);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ── Group words into caption chunks by pause gaps ────────────────
function groupWordsIntoChunks(words, fps) {
  const MAX_WORDS = 4; // keep chunks small so captions appear word-by-word
  const chunks = [];
  let currentChunk = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentChunk.push(w);

    if (currentChunk.length >= MAX_WORDS || i === words.length - 1) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  }

  // Convert to CaptionChunk format with frame timestamps
  return chunks.map(chunk => {
    const wordTimings = chunk.map(w => ({
      word: w.word,
      startFrame: Math.round(w.start * fps),
      endFrame: Math.round(w.end * fps),
    }));
    return {
      words: wordTimings,
      startFrame: wordTimings[0].startFrame,
      endFrame: wordTimings[wordTimings.length - 1].endFrame,
    };
  });
}

// ── Generate captions-data.ts ─────────────────────────────────────
function writeCaptionsFile(captions, totalFrames) {
  const outPath = path.join(__dirname, "src", "captions-data.ts");

  // Format a single word timing as TS object literal
  const fmtWord = (w) => `    { word: ${JSON.stringify(w.word)}, startFrame: ${w.startFrame}, endFrame: ${w.endFrame} }`;

  // Format a chunk
  const fmtChunk = (c, ci) => {
    const words = c.words.map(fmtWord).join(",\n");
    return `  { words: [\n${words}\n  ], startFrame: ${c.startFrame}, endFrame: ${c.endFrame} }`;
  };

  const chunksBody = captions.map(fmtChunk).join(",\n");

  const content = `// Auto-generated by render-server.js — Whisper transcription
// Generated at: ${new Date().toISOString()}

export type WordTiming = {
  word: string;
  startFrame: number;
  endFrame: number;
};

export type CaptionChunk = {
  words: WordTiming[];
  startFrame: number;
  endFrame: number;
};

export const TOTAL_FRAMES = ${totalFrames};

export const CAPTIONS: CaptionChunk[] = [
${chunksBody}
];
`;

  fs.writeFileSync(outPath, content, "utf-8");
  return outPath;
}

// ── Render endpoint ──────────────────────────────────────────────
app.post("/render", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "endImage", maxCount: 1 },
  { name: "video", maxCount: 1 },
]), async (req, res) => {
  const { quality, outputDir } = req.body;

  if (!outputDir || !fs.existsSync(outputDir)) {
    return res.status(400).json({ error: "Output folder does not exist" });
  }

  res.writeHead(200, { "Content-Type": "application/x-ndjson" });

  const send = (data) => {
    broadcast(data);
    try { res.write(JSON.stringify(data) + "\n"); } catch {}
  };

  try {
    // Step 1: Transcribe
    send({ type: "status", msg: "Transcribing audio with Whisper..." });
    const whisperWords = await transcribeVideo(send);

    // Step 2: Group into caption chunks
    const FPS = 30;
    const captions = groupWordsIntoChunks(whisperWords, FPS);
    const totalFrames = captions.length > 0
      ? captions[captions.length - 1].endFrame
      : 1217;

    send({ type: "log", msg: captions.length + " caption chunks, " + totalFrames + " total frames", cls: "info" });

    // Step 3: Write captions-data.ts
    send({ type: "status", msg: "Writing caption data..." });
    writeCaptionsFile(captions, totalFrames);
    send({ type: "log", msg: "Written to src/captions-data.ts", cls: "success" });

    // Step 4: Render (clear webpack cache so captions-data.ts is fresh)
    send({ type: "status", msg: "Clearing bundle cache..." });
    const cacheDir = path.join(__dirname, "node_modules", ".cache");
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });

    const filename = quality === "full" ? "tiktok-reel.mp4" : "tiktok-reel-low.mp4";
    const outputPath = path.join(outputDir, filename);
    const args = ["remotion", "render", "TikTokReel", outputPath];
    if (quality === "low") args.push("--crf", "35", "--scale", "0.5");

    send({ type: "log", msg: "Rendering: " + outputPath, cls: "info" });
    send({ type: "status", msg: "Rendering " + (quality === "full" ? "full quality" : "low quality") + "..." });

    const child = spawn("npx", args, { cwd: __dirname, shell: true });

    let progressLines = [];

    child.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.includes("Rendered") || trimmed.includes("Encoded") || trimmed.includes("Error") || trimmed.includes("Built") || trimmed.includes("+") || trimmed.includes("○")) {
          send({ type: "log", msg: trimmed, cls: trimmed.includes("Error") ? "error" : "progress" });
        }
      }
    });

    child.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) send({ type: "log", msg: text, cls: "progress" });
    });

    child.on("close", (code) => {
      if (code === 0) {
        const sizeMB = fs.existsSync(outputPath) ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1) : "?";
        send({ type: "done", msg: "Rendered: " + outputPath + " (" + sizeMB + " MB)" });
      } else {
        send({ type: "error", msg: "Render failed with exit code " + code });
      }
      res.end();
    });

  } catch (err) {
    send({ type: "error", msg: err.message });
    res.end();
  }
});

app.listen(PORT, () => {
  console.log("Reel Renderer running at http://localhost:" + PORT);
});
