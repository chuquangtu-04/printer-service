/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.tppos.print',
  productName: 'Tppos print',
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
    shortcutName: 'Tppos print',
  },
  extraResources: [
    {
      from: 'bin/',
      to: 'bin/',
      filter: ['**/*'],
    },
  ],
  files: ['dist/**/*', 'package.json'],
};
