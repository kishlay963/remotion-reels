const express = require("express");
const multer  = require("multer");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs   = require("fs");

const app  = express();
const PORT = 3456;

// Temp dir for incoming uploads before we rename them
const TEMP_DIR   = path.join(__dirname, "public", "_uploads_temp");
const PUBLIC_DIR = path.join(__dirname, "public");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Save all incoming files to temp dir; we rename after parsing config
const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) =>
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname) || ".bin"}`),
});
const upload = multer({ storage }).any();

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ── Serve config template ─────────────────────────────────────────
app.get("/template.json", (_req, res) => {
  const tpl = path.join(__dirname, "src", "reel-config.json");
  res.sendFile(tpl);
});

// ── Serve UI ─────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reel Renderer</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;color:#e0e0e0;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:40px 20px}
  .container{width:100%;max-width:560px}
  .card{background:#1a1a1a;border-radius:12px;padding:32px;border:1px solid #2a2a2a;margin-bottom:16px}
  h1{font-size:22px;margin-bottom:6px;font-weight:600}
  .subtitle{color:#888;font-size:13px;margin-bottom:0}
  h2{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#aaa;margin-bottom:16px}
  .section{margin-bottom:18px}
  label{display:block;font-size:13px;font-weight:500;color:#aaa;margin-bottom:5px}
  .hint{font-size:11px;color:#555;margin-left:6px;font-weight:400;font-family:monospace}
  input[type=file]{width:100%;padding:10px;background:#222;border:1px dashed #444;border-radius:6px;color:#ccc;cursor:pointer;font-size:13px}
  input[type=file]:hover{border-color:#666}
  input[type=text]{width:100%;padding:10px 12px;background:#222;border:1px solid #333;border-radius:6px;color:#e0e0e0;font-size:14px}
  input[type=text]:focus{outline:none;border-color:#8b5cf6}
  .file-meta{font-size:11px;color:#555;margin-top:3px}
  .file-meta.ok{color:#34d399}
  .quality-row{display:flex;gap:10px}
  .quality-btn{flex:1;padding:10px;border:1px solid #333;border-radius:6px;background:#222;color:#ccc;cursor:pointer;text-align:center;font-size:13px;font-weight:500;transition:all .15s;user-select:none}
  .quality-btn:hover{border-color:#666}
  .quality-btn.active{background:#8b5cf6;border-color:#8b5cf6;color:#fff}
  .render-btn{width:100%;padding:14px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:background .15s}
  .render-btn:hover{background:#7c3aed}
  .render-btn:disabled{background:#333;color:#666;cursor:not-allowed}
  .log-area{background:#0a0a0a;border-radius:8px;padding:16px;height:320px;overflow-y:auto;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all;border:1px solid #222;margin-top:16px}
  .log-area .info{color:#a78bfa}
  .log-area .progress{color:#60a5fa}
  .log-area .success{color:#34d399}
  .log-area .error{color:#f87171}
  .status{font-size:13px;margin-top:8px;color:#888;min-height:20px}
  .template-link{font-size:12px;color:#8b5cf6;text-decoration:none;margin-left:8px}
  .template-link:hover{text-decoration:underline}
  .badge{display:inline-block;font-size:10px;padding:2px 7px;border-radius:4px;background:#2a2a2a;color:#888;margin-left:6px;vertical-align:middle;font-weight:500;text-transform:uppercase;letter-spacing:.4px}
  .badge.ok{background:#1a3a2a;color:#34d399}
  .divider{height:1px;background:#2a2a2a;margin:20px 0}
  #dynamicFields .section{animation:fadeIn .2s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  .asset-grid{display:grid;gap:14px}
  .config-row{display:flex;align-items:center;gap:10px}
  .config-row input[type=file]{flex:1}
  .loaded-pill{font-size:11px;padding:3px 9px;border-radius:20px;background:#1a3a2a;color:#34d399;border:1px solid #2a5a3a;white-space:nowrap}
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="card">
    <h1>Reel Renderer</h1>
    <p class="subtitle">JSON-driven &bull; multi b-roll &bull; auto captions via Whisper
      <a class="template-link" href="/template.json" download="reel-config.json">Download template</a>
    </p>
  </div>

  <!-- Step 1: Config JSON -->
  <div class="card" id="step1Card">
    <h2>Step 1 &mdash; Load Config JSON</h2>
    <div class="section">
      <label>reel-config.json <span class="hint">(defines timeline, effects, assets)</span></label>
      <div class="config-row">
        <input type="file" id="configFile" accept=".json,application/json">
        <span id="configPill" style="display:none" class="loaded-pill">&#10003; loaded</span>
      </div>
      <div class="file-meta" id="configMeta"></div>
    </div>
  </div>

  <!-- Step 2: Dynamic asset uploads (rendered by JS) -->
  <div id="step2Wrap" style="display:none">
    <div class="card">
      <h2>Step 2 &mdash; Upload Assets <span id="assetCount" class="badge"></span></h2>
      <div class="asset-grid" id="dynamicFields"></div>
    </div>

    <!-- Step 3: Render options -->
    <div class="card">
      <h2>Step 3 &mdash; Render</h2>
      <div class="section">
        <label>Quality</label>
        <div class="quality-row">
          <div class="quality-btn active" data-q="low"  onclick="setQ('low',this)">Low &mdash; fast preview</div>
          <div class="quality-btn"        data-q="full" onclick="setQ('full',this)">Full &mdash; 1080p</div>
        </div>
      </div>
      <div class="section">
        <label>Output Folder</label>
        <input type="text" id="outputDir" placeholder="e.g. C:\\Users\\Kairav\\Desktop\\output">
      </div>
      <button class="render-btn" id="renderBtn" onclick="startRender()">Transcribe + Render</button>
      <div class="status" id="status"></div>
      <div class="log-area" id="log" style="display:none"></div>
    </div>
  </div>

</div>

<script>
  let quality = 'low';
  let loadedConfig = null;
  let rendering = false;

  function setQ(q, el) {
    quality = q;
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  function log(msg, cls) {
    const el = document.getElementById('log');
    el.style.display = 'block';
    const span = document.createElement('span');
    span.className = cls || '';
    span.textContent = msg + '\\n';
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;
  }

  function setStatus(msg) { document.getElementById('status').textContent = msg; }

  // Strip // line comments so users can annotate their JSON files.
  // Uses line-splitting instead of a regex to avoid template-literal escape issues.
  function parseJsonLoose(text) {
    var out = text.split('\\n').map(function(line) {
      var i = line.indexOf('//');
      return i < 0 ? line : line.slice(0, i);
    }).join('\\n');
    return JSON.parse(out);
  }

  // ── Load config JSON ─────────────────────────────────────────
  document.getElementById('configFile').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        loadedConfig = parseJsonLoose(e.target.result);
        document.getElementById('configMeta').textContent = file.name + ' (' + loadedConfig.assets.broll.length + ' b-roll slots, ' + loadedConfig.timeline.length + ' timeline clips)';
        document.getElementById('configMeta').className = 'file-meta ok';
        document.getElementById('configPill').style.display = 'inline-block';
        renderAssetFields(loadedConfig);
      } catch(err) {
        document.getElementById('configMeta').textContent = 'Invalid JSON: ' + err.message;
        document.getElementById('configMeta').className = 'file-meta error';
        document.getElementById('step2Wrap').style.display = 'none';
      }
    };
    reader.readAsText(file);
  });

  function renderAssetFields(config) {
    const grid = document.getElementById('dynamicFields');
    grid.innerHTML = '';

    // Video field
    const videoSection = makeFileSection(
      'video',
      'Video / Audio Source',
      config.assets.video,
      'video/*'
    );
    grid.appendChild(videoSection);

    // B-roll fields
    for (const broll of config.assets.broll) {
      const section = makeFileSection(
        'broll_' + broll.id,
        broll.label,
        broll.filename,
        'image/*'
      );
      grid.appendChild(section);
    }

    document.getElementById('assetCount').textContent = (1 + config.assets.broll.length) + ' files';
    document.getElementById('assetCount').className = 'badge';
    document.getElementById('step2Wrap').style.display = 'block';
  }

  function makeFileSection(fieldName, label, filename, accept) {
    const wrap = document.createElement('div');
    wrap.className = 'section';
    wrap.style.marginBottom = '0';
    wrap.innerHTML =
      '<label>' + esc(label) + '<span class="hint">(' + esc(filename) + ')</span></label>' +
      '<input type="file" id="field_' + esc(fieldName) + '" accept="' + accept + '">' +
      '<div class="file-meta" id="meta_' + esc(fieldName) + '">optional — reuses existing file if blank</div>';
    const input = wrap.querySelector('input');
    const meta  = wrap.querySelector('.file-meta');
    input.addEventListener('change', () => {
      const f = input.files[0];
      if (f) {
        meta.textContent = f.name + ' (' + (f.size/1024/1024).toFixed(1) + ' MB)';
        meta.className = 'file-meta ok';
      }
    });
    return wrap;
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Submit ────────────────────────────────────────────────────
  async function startRender() {
    if (rendering || !loadedConfig) return;
    const outputDir = document.getElementById('outputDir').value.trim();
    if (!outputDir) { log('ERROR: Please enter an output folder', 'error'); return; }

    rendering = true;
    const btn = document.getElementById('renderBtn');
    btn.disabled = true; btn.textContent = 'Working...';
    document.getElementById('log').innerHTML = '';
    setStatus('Reading files...');

    const formData = new FormData();
    formData.append('configJson', JSON.stringify(loadedConfig));
    formData.append('quality', quality);
    formData.append('outputDir', outputDir);

    // Append video
    const videoInput = document.getElementById('field_video');
    if (videoInput && videoInput.files[0]) {
      const vf = videoInput.files[0];
      const buf = await vf.arrayBuffer();
      formData.append('video', new Blob([buf], {type: vf.type}), vf.name);
    }

    // Append broll files
    for (const broll of loadedConfig.assets.broll) {
      const inp = document.getElementById('field_broll_' + broll.id);
      if (inp && inp.files[0]) {
        const bf = inp.files[0];
        const buf = await bf.arrayBuffer();
        formData.append('broll_' + broll.id, new Blob([buf], {type: bf.type}), bf.name);
      }
    }

    setStatus('Uploading...');
    try {
      const resp = await fetch('/render', { method: 'POST', body: formData });
      if (!resp.ok) { log('Server error ' + resp.status, 'error'); return; }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const d = JSON.parse(line);
            if (d.type === 'log')    log(d.msg, d.cls);
            if (d.type === 'done')   { log(d.msg, 'success'); setStatus('Done'); }
            if (d.type === 'error')  { log(d.msg, 'error');   setStatus('Failed'); }
            if (d.type === 'status') setStatus(d.msg);
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
  }
</script>
</body>
</html>`);
});

// ── Whisper transcription ─────────────────────────────────────────
function transcribeVideo(videoPath, send) {
  return new Promise((resolve, reject) => {
    send({ type: "log", msg: "Running Whisper transcription...", cls: "info" });
    send({ type: "status", msg: "Transcribing audio..." });

    try {
      execSync('python -c "import whisper"', { stdio: "ignore" });
    } catch {
      return reject(new Error("Python whisper not installed. Run: pip install openai-whisper"));
    }

    const script = `
import whisper, json, sys
model = whisper.load_model("medium")
result = model.transcribe(r"${videoPath.replace(/\\/g, "\\\\")}", word_timestamps=True)
words = []
for seg in result["segments"]:
    for w in seg.get("words", []):
        words.append({"word": w["word"].strip(), "start": round(w["start"],3), "end": round(w["end"],3)})
print(json.dumps(words))`;

    const child = spawn("python", ["-c", script]);
    let stdout = "", stderr = "";

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => {
      const t = d.toString();
      stderr += t;
      const m = t.match(/(\d+)%/);
      if (m) send({ type: "log", msg: "Whisper: " + m[1] + "%", cls: "progress" });
    });

    child.on("close", (code) => {
      if (code !== 0) return reject(new Error("Whisper failed: " + stderr.slice(-500)));
      try {
        const lines = stdout.trim().split("\n");
        let words;
        for (let i = lines.length - 1; i >= 0; i--) {
          try { words = JSON.parse(lines[i]); break; } catch {}
        }
        if (!Array.isArray(words)) return reject(new Error("Failed to parse Whisper output"));
        send({ type: "log", msg: "Transcribed " + words.length + " words", cls: "success" });
        resolve(words);
      } catch (e) { reject(e); }
    });
  });
}

// ── Group words into caption chunks ──────────────────────────────
function groupWordsIntoChunks(words, fps) {
  const MAX_WORDS = 4;
  const chunks = [];
  let cur = [];
  for (let i = 0; i < words.length; i++) {
    cur.push(words[i]);
    if (cur.length >= MAX_WORDS || i === words.length - 1) {
      chunks.push(cur);
      cur = [];
    }
  }
  return chunks.map((chunk) => {
    const wt = chunk.map((w) => ({
      word: w.word,
      startFrame: Math.round(w.start * fps),
      endFrame:   Math.round(w.end   * fps),
    }));
    return { words: wt, startFrame: wt[0].startFrame, endFrame: wt[wt.length - 1].endFrame };
  });
}

// ── Write captions-data.ts ────────────────────────────────────────
function writeCaptionsFile(captions, totalFrames) {
  const fmtWord  = (w) => `    { word: ${JSON.stringify(w.word)}, startFrame: ${w.startFrame}, endFrame: ${w.endFrame} }`;
  const fmtChunk = (c)  => `  { words: [\n${c.words.map(fmtWord).join(",\n")}\n  ], startFrame: ${c.startFrame}, endFrame: ${c.endFrame} }`;

  const content = `// Auto-generated by render-server.js — Whisper transcription
// Generated at: ${new Date().toISOString()}

export type WordTiming  = { word: string; startFrame: number; endFrame: number };
export type CaptionChunk = { words: WordTiming[]; startFrame: number; endFrame: number };

export const TOTAL_FRAMES = ${totalFrames};

export const CAPTIONS: CaptionChunk[] = [
${captions.map(fmtChunk).join(",\n")}
];
`;
  fs.writeFileSync(path.join(__dirname, "src", "captions-data.ts"), content, "utf-8");
}

// ── Write reel-config.json from config object ─────────────────────
function writeReelConfig(config, totalFrames) {
  const resolved = JSON.parse(JSON.stringify(config)); // deep clone

  // 1. Resolve explicit "auto" / null / 0 endFrames
  for (const clip of resolved.timeline) {
    if (clip.endFrame === "auto" || clip.endFrame === 0 || clip.endFrame == null) {
      clip.endFrame = totalFrames;
    }
  }

  // 2. Auto-extend the last non-emoji clip so the Series fills the full audio duration.
  //    This prevents blank frames when the video is longer than the configured timeline.
  const mainClips = resolved.timeline.filter((c) => c.type !== "emoji");
  if (mainClips.length > 0) {
    const seriesDuration = mainClips.reduce(
      (sum, c) => sum + (c.endFrame - c.startFrame + 1), 0
    );
    const gap = totalFrames - seriesDuration;
    if (gap > 0) {
      mainClips[mainClips.length - 1].endFrame += gap;
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "src", "reel-config.json"),
    JSON.stringify(resolved, null, 2),
    "utf-8"
  );
}

// ── Render endpoint ──────────────────────────────────────────────
app.post("/render", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: "Upload error: " + err.message });
    }

    const { quality, outputDir, configJson } = req.body;

    if (!configJson) return res.status(400).json({ error: "Missing configJson field" });
    if (!outputDir || !fs.existsSync(outputDir))
      return res.status(400).json({ error: "Output folder does not exist" });

    let config;
    try {
      // Strip // line comments so annotated JSON files are accepted
      const stripped = configJson.replace(/\/\/[^\n\r]*/g, "");
      config = JSON.parse(stripped);
    }
    catch (e) { return res.status(400).json({ error: "Invalid config JSON: " + e.message }); }

    res.writeHead(200, { "Content-Type": "application/x-ndjson" });
    const send = (data) => { try { res.write(JSON.stringify(data) + "\n"); } catch {} };

    try {
      // ── Move uploaded files to their configured public/ destinations ──
      const files = req.files || [];
      for (const file of files) {
        let dest = null;
        if (file.fieldname === "video") {
          dest = path.join(PUBLIC_DIR, config.assets.video);
        } else if (file.fieldname.startsWith("broll_")) {
          const id = file.fieldname.slice(6);
          const broll = config.assets.broll.find((b) => b.id === id);
          if (broll) dest = path.join(PUBLIC_DIR, broll.filename);
        }
        if (dest) {
          fs.renameSync(file.path, dest);
          send({ type: "log", msg: "Saved: " + path.basename(dest), cls: "info" });
        } else {
          fs.unlinkSync(file.path); // discard unknown field
        }
      }

      // ── Verify required assets exist ──────────────────────────────────
      const videoPath = path.join(PUBLIC_DIR, config.assets.video);
      if (!fs.existsSync(videoPath))
        throw new Error("Video file not found: " + config.assets.video + " — upload it first");

      for (const broll of config.assets.broll) {
        const imgPath = path.join(PUBLIC_DIR, broll.filename);
        if (!fs.existsSync(imgPath))
          throw new Error("B-roll image not found: " + broll.filename + " (" + broll.label + ") — upload it");
      }

      // ── Whisper ───────────────────────────────────────────────────────
      send({ type: "status", msg: "Transcribing with Whisper..." });
      const whisperWords = await transcribeVideo(videoPath, send);

      const FPS      = 30;
      const captions = groupWordsIntoChunks(whisperWords, FPS);
      const totalFrames = captions.length > 0
        ? captions[captions.length - 1].endFrame
        : 1352;

      send({ type: "log", msg: captions.length + " caption chunks, total frames: " + totalFrames, cls: "info" });

      // ── Write src files ───────────────────────────────────────────────
      send({ type: "status", msg: "Writing config + captions..." });
      writeReelConfig(config, totalFrames);
      writeCaptionsFile(captions, totalFrames);
      send({ type: "log", msg: "src/reel-config.json written", cls: "success" });
      send({ type: "log", msg: "src/captions-data.ts written", cls: "success" });

      // ── Clear bundle cache ────────────────────────────────────────────
      const cacheDir = path.join(__dirname, "node_modules", ".cache");
      if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
      send({ type: "log", msg: "Bundle cache cleared", cls: "info" });

      // ── Render ────────────────────────────────────────────────────────
      const filename   = quality === "full" ? "tiktok-reel.mp4" : "tiktok-reel-low.mp4";
      const outputPath = path.join(outputDir, filename);
      const args = ["remotion", "render", "TikTokReel", outputPath];
      if (quality === "low") args.push("--crf", "35", "--scale", "0.5");

      send({ type: "log", msg: "Rendering: " + outputPath, cls: "info" });
      send({ type: "status", msg: "Rendering " + (quality === "full" ? "full 1080p" : "low quality preview") + "..." });

      const child = spawn("npx", args, { cwd: __dirname, shell: true });

      child.stdout.on("data", (data) => {
        for (const line of data.toString().split("\n").filter(Boolean)) {
          const t = line.trim();
          if (t) send({ type: "log", msg: t, cls: t.includes("Error") ? "error" : "progress" });
        }
      });
      child.stderr.on("data", (data) => {
        const t = data.toString().trim();
        if (t) send({ type: "log", msg: t, cls: "progress" });
      });
      child.on("close", (code) => {
        if (code === 0) {
          const size = fs.existsSync(outputPath)
            ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1) + " MB"
            : "?";
          send({ type: "done", msg: "Done: " + outputPath + " (" + size + ")" });
        } else {
          send({ type: "error", msg: "Render failed (exit " + code + ")" });
        }
        res.end();
      });

    } catch (err) {
      // Cleanup any leftover temp files
      for (const file of (req.files || [])) {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      }
      send({ type: "error", msg: err.message });
      res.end();
    }
  });
});

app.listen(PORT, () => {
  console.log("Reel Renderer  http://localhost:" + PORT);
});
