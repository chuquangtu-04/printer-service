export class TestBuilder {
  private static readonly BORDER = '*'.repeat(16);

  /** Nội dung text thuần, đúng format trong spec */
  static build(): string {
    return [
      '',
      this.BORDER,
      '',
      'TEST PRINT Chu Quang Tú nah',
      '',
      this.BORDER,
      '',
      '',
      '', // feed thêm để chừa lề trước khi cắt giấy
    ].join('\n');
  }

  /**
   * Chuyển thành Buffer kèm lệnh ESC/POS init + cắt giấy.
   * Máy in nhiệt hiểu ASCII thuần bình thường (không bắt buộc ESC/POS
   * cho text), nhưng init + cut thì cần lệnh riêng.
   */
  static buildBuffer(): Buffer {
    const ESC_INIT = Buffer.from([0x1b, 0x40]);        // ESC @  — reset máy in
    const text = Buffer.from(this.build() + '\n', 'ascii');
    const FEED = Buffer.from([0x0a, 0x0a, 0x0a]);       // feed thêm 3 dòng
    const CUT = Buffer.from([0x1d, 0x56, 0x00]);        // GS V 0 — cắt giấy (nếu máy hỗ trợ)

    return Buffer.concat([ESC_INIT, text, FEED, CUT]);
  }
}
