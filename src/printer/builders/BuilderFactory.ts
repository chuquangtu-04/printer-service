import { BaseBuilder } from './BaseBuilder';
import { ReceiptBuilder } from './ReceiptBuilder';
import { KitchenBuilder } from './KitchenBuilder';
import { BillBuilder } from './BillBuilder';
import { LabelBuilder } from './LabelBuilder';
import { TestBuilder } from './TestBuilder';
import { TemplateNotFoundError } from '../../common/errors';

/**
 * Đăng ký template -> Builder instance.
 * Thêm BillBuilder/LabelBuilder sau này: viết class kế thừa BaseBuilder,
 * rồi thêm đúng 1 dòng vào registry — không sửa gì khác trong hệ thống.
 */
const registry: Record<string, BaseBuilder<unknown>> = {
  receipt: new ReceiptBuilder(),
  kitchen: new KitchenBuilder(),
  bill: new BillBuilder(),
  label: new LabelBuilder(),
  test: new TestBuilder(), // xem lưu ý bên dưới
};

export class BuilderFactory {
  static build(template: string, data: unknown): Promise<Buffer> {
    const builder = registry[template];
    if (!builder) throw new TemplateNotFoundError(template);
    return builder.build(data);
  }

  /** Hữu ích cho endpoint kiểu GET /api/templates để FE biết template nào khả dụng */
  static listTemplates(): string[] {
    return Object.keys(registry);
  }
}
