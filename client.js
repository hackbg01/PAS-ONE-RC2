// PAS-One API client — Supabase backend (replaces the Google Apps Script transport).
// Same class/method names and {success, ...} response shapes as the legacy client (kept in client.gas-legacy.js),
// so existing page modules keep working. Authorization is enforced by PostgreSQL RLS + RPC, not by this file.
class ApiClient {
  constructor() {
    const cfg = window.APP_CONFIG || {};
    this.configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('YOUR_') && window.supabase);
    this.sb = this.configured
      ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
      : null;
  }

  setToken() { /* legacy no-op: Supabase manages the session */ }

  // ---- helpers -------------------------------------------------------
  _ok(extra) { return Object.assign({ success: true }, extra || {}); }
  _fail(e) {
    const msg = (e && (e.message || e.error_description)) || JSON.stringify(e) || 'Error';
    return { success: false, error: this._friendly(msg), message: this._friendly(msg) };
  }
  _friendly(m) {
    if (/insufficient stock/i.test(m)) return 'Stok tidak mencukupi';
    if (/unauthorized|JWT|not authenticated/i.test(m)) return 'Silakan login terlebih dahulu';
    if (/forbidden|permission denied/i.test(m)) return 'Anda tidak memiliki akses';
    if (/Invalid login credentials/i.test(m)) return 'Email atau password salah';
    return m;
  }
  _need() { if (!this.configured) throw new Error('Supabase belum dikonfigurasi (lihat js/config.js)'); }
  async _run(fn) { try { this._need(); return await fn(); } catch (e) { console.error('API error:', e); return this._fail(e); } }
  async _rpc(name, args) { const { data, error } = await this.sb.rpc(name, args); if (error) throw error; return data; }
  async _session() { const { data } = await this.sb.auth.getSession(); return data.session; }
  // Guests get an anonymous Supabase session so orders/emergencies are tied to an identity (RLS-safe).
  async _ensureSession() {
    let s = await this._session();
    if (!s) { const { data, error } = await this.sb.auth.signInAnonymously(); if (error) throw error; s = data.session; }
    return s;
  }
  _isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || ''); }
  async _orderUuid(idOrNo) {   // UI passes legacy-style order numbers (ORD-…); resolve to uuid
    if (this._isUuid(idOrNo)) return idOrNo;
    const { data, error } = await this.sb.from('orders').select('id').eq('order_no', idOrNo).maybeSingle();
    if (error) throw error; if (!data) throw new Error('Order tidak ditemukan'); return data.id;
  }
  async _ticketUuid(idOrNo) {
    if (this._isUuid(idOrNo)) return idOrNo;
    const { data, error } = await this.sb.from('emergency_tickets').select('id').eq('ticket_no', idOrNo).maybeSingle();
    if (error) throw error; if (!data) throw new Error('Tiket tidak ditemukan'); return data.id;
  }
  _mapItem(r) { return { id: r.id, name: r.name, category: r.category, description: r.description, price: Number(r.price), stock: r.stock, active: r.active, trackStock: r.track_stock }; }
  _mapOrder(r) {
    return {
      id: r.id, orderId: r.order_no, customerId: r.customer_id,
      customerData: { name: r.customer_name, phone: r.customer_phone },
      items: (r.order_items || []).map(i => ({ id: i.catalog_item_id, name: i.name_snapshot, price: Number(i.unit_price), quantity: i.quantity })),
      subtotal: Number(r.subtotal), discount: Number(r.discount_total), tax: Number(r.tax), total: Number(r.total),
      orderStatus: r.order_status, paymentStatus: r.payment_status, mechanicId: r.mechanic_id, createdAt: r.created_at
    };
  }
  _mapTicket(r) {
    return { id: r.id, ticketId: r.ticket_no, status: r.status, lat: r.lat, lng: r.lng, complaint: r.complaint, customerName: r.customer_name,
      customerPhone: r.customer_phone, assignedTo: r.assigned_to, distanceKm: Number(r.distance_km), visitFee: Number(r.visit_fee),
      distanceFee: Number(r.distance_fee), estimatedCost: Number(r.estimated_cost), actualCost: r.actual_cost == null ? null : Number(r.actual_cost), createdAt: r.created_at };
  }

  // ---- Auth ----------------------------------------------------------
  async register(email, password, name) {
    return this._run(async () => {
      const { data, error } = await this.sb.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw error;
      const needsConfirm = !data.session;
      return this._ok({ message: needsConfirm ? 'Registrasi berhasil. Cek email untuk konfirmasi.' : 'Registrasi berhasil' });
    });
  }
  async login(email, password) {
    return this._run(async () => {
      const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const me = await this.getCurrentUser();
      return this._ok({ token: data.session.access_token, user: me.user });
    });
  }
  async logout() { return this._run(async () => { await this.sb.auth.signOut(); return this._ok({ message: 'Logged out' }); }); }
  async getCurrentUser() {
    return this._run(async () => {
      const s = await this._session();
      if (!s) return { success: false, error: 'Unauthorized' };
      const { data, error } = await this.sb.from('profiles').select('id,email,name,phone,role,active').eq('id', s.user.id).maybeSingle();
      if (error) throw error;
      if (!data || !data.active) return { success: false, error: 'Unauthorized' };
      return this._ok({ user: { id: data.id, email: data.email, name: data.name, phone: data.phone, role: data.role, isAnonymous: !!s.user.is_anonymous } });
    });
  }

  // ---- Catalog -------------------------------------------------------
  async getCatalog(filters = {}) {
    return this._run(async () => {
      let q = this.sb.from('catalog_items').select('*').order('name').limit(500);
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.search) q = q.ilike('name', '%' + String(filters.search).replace(/[%,]/g, '') + '%');
      const { data, error } = await q; if (error) throw error;
      return this._ok({ items: data.map(r => this._mapItem(r)) });
    });
  }
  async getCatalogItem(id) {
    return this._run(async () => {
      const { data, error } = await this.sb.from('catalog_items').select('*').eq('id', id).maybeSingle(); if (error) throw error;
      return data ? this._ok({ item: this._mapItem(data) }) : { success: false, error: 'Item not found' };
    });
  }
  async createCatalogItem(d) {
    return this._run(async () => {
      const cat = d.category || 'lainnya';
      const { data, error } = await this.sb.from('catalog_items').insert({
        name: d.name, category: cat, description: d.description || '', price: Number(d.price), stock: Number(d.stock || 0),
        track_stock: d.trackStock !== undefined ? !!d.trackStock : cat !== 'jasa' }).select('id').single();
      if (error) throw error;
      return this._ok({ itemId: data.id });
    });
  }
  async updateCatalogItem(id, d) {
    return this._run(async () => {
      const p = {};
      if (d.name !== undefined) p.name = d.name; if (d.category !== undefined) p.category = d.category;
      if (d.description !== undefined) p.description = d.description;   // blank allowed (legacy bug fixed)
      if (d.price !== undefined) p.price = Number(d.price); if (d.stock !== undefined) p.stock = Number(d.stock);
      if (d.active !== undefined) p.active = !!d.active;
      const { data, error } = await this.sb.from('catalog_items').update(p).eq('id', id).select('id');
      if (error) throw error; if (!data.length) throw new Error('Item tidak ditemukan atau tanpa akses');
      return this._ok();
    });
  }
  async deleteCatalogItem(id) {   // soft delete keeps order history intact
    return this.updateCatalogItem(id, { active: false });
  }

  // ---- Orders --------------------------------------------------------
  async createOrder(items, customerData, idempotencyKey) {
    return this._run(async () => {
      await this._ensureSession();
      const d = await this._rpc('create_order', {
        p_items: items.map(i => ({ id: i.id, quantity: i.quantity })),   // prices are NEVER sent; server decides
        p_customer: customerData || {}, p_idempotency_key: idempotencyKey || null });
      return Object.assign({}, d, { id: d.orderId, orderId: d.orderNo });
    });
  }
  async getOrder(id) {
    return this._run(async () => {
      const col = this._isUuid(id) ? 'id' : 'order_no';
      const { data, error } = await this.sb.from('orders').select('*, order_items(*)').eq(col, id).maybeSingle(); if (error) throw error;
      return data ? this._ok({ order: this._mapOrder(data) }) : { success: false, error: 'Order not found' };
    });
  }
  async _myRole() {   // cached 60 s; lets customer queries carry an explicit owner filter so Postgres can use an index
    if (this._roleCache && Date.now() - this._roleCache.at < 60000) return this._roleCache;
    const me = await this.getCurrentUser();
    this._roleCache = { at: Date.now(), role: me.success ? me.user.role : null, id: me.success ? me.user.id : null };
    return this._roleCache;
  }
  async listOrders(filters = {}) {
    return this._run(async () => {
      let q = this.sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      const me = await this._myRole(); if (me.role === 'customer') q = q.eq('customer_id', me.id);   // same rows RLS would allow; just index-friendly
      const st = filters.status || (filters.paymentStatus === 'pending_payment' ? 'pending_payment' : null);
      if (st) q = q.eq('order_status', st);
      else if (filters.paymentStatus) q = q.eq('payment_status', filters.paymentStatus);
      const page = Math.max(0, parseInt(filters.page || 0, 10)), size = Math.min(200, parseInt(filters.pageSize || 100, 10));
      const { data, error } = await q.range(page * size, page * size + size - 1); if (error) throw error;
      return this._ok({ orders: data.map(r => this._mapOrder(r)), page, pageSize: size });
    });
  }
  async updateOrderStatus(id, status) {
    return this._run(async () => {
      const oid = await this._orderUuid(id);
      if (status === 'payment_rejected') await this._rpc('verify_payment', { p_order_id: oid, p_approve: false });
      else if (status === 'payment_verified') await this._rpc('verify_payment', { p_order_id: oid, p_approve: true });
      else await this._rpc('update_order_status', { p_order_id: oid, p_status: status });
      return this._ok();
    });
  }

  // ---- Payments ------------------------------------------------------
  async verifyPayment(orderId, proof = {}) {   // staff verification (manager/admin)
    return this._run(async () => {
      await this._rpc('verify_payment', { p_order_id: await this._orderUuid(orderId), p_approve: true,
        p_method: proof.method || 'qris', p_proof_url: (proof.proofUrl && /^https:\/\//.test(proof.proofUrl)) ? proof.proofUrl : null, p_note: (proof.note || proof.proof || '').slice(0, 500) || null });
      return this._ok();
    });
  }
  async uploadProof(file) {   // browser -> Cloudflare Worker -> R2 (never through the database)
    return this._run(async () => {
      const cfg = window.APP_CONFIG || {}; if (!cfg.MEDIA_WORKER_URL || cfg.MEDIA_WORKER_URL.includes('YOUR_')) throw new Error('Upload belum dikonfigurasi (MEDIA_WORKER_URL)');
      const s = await this._session(); if (!s) throw new Error('unauthorized');
      const blob = await window.prepareUpload(file);
      const r = await fetch(cfg.MEDIA_WORKER_URL + '/upload?kind=payment_proof', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token }, body: blob });
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.success) throw new Error(j.error || 'Upload gagal');
      return this._ok({ key: j.key });
    });
  }
  async submitPayment(orderId, method, proofUrl, idempotencyKey, file) {   // customer submits proof (file and/or https link)
    return this._run(async () => {
      let key = null;
      if (file) { const u = await this.uploadProof(file); if (!u.success) return u; key = u.key; }
      const d = await this._rpc('submit_payment', { p_order_id: await this._orderUuid(orderId), p_method: method,
        p_proof_url: proofUrl || null, p_idempotency_key: idempotencyKey || null });
      if (key && d.paymentId) await this._rpc('attach_payment_proof', { p_payment_id: d.paymentId, p_media_key: key });
      return d;
    });
  }
  async getPaymentProof(orderId) {   // staff/owner: short-lived signed link to the proof in R2
    return this._run(async () => {
      const { data, error } = await this.sb.from('payments').select('proof_url, media_assets!payments_proof_media_id_fkey(r2_key, mime_type)')
        .eq('order_id', await this._orderUuid(orderId)).order('created_at', { ascending: false }).limit(1);
      if (error) throw error; const p = data[0]; if (!p) return this._ok({ url: null });
      const m = p.media_assets; if (!m) return this._ok({ url: p.proof_url || null, external: true });
      const s = await this._session(); const cfg = window.APP_CONFIG;
      const r = await fetch(cfg.MEDIA_WORKER_URL + '/sign?key=' + encodeURIComponent(m.r2_key), { headers: { Authorization: 'Bearer ' + s.access_token } });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'forbidden');
      return this._ok({ url: j.url, mime: m.mime_type });
    });
  }
  async getPaymentStatus(orderId) {
    return this._run(async () => {
      const { data, error } = await this.sb.from('payments').select('*').eq('order_id', await this._orderUuid(orderId)).order('created_at', { ascending: false });
      if (error) throw error;
      return this._ok({ payments: data, status: data[0] ? data[0].status : 'pending' });
    });
  }

  // ---- Emergency / location -----------------------------------------
  async createEmergency(d) {
    return this._run(async () => {
      await this._ensureSession();
      const r = await this._rpc('create_emergency', { p_lat: d.lat, p_lng: d.lng, p_complaint: d.complaint || '',
        p_name: d.customerName || null, p_phone: (d.customerPhone && d.customerPhone !== 'N/A') ? d.customerPhone : null,
        p_idempotency_key: d.idempotencyKey || null });
      return r;
    });
  }
  async getEmergency(id) {
    return this._run(async () => {
      const col = this._isUuid(id) ? 'id' : 'ticket_no';
      const { data, error } = await this.sb.from('emergency_tickets').select('*').eq(col, id).maybeSingle(); if (error) throw error;
      return data ? this._ok({ ticket: this._mapTicket(data) }) : { success: false, error: 'Ticket not found' };
    });
  }
  async listEmergency() {
    return this._run(async () => {
      const { data, error } = await this.sb.from('emergency_tickets').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error;
      return this._ok({ tickets: data.map(r => this._mapTicket(r)) });
    });
  }
  async updateEmergencyStatus(id, status, actualCost) {
    return this._run(async () => { await this._rpc('update_emergency_status', { p_ticket_id: await this._ticketUuid(id), p_status: status, p_actual_cost: actualCost ?? null }); return this._ok(); });
  }
  async assignMechanic(ticketId, mechanicId) {
    return this._run(async () => { await this._rpc('assign_mechanic', { p_ticket_id: await this._ticketUuid(ticketId), p_mechanic_id: mechanicId }); return this._ok(); });
  }
  async listMechanics() {
    return this._run(async () => {
      const { data, error } = await this.sb.from('profiles').select('id,name,email').eq('role', 'mechanic').eq('active', true); if (error) throw error;
      return this._ok({ mechanics: data });
    });
  }
  async assignOrderMechanic(orderId, mechanicId) {
    return this._run(async () => { await this._rpc('assign_order_mechanic', { p_order_id: await this._orderUuid(orderId), p_mechanic_id: mechanicId }); return this._ok(); });
  }
  async shareLocation(emergencyId, lat, lng) {
    return this._run(async () => { await this._rpc('share_location', { p_ticket_id: await this._ticketUuid(emergencyId), p_lat: lat, p_lng: lng }); return this._ok(); });
  }
  async getMechanicLocation(emergencyId) {
    return this._run(async () => {
      const { data, error } = await this.sb.from('mechanic_locations').select('lat,lng,updated_at').eq('ticket_id', await this._ticketUuid(emergencyId)).maybeSingle(); if (error) throw error;
      return this._ok({ location: data });
    });
  }

  // ---- Inventory -----------------------------------------------------
  async getInventory(filters = {}) {
    return this._run(async () => {
      let q = this.sb.from('parts').select('*').eq('active', true).order('name').limit(1000);
      if (filters.category) q = q.eq('category', filters.category);
      const { data, error } = await q; if (error) throw error;
      return this._ok({ items: data.map(p => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, quantity: p.quantity,
        minStock: p.min_stock, price: Number(p.price), supplier: p.supplier })) });
    });
  }
  async saveParts(rows) {   // add/edit part metadata (manager/admin)
    return this._run(async () => this._rpc('upsert_parts', { p_rows: rows.map(r => ({ id: r.id, name: r.name, category: r.category, unit: r.unit,
      quantity: r.quantity, min_stock: r.minStock ?? r.min_stock, price: r.price, supplier: r.supplier })) }));
  }
  async inventoryMutation(partId, type, quantity, reason, reference) {
    return this._run(async () => this._rpc('inventory_mutation', { p_part_id: partId, p_type: type, p_quantity: parseInt(quantity, 10), p_reason: reason || null, p_reference: reference || null }));
  }
  async importInventoryCSV(csvData) {   // header: name,category,unit,quantity,min_stock,price,supplier
    return this._run(async () => {
      const lines = String(csvData).trim().split(/\r?\n/); const head = lines.shift().split(',').map(h => h.trim());
      const rows = lines.filter(Boolean).map(l => { const c = l.split(','); const o = {}; head.forEach((h, i) => o[h] = (c[i] || '').trim());
        return { name: o.name, category: o.category || undefined, unit: o.unit || undefined, quantity: o.quantity ? +o.quantity : undefined,
          min_stock: o.min_stock ? +o.min_stock : undefined, price: o.price ? +o.price : undefined, supplier: o.supplier || undefined }; });
      return this._rpc('upsert_parts', { p_rows: rows });
    });
  }

  // ---- Discount ------------------------------------------------------
  async requestDiscount(d) {
    return this._run(async () => this._rpc('request_discount', { p_order_id: await this._orderUuid(d.orderId), p_amount: Number(d.discountAmount ?? d.amount), p_reason: d.reason }));
  }
  async approveDiscount(id, approved, reason) {
    return this._run(async () => this._rpc('decide_discount', { p_request_id: id, p_approve: !!approved, p_note: reason || null }));
  }
  async listDiscounts(status = 'requested') {
    return this._run(async () => {
      const { data, error } = await this.sb.from('discount_requests').select('*, orders(order_no)').eq('status', status).order('created_at', { ascending: false }).limit(100); if (error) throw error;
      return this._ok({ requests: data.map(r => ({ id: r.id, orderId: r.orders && r.orders.order_no, originalAmount: Number(r.original_amount),
        discountAmount: Number(r.discount_amount), finalAmount: Number(r.final_amount), reason: r.reason, status: r.status, createdAt: r.created_at })) });
    });
  }

  async getSettings() {
    return this._run(async () => {
      const { data, error } = await this.sb.from('settings').select('key,value'); if (error) throw error;
      const o = {}; data.forEach(r => o[r.key] = r.value); return this._ok({ settings: o });
    });
  }

  // ---- Dashboard / Audit --------------------------------------------
  async getDashboard(portal) { return this._run(async () => this._rpc('dashboard_summary', { p_portal: portal })); }
  async getAuditLog(filters = {}) {
    return this._run(async () => {
      let q = this.sb.from('audit_logs').select('*').order('at', { ascending: false }).limit(Math.min(500, parseInt(filters.limit || 100, 10)));
      if (filters.action) q = q.eq('action', filters.action);
      const { data, error } = await q; if (error) throw error;
      return this._ok({ logs: data });
    });
  }
}

window.api = new ApiClient();
