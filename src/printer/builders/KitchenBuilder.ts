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
  table?: string;
  items: KitchenItem[];
}

export class KitchenBuilder extends BaseBuilder<KitchenData> {
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
    const parts: Buffer[] = [C.INIT, C.ALIGN_CENTER, C.BOLD_ON, C.DOUBLE_SIZE_ON];
    parts.push(C.text('PHIEU BEP\n'));
    parts.push(C.DOUBLE_SIZE_OFF, C.BOLD_OFF);

    if (data.table) parts.push(C.text(`Ban: ${data.table}\n`));
    if (data.orderId) parts.push(C.text(`Order: ${data.orderId}\n`));
    parts.push(C.text(new Date().toLocaleTimeString('vi-VN') + '\n'));
    parts.push(C.line('='));
    parts.push(C.ALIGN_LEFT);
    return Buffer.concat(parts);
  }

  protected renderBody(data: KitchenData): Buffer {
    const parts: Buffer[] = [];
    for (const item of data.items) {
      parts.push(C.DOUBLE_SIZE_ON, C.BOLD_ON);
      parts.push(C.text(`${item.qty}x ${item.name}\n`));
      parts.push(C.DOUBLE_SIZE_OFF, C.BOLD_OFF);

      if (item.note) {
        parts.push(C.text(`   >> ${item.note}\n`));
      }
      parts.push(C.FEED(1));
    }
    return Buffer.concat(parts);
  }

  protected renderFooter(_data: KitchenData): Buffer {
    return Buffer.concat([C.line('='), C.FEED(2), C.CUT]);
  }
}

