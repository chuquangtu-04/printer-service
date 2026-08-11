import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';
import { ValidationError } from '../../common/errors';

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  storeName?: string;
  orderId?: string;
  items: ReceiptItem[];
  total?: number;
  note?: string;
}

export class ReceiptBuilder extends BaseBuilder<ReceiptData> {
  protected validate(data: ReceiptData): void {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new ValidationError('Du lieu hoa don khong hop le: thieu "items"');
    }

    for (const item of data.items) {
      if (!item.name || typeof item.qty !== 'number' || typeof item.price !== 'number') {
        throw new ValidationError(`Item khong hop le: ${JSON.stringify(item)}`);
      }
    }
  }

  protected renderHeader(data: ReceiptData): Buffer {
    const parts: Buffer[] = [C.INIT, C.ALIGN_CENTER];
    if (data.storeName) {
      parts.push(C.BOLD_ON, C.DOUBLE_SIZE_ON, C.text(data.storeName + '\n'), C.DOUBLE_SIZE_OFF, C.BOLD_OFF);
    }
    if (data.orderId) parts.push(C.text(`Order: ${data.orderId}\n`));
    parts.push(C.text(new Date().toLocaleString('vi-VN') + '\n'));
    parts.push(C.line('-'));
    parts.push(C.ALIGN_LEFT);
    return Buffer.concat(parts);
  }

  protected renderBody(data: ReceiptData): Buffer {
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
    parts.push(C.BOLD_ON, C.text(this.padLine('TOTAL', this.formatCurrency(total))), C.BOLD_OFF);

    return Buffer.concat(parts);
  }

  protected renderFooter(data: ReceiptData): Buffer {
    const parts: Buffer[] = [];
    if (data.note) {
      parts.push(C.FEED(1), C.ALIGN_CENTER, C.text(data.note + '\n'));
    }
    parts.push(C.FEED(3), C.CUT);
    return Buffer.concat(parts);
  }
}

