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
