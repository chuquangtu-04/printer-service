interface PrinterOptions {
  id: string;
  name: string;
  type: string;
  status?: string;
  isDefault?: boolean;
  port?: string | null;
  ip?: string;
  lanPort?: number;
  meta?: Record<string, unknown>;
}

export class Printer {
  id: string;
  name: string;
  type: string;
  status: string;
  isDefault: boolean;
  port: string | null;
  ip?: string;
  lanPort?: number;
  meta: Record<string, unknown>;

  constructor({ id, name, type, status = 'unknown', isDefault = false, port = null, ip, lanPort, meta = {} }: PrinterOptions) {
    this.id = id;
    this.name = name;
    this.type = type;       // 'USB' | 'NETWORK' | 'BLUETOOTH'
    this.status = status;   // 'online' | 'offline' | 'unknown'
    this.isDefault = isDefault;
    this.port = port;       // giữ lại để debug, không trả ra API
    this.ip = ip;
    this.lanPort = lanPort;
    this.meta = meta;
  }

  toJSON() {
    const data: {
      id: string;
      name: string;
      type: string;
      status: string;
      isDefault: boolean;
      ip?: string;
      port?: number;
    } = {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      isDefault: this.isDefault,
    };

    if (this.ip && this.lanPort) {
      data.ip = this.ip;
      data.port = this.lanPort;
    }

    return data;
  }
}
