import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';
import { ValidationError } from '../../common/errors';

export interface KitchenItem {
  name: string;
  qty: number;
  note?: string;
}

export interface KitchenData {
  orderId?: string;
  billId?: string;
  table?: string;
  note?: string;
  orderNote?: string;
  items: KitchenItem[];
}

export class KitchenBuilder extends BaseBuilder<KitchenData> {
  private static readonly WIDTH = 45;
  private static readonly QTY_WIDTH = 3;
  private static readonly NAME_WIDTH = KitchenBuilder.WIDTH - KitchenBuilder.QTY_WIDTH;

  protected validate(data: KitchenData): void {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new ValidationError('Du lieu phieu bep khong hop le: thieu "items"');
    }

    for (const item of data.items) {
      if (!item.name || typeof item.qty !== 'number') {
        throw new ValidationError(`Item khong hop le: ${JSON.stringify(item)}`);
      }
    }
  }

  protected renderHeader(data: KitchenData): Buffer {
    const parts: Buffer[] = [C.INIT, C.ALIGN_CENTER, C.BOLD_ON];
    parts.push(C.text('PHIEU BEP\n'));
    parts.push(C.BOLD_OFF);

    if (data.table) {
      parts.push(C.text('----------------------\n'));
      parts.push(C.BOLD_ON, C.text(`Ban: ${data.table}\n`), C.BOLD_OFF);
      parts.push(C.text('----------------------\n'));
    }

    parts.push(C.ALIGN_LEFT);
    const orderId = data.billId ?? data.orderId;
    if (orderId) parts.push(C.text(`Ma HD: ${orderId}\n`));
    parts.push(C.text(`TG: ${this.formatDateTime(new Date())}\n`));

    const orderNote = data.orderNote ?? data.note;
    if (orderNote) {
      for (const line of this.wrapText(`Ghi chu don: ${orderNote}`, KitchenBuilder.WIDTH)) {
        parts.push(C.BOLD_ON, C.text(line + '\n'), C.BOLD_OFF);
      }
    }

    parts.push(C.ALIGN_LEFT);
    parts.push(C.line('-', KitchenBuilder.WIDTH));
    parts.push(C.BOLD_ON, C.text(this.padLine('Ten mon', 'SL', KitchenBuilder.WIDTH)), C.BOLD_OFF);
    parts.push(C.line('-', KitchenBuilder.WIDTH));
    return Buffer.concat(parts);
  }

  protected renderBody(data: KitchenData): Buffer {
    const parts: Buffer[] = [];
    for (const item of data.items) {
      const nameLines = this.wrapText(item.name, KitchenBuilder.NAME_WIDTH);

      parts.push(C.BOLD_ON);
      parts.push(C.text(this.itemLine(nameLines[0] ?? '', item.qty)));
      for (const line of nameLines.slice(1)) {
        parts.push(C.text(line + '\n'));
      }
      parts.push(C.BOLD_OFF);

      if (item.note) {
        for (const line of this.wrapText(`/ ${item.note}`, KitchenBuilder.WIDTH - 2)) {
          parts.push(C.text(`  ${line}\n`));
        }
      }

      parts.push(C.line('.', KitchenBuilder.WIDTH));
    }
    return Buffer.concat(parts);
  }

  protected renderFooter(_data: KitchenData): Buffer {
    return Buffer.concat([
      C.ALIGN_CENTER,
      C.text('-- Het --\n'),
      C.FEED(5),
      C.CUT,
    ]);
  }

  private itemLine(name: string, qty: number): string {
    const left = this.truncate(name, KitchenBuilder.NAME_WIDTH).padEnd(KitchenBuilder.NAME_WIDTH);
    const right = String(qty).padStart(KitchenBuilder.QTY_WIDTH);
    return `${left}${right}\n`;
  }

  private wrapText(text: string, width: number): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];

    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if (word.length > width) {
        if (current) {
          lines.push(current);
          current = '';
        }
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
        continue;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length > width) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) lines.push(current);
    return lines;
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('vi-VN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
