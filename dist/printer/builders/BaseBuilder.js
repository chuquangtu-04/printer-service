"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBuilder = void 0;
const EscposCommands_1 = require("./EscposCommands");
/**
 * Mọi Builder phải implement build(data) -> Buffer.
 * BaseBuilder cung cấp:
 *  - Template method render() để ép cấu trúc chung (header -> body -> footer)
 *  - Các helper dùng chung (validate, format tiền, canh lề...)
 * Builder con chỉ cần override renderBody(), và tuỳ chọn renderHeader()/renderFooter().
 */
class BaseBuilder {
    static LINE_WIDTH = 32; // 32 ký tự cho khổ giấy 80mm phổ biến
    /** Entry point công khai — BuilderFactory chỉ gọi hàm này */
    build(data) {
        this.validate(data);
        return Buffer.concat([
            this.renderHeader(data),
            this.renderBody(data),
            this.renderFooter(data),
        ]);
    }
    /** Header mặc định: init máy in. Builder con có thể override thêm */
    renderHeader(_data) {
        return EscposCommands_1.EscposCommands.INIT;
    }
    /** Footer mặc định: feed giấy + cắt. Builder con có thể override */
    renderFooter(_data) {
        return Buffer.concat([EscposCommands_1.EscposCommands.FEED(3), EscposCommands_1.EscposCommands.CUT]);
    }
    // ---- helper dùng chung cho các builder con ----
    formatCurrency(amount) {
        return amount.toLocaleString('vi-VN');
    }
    padLine(left, right, width = BaseBuilder.LINE_WIDTH) {
        const space = Math.max(1, width - left.length - right.length);
        return left + ' '.repeat(space) + right + '\n';
    }
    truncate(text, max) {
        return text.length > max ? text.slice(0, max) : text;
    }
}
exports.BaseBuilder = BaseBuilder;
