export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class PrinterNotFoundError extends AppError {
  constructor(name: string) {
    super(`Khong tim thay may in dang online: ${name}`, 404);
  }
}

export class ConfiguredLanPrinterNotFoundError extends AppError {
  constructor(id: string) {
    super(`Khong tim thay may in LAN da cau hinh: ${id}`, 404);
  }
}

export class CategoryPrinterNotConfiguredError extends AppError {
  constructor(categoryId: string) {
    super(`Danh muc chua cau hinh may in: ${categoryId}`, 400);
  }
}

export class TemplateNotFoundError extends AppError {
  constructor(template: string) {
    super(`Khong ho tro template: ${template}`, 400);
  }
}
