import { EscposCommands as C } from './EscposCommands';

type MaybePromise<T> = T | Promise<T>;

/**
 * Mọi Builder phải implement build(data) -> Buffer.
 * BaseBuilder cung cấp:
 *  - Template method render() để ép cấu trúc chung (header -> body -> footer)
 *  - Các helper dùng chung (validate, format tiền, canh lề...)
 * Builder con chỉ cần override renderBody(), và tuỳ chọn renderHeader()/renderFooter().
 */
export abstract class BaseBuilder<TData = unknown> {
  protected static readonly LINE_WIDTH = 32; // 32 ký tự cho khổ giấy 80mm phổ biến

  /** Entry point công khai — BuilderFactory chỉ gọi hàm này */
  async build(data: TData): Promise<Buffer> {
    this.validate(data);
    return Buffer.concat([
      await this.renderHeader(data),
      await this.renderBody(data),
      await this.renderFooter(data),
    ]);
  }

  /** Builder con validate dữ liệu đầu vào, throw nếu thiếu field bắt buộc */
  protected abstract validate(data: TData): void;

  /** Phần thân chính — bắt buộc mỗi builder tự định nghĩa */
  protected abstract renderBody(data: TData): MaybePromise<Buffer>;

  /** Header mặc định: init máy in. Builder con có thể override thêm */
  protected renderHeader(_data: TData): MaybePromise<Buffer> {
    return C.INIT;
  }

  /** Footer mặc định: feed giấy + cắt. Builder con có thể override */
  protected renderFooter(_data: TData): MaybePromise<Buffer> {
    return Buffer.concat([C.FEED(3), C.CUT]);
  }

  // ---- helper dùng chung cho các builder con ----

  protected formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN');
  }

  protected padLine(left: string, right: string, width = BaseBuilder.LINE_WIDTH): string {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right + '\n';
  }

  protected truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) : text;
  }
}
