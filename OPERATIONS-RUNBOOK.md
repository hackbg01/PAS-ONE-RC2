# PAS-One v1.0.0 - Operations Runbook

**For**: Operations & Admin Team  
**Purpose**: Day-to-day system management  
**Version**: 1.0.0  

---

## 📋 **QUICK REFERENCE**

| Task | Time | Frequency | Who |
|------|------|-----------|-----|
| Check system status | 5 min | Every 4 hours | Ops |
| Monitor error logs | 5 min | Every 4 hours | Ops |
| Verify backups | 10 min | Daily (EOD) | DB Admin |
| Review audit log | 10 min | Daily | Admin |
| Verify payment processing | 10 min | Hourly (business hours) | Admin |
| Clean old logs | 30 min | Monthly | DB Admin |

---

## ✅ **DAILY STARTUP (08:00)**

**Morning System Check**
```
1. Check Google Sheets Access
   [ ] Open PAS-One Spreadsheet
   [ ] Verify all tabs visible (10 tabs)
   [ ] Data loads without errors
   
2. Verify Backend Status
   [ ] Google Apps Script project opens
   [ ] Recent executions show success (green ✓)
   [ ] No errors in logs
   
3. Test Frontend
   [ ] Open deployment URL
   [ ] Page loads (< 2 seconds)
   [ ] Login page displays
   [ ] Test login: admin@pasone.local
   
4. Check Previous Day Issues
   [ ] Review audit log for errors
   [ ] Note any failed operations
   [ ] Plan fixes if needed
   
5. Morning Briefing
   [ ] Note system status
   [ ] Brief team on issues
   [ ] Set day's priorities
```

---

## 📊 **HOURLY MONITORING (Business Hours)**

**Every Hour (09:00-18:00)**
```
[ ] Check error logs (Apps Script > Executions)
    - Look for failed API calls
    - Check for timeouts
    - Note any patterns
    
[ ] Verify payment processing
    - Check Orders sheet for new orders
    - Verify payment status updates
    - Ensure no stuck orders
    
[ ] Monitor quota usage
    - Apps Script > Quota
    - Current usage should be < 20k/day
    - Alert if exceeding 50% of daily quota
    
[ ] Quick feature spot-check
    - Login works
    - Catalog loads
    - Can create test order
```

---

## 🔧 **ADMIN TASKS**

### **Payment Verification** (Daily)
```
1. Check Pending Payments
   [ ] Catalog → Admin → Payments tab
   [ ] View all "Pending Verification" payments
   
2. For Each Payment
   [ ] Confirm payment received (bank statement)
   [ ] Verify amount matches order total
   [ ] Check customer identity
   
3. Verify in System
   [ ] Click order
   [ ] Fill "Verify Payment" form:
       - Amount
       - Method (QRIS/Transfer/Cash)
       - Proof/Notes
   [ ] Click "Verify & Confirm"
   [ ] Booking code auto-generates
   
4. Notify Customer (if WhatsApp configured)
   [ ] Payment confirmed
   [ ] Booking code provided
   [ ] Provide mechanic contact
```

### **Catalog Management** (Weekly)
```
1. Add New Items
   [ ] Admin → Catalog tab
   [ ] Click "+ Tambah Item"
   [ ] Fill form (name, price, stock, category)
   [ ] Save
   [ ] Verify in catalog
   
2. Update Item Details
   [ ] Find item in table
   [ ] Click "Edit"
   [ ] Update info
   [ ] Save
   
3. Remove Inactive Items
   [ ] Find item in table
   [ ] Click "Edit"
   [ ] Uncheck "Item Aktif"
   [ ] Save (item hidden from catalog)
   
4. Monitor Stock Levels
   [ ] Check Inventory tab
   [ ] Items with red background = low stock
   [ ] Order more if needed
```

### **Order Management** (Daily)
```
1. Track Orders
   [ ] Admin → Orders tab
   [ ] Sort by status (pending → in progress)
   
2. Update Order Status
   [ ] Click order to view details
   [ ] Update status:
       - Draft → In Progress (work starts)
       - In Progress → Completed (work done)
   [ ] Save
   
3. Handle Issues
   [ ] Order stuck? Check audit log for clues
   [ ] Customer complaint? Review order history
   [ ] Missing payment? Follow up with customer
```

### **Inventory Management** (Weekly)
```
1. Track Stock Levels
   [ ] Admin → Inventory tab
   [ ] Red rows = low stock (below min)
   [ ] Order replacements as needed
   
2. Record Stock Changes
   [ ] Click part to edit
   [ ] Click "Mutasi" (mutation)
   [ ] Select type: "In" (incoming) or "Out" (used)
   [ ] Enter quantity
   [ ] Save
   
3. Review Stock History
   [ ] InventoryMutations sheet
   [ ] See all ins/outs
   [ ] Verify accuracy
```

---

## 📈 **WEEKLY TASKS**

**Every Monday**
```
[ ] Weekly System Health Check
    - All systems running?
    - No critical issues from last week?
    - Performance metrics normal?
    - Backup successful?

[ ] Review Pending Issues
    - Any stuck orders?
    - Any failed payments?
    - Any inventory issues?
    
[ ] Plan Week's Work
    - Catalog items to add?
    - Inventory to order?
    - Training needed?
```

**End of Week (Friday)**
```
[ ] Backup & Archive
    - Export Google Sheets (Download > .xlsx)
    - Store backup securely
    - Name: pas-one-backup-YYYY-MM-DD.xlsx
    
[ ] Weekly Report
    - Total orders processed
    - Payment success rate
    - Issues encountered
    - Forecast for next week
    
[ ] Team Standup
    - Any lessons learned?
    - Any improvements needed?
    - Celebrate wins
```

---

## 🔐 **SECURITY CHECKLIST**

**Monthly**
```
[ ] Verify Access Control
    - Who has admin account access?
    - Any unauthorized access attempts?
    - Audit log shows legitimate only?
    
[ ] Review Admin Passwords
    - Still secure?
    - Change if suspected compromise
    - Never share via chat/email
    
[ ] Check Audit Log
    - Review all actions last month
    - Look for suspicious activity
    - Document any concerns
```

---

## 🚨 **TROUBLESHOOTING**

### **Login Not Working**
```
Problem: Can't login with correct credentials
Solution:
  1. Check Google Sheets accessible
  2. Verify Apps Script backend running
  3. Check Users sheet for user record
  4. Verify password is correct (case-sensitive)
  5. Try logging out & back in
  6. Clear browser cache (Ctrl+Shift+Delete)
  7. Contact tech support if persists
```

### **Orders Not Showing**
```
Problem: Orders not visible in Orders tab
Solution:
  1. Refresh page (F5)
  2. Check Orders sheet (Google Sheets)
  3. Verify API working (Admin → Payments loads?)
  4. Check Apps Script execution logs
  5. Restart browser
  6. Contact backend team if data missing
```

### **Payment Not Verifying**
```
Problem: Payment verification form not submitting
Solution:
  1. Check all required fields filled
  2. Verify amount > 0
  3. Check date/time fields
  4. Try refreshing page
  5. Clear form & retry
  6. Contact tech support
```

### **Inventory Stuck at Old Quantity**
```
Problem: Stock quantity not updating after mutation
Solution:
  1. Refresh page
  2. Check InventoryMutations sheet for mutation record
  3. Verify quantity calculation correct
  4. Try mutation again with exact same data
  5. Check Apps Script logs for errors
  6. Contact backend team
```

### **System Slow / Laggy**
```
Problem: Pages taking > 5 seconds to load
Solution:
  1. Check internet connection
  2. Try different browser
  3. Clear browser cache
  4. Check Apps Script quota (shouldn't exceed 50%)
  5. Restart browser
  6. If persists, contact tech team
```

---

## 🔄 **BACKUP & RECOVERY**

### **Daily Backup** (EOD - 18:00)
```
1. Open Google Sheets
2. Click File → Download
3. Select "Microsoft Excel (.xlsx)"
4. Save as: pas-one-backup-YYYY-MM-DD.xlsx
5. Store in secure location (Google Drive backup folder)
6. Keep last 30 days of backups
```

### **If Data Lost / Corrupted**
```
1. STOP operations immediately
2. Notify management
3. Get most recent backup
4. Contact backend team to restore
5. Verify data integrity
6. Gradually resume operations
7. Document what happened
```

---

## 📞 **ESCALATION PROCEDURE**

### **Level 1: Ops Team** (Handle first)
```
- Login issues
- Missing orders
- Inventory discrepancies
- Audit log questions
- Most daily issues
→ Try troubleshooting steps
→ If unresolved → escalate
```

### **Level 2: Tech Team** (Backend)
```
- API errors / timeouts
- Database issues
- Payment processing failures
- Google Apps Script errors
- System performance issues
→ Contact backend team
→ Provide error details
→ Have recent logs ready
```

### **Level 3: Management** (Critical)
```
- Complete system down
- Data corruption
- Security incident
- Data loss
- Rollback needed
→ Contact manager immediately
→ Prepare to rollback if needed
→ Follow incident procedure
```

---

## 📋 **MONTHLY MAINTENANCE**

**First Week of Month**
```
[ ] Review Previous Month
    - Total transactions
    - Payment success rate
    - Issues encountered
    - Performance metrics
    
[ ] Cleanup Old Data
    - Archive completed orders (> 90 days old)
    - Clean audit log (keep 6 months)
    - Remove test data
    
[ ] Security Audit
    - Review admin access
    - Check audit log for anomalies
    - Verify backups secure
```

**Mid-Month**
```
[ ] System Health Check
    - All systems functioning?
    - Performance normal?
    - Quota usage on track?
    - Any recurring issues?
```

**End of Month**
```
[ ] Monthly Report
    - KPIs and metrics
    - Issues & resolutions
    - Planned improvements
    - Share with management
    
[ ] Prepare for Month End Closing
    - Reconcile all payments
    - Verify inventory accuracy
    - Archive completed work
```

---

## 📊 **METRICS TO TRACK**

| Metric | Target | Action if Miss |
|--------|--------|-----------------|
| **Uptime** | 99%+ | Investigate & fix |
| **Payment Processing** | 95%+ success | Review failures |
| **API Response** | < 2 sec (avg) | Optimize queries |
| **Error Rate** | < 1% | Fix top errors |
| **Daily Active Users** | Track & report | Monitor trends |

---

## 👥 **ROLES & RESPONSIBILITIES**

### **Operations Manager**
- Daily system monitoring
- Payment verification oversight
- Order management
- Team coordination
- Escalation point

### **Database Administrator**
- Database backups
- Data integrity
- Inventory management
- Audit log review
- Performance monitoring

### **Admin User**
- Catalog management
- Payment verification
- Customer support
- Day-to-day operations
- Issue documentation

### **Support Lead**
- User support
- FAQ updates
- Issue tracking
- Customer communication

---

## 📚 **USEFUL LINKS**

| Document | Purpose |
|----------|---------|
| QUICK-START.md | Initial setup |
| docs/DEPLOYMENT.md | Technical details |
| docs/SECURITY.md | Security protocols |
| LAUNCH-CHECKLIST.md | Go-live checklist |
| docs/TROUBLESHOOTING.md | Issue resolution |

---

## ✅ **SIGN-OFF**

**Ops Manager Name**: _______________  
**Date Trained**: _______________  
**Signature**: _______________  

I understand the operations procedures and am ready to manage PAS-One in production.

---

**Last Updated**: October 30, 2026  
**Status**: ✅ Ready for operations  
**Version**: 1.0.0  

🚀 **System is in your hands!**
