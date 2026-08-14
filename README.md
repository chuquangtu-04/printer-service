# NemoPOS Printer Service

Local Windows printer service for NemoPOS. The app exposes HTTP APIs on port `9000`, builds ESC/POS print buffers, queues print jobs, and sends raw print data to Windows printers or configured LAN printers over TCP.

## Requirements

- Windows
- Node.js and npm
- .NET SDK, only needed when rebuilding `bin/printer.exe`
- A Windows printer installed and visible in Control Panel / Printers, or a LAN thermal printer reachable by IP/port `9100`

## Install From Source

```bash
npm install
```

If `bin/printer.exe` does not exist, or if code under `native/printer-exe` changes, build the native raw printer helper:

```bash
npm.cmd run build:printer
```

This creates:

```text
bin/printer.exe
```

## Run Locally

Start the API service in development mode:

```bash
npm.cmd run dev
```

The service runs at:

```text
http://localhost:9000
```

Check that the service is running:

```bash
curl http://localhost:9000/api/health
```

List printers detected on the machine:

```bash
curl http://localhost:9000/api/printers
```

Use a returned printer `id` or `name` as the `printer` value when calling `/api/print`.

## LAN Printer Config

Printer Service supports two connection modes.

### USB/Windows Printer

Use this when the printer is plugged into the computer by USB, or when the printer has already been added to Windows.

Setup:

1. Install the printer driver in Windows.
2. Confirm the printer appears in `Settings -> Bluetooth & devices -> Printers & scanners`.
3. Start the service.
4. Call:

```bash
curl http://localhost:9000/api/printers
```

5. Use the returned printer `name` or `id` when printing.

Example:

```json
{
  "printer": "XP-T80A",
  "template": "receipt"
}
```

USB/Windows mode does not require `config/printers.json`.

### LAN/TCP Printer

Use this when the printer is connected to the router/switch by network cable, and the POS computer is on the same LAN/Wi-Fi.

For a network thermal printer, edit:

```text
config/printers.json
```

In production on Windows, the service also supports:

```text
C:\ProgramData\NemoPrinter\config\printers.json
```

You can override the path with `PRINTER_CONFIG_PATH`.

Example:

```json
{
  "printers": [
    {
      "id": "kitchen-01",
      "name": "May in bep",
      "connection": {
        "type": "tcp",
        "host": "192.168.100.100",
        "port": 9100
      },
      "enabled": true
    }
  ]
}
```

Restart the service after changing this file, then test:

```bash
curl -X POST http://localhost:9000/api/printers/kitchen-01/test
```

When printing from NemoPOS, send `printer: "kitchen-01"` instead of sending the printer IP.

Example:

```json
{
  "printer": "kitchen-01",
  "template": "kitchen",
  "data": {
    "table": "B05",
    "items": [
      { "name": "Pho bo", "qty": 2 }
    ]
  }
}
```

LAN/TCP mode does not require adding the printer to Windows.

## Test Print API

Example receipt:

```json
{
  "template": "receipt",
  "printer": "{{printerId}}",
  "header": {
    "store_name": "Nguyễn Văn Muối",
    "address": "269 Nguyễn Văn Huyên",
    "phone": "01234567899888"
  },
  "branch_name": "main-branch",
  "invoice": {
    "title": "HÓA ĐƠN BÁN HÀNG",
    "barcode": {
      "type": "CODE128",
      "value": "SAL-FYE-FC6F9A"
    },
    "qrcode": {
      "value": "https://your-domain.com/invoice/SAL-FYE-FC6F9A"
    },
    "code": "SAL-FYE-FC6F9A",
    "created_at": "13/08/2026 16:36:09",
    "customer": "Khách Lẻ",
    "seller": "0123456789"
  },
  "items": [
    {
      "name": "Cải bò thơm",
      "quantity": 1,
      "unit_price": 62000,
      "discount": 50000,
      "amount": 12000
    }
  ],
  "summary": {
    "subtotal": 12000,
    "discount": 1200,
    "voucher": 0,
    "points": 10000,
    "tax": 1377.34,
    "total": 800
  },
  "payment": {
    "method": "cash",
    "amount": 800
  }
}
```

Example kitchen ticket:

```json
{
  "printer": "{{printerId}}",
  "template": "kitchen",
  "data": {
    "language": "vi",
    "table": "208",
    "orderId": "ORD-F1D-AB793B",
    "orderNote": "Ban co tre em",
    "items": [
      { "name": "Pho bo tai", "qty": 1, "note": "Nhieu rau" },
      { "name": "Pho bo chin", "qty": 1, "note": "Nhieu bo" }
    ]
  }
}
```

Supported kitchen ticket languages:

```text
vi
en
```

If `language` is omitted, the default is `vi`.

You can also import:

```text
postman_collection.json
```

Full API and Postman guide:

```text
API_DOCS.md
```

## Frontend SDK

Frontend apps should use the SDK wrapper instead of calling `fetch('http://localhost:9000/api/...')` directly throughout the codebase.

SDK source repo:

```text
D:\printer-sdk
```

During local development, install it in your frontend app with:

```bash
npm install D:\printer-sdk
```

Example:

```ts
import { PrinterSDK } from '@nemo/printer-sdk';

const printer = new PrinterSDK();
const printers = await printer.getPrinters();

await printer.printKitchen(printers[0].id, {
  language: 'vi',
  table: '208',
  orderId: 'ORD001',
  items: [{ name: 'Pho bo', qty: 1 }],
});
```

## Build TypeScript

```bash
npm.cmd run build
```

This creates compiled files under:

```text
dist/
```

## Run Electron App Locally

```bash
npm.cmd run electron:dev
```

The app runs in the system tray and starts the API service on port `9000`.

## Build Desktop App

For a full desktop build, make sure the native printer helper exists first:

```bash
npm.cmd run build:printer
```

Then build the Electron desktop app:

```bash
node node_modules\electron-builder\cli.js --config electron-builder.js --win --publish never
```

You can also try:

```bash
npm.cmd run dist
```

If `npm.cmd run dist` gives unclear output, use the direct `node node_modules\electron-builder\cli.js ...` command above.

## Desktop Build Output

Installer:

```text
release\NemoPOS Printer Service Setup 1.0.0.exe
```

Portable/unpacked app:

```text
release\win-unpacked\NemoPOS Printer Service.exe
```

After installing or opening the desktop app, test:

```text
http://localhost:9000/api/health
http://localhost:9000/api/printers
```

## Troubleshooting

If the tray app is visible but the API does not respond, check:

```text
C:\Users\<your-user>\AppData\Roaming\printer-service\service.log
```

Also make sure no old process is still running:

```powershell
Get-Process | Where-Object { $_.ProcessName -eq 'NemoPOS Printer Service' }
```

If needed, close the tray app or end the old process, then open the app again.

## Useful Scripts

```text
npm.cmd run dev            Run local API in development mode
npm.cmd run build          Compile TypeScript to dist
npm.cmd run build:printer  Build native Windows raw printer helper
npm.cmd run build:all      Build TypeScript and native printer helper
npm.cmd run electron:dev   Run tray desktop app locally
npm.cmd run dist           Build desktop installer
```
