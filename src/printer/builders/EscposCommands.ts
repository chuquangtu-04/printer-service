export const ESC = 0x1b;
export const GS = 0x1d;

function normalizeEscposText(value: string): string {
  return value
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '?');
}

export const EscposCommands = {
  INIT: Buffer.from([ESC, 0x40]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  DOUBLE_SIZE_ON: Buffer.from([GS, 0x21, 0x11]),
  DOUBLE_SIZE_OFF: Buffer.from([GS, 0x21, 0x00]),
  CUT: Buffer.from([GS, 0x56, 0x00]),
  FEED: (lines = 1) => Buffer.from(Array(lines).fill(0x0a)),
  text: (s: string) => Buffer.from(normalizeEscposText(s), 'ascii'),
  line: (char = '-', width = 32) => Buffer.from(char.repeat(width) + '\n', 'ascii'),
  barcodeCode128: (value: string, height = 72, width = 2) => {
    const data = Buffer.from(`{B${normalizeEscposText(value)}`, 'ascii');
    return Buffer.concat([
      Buffer.from([GS, 0x48, 0x00]), // Hide HRI text; the template prints the code below.
      Buffer.from([GS, 0x68, height]),
      Buffer.from([GS, 0x77, width]),
      Buffer.from([GS, 0x6b, 0x49, data.length]),
      data,
      Buffer.from('\n', 'ascii'),
    ]);
  },
  qrcode: (value: string, size = 6) => {
    const data = Buffer.from(normalizeEscposText(value), 'ascii');
    const storeLength = data.length + 3;
    const pL = storeLength % 256;
    const pH = Math.floor(storeLength / 256);

    return Buffer.concat([
      Buffer.from([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
      Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]),
      Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),
      Buffer.from([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
      data,
      Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
      Buffer.from('\n', 'ascii'),
    ]);
  },
};
