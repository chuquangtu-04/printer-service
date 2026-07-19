"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KitchenBuilder = void 0;
const BaseBuilder_1 = require("./BaseBuilder");
const EscposCommands_1 = require("./EscposCommands");
class KitchenBuilder extends BaseBuilder_1.BaseBuilder {
    validate(data) {
        if (!data || !Array.isArray(data.items) || data.items.length === 0) {
            throw new Error('Dữ liệu phiếu bếp không hợp lệ: thiếu "items"');
        }
        for (const item of data.items) {
            if (!item.name || typeof item.qty !== 'number') {
                throw new Error(`Item không hợp lệ: ${JSON.stringify(item)}`);
            }
        }
    }
    renderHeader(data) {
        const parts = [EscposCommands_1.EscposCommands.INIT, EscposCommands_1.EscposCommands.ALIGN_CENTER, EscposCommands_1.EscposCommands.BOLD_ON, EscposCommands_1.EscposCommands.DOUBLE_SIZE_ON];
        parts.push(EscposCommands_1.EscposCommands.text('PHIEU BEP\n'));
        parts.push(EscposCommands_1.EscposCommands.DOUBLE_SIZE_OFF, EscposCommands_1.EscposCommands.BOLD_OFF);
        if (data.table)
            parts.push(EscposCommands_1.EscposCommands.text(`Ban: ${data.table}\n`));
        if (data.orderId)
            parts.push(EscposCommands_1.EscposCommands.text(`Order: ${data.orderId}\n`));
        parts.push(EscposCommands_1.EscposCommands.text(new Date().toLocaleTimeString('vi-VN') + '\n'));
        parts.push(EscposCommands_1.EscposCommands.line('='));
        parts.push(EscposCommands_1.EscposCommands.ALIGN_LEFT);
        return Buffer.concat(parts);
    }
    renderBody(data) {
        const parts = [];
        for (const item of data.items) {
            // chữ to cho tên món + số lượng, để đọc dễ từ xa trong bếp
            parts.push(EscposCommands_1.EscposCommands.DOUBLE_SIZE_ON, EscposCommands_1.EscposCommands.BOLD_ON);
            parts.push(EscposCommands_1.EscposCommands.text(`${item.qty}x ${item.name}\n`));
            parts.push(EscposCommands_1.EscposCommands.DOUBLE_SIZE_OFF, EscposCommands_1.EscposCommands.BOLD_OFF);
            if (item.note) {
                parts.push(EscposCommands_1.EscposCommands.text(`   >> ${item.note}\n`));
            }
            parts.push(EscposCommands_1.EscposCommands.FEED(1));
        }
        return Buffer.concat(parts);
    }
    renderFooter(_data) {
        // Phiếu bếp không cần feed nhiều, không cần "cảm ơn"
        return Buffer.concat([EscposCommands_1.EscposCommands.line('='), EscposCommands_1.EscposCommands.FEED(2), EscposCommands_1.EscposCommands.CUT]);
    }
}
exports.KitchenBuilder = KitchenBuilder;
