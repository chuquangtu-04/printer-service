const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'src', 'storage', 'config');
const targetDir = path.join(__dirname, '..', 'dist', 'storage', 'config');
const electronSourceDir = path.join(__dirname, '..', 'src', 'electron');
const electronTargetDir = path.join(__dirname, '..', 'dist', 'electron');

if (!fs.existsSync(sourceDir)) {
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const entry of fs.readdirSync(sourceDir)) {
  if (entry.endsWith('.json')) {
    fs.copyFileSync(path.join(sourceDir, entry), path.join(targetDir, entry));
  }
}

const trayIconPath = path.join(electronSourceDir, 'icon.png');
if (fs.existsSync(trayIconPath)) {
  fs.mkdirSync(electronTargetDir, { recursive: true });
  fs.copyFileSync(trayIconPath, path.join(electronTargetDir, 'icon.png'));
}
