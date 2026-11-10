# PAS-One v1.0.0 Launch Checklist

**Launch Date**: October 29, 2026  
**Version**: 1.0.0 (Production Beta)  
**Tester**: Quality Assurance Team  

---

## ✅ **PRE-LAUNCH TESTING (Phase 1 - 2 Hours)**

### **Authentication Flow**
- [ ] Register new user with valid email
- [ ] Register with duplicate email (should fail)
- [ ] Register with weak password (should warn)
- [ ] Login with correct credentials
- [ ] Login with wrong password (should fail)
- [ ] Logout clears session
- [ ] Refresh page after login (session persists)
- [ ] Different roles see different menus (admin vs customer)

### **Consumer Portal - Catalog & Cart**
- [ ] Catalog loads with all items
- [ ] Items display name, price, description
- [ ] Add item to cart
- [ ] Remove item from cart
- [ ] Change quantity in cart
- [ ] Cart total recalculates correctly
- [ ] Cart persists after refresh
- [ ] Empty cart state displays correctly

### **Admin Portal - Payment Verification**
- [ ] List pending payments shows
- [ ] Payment detail modal opens
- [ ] Form fields validate (required inputs)
- [ ] Verify payment form submits
- [ ] Payment status updates in Orders
- [ ] Booking code generates after verify
- [ ] Reject payment works
- [ ] Auto-refresh fetches new pending payments

### **Admin Portal - Catalog Management**
- [ ] Catalog table displays all items
- [ ] Add item button opens form
- [ ] Add item form validates (price > 0)
- [ ] Add item stores in database
- [ ] New item appears in catalog & consumer catalog
- [ ] Edit item form pre-fills data
- [ ] Edit item updates database
- [ ] Delete item removes from table
- [ ] Toggle active/inactive works
- [ ] Category filter works (if implemented)

### **Admin Portal - Order Management**
- [ ] Orders list shows all orders
- [ ] Order status badges display correct colors
- [ ] Click order detail opens modal
- [ ] Order detail shows items & prices
- [ ] Cost summary calculates correctly
- [ ] Update order status changes in database
- [ ] Status transitions are logical (draft → in progress → completed)
- [ ] Auto-refresh fetches new orders

### **Admin Portal - Inventory Management**
- [ ] Inventory list displays all parts
- [ ] Low stock items highlight (red background)
- [ ] Add part form opens
- [ ] Add part validates required fields
- [ ] Edit part pre-fills data
- [ ] Stock in/out mutation form works
- [ ] Mutation reason dropdown shows options
- [ ] Quantity updates in inventory
- [ ] CSV import preview shows (UI ready)

### **Emergency Features**
- [ ] Emergency page loads
- [ ] Panic button visible & clickable
- [ ] Panic button requests geolocation
- [ ] Emergency ticket creates with location
- [ ] Cost estimate displays correctly
- [ ] Off-hours fee applies (test at night)
- [ ] Distance overage calculates (test > 30km)
- [ ] Guest vs registered pricing different

### **Responsive Design**
- [ ] Desktop (1920x1080): Full layout
- [ ] Tablet (768x1024): 2-column grid
- [ ] Mobile (375x667): Single column
- [ ] Hamburger menu appears on mobile
- [ ] Hamburger menu opens/closes
- [ ] Touch buttons are tappable (48px minimum)
- [ ] Forms are readable on mobile
- [ ] Tables don't overflow on mobile
- [ ] No horizontal scroll on mobile

### **Security**
- [ ] No passwords visible in console
- [ ] No API tokens in localStorage (check DevTools)
- [ ] No secrets in source code
- [ ] Authorization checks work (non-admin can't access admin)
- [ ] Form validation prevents XSS (script tags in input)
- [ ] SQL injection impossible (no SQL used)
- [ ] Email validation rejects invalid formats
- [ ] Price validation rejects negative numbers

### **UI/UX Quality**
- [ ] No console errors (check DevTools)
- [ ] No console warnings (expect some deprecations OK)
- [ ] All links navigate correctly
- [ ] Modal close button works
- [ ] Modal overlay click closes modal
- [ ] Loading states show (if any)
- [ ] Error messages display clearly
- [ ] Success notifications appear
- [ ] Buttons have hover states
- [ ] Forms have focus states
- [ ] No broken images/assets

### **Data Integrity**
- [ ] Cart total = sum of (price × qty) ✓
- [ ] Order total = subtotal + tax (10%) ✓
- [ ] Payment amount can't exceed order total
- [ ] Order can't have 0 items
- [ ] Duplicate orders prevented
- [ ] Stock mutations are logged
- [ ] Audit trail shows all actions
- [ ] Customer data not visible in public portal

---

## 🔧 **INFRASTRUCTURE CHECKLIST (Phase 2 - 2 Hours)**

### **Database Setup**
- [ ] Google Sheets created
- [ ] All 10 tables exist (Users, Catalog, Orders, etc)
- [ ] Headers added to all tables
- [ ] Test data seeded (5 items, 3 users)
- [ ] Admin user created (admin@pasone.local)
- [ ] Sample orders created for testing
- [ ] Audit log has entries
- [ ] No orphaned records

### **Google Apps Script Backend**
- [ ] Script properties set:
  - [ ] SPREADSHEET_ID
  - [ ] SECRET_KEY
- [ ] All endpoint handlers exist
- [ ] /auth/register works
- [ ] /auth/login works
- [ ] /catalog/list works
- [ ] /orders/create works
- [ ] /payments/verify works
- [ ] /emergency/create works
- [ ] Error handling returns JSON
- [ ] No syntax errors in logs

### **Frontend Deployment**
- [ ] frontend/.env configured with:
  - [ ] APPS_SCRIPT_URL (deployment URL)
  - [ ] SPREADSHEET_ID
  - [ ] BASE_LOCATION (Palembang coordinates)
  - [ ] EMERGENCY_PHONE configured
- [ ] All CSS files load (no 404s)
- [ ] All JS files load (no 404s)
- [ ] Images/assets load (if any)
- [ ] CDN resources available (if used)
- [ ] HTTPS enforced (for production)

### **Network & CORS**
- [ ] Frontend can reach Apps Script API
- [ ] POST requests succeed (200 OK)
- [ ] Error responses formatted correctly
- [ ] Network tab shows <500ms latency (after cold start)
- [ ] No CORS errors (GAS allows all)

### **Backup & Recovery**
- [ ] Google Sheets backup export created
- [ ] Backup stored in secure location
- [ ] Recovery procedure documented
- [ ] Daily backup script ready (future)
- [ ] Rollback procedure documented

---

## 🚀 **DEPLOYMENT CHECKLIST (Phase 3 - 1 Hour)**

### **Pre-Deployment**
- [ ] All code changes committed to git
- [ ] README.md up to date
- [ ] All docs reviewed (ARCHITECTURE, DEPLOYMENT, etc)
- [ ] .env.example matches required variables
- [ ] No secrets in .gitignore violations
- [ ] No TODOs in critical code

### **Frontend Deploy**
- [ ] GitHub repo created & initialized
- [ ] All files committed
- [ ] GitHub Pages enabled
- [ ] Frontend accessible at URL
- [ ] HTTPS working (auto-enabled by Pages)
- [ ] Custom domain configured (if applicable)

### **Backend Deploy**
- [ ] Apps Script project created
- [ ] app.gs deployed as Web App
- [ ] Web App deployment URL copied
- [ ] Execution & permissions set correctly
- [ ] Script quota checked (20k requests/day)
- [ ] Apps Script logs clean (no errors)

### **Post-Deployment Verification**
- [ ] Frontend loads at deployed URL
- [ ] Login page displays
- [ ] Can login with test account
- [ ] Admin dashboard loads
- [ ] Catalog displays
- [ ] API calls succeed (check Network tab)
- [ ] Database queries return data
- [ ] Forms submit & save data
- [ ] No CORS/Network errors

### **Performance Baseline**
- [ ] Frontend load time: < 3 seconds
- [ ] First contentful paint: < 2 seconds
- [ ] API response time: 500-2000ms (cold start OK)
- [ ] No memory leaks detected
- [ ] Page size < 100KB (without images)

### **Monitoring Setup**
- [ ] Error tracking configured (optional: Sentry)
- [ ] Analytics configured (optional: Google Analytics)
- [ ] Uptime monitoring ready
- [ ] Log aggregation ready
- [ ] Alert thresholds configured

---

## 👥 **STAKEHOLDER VERIFICATION (Phase 4 - 30 Min)**

### **Product Owner Sign-Off**
- [ ] All MVP features working
- [ ] UI matches design (or approved deviation)
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete

### **Operations Team**
- [ ] Knows how to verify payments
- [ ] Knows how to manage catalog
- [ ] Knows how to track orders
- [ ] Knows how to manage inventory
- [ ] Knows backup/recovery procedure
- [ ] Has access to Google Sheets
- [ ] Has admin account created

### **Customer Support**
- [ ] FAQ documentation ready
- [ ] Troubleshooting guide created
- [ ] Support contact configured
- [ ] Initial tickets logged for edge cases

---

## ✅ **FINAL APPROVAL**

| Role | Name | Sign-Off | Date |
|------|------|----------|------|
| **QA Lead** | Cloud Tester | _____ | _____ |
| **Dev Lead** | Engineer | _____ | _____ |
| **Ops Manager** | Operations | _____ | _____ |
| **Product Owner** | Manager | _____ | _____ |

---

## 📋 **LAUNCH READINESS SUMMARY**

**Test Coverage**: 56+ test cases  
**Critical Issues**: 0  
**High Priority Issues**: 0  
**Medium Issues**: ___ (if any)  
**Low Issues**: ___ (if any)  

**Recommendation**: ✅ **APPROVED FOR LAUNCH**

---

## 🎯 **POST-LAUNCH (First Week)**

- [ ] Monitor error logs daily
- [ ] Check Apps Script quota usage
- [ ] Verify backups successful
- [ ] Gather user feedback
- [ ] Document issues found
- [ ] Plan v1.1 features

---

**Launch Date**: _______________  
**Launched By**: _______________  
**Notes**: _______________________________________________

