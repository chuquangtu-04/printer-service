import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';
import { ValidationError } from '../../common/errors';

type BarcodeType = 'CODE128';

export interface ReceiptHeader {
  store_name?: string;
  address?: string;
  phone?: string;
}

export interface ReceiptInvoice {
  title?: string;
  barcode?: {
    type?: BarcodeType;
    value?: string;
  };
  qrcode?: {
    value?: string;
  };
  code?: string;
  created_at?: string;
  customer?: string;
  seller?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  amount: number;
}

export interface ReceiptSummary {
  subtotal?: number;
  discount?: number;
  voucher?: number;
  points?: number;
  tax?: number;
  total?: number;
}

export interface ReceiptPayment {
  method?: string;
  amount?: number;
}

export interface ReceiptData {
  header?: ReceiptHeader;
  branch_name?: string;
  invoice?: ReceiptInvoice;
  items: ReceiptItem[];
  summary?: ReceiptSummary;
  payment?: ReceiptPayment;
  note?: string;
}

type LegacyReceiptItem = {
  name: string;
  qty: number;
  price: number;
};

type LegacyReceiptData = {
  storeName?: string;
  orderId?: string;
  items: LegacyReceiptItem[];
  total?: number;
  note?: string;
};

const LINE_WIDTH = 45;
const ITEM_NAME_WIDTH = 18;
const ITEM_QTY_WIDTH = 5;

export class ReceiptBuilder extends BaseBuilder<ReceiptData | LegacyReceiptData> {
  protected validate(data: ReceiptData | LegacyReceiptData): void {
    const receipt = this.normalize(data);

    if (!Array.isArray(receipt.items) || receipt.items.length === 0) {
      throw new ValidationError('Du lieu hoa don khong hop le: thieu "items"');
    }

    for (const item of receipt.items) {
      if (
        !item.name ||
        typeof item.quantity !== 'number' ||
        typeof item.unit_price !== 'number' ||
        typeof item.amount !== 'number'
      ) {
        throw new ValidationError(`Item khong hop le: ${JSON.stringify(item)}`);
      }
    }
  }

  protected renderHeader(data: ReceiptData | LegacyReceiptData): Buffer {
    const receipt = this.normalize(data);
    const parts: Buffer[] = [C.INIT, C.ALIGN_CENTER];

    if (receipt.header?.store_name) {
      parts.push(C.BOLD_ON, C.DOUBLE_SIZE_ON, C.text(`${receipt.header.store_name}\n`), C.DOUBLE_SIZE_OFF, C.BOLD_OFF);
    }
    if (receipt.branch_name) parts.push(C.text(`${receipt.branch_name}\n`));
    if (receipt.header?.address) parts.push(C.text(`${receipt.header.address}\n`));
    if (receipt.header?.phone) parts.push(C.text(`${receipt.header.phone}\n`));

    parts.push(C.FEED(1), C.BOLD_ON, C.DOUBLE_SIZE_ON);
    parts.push(C.text(`${receipt.invoice?.title ?? 'HOA DON BAN HANG'}\n`));
    parts.push(C.DOUBLE_SIZE_OFF, C.BOLD_OFF);

    const barcode = receipt.invoice?.barcode;
    if (barcode?.value) {
      if (barcode.type && barcode.type !== 'CODE128') {
        throw new ValidationError(`Khong ho tro barcode type: ${barcode.type}`);
      }
      parts.push(C.barcodeCode128(barcode.value));
      parts.push(C.BOLD_ON, C.text(`${barcode.value}\n`), C.BOLD_OFF);
    }

    if (receipt.invoice?.created_at) parts.push(C.text(`${receipt.invoice.created_at}\n`));
    parts.push(C.FEED(1), C.ALIGN_LEFT);

    return Buffer.concat(parts);
  }

  protected renderBody(data: ReceiptData | LegacyReceiptData): Buffer {
    const receipt = this.normalize(data);
    const parts: Buffer[] = [];

    parts.push(...this.renderInvoiceInfo(receipt));
    parts.push(C.FEED(1), C.BOLD_ON);
    parts.push(C.text(this.itemHeaderLine()));
    parts.push(C.BOLD_OFF, C.line('-', LINE_WIDTH));

    for (const item of receipt.items) {
      parts.push(...this.renderItem(item));
    }

    parts.push(C.line('-', LINE_WIDTH));
    parts.push(...this.renderSummary(receipt));
    parts.push(C.line('-', LINE_WIDTH));
    parts.push(C.BOLD_ON);
    parts.push(C.text(this.rowLine('TONG THANH TOAN', this.money(receipt.summary?.total ?? 0))));
    parts.push(C.BOLD_OFF);

    if (receipt.payment?.amount !== undefined) {
      parts.push(C.text(this.rowLine(`Da thanh toan (${this.paymentMethod(receipt.payment.method)})`, this.money(receipt.payment.amount))));
    }

    return Buffer.concat(parts);
  }

  protected renderFooter(data: ReceiptData | LegacyReceiptData): Buffer {
    const receipt = this.normalize(data);
    const parts: Buffer[] = [C.line('-', LINE_WIDTH), C.ALIGN_CENTER];

    if (receipt.invoice?.qrcode?.value) {
      parts.push(C.qrcode(receipt.invoice.qrcode.value));
    }

    parts.push(C.FEED(1));
    parts.push(C.text(receipt.note ?? 'Cam on Quy khach!\nHen gap lai!\n'));
    parts.push(C.FEED(3), C.CUT);

    return Buffer.concat(parts);
  }

  private renderInvoiceInfo(receipt: ReceiptData): Buffer[] {
    const invoice = receipt.invoice ?? {};
    const parts: Buffer[] = [];

    if (invoice.code) parts.push(C.text(this.rowLine('Ma hoa don:', invoice.code)));
    if (invoice.customer) parts.push(C.text(this.rowLine('Khach hang:', invoice.customer)));
    if (invoice.seller) parts.push(C.text(this.rowLine('Nguoi ban:', invoice.seller)));

    return parts;
  }

  private renderItem(item: ReceiptItem): Buffer[] {
    const name = this.truncate(item.name, LINE_WIDTH);
    const price = this.money(item.unit_price);
    const qty = String(item.quantity);
    const amount = this.money(item.amount);

    return [
      C.text(`${name}\n`),
      C.text(
        this.truncate(price, ITEM_NAME_WIDTH).padEnd(ITEM_NAME_WIDTH) +
          qty.padStart(ITEM_QTY_WIDTH) +
          amount.padStart(LINE_WIDTH - ITEM_NAME_WIDTH - ITEM_QTY_WIDTH) +
          '\n'
      ),
    ];
  }

  private renderSummary(receipt: ReceiptData): Buffer[] {
    const summary = receipt.summary ?? {};
    const lines: Array<[string, number | undefined]> = [
      ['Tam tinh', summary.subtotal],
      ['Giam gia', this.negative(summary.discount)],
      ['Voucher', this.negative(summary.voucher)],
      ['Doi diem', this.negative(summary.points)],
      ['Tong thue', summary.tax],
    ];

    return lines
      .filter(([, value]) => value !== undefined)
      .map(([label, value]) => C.text(this.rowLine(label, this.money(value ?? 0))));
  }

  private itemHeaderLine(): string {
    return (
      'DON GIA'.padEnd(ITEM_NAME_WIDTH) +
      'SL'.padStart(ITEM_QTY_WIDTH) +
      'THANH TIEN'.padStart(LINE_WIDTH - ITEM_NAME_WIDTH - ITEM_QTY_WIDTH) +
      '\n'
    );
  }

  private money(value: number): string {
    return `${Math.round(value).toLocaleString('vi-VN')}d`;
  }

  private rowLine(left: string, right: string): string {
    const maxLeftWidth = Math.max(1, LINE_WIDTH - right.length - 1);
    return this.padLine(this.truncate(left, maxLeftWidth), right, LINE_WIDTH);
  }

  private negative(value?: number): number | undefined {
    if (value === undefined) return undefined;
    return value === 0 ? 0 : -Math.abs(value);
  }

  private paymentMethod(method?: string): string {
    const labels: Record<string, string> = {
      cash: 'Tien mat',
      card: 'The',
      bank_transfer: 'Chuyen khoan',
      transfer: 'Chuyen khoan',
      qr: 'QR',
    };

    return labels[method ?? ''] ?? method ?? 'Tien mat';
  }

  private normalize(data: ReceiptData | LegacyReceiptData): ReceiptData {
    if (this.isLegacy(data)) {
      const subtotal = data.items.reduce((sum, item) => sum + item.qty * item.price, 0);
      return {
        header: {
          store_name: data.storeName,
        },
        invoice: {
          code: data.orderId,
          created_at: new Date().toLocaleString('vi-VN'),
        },
        items: data.items.map((item) => ({
          name: item.name,
          quantity: item.qty,
          unit_price: item.price,
          amount: item.qty * item.price,
        })),
        summary: {
          subtotal,
          total: data.total ?? subtotal,
        },
        payment: data.total === undefined ? undefined : { amount: data.total },
        note: data.note,
      };
    }

    return data;
  }

  private isLegacy(data: ReceiptData | LegacyReceiptData): data is LegacyReceiptData {
    const firstItem = Array.isArray(data?.items) ? data.items[0] : undefined;
    return !!firstItem && 'qty' in firstItem && 'price' in firstItem;
  }
}
