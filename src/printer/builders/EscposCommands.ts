export const ESC = 0x1b;
export const GS = 0x1d;

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
  text: (s: string) => Buffer.from(s, 'ascii'),
  line: (char = '-', width = 32) => Buffer.from(char.repeat(width) + '\n', 'ascii'),
};
