interface PrinterOptions {
  id: string;
  name: string;
  type: string;
  status?: string;
  isDefault?: boolean;
  port?: string | null;
  meta?: Record<string, any>;
}

export class Printer {
  id: string;
  name: string;
  type: string;
  status: string;
  isDefault: boolean;
  port: string | null;
  meta: Record<string, any>;

  constructor({ id, name, type, status = 'unknown', isDefault = false, port = null, meta = {} }: PrinterOptions) {
    this.id = id;
    this.name = name;
    this.type = type;       // 'USB' | 'NETWORK' | 'BLUETOOTH'
    this.status = status;   // 'online' | 'offline' | 'unknown'
    this.isDefault = isDefault;
    this.port = port;       // giữ lại để debug, không trả ra API
    this.meta = meta;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      isDefault: this.isDefault,
    };
  }
}
