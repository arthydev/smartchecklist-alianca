import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const appDir = path.join(rootDir, 'backend-php', 'public', 'app');
const publicAssetsDir = path.join(rootDir, 'backend-php', 'public', 'assets');
const basePathAssetsDir = path.join(rootDir, 'backend-php', 'public', 'smartchecklist', 'assets');

const ensureExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const emptyDir = (dir) => {
  ensureExists(dir);
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
};

const copyDirContents = (sourceDir, targetDir) => {
  ensureExists(targetDir);
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
};

if (!fs.existsSync(distDir)) {
  console.error('Build directory not found:', distDir);
  process.exit(1);
}

emptyDir(appDir);
copyDirContents(distDir, appDir);

const builtAssetsDir = path.join(appDir, 'assets');
if (!fs.existsSync(builtAssetsDir)) {
  console.error('Assets directory not found after copy:', builtAssetsDir);
  process.exit(1);
}

emptyDir(publicAssetsDir);
copyDirContents(builtAssetsDir, publicAssetsDir);

emptyDir(basePathAssetsDir);
copyDirContents(builtAssetsDir, basePathAssetsDir);

console.log('SPA deployed to PHP public directories.');
console.log(`- ${appDir}`);
console.log(`- ${publicAssetsDir}`);
console.log(`- ${basePathAssetsDir}`);
