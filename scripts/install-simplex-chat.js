const childProcess = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const SIMPLEX_VERSION = '6.5.5';
const RELEASE_TAG = `v${SIMPLEX_VERSION}`;
const PACKAGE_NAME = 'simplex-chat';
const ROOT_DIR = path.resolve(__dirname, '..');
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules');
const PACKAGE_DIR = path.join(NODE_MODULES_DIR, PACKAGE_NAME);
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'simplex-chat');

function log(message) {
  console.log(`[simplex-chat] ${message}`);
}

function run(command, args, options = {}) {
  childProcess.execFileSync(command, args, {
    cwd: options.cwd || ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDirSync(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const NODE_GYP_BIN = path.join(
  ROOT_DIR, 'node_modules', '.bin',
  process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp'
);

const TSC_BIN = path.join(
  ROOT_DIR, 'node_modules', '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));

    const request = (currentUrl) => {
      const file = fs.createWriteStream(dest);
      https
        .get(currentUrl, { headers: { 'User-Agent': 'supernotifier-install' } }, (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            file.destroy();
            fs.rmSync(dest, { force: true });
            request(response.headers.location);
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            file.destroy();
            fs.rmSync(dest, { force: true });
            reject(new Error(`HTTP ${response.statusCode} downloading ${currentUrl}`));
            return;
          }

          response.pipe(file);
          file.on('finish', () => file.close(resolve));
        })
        .on('error', (error) => {
          fs.rmSync(dest, { force: true });
          reject(error);
        });
    };

    request(url);
  });
}

async function downloadIfMissing(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    log(`using cached ${path.basename(dest)}`);
    return;
  }

  await download(url, dest);
}

function isPackageInstalled() {
  const packageJson = path.join(PACKAGE_DIR, 'package.json');
  if (!fs.existsSync(packageJson)) return false;

  const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  return pkg.name === PACKAGE_NAME && pkg.version === SIMPLEX_VERSION;
}

async function installPackage() {
  if (isPackageInstalled()) {
    log(`${PACKAGE_NAME}@${SIMPLEX_VERSION} already unpacked`);
    return;
  }

  const archive = path.join(CACHE_DIR, `simplex-chat-${SIMPLEX_VERSION}.tar.gz`);
  const extractDir = path.join(CACHE_DIR, `source-${SIMPLEX_VERSION}`);
  const url = `https://github.com/simplex-chat/simplex-chat/archive/refs/tags/${RELEASE_TAG}.tar.gz`;

  log(`downloading from GitHub ${url}`);
  await downloadIfMissing(url, archive);

  removeDir(extractDir);
  ensureDir(extractDir);
  run('tar', ['-xzf', archive, '-C', extractDir]);

  const rootEntries = fs.readdirSync(extractDir);
  if (rootEntries.length !== 1) {
    throw new Error(`Expected 1 top-level entry in archive, got ${rootEntries.length}`);
  }
  const archiveRoot = path.join(extractDir, rootEntries[0]);
  const sourceDir = path.join(archiveRoot, 'packages', 'simplex-chat-nodejs');
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`packages/simplex-chat-nodejs not found in archive at ${sourceDir}`);
  }

  removeDir(PACKAGE_DIR);
  ensureDir(PACKAGE_DIR);
  copyDirSync(sourceDir, PACKAGE_DIR);

  log(`unpacked ${PACKAGE_NAME}@${SIMPLEX_VERSION} from GitHub source`);
}

function buildPackage() {
  const distIndex = path.join(PACKAGE_DIR, 'dist', 'index.js');
  if (fs.existsSync(distIndex)) {
    log('dist/ already built');
    return;
  }

  if (!fs.existsSync(TSC_BIN)) {
    throw new Error(`TypeScript compiler not found at ${TSC_BIN}`);
  }

  log('compiling TypeScript sources');
  run(TSC_BIN, ['-p', path.join(PACKAGE_DIR, 'tsconfig.json')]);

  for (const file of ['simplex.js', 'simplex.d.ts']) {
    const src = path.join(PACKAGE_DIR, 'src', file);
    const dest = path.join(PACKAGE_DIR, 'dist', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  log('TypeScript build complete');
}

function getUbuntuAssetVersion() {
  if (process.env.SIMPLEX_UBUNTU_VERSION) {
    return process.env.SIMPLEX_UBUNTU_VERSION.replace('.', '_');
  }

  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    const version = osRelease.match(/^VERSION_ID="?([^"\n]+)"?/m)?.[1];
    if (version === '22.04' || version === '24.04') {
      return version.replace('.', '_');
    }
  } catch (_error) {
    // Fall through to the default below.
  }

  return '22_04';
}

async function installLinuxArm64Libs() {
  const libsDir = path.join(PACKAGE_DIR, 'libs');
  const installedFile = path.join(libsDir, 'installed.txt');
  const expected = `${RELEASE_TAG}:sqlite`;

  if (fs.existsSync(installedFile) && fs.readFileSync(installedFile, 'utf8').trim() === expected) {
    log(`ARM64 libraries ${expected} already installed`);
    return;
  }

  const ubuntu = getUbuntuAssetVersion();
  const debName = `simplex-desktop-ubuntu-${ubuntu}-aarch64.deb`;
  const deb = path.join(CACHE_DIR, debName);
  const debExtractDir = path.join(CACHE_DIR, `desktop-${ubuntu}-aarch64`);
  const resourcesDir = path.join(debExtractDir, 'opt', 'simplex', 'lib', 'app', 'resources');
  const url = `https://github.com/simplex-chat/simplex-chat/releases/download/${RELEASE_TAG}/${debName}`;

  log(`downloading ARM64 desktop libraries from ${url}`);
  await downloadIfMissing(url, deb);

  removeDir(debExtractDir);
  ensureDir(debExtractDir);
  run('dpkg-deb', ['-x', deb, debExtractDir]);

  if (!fs.existsSync(path.join(resourcesDir, 'libsimplex.so'))) {
    throw new Error(`libsimplex.so not found in ${resourcesDir}`);
  }

  removeDir(libsDir);
  ensureDir(libsDir);

  for (const file of fs.readdirSync(resourcesDir)) {
    if (file.endsWith('.so')) {
      fs.copyFileSync(path.join(resourcesDir, file), path.join(libsDir, file));
    }
  }

  fs.writeFileSync(installedFile, expected, 'utf8');
  log(`installed ARM64 libraries ${expected}`);
}

function installUpstreamLibs() {
  log('installing upstream native libraries');
  run(process.execPath, ['src/download-libs.js'], { cwd: PACKAGE_DIR });
}

function rebuildAddon() {
  const command = fs.existsSync(NODE_GYP_BIN) ? NODE_GYP_BIN : 'node-gyp';

  log('building native addon');
  run(command, ['configure'], { cwd: PACKAGE_DIR });
  run(command, ['rebuild', '--release'], { cwd: PACKAGE_DIR });
}

async function main() {
  ensureDir(CACHE_DIR);
  ensureDir(NODE_MODULES_DIR);

  await installPackage();

  if (process.platform === 'linux' && process.arch === 'arm64') {
    await installLinuxArm64Libs();
  } else {
    installUpstreamLibs();
  }

  buildPackage();
  rebuildAddon();

  log(`installed ${PACKAGE_NAME}@${SIMPLEX_VERSION} for ${os.platform()} ${os.arch()}`);
}

main().catch((error) => {
  console.error(`[simplex-chat] ${error.stack || error.message}`);
  process.exit(1);
});
