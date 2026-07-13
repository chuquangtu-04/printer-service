import { EscposCommands as C } from './EscposCommands';

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number; // đơn giá
}

export interface ReceiptData {
  storeName?: string;
  orderId?: string;
  items: ReceiptItem[];
  total?: number; // nếu không truyền, tự tính từ items
  note?: string;
}

const LINE_WIDTH = 32; // ký tự / dòng — tùy khổ giấy 58mm hay 80mm, chỉnh lại nếu cần

// Helper: Bỏ dấu tiếng Việt để in ASCII không bị lỗi font
function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

export class ReceiptBuilder {
  static build(data: ReceiptData): Buffer {
    this._validate(data);

    const parts: Buffer[] = [C.INIT, C.ALIGN_CENTER];

    if (data.storeName) {
      const storeNameAscii = removeVietnameseTones(data.storeName);
      parts.push(C.BOLD_ON, C.DOUBLE_SIZE_ON, C.text(storeNameAscii + '\n'), C.DOUBLE_SIZE_OFF, C.BOLD_OFF);
    }
    if (data.orderId) {
      parts.push(C.text(`Order: ${data.orderId}\n`));
    }
    parts.push(C.text(new Date().toLocaleString('vi-VN') + '\n'));
    parts.push(C.line('-', LINE_WIDTH));

    parts.push(C.ALIGN_LEFT);
    let computedTotal = 0;
    for (const item of data.items) {
      const lineTotal = item.qty * item.price;
      computedTotal += lineTotal;
      parts.push(C.text(this._formatItemLine(item, lineTotal)));
    }

    parts.push(C.line('-', LINE_WIDTH));
    const total = data.total ?? computedTotal;
    parts.push(C.BOLD_ON, C.text(this._formatTotalLine(total)), C.BOLD_OFF);

    if (data.note) {
      const noteAscii = removeVietnameseTones(data.note);
      parts.push(C.FEED(1), C.ALIGN_CENTER, C.text(noteAscii + '\n'));
    }

    parts.push(C.FEED(3), C.CUT);
    return Buffer.concat(parts);
  }

  private static _validate(data: ReceiptData): void {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Dữ liệu hóa đơn không hợp lệ: thiếu "items"');
    }
    for (const item of data.items) {
      if (!item.name || typeof item.qty !== 'number' || typeof item.price !== 'number') {
        throw new Error(`Item không hợp lệ: ${JSON.stringify(item)}`);
      }
    }
  }

  private static _formatItemLine(item: ReceiptItem, lineTotal: number): string {
    const itemNameAscii = removeVietnameseTones(item.name);
    const namePart = itemNameAscii.slice(0, 18).padEnd(18);
    const qtyPart = String(item.qty).padStart(3);
    const totalPart = lineTotal.toLocaleString('vi-VN').padStart(9);
    return `${namePart}${qtyPart}${totalPart}\n`;
  }

  private static _formatTotalLine(total: number): string {
    const label = 'TOTAL'.padEnd(LINE_WIDTH - 10);
    const value = total.toLocaleString('vi-VN').padStart(10);
    return `${label}${value}\n`;
  }
}
