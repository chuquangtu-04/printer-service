"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillBuilder = void 0;
const BaseBuilder_1 = require("./BaseBuilder");
const EscposCommands_1 = require("./EscposCommands");
class BillBuilder extends BaseBuilder_1.BaseBuilder {
    validate(data) {
        if (!data || !Array.isArray(data.items) || data.items.length === 0) {
            throw new Error('Dữ liệu bill không hợp lệ: thiếu "items"');
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
        parts.push(EscposCommands_1.EscposCommands.text('HOA DON TAM TINH\n'));
        if (data.table)
            parts.push(EscposCommands_1.EscposCommands.text(`Ban: ${data.table}\n`));
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
        parts.push(EscposCommands_1.EscposCommands.text(this.padLine('Tong cong', this.formatCurrency(total))));
        if (data.discount) {
            parts.push(EscposCommands_1.EscposCommands.text(this.padLine('Giam gia', `-${this.formatCurrency(data.discount)}`)));
        }
        if (data.tax) {
            parts.push(EscposCommands_1.EscposCommands.text(this.padLine('Thue', this.formatCurrency(data.tax))));
        }
        const finalTotal = data.finalTotal ?? (total - (data.discount || 0) + (data.tax || 0));
        parts.push(EscposCommands_1.EscposCommands.line('-'));
        parts.push(EscposCommands_1.EscposCommands.BOLD_ON, EscposCommands_1.EscposCommands.text(this.padLine('THANH TOAN', this.formatCurrency(finalTotal))), EscposCommands_1.EscposCommands.BOLD_OFF);
        return Buffer.concat(parts);
    }
}
exports.BillBuilder = BillBuilder;
