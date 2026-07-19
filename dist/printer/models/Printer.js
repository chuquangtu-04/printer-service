"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Printer = void 0;
class Printer {
    id;
    name;
    type;
    status;
    isDefault;
    port;
    meta;
    constructor({ id, name, type, status = 'unknown', isDefault = false, port = null, meta = {} }) {
        this.id = id;
        this.name = name;
        this.type = type; // 'USB' | 'NETWORK' | 'BLUETOOTH'
        this.status = status; // 'online' | 'offline' | 'unknown'
        this.isDefault = isDefault;
        this.port = port; // giữ lại để debug, không trả ra API
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
exports.Printer = Printer;
