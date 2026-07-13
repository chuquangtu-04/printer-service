import { ReceiptBuilder } from './ReceiptBuilder';
import { TestBuilder } from './TestBuilder';
import { TemplateNotFoundError } from '../../common/errors';

type BuilderFn = (data: any) => Buffer;

const registry: Record<string, BuilderFn> = {
  receipt: (data) => ReceiptBuilder.build(data),
  test: () => TestBuilder.buildBuffer(),
};

export class BuilderFactory {
  static build(template: string, data: any): Buffer {
    const fn = registry[template];
    if (!fn) throw new TemplateNotFoundError(template);
    return fn(data);
  }
}
