"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscposCommands = exports.GS = exports.ESC = void 0;
exports.ESC = 0x1b;
exports.GS = 0x1d;
exports.EscposCommands = {
    INIT: Buffer.from([exports.ESC, 0x40]),
    BOLD_ON: Buffer.from([exports.ESC, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([exports.ESC, 0x45, 0x00]),
    ALIGN_LEFT: Buffer.from([exports.ESC, 0x61, 0x00]),
    ALIGN_CENTER: Buffer.from([exports.ESC, 0x61, 0x01]),
    ALIGN_RIGHT: Buffer.from([exports.ESC, 0x61, 0x02]),
    DOUBLE_SIZE_ON: Buffer.from([exports.GS, 0x21, 0x11]),
    DOUBLE_SIZE_OFF: Buffer.from([exports.GS, 0x21, 0x00]),
    CUT: Buffer.from([exports.GS, 0x56, 0x00]),
    FEED: (lines = 1) => Buffer.from(Array(lines).fill(0x0a)),
    text: (s) => Buffer.from(s, 'ascii'),
    line: (char = '-', width = 32) => Buffer.from(char.repeat(width) + '\n', 'ascii'),
};
