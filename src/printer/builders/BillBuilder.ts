import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';

export interface BillItem {
  name: string;
  qty: number;
  price: number;
}

export interface BillData {
  storeName?: string;
  table?: string;
  items: BillItem[];
  total?: number;
  discount?: number;
  tax?: number;
  finalTotal?: number;
}

export class BillBuilder extends BaseBuilder<BillData> {
  protected validate(data: BillData): void {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Dữ liệu bill không hợp lệ: thiếu "items"');
    }
    for (const item of data.items) {
      if (!item.name || typeof item.qty !== 'number' || typeof item.price !== 'number') {
        throw new Error(`Item không hợp lệ: ${JSON.stringify(item)}`);
      }
    }
  }

  protected renderHeader(data: BillData): Buffer {
    const parts: Buffer[] = [C.INIT, C.ALIGN_CENTER];
    if (data.storeName) {
      parts.push(C.BOLD_ON, C.DOUBLE_SIZE_ON, C.text(data.storeName + '\n'), C.DOUBLE_SIZE_OFF, C.BOLD_OFF);
    }
    parts.push(C.text('HOA DON TAM TINH\n'));
    if (data.table) parts.push(C.text(`Ban: ${data.table}\n`));
    parts.push(C.text(new Date().toLocaleString('vi-VN') + '\n'));
    parts.push(C.line('-'));
    parts.push(C.ALIGN_LEFT);
    return Buffer.concat(parts);
  }

  protected renderBody(data: BillData): Buffer {
    const parts: Buffer[] = [];
    let computedTotal = 0;

    for (const item of data.items) {
      const lineTotal = item.qty * item.price;
      computedTotal += lineTotal;
      const left = `${this.truncate(item.name, 18).padEnd(18)}${String(item.qty).padStart(3)}`;
      const right = this.formatCurrency(lineTotal);
      parts.push(C.text(this.padLine(left, right)));
    }

    parts.push(C.line('-'));
    const total = data.total ?? computedTotal;
    parts.push(C.text(this.padLine('Tong cong', this.formatCurrency(total))));
    
    if (data.discount) {
      parts.push(C.text(this.padLine('Giam gia', `-${this.formatCurrency(data.discount)}`)));
    }
    if (data.tax) {
      parts.push(C.text(this.padLine('Thue', this.formatCurrency(data.tax))));
    }
    
    const finalTotal = data.finalTotal ?? (total - (data.discount || 0) + (data.tax || 0));
    parts.push(C.line('-'));
    parts.push(C.BOLD_ON, C.text(this.padLine('THANH TOAN', this.formatCurrency(finalTotal))), C.BOLD_OFF);

    return Buffer.concat(parts);
  }
}
