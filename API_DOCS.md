# Printer Service - API Documentation

Tai lieu nay mo ta cac API dang dung trong `printer-service`.

Base URL mac dinh: `http://localhost:9000`

---

## 0. Hai cach ket noi may in

Printer Service hien ho tro 2 cach ket noi:

| Cach ket noi | Khi nao dung | Cach service in |
| --- | --- | --- |
| USB/Windows printer | May in cam USB vao may tinh, hoac may in da duoc add vao Windows | In qua Windows printer name bang `bin/printer.exe`. |
| LAN/TCP printer | May in cam day mang vao router, POS/may tinh cung mang Wi-Fi/LAN | In truc tiep ESC/POS toi IP may in qua TCP port `9100`. |

Ca 2 cach deu dung chung API:

```text
GET  /api/printers
POST /api/printers/test
POST /api/print
GET  /api/queue
GET  /api/queue/failed
```

Khac nhau duy nhat la gia tri field `printer`:

- USB/Windows: dung `id` hoac `name` cua may in Windows, vi du `XP-T80A`.
- LAN/TCP: dung alias trong config, vi du `kitchen-01`, khong truyen IP tu POS.

---

## 1. Health Check

Dung de kiem tra app/service da chay va server API co phan hoi hay chua.

- **Endpoint:** `/api/health`
- **Method:** `GET`

```bash
curl -X GET http://localhost:9000/api/health
```

```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/health' -Method Get
```

---

## 2. Lay danh sach may in

API nay doc danh sach may in tu 2 nguon:

- `config/printers.json`: may in LAN/TCP hoac alias USB cau hinh co dinh cho tung nha hang.
- Windows printers: may in da duoc cai vao Windows.

POS/app goi API nay de hien thi danh sach cho nguoi dung chon may in.

- **Endpoint:** `/api/printers`
- **Method:** `GET`

```bash
curl -X GET http://localhost:9000/api/printers
```

```javascript
fetch('http://localhost:9000/api/printers')
  .then(response => response.json())
  .then(data => console.log(data));
```

```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/printers' -Method Get
```

**Cach dung thuc te:**

1. POS goi `GET /api/printers`.
2. Nguoi dung chon may in tren giao dien POS.
3. POS luu lai `id` hoac `name` cua may in da chon.
4. Khi can in, POS truyen gia tri do vao field `printer` cua API `/api/print`.

---

## 2.1 Ket noi USB/Windows printer

Dung cho may in cam USB truc tiep vao may tinh, hoac bat ky may in nao da duoc Windows nhan trong danh sach Printers.

### Dieu kien

- May in da cam USB vao may tinh.
- Windows da cai driver va thay may in trong `Settings -> Bluetooth & devices -> Printers & scanners`.
- `bin/printer.exe` ton tai. Neu chua co, chay:

```bash
npm.cmd run build:printer
```

### Cach test

1. Chay service:

```bash
npm.cmd run dev
```

2. Lay danh sach may in:

```text
GET http://localhost:9000/api/printers
```

3. Tim may in USB, vi du:

```json
{
  "id": "prn_xxxxx",
  "name": "XP-T80A",
  "type": "USB",
  "status": "online",
  "isDefault": false
}
```

4. Test in:

```json
{
  "printerId": "XP-T80A"
}
```

Gui toi:

```text
POST http://localhost:9000/api/printers/test
```

5. Khi goi `/api/print`, truyen:

```json
{
  "printer": "XP-T80A",
  "template": "receipt"
}
```

Luu y: voi cach USB/Windows, khong can sua `config/printers.json`.

---

## 2.2 Ket noi LAN/TCP printer

Dung khi may in cam day mang vao router/switch, may tinh POS ket noi cung mang Wi-Fi/LAN, va may in ho tro raw ESC/POS qua TCP port `9100`.

Mo hinh:

```text
POS/may tinh -- Wi-Fi/LAN -- Router/Switch -- day mang -- May in
```

POS khong truyen IP may in vao API. IP duoc IT cau hinh mot lan trong `config/printers.json`.

### Dieu kien

- May in co IP noi bo, vi du `192.168.100.100`.
- May tinh chay Printer Service ping duoc IP may in.
- Cong TCP `9100` cua may in mo.
- May in ho tro ESC/POS raw qua network.

### File config

File cau hinh local/dev:

```text
config/printers.json
```

Khi dung app desktop tren Windows, Tppos print tu tao file nay o lan mo dau tien:

```text
C:\ProgramData\TpposPrint\config\printers.json
```

Co the override bang bien moi truong:

```text
PRINTER_CONFIG_PATH
```

Vi du cau hinh may in bep LAN:

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

### Cach test

1. Sua `host` dung IP may in.
2. Dat `enabled` la `true`.
3. Restart Printer Service.
4. Goi:

```text
GET http://localhost:9000/api/printers
```

Neu cau hinh dung, se thay:

```json
{
  "id": "kitchen-01",
  "name": "May in bep",
  "type": "NETWORK",
  "status": "unknown",
  "isDefault": false
}
```

5. Test in:

```text
POST http://localhost:9000/api/printers/kitchen-01/test
```

Hoac dung endpoint cu:

```json
{
  "printerId": "kitchen-01"
}
```

Gui toi:

```text
POST http://localhost:9000/api/printers/test
```

6. Khi goi `/api/print`, truyen alias:

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

Luu y: voi LAN/TCP, khong can add may in vao Windows. Service gui ESC/POS truc tiep toi `host:port`.

---

## 3. In test

Dung de gui mot lenh in thu toi may in cu the. `printerId` co the la `id` hoac `name` lay tu API `GET /api/printers`.

- **Endpoint:** `/api/printers/test`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

```json
{
  "printerId": "XP-80C"
}
```

```bash
curl -X POST http://localhost:9000/api/printers/test \
  -H "Content-Type: application/json" \
  -d '{"printerId": "XP-80C"}'
```

```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/printers/test' `
  -Method Post `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body '{"printerId": "XP-80C"}'
```

## 4. In theo template

API nay nhan du lieu tu POS, dung template de tao lenh ESC/POS, sau do dua job vao queue in cua may in duoc chon.

- **Endpoint:** `/api/print`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

Field `printer` phai la `id` hoac `name` cua may in lay tu API `GET /api/printers`.

**Template dang ho tro:**

- `receipt`: hoa don ban hang/thanh toan.
- `kitchen`: phieu bep, khong hien thi gia tien.
- `bill`: hoa don tam tinh.
- `label`: tem nhan san pham.

### Test bang Postman

1. Chay service:

```bash
npm.cmd run dev
```

2. Kiem tra service:

```text
GET http://localhost:9000/api/health
```

3. Lay danh sach may in:

```text
GET http://localhost:9000/api/printers
```

4. Copy gia tri `id` hoac `name` cua may in, sau do dung lam field `printer`.

5. Tao request in hoa don:

```text
POST http://localhost:9000/api/print
```

Headers:

```text
Content-Type: application/json
```

Body chon `raw` -> `JSON`, sau do dan payload:

```json
{
  "template": "receipt",
  "printer": "XP-T80A",
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

### Cau truc payload `receipt`

| Field | Bat buoc | Mo ta |
| --- | --- | --- |
| `template` | Co | Gia tri la `receipt`. |
| `printer` | Co | Ten/id may in lay tu `GET /api/printers`. |
| `header.store_name` | Khong | Ten cua hang in o dau hoa don. |
| `header.address` | Khong | Dia chi cua hang. |
| `header.phone` | Khong | So dien thoai cua hang. |
| `branch_name` | Khong | Ten chi nhanh. |
| `invoice.title` | Khong | Tieu de hoa don. Mac dinh la `HOA DON BAN HANG`. |
| `invoice.barcode.type` | Khong | Hien ho tro `CODE128`. |
| `invoice.barcode.value` | Khong | Gia tri barcode. |
| `invoice.qrcode.value` | Khong | Gia tri QR code. |
| `invoice.code` | Khong | Ma hoa don. |
| `invoice.created_at` | Khong | Thoi gian tao hoa don. |
| `invoice.customer` | Khong | Ten khach hang. |
| `invoice.seller` | Khong | Ma/ten nguoi ban. |
| `items` | Co | Danh sach san pham. |
| `items[].name` | Co | Ten san pham. |
| `items[].quantity` | Co | So luong. |
| `items[].unit_price` | Co | Don gia. |
| `items[].discount` | Khong | Giam gia rieng cua dong hang, hien chua in thanh dong rieng. |
| `items[].amount` | Co | Thanh tien cua dong hang. |
| `summary.subtotal` | Khong | Tam tinh. |
| `summary.discount` | Khong | Giam gia hoa don. Khi in se hien thi so am. |
| `summary.voucher` | Khong | Voucher. Khi in se hien thi so am neu lon hon 0. |
| `summary.points` | Khong | Doi diem. Khi in se hien thi so am neu lon hon 0. |
| `summary.tax` | Khong | Tong thue. |
| `summary.total` | Khong | Tong thanh toan. |
| `payment.method` | Khong | Phuong thuc thanh toan. Ho tro label san: `cash`, `card`, `bank_transfer`, `transfer`, `qr`. |
| `payment.amount` | Khong | So tien da thanh toan. |

### Response mau

```json
{
  "success": true,
  "message": "Da them lenh in vao queue \"XP-T80A\"",
  "job": {
    "id": 1,
    "status": "waiting",
    "printer": "XP-T80A",
    "printerName": "XP-T80A",
    "template": "receipt"
  }
}
```

### Curl mau

```bash
curl -X POST http://localhost:9000/api/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "receipt",
    "printer": "XP-T80A",
    "header": {
      "store_name": "Nguyen Van Muoi",
      "address": "269 Nguyen Van Huyen",
      "phone": "01234567899888"
    },
    "branch_name": "main-branch",
    "invoice": {
      "title": "HOA DON BAN HANG",
      "barcode": { "type": "CODE128", "value": "SAL-FYE-FC6F9A" },
      "qrcode": { "value": "https://your-domain.com/invoice/SAL-FYE-FC6F9A" },
      "code": "SAL-FYE-FC6F9A",
      "created_at": "13/08/2026 16:36:09",
      "customer": "Khach Le",
      "seller": "0123456789"
    },
    "items": [
      {
        "name": "Cai bo thom",
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
  }'
```

### Kiem tra queue sau khi in

```text
GET http://localhost:9000/api/queue
```

Trang thai job thuong di theo luong:

```text
waiting -> printing -> spooled -> completed
```

Voi LAN/TCP printer, luong thuong la:

```text
waiting -> printing -> completed
```

`spooled` nghia la job da duoc day vao Windows Print Queue / Spooler va service dang theo doi job do.
Neu Windows print job bien mat khoi spooler trong thoi gian cho phep, job duoc xem la `completed`.
Timeout theo doi mac dinh la `10000ms`. Co the doi bang bien moi truong `PRINTER_JOB_MONITOR_TIMEOUT_MS`.
Chu ky poll mac dinh la `1000ms`, co the doi bang `PRINTER_JOB_MONITOR_INTERVAL_MS`.

Neu may in sai ten, mat ket noi, helper raw printer loi, hoac Windows print job bi treo qua timeout, job co the chuyen sang `failed`.
Voi Windows/USB printer, service khong chan lenh in bang pre-check online/offline; service gui job vao spooler truoc, sau do theo doi Windows print job.
Neu Windows print job bi loi hoac treo qua timeout, service se xoa job do khoi Windows spooler truoc khi retry/fail de tranh in trung phieu khi may in ket noi lai.
Mac dinh service chi retry 1 lan sau `4000ms`. Sau khi retry het so lan, job chuyen sang `failed` va co `lastError` trong API `/api/queue`.

Voi LAN/TCP printer, service van gui ESC/POS truc tiep toi `host:port`.
Neu ket noi hoac ghi du lieu TCP loi, job se retry/fail trong queue.

Queue duoc luu xuong SQLite tai `data/print-queue.sqlite` theo mac dinh, khong chi nam trong RAM.
Co the doi duong dan file bang bien moi truong `PRINTER_QUEUE_DB_PATH`.
Khi service restart, cac job dang `waiting` se duoc xu ly tiep. Cac job dang `printing` hoac `spooled` luc service bi tat se duoc dua ve `waiting` de thu lai.
Job da `completed` se duoc don tu dong de file SQLite khong tang mai:
`PRINTER_QUEUE_COMPLETED_RETENTION_HOURS` mac dinh la `24`, va `PRINTER_QUEUE_MAX_COMPLETED_JOBS` mac dinh la `1000`.
Job `waiting`, `printing`, `spooled`, va `failed` khong bi don boi co che nay.

### Luu y tuong thich

API van ho tro payload cu dang:

```json
{
  "printer": "XP-80C",
  "template": "receipt",
  "data": {
    "storeName": "CUA HANG ABC",
    "orderId": "DH00123",
    "items": [
      { "name": "Ca phe sua", "qty": 2, "price": 25000 }
    ],
    "note": "Cam on quy khach!"
  }
}
```

Payload moi nen gui truc tiep cac field `header`, `invoice`, `items`, `summary`, `payment` o top-level nhu vi du Postman ben tren.

---

## 5. Quan ly hang doi in

Queue giup moi may in xu ly job theo thu tu, tranh nhieu lenh in cung luc lam tron bill hoac mat job. Moi may in co queue rieng theo gia tri `printer` da truyen vao API `/api/print`.

### Xem queue

- **Endpoint:** `/api/queue`
- **Method:** `GET`

```bash
curl -X GET http://localhost:9000/api/queue
```

### Xem job in loi

Dung de lay rieng cac job da `failed` sau khi retry het so lan.

- **Endpoint:** `/api/queue/failed`
- **Method:** `GET`

```bash
curl -X GET http://localhost:9000/api/queue/failed
```

Response co kem payload goc da gui vao `/api/print`, giup FE hien thi bill/món bi loi:

```json
{
  "success": true,
  "total": 1,
  "jobs": [
    {
      "id": 12,
      "status": "failed",
      "printer": "kitchen-01",
      "printerName": "kitchen-01",
      "template": "kitchen",
      "attempts": 2,
      "maxAttempts": 2,
      "lastError": "Network printer timeout: 192.168.1.50:9100",
      "data": {
        "table": "B05",
        "items": [
          { "name": "Pho bo", "qty": 2 }
        ]
      }
    }
  ]
}
```

### Clear queue

- **Endpoint:** `/api/queue`
- **Method:** `DELETE`

```bash
curl -X DELETE http://localhost:9000/api/queue
```

### Retry job failed

- **Endpoint:** `/api/queue/retry`
- **Method:** `POST`

Retry mot job:

```bash
curl -X POST http://localhost:9000/api/queue/retry \
  -H "Content-Type: application/json" \
  -d '{"id": 5}'
```

Retry tat ca job failed:

```bash
curl -X POST http://localhost:9000/api/queue/retry \
  -H "Content-Type: application/json" \
  -d '{}'
```
