export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 400); }
}

export class PrinterAliasNotFoundError extends AppError {
  constructor(alias: string) { super(`Không tìm thấy cấu hình máy in cho alias: ${alias}`, 404); }
}

export class PrinterNotFoundError extends AppError {
  constructor(name: string) { super(`Không tìm thấy máy in đang online: ${name}`, 404); }
}

export class TemplateNotFoundError extends AppError {
  constructor(template: string) { super(`Không hỗ trợ template: ${template}`, 400); }
}
