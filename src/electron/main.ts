import { app, Tray, Menu, shell, nativeImage, NativeImage, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { PrinterConfigService } from '../printer/config/PrinterConfigService';

let tray: Tray | null = null;
const APP_NAME = 'Tppos print';
let printerConfigPath = '';

app.setName(APP_NAME);

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    const logDir = path.join(app.getPath('userData'));
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'service.log'), line);
  } catch {}
  console.log(msg);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  if (app.dock) {
    app.dock.hide();
  }

  app.whenReady().then(() => {
    log('Electron app ready. Starting Express server...');
    try {
      printerConfigPath = PrinterConfigService.ensureDefaultConfigFile();
      log(`Printer config ready: ${printerConfigPath}`);

      const appPath = path.join(__dirname, '../app.js');
      log(`Requiring app from: ${appPath}`);
      require(appPath);
      log('Express server started successfully!');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.stack || err.message : String(err);
      log(`FAILED to start Express server: ${errMsg}`);
      dialog.showErrorBox(`${APP_NAME} Startup Error`, `Khong the khoi chay Express server:\n${errMsg}`);
    }

    createTray();
  });
}

function createTray() {
  const configPath = printerConfigPath || PrinterConfigService.resolveConfigPath();
  const iconPath = path.join(__dirname, 'tray-icon.png');
  let icon: NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = createFallbackIcon();
    }
  } catch {
    icon = createFallbackIcon();
  }

  icon = icon.resize({ width: 32, height: 32 });
  icon.setTemplateImage(false);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: APP_NAME, enabled: false },
    { label: 'Trang thai: Running (Port 9000)', enabled: false },
    { type: 'separator' },
    {
      label: 'Mo API Health Check',
      click: () => {
        shell.openExternal('http://localhost:9000/api/health');
      },
    },
    {
      label: 'Xem danh sach may in',
      click: () => {
        shell.openExternal('http://localhost:9000/api/printers');
      },
    },
    {
      label: 'Mo file cau hinh may in',
      click: () => {
        shell.openPath(configPath).catch((err) => {
          log(`FAILED to open printer config: ${err}`);
        });
      },
    },
    {
      label: 'Mo thu muc cau hinh',
      click: () => {
        shell.openPath(path.dirname(configPath)).catch((err) => {
          log(`FAILED to open printer config folder: ${err}`);
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Thoat ung dung',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip(`${APP_NAME} (Port 9000)`);
  tray.setContextMenu(contextMenu);
}

function createFallbackIcon(): NativeImage {
  const base64Icon =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZSURBVDhPY2AYBYgHjBqA0QSMGkDBoAEAG54AGY+h7nQAAAAASUVORK5CYII=';
  return nativeImage.createFromBuffer(Buffer.from(base64Icon, 'base64'));
}
