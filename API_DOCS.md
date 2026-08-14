# Printer Service - API Documentation

Tai lieu nay mo ta cac API dang dung trong `printer-service`.

Base URL mac dinh: `http://localhost:9000`

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

API nay doc danh sach may in tu Windows. POS/app goi API nay de hien thi danh sach cho nguoi dung chon may in.

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

---

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
waiting -> printing -> completed
```

Neu may in sai ten, mat ket noi, hoac helper raw printer loi, job co the chuyen sang `failed`.

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
