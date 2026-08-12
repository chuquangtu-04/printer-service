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

API nay nhan du lieu tu POS, dung template de tao lenh ESC/POS, sau do gui vao queue in cua may in duoc chon.

- **Endpoint:** `/api/print`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

Field `printer` la may in that lay tu `GET /api/printers`. Khong can alias, khong can database, khong can file cau hinh rieng.

**Body mau:**

```json
{
  "printer": "XP-80C",
  "template": "receipt",
  "data": {
    "storeName": "CUA HANG ABC",
    "orderId": "DH00123",
    "items": [
      { "name": "Ca phe sua", "qty": 2, "price": 25000 },
      { "name": "Banh mi", "qty": 1, "price": 15000 }
    ],
    "note": "Cam on quy khach!"
  }
}
```

**Template dang ho tro:**

- `receipt`: hoa don thanh toan.
- `kitchen`: phieu bep, khong hien thi gia tien.
- `bill`: hoa don tam tinh.
- `label`: tem nhan san pham.

**Response mau:**

```json
{
  "success": true,
  "message": "Da them lenh in vao queue \"XP-80C\"",
  "jobId": 1
}
```

**Cach goi:**

```bash
curl -X POST http://localhost:9000/api/print \
  -H "Content-Type: application/json" \
  -d '{
    "printer": "XP-80C",
    "template": "receipt",
    "data": {
      "storeName": "CUA HANG ABC",
      "orderId": "DH00123",
      "items": [
        { "name": "Ca phe sua", "qty": 2, "price": 25000 },
        { "name": "Banh mi", "qty": 1, "price": 15000 }
      ],
      "note": "Cam on quy khach!"
    }
  }'
```

```javascript
fetch('http://localhost:9000/api/print', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    printer: 'XP-80C',
    template: 'receipt',
    data: {
      storeName: 'CUA HANG ABC',
      orderId: 'DH00123',
      items: [
        { name: 'Ca phe sua', qty: 2, price: 25000 },
        { name: 'Banh mi', qty: 1, price: 15000 }
      ],
      note: 'Cam on quy khach!'
    }
  })
})
  .then(response => response.json())
  .then(data => console.log(data));
```

```powershell
$body = @{
  printer = "XP-80C"
  template = "receipt"
  data = @{
    storeName = "CUA HANG ABC"
    orderId = "DH00123"
    items = @(
      @{ name = "Ca phe sua"; qty = 2; price = 25000 },
      @{ name = "Banh mi"; qty = 1; price = 15000 }
    )
    note = "Cam on quy khach!"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri 'http://localhost:9000/api/print' `
  -Method Post `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body $body
```

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
