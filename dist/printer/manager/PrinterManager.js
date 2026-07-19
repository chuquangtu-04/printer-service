"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrinterManager = void 0;
const UsbDriver_1 = require("../drivers/UsbDriver");
class PrinterManager {
    drivers;
    usbDriver;
    constructor(drivers = [], usbDriver = new UsbDriver_1.UsbDriver()) {
        this.drivers = drivers;
        this.usbDriver = usbDriver;
    }
    registerDriver(driver) {
        this.drivers.push(driver);
    }
    async discoverAll() {
        const results = await Promise.all(this.drivers.map((driver) => driver.discover().catch(() => [])));
        return results.flat();
    }
    /**
     * In test tới 1 máy in cụ thể.
     * printerId có thể match theo id (hash) hoặc theo tên hệ thống.
     */
    async print(printerId, data) {
        const printers = await this.discoverAll();
        const target = printers.find((p) => p.id === printerId || p.name === printerId);
        if (!target) {
            throw new Error(`Không tìm thấy máy in: ${printerId}`);
        }
        await this.usbDriver.write(target.name, data);
        return { id: target.id, name: target.name };
    }
}
exports.PrinterManager = PrinterManager;
