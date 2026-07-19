"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptBuilder = void 0;
const BaseBuilder_1 = require("./BaseBuilder");
const EscposCommands_1 = require("./EscposCommands");
class ReceiptBuilder extends BaseBuilder_1.BaseBuilder {
    validate(data) {
        if (!data || !Array.isArray(data.items) || data.items.length === 0) {
            throw new Error('Dữ liệu hóa đơn không hợp lệ: thiếu "items"');
        }
        for (const item of data.items) {
            if (!item.name || typeof item.qty !== 'number' || typeof item.price !== 'number') {
                throw new Error(`Item không hợp lệ: ${JSON.stringify(item)}`);
            }
        }
    }
    renderHeader(data) {
        const parts = [EscposCommands_1.EscposCommands.INIT, EscposCommands_1.EscposCommands.ALIGN_CENTER];
        if (data.storeName) {
            parts.push(EscposCommands_1.EscposCommands.BOLD_ON, EscposCommands_1.EscposCommands.DOUBLE_SIZE_ON, EscposCommands_1.EscposCommands.text(data.storeName + '\n'), EscposCommands_1.EscposCommands.DOUBLE_SIZE_OFF, EscposCommands_1.EscposCommands.BOLD_OFF);
        }
        if (data.orderId)
            parts.push(EscposCommands_1.EscposCommands.text(`Order: ${data.orderId}\n`));
        parts.push(EscposCommands_1.EscposCommands.text(new Date().toLocaleString('vi-VN') + '\n'));
        parts.push(EscposCommands_1.EscposCommands.line('-'));
        parts.push(EscposCommands_1.EscposCommands.ALIGN_LEFT);
        return Buffer.concat(parts);
    }
    renderBody(data) {
        const parts = [];
        let computedTotal = 0;
        for (const item of data.items) {
            const lineTotal = item.qty * item.price;
            computedTotal += lineTotal;
            const left = `${this.truncate(item.name, 18).padEnd(18)}${String(item.qty).padStart(3)}`;
            const right = this.formatCurrency(lineTotal);
            parts.push(EscposCommands_1.EscposCommands.text(this.padLine(left, right)));
        }
        parts.push(EscposCommands_1.EscposCommands.line('-'));
        const total = data.total ?? computedTotal;
        parts.push(EscposCommands_1.EscposCommands.BOLD_ON, EscposCommands_1.EscposCommands.text(this.padLine('TOTAL', this.formatCurrency(total))), EscposCommands_1.EscposCommands.BOLD_OFF);
        return Buffer.concat(parts);
    }
    renderFooter(data) {
        const parts = [];
        if (data.note) {
            parts.push(EscposCommands_1.EscposCommands.FEED(1), EscposCommands_1.EscposCommands.ALIGN_CENTER, EscposCommands_1.EscposCommands.text(data.note + '\n'));
        }
        parts.push(EscposCommands_1.EscposCommands.FEED(3), EscposCommands_1.EscposCommands.CUT);
        return Buffer.concat(parts);
    }
}
exports.ReceiptBuilder = ReceiptBuilder;
