/**
 * setup-wincsc.mjs
 *
 * Pre-extracts winCodeSign into the electron-builder cache directory so that
 * electron-builder doesn't try to do it itself (which fails on Windows without
 * Developer Mode because the archive contains macOS symlinks).
 *
 * The .7z still extracts all Windows-needed files successfully (exit code 2 = warnings).
 * We create empty placeholder files for the two macOS symlinks that can't be created,
 * then move the result to the exact path electron-builder expects.
 *
 * Run once before your first build:  node scripts/setup-wincsc.mjs
 */

import { execFileSync }              from 'child_process';
import { existsSync, mkdirSync,
         writeFileSync, renameSync,
         rmSync }                    from 'fs';
import { createWriteStream }         from 'fs';
import { get }                       from 'https';
import { join }                      from 'path';
import { homedir, tmpdir }           from 'os';

// ─────────────────────────────────────────────
const VERSION   = '2.6.0';
const URL       = `https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-${VERSION}/winCodeSign-${VERSION}.7z`;
const CACHE_DIR = join(homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign', `winCodeSign-${VERSION}`);
const SEVENZIP  = join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
const TMP_7Z    = join(tmpdir(), `winCodeSign-${VERSION}.7z`);
const TMP_DIR   = join(tmpdir(), `winCodeSign-${VERSION}-extract`);

// ─────────────────────────────────────────────

if (existsSync(CACHE_DIR)) {
  console.log('✓ winCodeSign cache already present, nothing to do.');
  process.exit(0);
}

console.log('Downloading winCodeSign', VERSION, '…');
await download(URL, TMP_7Z);
console.log('  Downloaded to', TMP_7Z);

console.log('Extracting (ignoring macOS symlink errors) …');
mkdirSync(TMP_DIR, { recursive: true });
try {
  execFileSync(SEVENZIP, ['x', TMP_7Z, `-o${TMP_DIR}`, '-y'], { stdio: 'pipe' });
} catch (err) {
  // Exit code 2 = "warnings" — the Windows files extract fine; only the two
  // macOS dylib symlinks fail (not needed on Windows).
  if (err.status !== 2) {
    console.error('Unexpected 7za error (exit', err.status, '):\n', err.stderr?.toString());
    process.exit(1);
  }
}

// Create empty placeholder files for the missing macOS symlink targets
const darwinLib = join(TMP_DIR, 'darwin', '10.12', 'lib');
mkdirSync(darwinLib, { recursive: true });
writeFileSync(join(darwinLib, 'libcrypto.dylib'), '');
writeFileSync(join(darwinLib, 'libssl.dylib'), '');
console.log('  Created placeholder macOS symlink targets');

// Move extracted directory to the path electron-builder expects
const parentDir = join(homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
mkdirSync(parentDir, { recursive: true });
renameSync(TMP_DIR, CACHE_DIR);
console.log('  Moved to cache:', CACHE_DIR);

rmSync(TMP_7Z, { force: true });
console.log('✓ winCodeSign cache ready. You can now run electron:build.');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    function fetch(currentUrl, redirects = 0) {
      if (redirects > 10) { reject(new Error('Too many redirects')); return; }
      get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); // discard body
          fetch(res.headers.location, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
          return;
        }
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', (e) => { rmSync(dest, { force: true }); reject(e); });
      }).on('error', reject);
    }
    fetch(url);
  });
}
