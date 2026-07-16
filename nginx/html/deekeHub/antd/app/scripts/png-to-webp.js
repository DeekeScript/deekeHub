const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob') || require('fs');

const distDir = path.join(__dirname, '..', 'dist');

// Only convert these specific large PNGs (skip logo.png which is tiny)
const targets = ['mobile.png', 'wechat.png', 'app.png', 'qiwei.png'];

// Simple recursive file finder (no glob dependency needed)
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'monaco-editor') continue; // skip vendor assets
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

// Replace .png → .webp in text files (JS, CSS, HTML)
function replaceInFile(filePath, map) {
  const ext = path.extname(filePath);
  if (!['.js', '.css', '.html'].includes(ext)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of Object.entries(map)) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

(async () => {
  if (!fs.existsSync(distDir)) {
    console.log('[png-to-webp] dist/ not found, skipping');
    return;
  }

  // Step 1: Convert PNG → WebP
  const map = {};
  console.log('[png-to-webp] Converting PNGs in dist/...');
  for (const file of targets) {
    const src = path.join(distDir, file);
    if (!fs.existsSync(src)) {
      console.log(`  skip (not found): ${file}`);
      continue;
    }
    const before = fs.statSync(src).size;
    const dest = src.replace(/\.png$/, '.webp');
    await sharp(src).webp({ quality: 85 }).toFile(dest);
    const after = fs.statSync(dest).size;
    const pct = ((1 - after / before) * 100).toFixed(0);
    console.log(`  ${file} → ${path.basename(dest)}  (${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB, -${pct}%)`);
    map[file] = path.basename(dest);
    // Remove original PNG from dist to save space
    fs.unlinkSync(src);
  }

  if (Object.keys(map).length === 0) {
    console.log('[png-to-webp] No PNGs to convert');
    return;
  }

  // Step 2: Update references in all dist text files
  console.log('[png-to-webp] Updating references...');
  const files = walk(distDir);
  for (const f of files) {
    replaceInFile(f, map);
  }

  console.log('[png-to-webp] Done');
})();
