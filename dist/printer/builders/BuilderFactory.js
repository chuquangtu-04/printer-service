"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderFactory = void 0;
const ReceiptBuilder_1 = require("./ReceiptBuilder");
const KitchenBuilder_1 = require("./KitchenBuilder");
const BillBuilder_1 = require("./BillBuilder");
const LabelBuilder_1 = require("./LabelBuilder");
const TestBuilder_1 = require("./TestBuilder");
const errors_1 = require("../../common/errors");
/**
 * Đăng ký template -> Builder instance.
 * Thêm BillBuilder/LabelBuilder sau này: viết class kế thừa BaseBuilder,
 * rồi thêm đúng 1 dòng vào registry — không sửa gì khác trong hệ thống.
 */
const registry = {
    receipt: new ReceiptBuilder_1.ReceiptBuilder(),
    kitchen: new KitchenBuilder_1.KitchenBuilder(),
    bill: new BillBuilder_1.BillBuilder(),
    label: new LabelBuilder_1.LabelBuilder(),
    test: new TestBuilder_1.TestBuilder(), // xem lưu ý bên dưới
};
class BuilderFactory {
    static build(template, data) {
        const builder = registry[template];
        if (!builder)
            throw new errors_1.TemplateNotFoundError(template);
        return builder.build(data);
    }
    /** Hữu ích cho endpoint kiểu GET /api/templates để FE biết template nào khả dụng */
    static listTemplates() {
        return Object.keys(registry);
    }
}
exports.BuilderFactory = BuilderFactory;
