/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.nemopos.printer-service',
  productName: 'NemoPOS Printer Service',
  directories: {
    output: 'release',
  },
  forceCodeSigning: false,
  win: {
    target: ['nsis'],
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'NemoPOS Printer Service',
  },
  extraResources: [
    {
      from: 'bin/',
      to: 'bin/',
      filter: ['**/*'],
    },
    {
      from: 'src/storage/config/',
      to: 'storage/config/',
      filter: ['*.json'],
    },
  ],
  files: ['dist/**/*', 'package.json'],
};
