# Deployment Guide

## Prerequisites

- Google Account (for Sheets, Apps Script, Drive)
- GitHub Account (untuk host frontend)
- Basic understanding of Google Sheets dan Apps Script

## Step-by-Step Deployment

### PHASE 1: Setup Google Sheets Database

#### 1. Create Google Sheets
1. Go to [sheets.google.com](https://sheets.google.com)
2. Click "Create" → New spreadsheet
3. Name: `PAS-One Production`
4. Copy the Spreadsheet ID from URL

#### 2. Initialize Database Schema
1. In the same Google Sheet, create tabs (sheets): Users, Catalog, Orders, etc.
2. Gunakan script di `docs/DATABASE-SETUP.md` untuk:
   - Add headers
   - Seed test data
   - Create admin user

#### 3. Set Permissions
- Share spreadsheet with team members
- Set to "Editor" access for admins
- "Viewer" untuk analytics users

### PHASE 2: Deploy Google Apps Script Backend

#### 1. Create Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New project"
3. Name: `PAS-One Backend`

#### 2. Add Backend Code
1. Paste entire `backend/app.gs` into the editor
2. Replace `SPREADSHEET_ID` placeholder dengan ID dari PHASE 1
3. Save project

#### 3. Configure Script Properties
1. Click "Project Settings"
2. Add Script Property:
   ```
   Key: SPREADSHEET_ID
   Value: [paste your Sheets ID]
   
   Key: SECRET_KEY
   Value: [generate random string, e.g., `$(openssl rand -base64 32)`]
   ```

#### 4. Deploy as Web App
1. Click "Deploy" → New deployment
2. Type: Select "Web app"
3. Configuration:
   - Execute as: [your Google account]
   - Who has access: Anyone
4. Click "Deploy"
5. **Copy the deployment URL** (format: `https://script.google.com/macros/d/{ID}/usercodeapp`)
6. Save this URL - needed for frontend config

#### 5. Test Backend
1. Open Apps Script > Run console
2. Execute:
   ```javascript
   testAuth();
   ```
3. Check execution log for errors

### PHASE 3: Setup Frontend

#### 1. Konfigurasi Lokal
```bash
# Clone atau extract PAS-One-Complete.zip
cd pas-one

# Copy config template
cp frontend/.env.example frontend/.env

# Edit frontend/.env
nano frontend/.env
```

Edit file `frontend/.env`:
```env
APPS_SCRIPT_URL=https://script.google.com/macros/d/{YOUR_DEPLOYMENT_ID}/usercodeapp
SPREADSHEET_ID={YOUR_SPREADSHEET_ID}
```

#### 2. Test Lokal (Optional)
```bash
# Jalankan simple HTTP server
cd frontend
python3 -m http.server 8000

# Buka browser: http://localhost:8000
```

#### 3. Deploy ke GitHub Pages

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: PAS-One v1.0.0"
   git remote add origin https://github.com/YOUR_USERNAME/pas-one.git
   git branch -M main
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: main branch → /docs folder (atau root jika frontend di root)
   - Custom domain: opsional (jika pakai domain sendiri)

3. **Frontend sekarang accessible di:**
   - `https://YOUR_USERNAME.github.io/pas-one`
   - atau custom domain jika dikonfigurasi

#### Alternative: Host di Cloud Run
```bash
# Build container
docker build -t pas-one-frontend .

# Deploy ke Google Cloud Run
gcloud run deploy pas-one \
  --image pas-one-frontend \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

### PHASE 4: Initial Setup & Testing

#### 1. Create First User (Admin)
1. Open frontend di browser
2. Go to /register
3. Register account:
   ```
   Email: admin@yourcompany.com
   Password: secure_password_123
   Name: Administrator
   ```
4. Manually update di Google Sheets:
   - Go to Users sheet
   - Set role to "admin" untuk user ini
   - Set active to TRUE

#### 2. Test Login
1. Logout
2. Go to /login
3. Login dengan admin account
4. Verify admin dashboard accessible (#/admin)

#### 3. Add Test Data
1. At #/admin → Catalog tab
2. Add sample items:
   - Ganti Oli 10W-40, Rp150.000
   - Service Rutin A, Rp200.000
3. Verify catalog tampil di #/catalog

#### 4. Test Payment Flow
1. Go to #/catalog
2. Add item to cart
3. Checkout
4. Verify order created di Google Sheets (Orders tab)
5. Verify payment pending

#### 5. Test Admin Payment Verification
1. As admin, go #/admin → Payments tab
2. Find pending payment
3. Click "Verify"
4. Verify order status updated to "payment_verified"

### PHASE 5: Production Configuration

#### 1. Update Settings Sheet
1. Di Google Sheets, buka Settings tab
2. Update configuration:
   ```
   NORMAL_HOURS_START | 06:00
   NORMAL_HOURS_END | 18:00
   FREE_RADIUS_KM | 30
   DISTANCE_FEE_PER_KM | 10000
   GUEST_VISIT_FEE | 250000
   TAX_PERCENTAGE | 10
   ```

#### 2. Setup Email Notifications (Opsional)
Jika menggunakan email service:
```javascript
// Di backend/app.gs tambahkan:
function sendOrderConfirmation(orderId, email) {
  MailApp.sendEmail(email, 'Order Confirmed', `Order ${orderId} confirmed`);
}
```

#### 3. Enable WhatsApp Integration (Future)
```javascript
// Placeholder untuk integrasi WhatsApp API
function sendWhatsAppNotification(phone, message) {
  // Integrasi dengan WhatsApp Business API
}
```

#### 4. Setup Backup
```bash
# Auto-backup sheet setiap hari
function dailyBackup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const blob = ss.getBlob();
  DriveApp.getFolderById(BACKUP_FOLDER_ID)
    .createFile(blob)
    .setName(`PAS-One-Backup-${new Date().toISOString()}`);
}

// Schedule dengan Triggers
// Apps Script > Triggers > Create new trigger
// Function: dailyBackup
// Deployment: Head
// Event: Time-driven, Daily, 2 AM
```

### PHASE 6: Monitoring & Maintenance

#### 1. Monitor Quota
- Apps Script: 20k requests/day
- Sheets API: 500 requests/100 seconds
- Check Usage: Apps Script > Executions

#### 2. Check Logs
```javascript
// View audit log
function viewAuditLog() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName('AuditLog');
  Logger.log(sheet.getDataRange().getValues());
}
```

#### 3. Performance Tuning
- Clear old audit logs monthly
- Archive old emergency tickets
- Optimize Sheets formulas if used
- Implement caching on frontend

#### 4. Regular Tasks
- Weekly: Backup check
- Monthly: Security audit (check for exposed secrets)
- Quarterly: Performance review & optimization
- Yearly: Major version release planning

## Troubleshooting

### Frontend tidak bisa connect ke backend
- [ ] Verify `APPS_SCRIPT_URL` di frontend/.env
- [ ] Check Apps Script deployment is active
- [ ] Verify CORS headers (GAS tidak block CORS)
- [ ] Check browser console untuk error details

### Login gagal
- [ ] Verify user exists di Users sheet
- [ ] Check password hash calculation
- [ ] Verify token generation works

### Sheets tidak update
- [ ] Check Spreadsheet ID di Script Properties
- [ ] Verify user has edit access ke Sheets
- [ ] Check Apps Script quota limits
- [ ] Review execution logs for errors

### Payment tidak terverifikasi
- [ ] Verify Payments sheet populated
- [ ] Check admin user role is "admin"
- [ ] Verify paymentStatus update formula

## Rollback Plan

Jika terjadi issue di production:

1. **Immediate**: Stop Apps Script deployment (disable Web App)
2. **Investigate**: Check logs, recent changes
3. **Restore**: Revert backend code ke versi sebelumnya
4. **Verify**: Test di staging sebelum re-deploy
5. **Communicate**: Inform users of issue status

## Checklist Final

- [ ] Google Sheets created dan shared
- [ ] Apps Script deployed with correct Spreadsheet ID
- [ ] Frontend .env configured dengan correct URLs
- [ ] Test data seeded (admin user, sample catalog)
- [ ] Login flow tested
- [ ] Order creation tested
- [ ] Payment verification tested
- [ ] Admin dashboard loads
- [ ] Emergency panic button works
- [ ] All menu links functional
- [ ] No console errors in browser DevTools
- [ ] Responsive design tested on mobile
- [ ] Backup strategy in place
- [ ] Team training completed
- [ ] Go-live approval obtained

---

**Deployment Status**: Ready for Production ✅
**Last Updated**: October 29, 2026
**Version**: 1.0.0
