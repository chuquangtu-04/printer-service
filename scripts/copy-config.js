const fs = require('fs');
const path = require('path');

const electronSourceDir = path.join(__dirname, '..', 'src', 'electron');
const electronTargetDir = path.join(__dirname, '..', 'dist', 'electron');

if (fs.existsSync(electronSourceDir)) {
  fs.mkdirSync(electronTargetDir, { recursive: true });
  for (const entry of fs.readdirSync(electronSourceDir)) {
    if (entry.endsWith('.png')) {
      fs.copyFileSync(path.join(electronSourceDir, entry), path.join(electronTargetDir, entry));
    }
  }
}
