# NemoPOS Printer Service

Local Windows printer service for NemoPOS. The app exposes HTTP APIs on port `9000`, builds ESC/POS print buffers, queues print jobs, and sends raw print data to Windows printers.

## Requirements

- Windows
- Node.js and npm
- .NET SDK, only needed when rebuilding `bin/printer.exe`
- A Windows printer installed and visible in Control Panel / Printers

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

## Test Print API

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
