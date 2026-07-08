# Printer Service

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
