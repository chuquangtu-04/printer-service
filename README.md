# Printer Service

## Native Windows raw printer

Windows raw ESC/POS printing is handled by a small C# executable instead of a generated PowerShell script.

```text
printer-service/
|-- native/
|   `-- printer-exe/
|       |-- PrinterExe.csproj
|       |-- Program.cs
|       `-- RawPrinter.cs
|-- bin/
|   `-- printer.exe
`-- src/
    `-- printer/drivers/UsbDriver.ts
```

Build the executable:

```bash
npm run build:printer
```

Then run the Node service as usual:

```bash
npm run dev
```

`UsbDriver` calls `bin/printer.exe` with `execFile`, writes the ESC/POS buffer to a temporary `.raw` file, and lets the executable send those bytes to Windows Spooler with data type `RAW`.

## Cấu trúc thư mục

```text
printer-service/
│
├── src/
│   │
│   ├── app.js                 # Điểm khởi động
│   │
│   ├── api/                   # HTTP/WebSocket
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   │
│   ├── printer/               # Module máy in
│   │   ├── builders/
│   │   ├── drivers/
│   │   ├── manager/
│   │   ├── queue/
│   │   ├── services/
│   │   ├── templates/
│   │   └── models/
│   │
│   ├── config/
│   │
│   ├── common/
│   │   ├── logger/
│   │   ├── errors/
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── storage/
│   │   ├── config/
│   │   └── logs/
│   │
│   └── electron/              # Thêm sau nếu cần
│
├── package.json
└── README.md
```
