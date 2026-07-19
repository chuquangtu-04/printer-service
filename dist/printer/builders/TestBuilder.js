"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestBuilder = void 0;
const BaseBuilder_1 = require("./BaseBuilder");
const EscposCommands_1 = require("./EscposCommands");
class TestBuilder extends BaseBuilder_1.BaseBuilder {
    validate(_data) {
        // Test print không cần dữ liệu đầu vào
    }
    renderBody(_data) {
        return Buffer.concat([
            EscposCommands_1.EscposCommands.ALIGN_CENTER,
            EscposCommands_1.EscposCommands.line('*'),
            EscposCommands_1.EscposCommands.text('\nTEST PRINT\n\n'),
            EscposCommands_1.EscposCommands.line('*'),
        ]);
    }
}
exports.TestBuilder = TestBuilder;
