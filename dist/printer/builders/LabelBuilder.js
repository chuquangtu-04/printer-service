"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelBuilder = void 0;
const BaseBuilder_1 = require("./BaseBuilder");
const EscposCommands_1 = require("./EscposCommands");
class LabelBuilder extends BaseBuilder_1.BaseBuilder {
    validate(data) {
        if (!data || !data.productName) {
            throw new Error('Dữ liệu tem nhãn không hợp lệ: thiếu "productName"');
        }
    }
    renderHeader(_data) {
        return Buffer.concat([EscposCommands_1.EscposCommands.INIT, EscposCommands_1.EscposCommands.ALIGN_CENTER]);
    }
    renderBody(data) {
        const parts = [];
        parts.push(EscposCommands_1.EscposCommands.BOLD_ON, EscposCommands_1.EscposCommands.text(`${data.productName}\n`), EscposCommands_1.EscposCommands.BOLD_OFF);
        if (data.price) {
            parts.push(EscposCommands_1.EscposCommands.text(`Gia: ${this.formatCurrency(data.price)}\n`));
        }
        if (data.note) {
            parts.push(EscposCommands_1.EscposCommands.text(`Note: ${data.note}\n`));
        }
        if (data.barcode) {
            parts.push(EscposCommands_1.EscposCommands.text(`[${data.barcode}]\n`));
        }
        return Buffer.concat(parts);
    }
    renderFooter(_data) {
        return Buffer.concat([EscposCommands_1.EscposCommands.FEED(2), EscposCommands_1.EscposCommands.CUT]);
    }
}
exports.LabelBuilder = LabelBuilder;
