import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';
import { ValidationError } from '../../common/errors';

export interface LabelData {
  productName: string;
  price?: number;
  barcode?: string;
  note?: string;
}

export class LabelBuilder extends BaseBuilder<LabelData> {
  protected validate(data: LabelData): void {
    if (!data || !data.productName) {
      throw new ValidationError('Du lieu tem nhan khong hop le: thieu "productName"');
    }
  }

  protected renderHeader(_data: LabelData): Buffer {
    return Buffer.concat([C.INIT, C.ALIGN_CENTER]);
  }

  protected renderBody(data: LabelData): Buffer {
    const parts: Buffer[] = [];

    parts.push(C.BOLD_ON, C.text(`${data.productName}\n`), C.BOLD_OFF);

    if (data.price) {
      parts.push(C.text(`Gia: ${this.formatCurrency(data.price)}\n`));
    }

    if (data.note) {
      parts.push(C.text(`Note: ${data.note}\n`));
    }

    if (data.barcode) {
      parts.push(C.text(`[${data.barcode}]\n`));
    }

    return Buffer.concat(parts);
  }

  protected renderFooter(_data: LabelData): Buffer {
    return Buffer.concat([C.FEED(2), C.CUT]);
  }
}

