# Printer Service - API Documentation

Tài liệu này tổng hợp các đầu API hiện có trong dự án `printer-service` cùng với hướng dẫn cách gọi chi tiết.

Ứng dụng đang chạy ở **PORT 9000**, do đó base URL của API sẽ là: `http://localhost:9000`

---

## 1. API Kiểm tra sức khỏe hệ thống (Health Check)
API này dùng để kiểm tra xem server có đang hoạt động bình thường hay không.

- **Endpoint:** `/api/health`
- **Method:** `GET`
- **Mô tả:** Trả về trạng thái hoạt động của server.

**Cách gọi (cURL):**
```bash
curl -X GET http://localhost:9000/api/health
```

**Cách gọi (JavaScript/Fetch):**
```javascript
fetch('http://localhost:9000/api/health')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Cách gọi (PowerShell):**
```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/health' -Method Get
```

---

## 2. API Lấy danh sách máy in (Get Printers)
API này dùng để lấy danh sách tất cả các máy in (bao gồm cả máy in cục bộ hoặc mạng).

- **Endpoint:** `/api/printers`
- **Method:** `GET`
- **Mô tả:** Trả về một mảng chứa thông tin các máy in (Printer ID, tên máy, port, loại kết nối...).

**Cách gọi (cURL):**
```bash
curl -X GET http://localhost:9000/api/printers
```

**Cách gọi (JavaScript/Fetch):**
```javascript
fetch('http://localhost:9000/api/printers')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Cách gọi (PowerShell):**
```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/printers' -Method Get
```

---

## 3. API In test (Test Print)
API này cho phép gửi một lệnh in thử nghiệm đến một máy in cụ thể dựa vào `printerId`.

- **Endpoint:** `/api/printers/test`
- **Method:** `POST`
- **Mô tả:** Nhận `printerId` trong phần body và gửi lệnh test đến máy in đó.
- **Headers yêu cầu:** 
  - `Content-Type: application/json`
- **Body yêu cầu (JSON):**
  ```json
  {
    "printerId": "Tên hoặc ID của máy in cần test"
  }
  ```

**Các Response trả về:**
- **200 OK:** In thành công hoặc đẩy lệnh in vào hàng đợi thành công.
- **400 Bad Request:** Nếu gửi thiếu `printerId` (trả về `{ "success": false, "message": "Thiếu printerId" }`).
- **404 Not Found:** Nếu không tìm thấy máy in tương ứng (trả về `{ "success": false, "message": "Không tìm thấy máy in..." }`).

**Cách gọi (cURL):**
```bash
curl -X POST http://localhost:9000/api/printers/test \
     -H "Content-Type: application/json" \
     -d '{"printerId": "XP-T80A"}'
```

**Cách gọi (JavaScript/Fetch):**
```javascript
fetch('http://localhost:9000/api/printers/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    printerId: 'XP-T80A' // Thay bằng ID thực tế bạn lấy được từ API lấy danh sách
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

**Cách gọi (PowerShell):**
```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/printers/test' `
  -Method Post `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body '{"printerId": "prn_603a575eba52"}'
```

---

## 4. API In theo luồng chuẩn (Print Pipeline - Phase 5)
API này dùng để in hóa đơn, in bếp, v.v. thông qua cơ chế alias (chỉ định cấu hình ảo `cashier`, `kitchen`) và sử dụng các template (như `receipt`). Việc cấu hình mapping máy in vật lý được chỉnh trong file `printers.json`.

- **Endpoint:** `/api/print`
- **Method:** `POST`
- **Mô tả:** Nhận request in từ phần mềm POS, chọn builder dựng dữ liệu tương ứng với template, sau đó tự động tra cứu alias để in ra máy vật lý thực tế.
- **Headers yêu cầu:** 
  - `Content-Type: application/json`
- **Body yêu cầu (JSON):**
  ```json
  {
    "printer": "cashier", 
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
  *(Các field có thể khác nhau tùy loại `template` bạn sử dụng)*

### Các template được hỗ trợ hiện tại:

#### 1. `receipt` (Hóa đơn thanh toán)
Dùng cho in hóa đơn đưa khách hàng. Cần các trường `items` (name, qty, price), có thể có `storeName`, `orderId`, `total`, `note`.

#### 2. `kitchen` (Phiếu bếp)
Dùng cho máy in bếp, in chữ to dễ đọc, không hiển thị giá tiền, có kèm ghi chú.
**Ví dụ Body (JSON):**
```json
{
  "printer": "kitchen", 
  "template": "kitchen",
  "data": {
    "table": "05",
    "orderId": "DH00123",
    "items": [
      { "name": "Pho bo", "qty": 2, "note": "khong hanh" },
      { "name": "Goi cuon", "qty": 1 }
    ]
  }
}
```

#### 3. `bill` (Hóa đơn tạm tính)
Dùng cho việc in hóa đơn tạm tính trước khi khách thanh toán, hỗ trợ hiển thị thông tin giảm giá, thuế.
**Ví dụ Body (JSON):**
```json
{
  "printer": "cashier", 
  "template": "bill",
  "data": {
    "storeName": "CUA HANG ABC",
    "table": "05",
    "items": [
      { "name": "Pho bo", "qty": 2, "price": 45000 },
      { "name": "Goi cuon", "qty": 1, "price": 15000 }
    ],
    "discount": 5000,
    "tax": 10000
  }
}
```

#### 4. `label` (Tem nhãn sản phẩm)
Dùng để in tem dán lên từng ly nước, sản phẩm (thường dùng khổ giấy nhỏ).
**Ví dụ Body (JSON):**
```json
{
  "printer": "cashier", 
  "template": "label",
  "data": {
    "productName": "Tra Sua Tran Chau",
    "price": 35000,
    "note": "It da, 50% duong",
    "barcode": "893123456789"
  }
}
```

**Các Response trả về:**
- **200 OK:** In thành công hoặc đẩy lệnh in vào hàng đợi thành công (trả về `{ "success": true, "message": "Đã gửi lệnh in tới \"cashier\" (XP-T80A)" }`).
- **400 Bad Request:** Nếu gửi thiếu field `printer`, `template`, `data` hoặc nếu `template` không được hỗ trợ.
- **404 Not Found:** Nếu alias máy in không có trong cấu hình, hoặc máy in vật lý tương ứng đang offline.

**Cách gọi (cURL):**
```bash
curl -X POST http://localhost:9000/api/print \
  -H "Content-Type: application/json" \
  -d '{
    "printer": "cashier",
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

**Cách gọi (JavaScript/Fetch):**
```javascript
fetch('http://localhost:9000/api/print', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    printer: "cashier",
    template: "receipt",
    data: {
      storeName: "CUA HANG ABC",
      orderId: "DH00123",
      items: [
        { name: "Ca phe sua", qty: 2, price: 25000 },
        { name: "Banh mi", qty: 1, price: 15000 }
      ],
      note: "Cam on quy khach!"
    }
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

**Cách gọi (PowerShell):**
```powershell
$body = @{
    printer = "cashier"
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

## 5. API Kiem tra trang thai may in (Printer Status - Phase 8)

- **Endpoint:** `/api/printers/status`
- **Method:** `GET`
- **Mo ta:** Tra ve trang thai online/offline cua cac may in da cau hinh alias trong `src/storage/config/printers.json`.

**Response mau:**
```json
[
  {
    "id": "kitchen",
    "status": "online"
  }
]
```

**Cach goi (cURL):**
```bash
curl -X GET http://localhost:9000/api/printers/status
```

**Cach goi (PowerShell):**
```powershell
Invoke-RestMethod -Uri 'http://localhost:9000/api/printers/status' -Method Get
```
