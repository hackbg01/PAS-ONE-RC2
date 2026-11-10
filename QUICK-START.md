# PAS-One v1.0.0 - Quick Launch (15 Minutes)

## Step 1: Setup Google Sheets (3 min)
```
1. Go sheets.google.com → Create new spreadsheet
2. Name: "PAS-One Production"
3. Copy Spreadsheet ID from URL
4. Keep tab open
```

## Step 2: Deploy Google Apps Script Backend (5 min)
```
1. Go script.google.com → New project
2. Paste backend/app.gs code
3. Project Settings:
   - SPREADSHEET_ID = [paste your ID]
   - SECRET_KEY = [any random string]
4. Deploy → Web app
   - Execute as: Your account
   - Access: Anyone
5. Copy deployment URL (format: https://script.google.com/macros/d/ABC/usercodeapp)
```

## Step 3: Configure Frontend (2 min)
```
1. Edit frontend/.env:
   APPS_SCRIPT_URL = [paste deployment URL]
   SPREADSHEET_ID = [paste your Sheets ID]
2. Save .env
```

## Step 4: Initialize Database (3 min)
```
1. Back in Google Apps Script
2. Run > initializeDatabase
3. Check: Database initialized ✓
4. Check Google Sheets: Tables created ✓
```

## Step 5: Test Login (2 min)
```
1. Open frontend/index.html in browser (or deploy to GitHub Pages)
2. Click Login
3. Use: admin@pasone.local / admin123
4. Verify: Admin dashboard loads ✓
```

## 🎉 DONE! You're Live!

---

## What's Working Now

### Consumer (Public Users)
- ✅ Catalog browsing
- ✅ Shopping cart
- ✅ Checkout
- ✅ Emergency panic button
- ✅ Cost estimation

### Admin Dashboard  
- ✅ Payment verification
- ✅ Order management
- ✅ Catalog management (add/edit/delete)
- ✅ Inventory management (stock tracking)

### Tech Details
- **Frontend**: HTML5 + CSS3 + Vanilla JS
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Cost**: $0/month (free tier Google)

---

## Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pasone.local | admin123 |
| Mechanic | mechanic@pasone.local | mechanic123 |
| Manager | manager@pasone.local | manager123 |

---

## Deploy Frontend (Pick One)

### Option A: GitHub Pages (Free, Auto-Deploy)
```bash
git clone your-repo
git add .
git commit -m "Initial PAS-One v1.0"
git push origin main
# GitHub Pages auto-deploys
# URL: https://yourname.github.io/pas-one
```

### Option B: Own Server
```bash
# Copy frontend/ folder to web server
# URL: https://yourdomain.com/pas-one
```

### Option C: Local Testing
```bash
# Open frontend/index.html in browser
# URL: file:///path/to/frontend/index.html
```

---

## Troubleshooting

**"Unauthorized" error when login?**
- Verify APPS_SCRIPT_URL in .env
- Check backend/app.gs deployed correctly
- Verify SPREADSHEET_ID in both places

**Database not syncing?**
- Verify Spreadsheet ID matches
- Check user has edit access to Sheets
- Re-run initializeDatabase()

**Frontend shows blank?**
- Check browser console (F12)
- Verify all CSS/JS files loaded
- Check frontend/.env configured

---

## Next Steps (v1.1)

- [ ] Real-time location tracking
- [ ] Email notifications
- [ ] Payment gateway integration (Midtrans)
- [ ] WhatsApp integration
- [ ] Advanced reports

---

**You're ready! 🚀 Welcome to PAS-One v1.0.0**
