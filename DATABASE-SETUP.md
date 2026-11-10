# Database Setup Guide

## Google Sheets Schema

PAS-One menggunakan Google Sheets sebagai database. Setiap tab (sheet) merepresentasikan satu tabel.

### Prerequisites
1. Buat Google Sheets baru untuk PAS-One
2. Salin Spreadsheet ID dari URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. Simpan di Apps Script Project Properties

## Sheet Definitions

### 1. Users (Tab: "Users")
Menyimpan data pengguna terdaftar.

| Column | Type | Notes |
|--------|------|-------|
| A | userId | UUID, primary key |
| B | email | Email unik, login identifier |
| C | passwordHash | SHA-256 hashed, base64 encoded |
| D | name | Full name |
| E | role | admin, mechanic, manager, customer, guest |
| F | createdAt | Timestamp |
| G | active | Boolean |

**Sample Row:**
```
550e8400-e29b-41d4-a716-446655440000 | admin@pasone.local | [hash] | Admin | admin | 2026-10-29 | TRUE
```

### 2. Catalog (Tab: "Catalog")
Menyimpan daftar jasa dan produk.

| Column | Type | Notes |
|--------|------|-------|
| A | itemId | UUID, primary key |
| B | name | Nama jasa/produk |
| C | category | jasa, spare-part, oli, material |
| D | description | Deskripsi detail |
| E | price | Harga dalam Rp |
| F | stock | Stok tersedia |
| G | active | Boolean |
| H | createdAt | Timestamp |

**Sample Rows:**
```
item-001 | Ganti Oli 10W-40 | oli | Ganti oli mesin standar | 150000 | 50 | TRUE | 2026-10-29
item-002 | Service Rutin A | jasa | Kuras oli, ganti filter, cek komponen | 200000 | 999 | TRUE | 2026-10-29
```

### 3. Orders (Tab: "Orders")
Menyimpan semua pesanan/order.

| Column | Type | Notes |
|--------|------|-------|
| A | orderId | ORD-{timestamp} |
| B | customerId | userId dari Users sheet |
| C | customerData | JSON: {name, email, phone, address} |
| D | items | JSON: [{itemId, name, price, quantity}] |
| E | subtotal | Harga tanpa pajak |
| F | tax | 10% dari subtotal |
| G | total | subtotal + tax |
| H | orderStatus | draft, in_progress, completed, cancelled |
| I | paymentStatus | pending, verified, failed |
| J | createdAt | Timestamp |
| K | createdBy | Email user yang membuat order |

### 4. Payments (Tab: "Payments")
Tracking pembayaran pesanan.

| Column | Type | Notes |
|--------|------|-------|
| A | paymentId | UUID |
| B | orderId | Order ID reference |
| C | amount | Jumlah pembayaran |
| D | status | pending, verified, failed |
| E | method | qris, transfer, cash |
| F | proofUrl | URL bukti pembayaran (opsional) |
| G | verifiedBy | Admin email yang verifikasi |
| H | verifiedAt | Timestamp verifikasi |
| I | createdAt | Timestamp pembayaran dibuat |

### 5. Emergency (Tab: "Emergency")
Menyimpan tiket emergency 24/7.

| Column | Type | Notes |
|--------|------|-------|
| A | ticketId | EMG-{timestamp} |
| B | customerId | Opsional (guest bisa submit) |
| C | customerName | Nama kontak |
| D | customerPhone | Nomor HP |
| E | lat | Latitude lokasi kejadian |
| F | lng | Longitude lokasi kejadian |
| G | complaint | Keluhan/deskripsi masalah |
| H | status | created, assigned, in_progress, completed |
| I | assignedTo | Mekanik email |
| J | estimatedCost | Estimasi biaya (termasuk jarak) |
| K | actualCost | Biaya final setelah verifikasi |
| L | createdAt | Timestamp |
| M | completedAt | Timestamp selesai |

### 6. Inventory (Tab: "Inventory")
Master data spare part dan material.

| Column | Type | Notes |
|--------|------|-------|
| A | partId | UUID |
| B | name | Nama part |
| C | category | spare-part, material, oil |
| D | unit | pcs, liter, kg |
| E | quantity | Stok saat ini |
| F | minStock | Reorder point |
| G | price | Harga satuan |
| H | supplier | Nama supplier |
| I | createdAt | Timestamp |

### 7. InventoryMutations (Tab: "InventoryMutations")
Audit trail mutasi stok.

| Column | Type | Notes |
|--------|------|-------|
| A | mutationId | UUID |
| B | partId | Part reference |
| C | type | in, out, adjustment |
| D | quantity | Jumlah perubahan |
| E | reason | order, emergency, adjustment, waste |
| F | referenceId | orderId atau emergencyId |
| G | createdBy | User email |
| H | createdAt | Timestamp |

### 8. DiscountRequests (Tab: "DiscountRequests")
Permintaan diskon dari mekanik.

| Column | Type | Notes |
|--------|------|-------|
| A | requestId | UUID |
| B | orderId | Order reference |
| C | originalAmount | Harga awal |
| D | discountAmount | Jumlah diskon |
| E | finalAmount | Harga setelah diskon |
| F | reason | Alasan pemberian diskon |
| G | requestedBy | Mekanik email |
| H | approvedBy | Manager email |
| I | status | requested, approved, rejected |
| J | createdAt | Timestamp |
| K | decidedAt | Timestamp approval/rejection |

### 9. AuditLog (Tab: "AuditLog")
Semua aksi penting untuk compliance.

| Column | Type | Notes |
|--------|------|-------|
| A | logId | UUID |
| B | timestamp | Waktu kejadian |
| C | action | USER_LOGIN, ORDER_CREATED, PAYMENT_VERIFIED, dll |
| D | resource | ID yang diaffect (orderId, userId, dll) |
| E | details | JSON: {extra context} |
| F | user | Email user yang trigger aksi |

### 10. Settings (Tab: "Settings")
Konfigurasi sistem yang dapat diubah admin.

| Column | Type | Notes |
|--------|------|-------|
| A | key | Nama setting |
| B | value | Nilai setting |
| C | type | string, number, boolean |
| D | description | Penjelasan |

**Default Settings:**
```
NORMAL_HOURS_START | 06:00 | string | Jam kerja mulai
NORMAL_HOURS_END | 18:00 | string | Jam kerja selesai
FREE_RADIUS_KM | 30 | number | Radius gratis ongkir
DISTANCE_FEE_PER_KM | 10000 | number | Biaya per km tambahan
GUEST_VISIT_FEE | 250000 | number | Biaya visit untuk guest
OFF_HOURS_VISIT_FEE | 250000 | number | Biaya visit di luar jam normal
TAX_PERCENTAGE | 10 | number | Pajak dalam persen
```

## Initialization Script

### Langkah 1: Create Sheets
```javascript
// Jalankan di Google Apps Script Editor
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create each sheet if not exists
  const sheetNames = [
    'Users', 'Catalog', 'Orders', 'Payments', 'Emergency',
    'Inventory', 'InventoryMutations', 'DiscountRequests',
    'AuditLog', 'Settings'
  ];
  
  sheetNames.forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });
}
```

### Langkah 2: Add Headers
```javascript
function addHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Users header
  const usersSheet = ss.getSheetByName('Users');
  usersSheet.getRange(1, 1, 1, 7).setValues([[
    'userId', 'email', 'passwordHash', 'name', 'role', 'createdAt', 'active'
  ]]);
  
  // Catalog header
  const catalogSheet = ss.getSheetByName('Catalog');
  catalogSheet.getRange(1, 1, 1, 8).setValues([[
    'itemId', 'name', 'category', 'description', 'price', 'stock', 'active', 'createdAt'
  ]]);
  
  // Orders header
  const ordersSheet = ss.getSheetByName('Orders');
  ordersSheet.getRange(1, 1, 1, 11).setValues([[
    'orderId', 'customerId', 'customerData', 'items', 'subtotal', 
    'tax', 'total', 'orderStatus', 'paymentStatus', 'createdAt', 'createdBy'
  ]]);
  
  // ... repeat untuk sheet lainnya
}
```

### Langkah 3: Seed Test Data
```javascript
function seedTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Add admin user
  const usersSheet = ss.getSheetByName('Users');
  const adminPassword = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    'admin123'
  );
  
  usersSheet.appendRow([
    Utilities.getUuid(),
    'admin@pasone.local',
    Utilities.base64Encode(adminPassword),
    'Administrator',
    'admin',
    new Date(),
    true
  ]);
  
  // Add sample catalog items
  const catalogSheet = ss.getSheetByName('Catalog');
  const items = [
    ['item-001', 'Ganti Oli 10W-40', 'oli', 'Ganti oli mesin', 150000, 50, true, new Date()],
    ['item-002', 'Service Rutin A', 'jasa', 'Kuras oli, ganti filter', 200000, 999, true, new Date()],
    ['item-003', 'Ban Michelin 195/65/R15', 'spare-part', 'Ban depan belakang', 800000, 10, true, new Date()]
  ];
  
  items.forEach(item => catalogSheet.appendRow(item));
}
```

## Migration & Backup

### Export Data
```javascript
function backupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const blob = ss.getBlob();
  const folder = DriveApp.getFolderById('FOLDER_ID');
  folder.createFile(blob)
    .setName(`PAS-One-Backup-${new Date().toISOString().split('T')[0]}`);
}
```

### Import from CSV
```javascript
function importCatalogFromCSV(csvData) {
  const lines = csvData.split('\n');
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Catalog');
  
  lines.slice(1).forEach(line => {
    if (line.trim()) {
      const [name, category, description, price, stock] = line.split(',');
      sheet.appendRow([
        Utilities.getUuid(),
        name,
        category,
        description,
        parseFloat(price),
        parseInt(stock),
        true,
        new Date()
      ]);
    }
  });
}
```

## Validation Rules

### Input Constraints
- Email: Must be valid format
- Price: Positive number only
- Stock: Non-negative integer
- UUID: Must be unique
- Timestamp: Auto-generated on server

### Data Integrity
- Foreign keys: Validate references exist
- Audit trail: Never delete, only mark inactive
- Passwords: Never store plaintext

## Performance Notes

- Add index on email (Users) for login speed
- Add index on orderId (Orders) for search
- Archive old Emergency tickets monthly
- Clear old AuditLog entries after 6 months
