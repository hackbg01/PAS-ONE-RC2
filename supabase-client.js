// PAS-One API client backed by Supabase (Auth + PostgREST + RPC).
// Same method names and legacy response shapes ({success, items, orders, orderId, ticketId, token, user ...})
// as js/api/client.js so existing page modules keep working. Activated by APP_CONFIG.BACKEND === 'supabase'.
(function () {
  var cfg = window.APP_CONFIG || {};
  if (cfg.BACKEND !== 'supabase') return;               // legacy GAS client stays in place otherwise
  var factory = (window.supabase && window.supabase.createClient) || (window.__supabaseFactory);
  if (!factory || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn('PAS-One: SUPABASE_URL / SUPABASE_ANON_KEY belum diisi di config.js');
    return;
  }

  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var MESSAGES = [
    [/insufficient stock/i, 'Stok tidak mencukupi'],
    [/item not found or inactive/i, 'Item tidak ditemukan atau tidak aktif'],
    [/invalid items/i, 'Data item tidak valid'],
    [/unauthorized/i, 'Silakan login terlebih dahulu'],
    [/forbidden|permission denied|row-level security/i, 'Anda tidak memiliki akses untuk tindakan ini'],
    [/invalid transition/i, 'Perubahan status tidak diizinkan'],
    [/already registered|User already registered/i, 'Email sudah terdaftar'],
    [/Invalid login credentials/i, 'Email atau password salah'],
    [/already open/i, 'Sudah ada permintaan diskon yang menunggu untuk order ini'],
    [/invalid coordinates/i, 'Koordinat lokasi tidak valid'],
    [/order not found/i, 'Order tidak ditemukan'],
    [/not awaiting payment/i, 'Order tidak sedang menunggu pembayaran'],
    [/cannot approve own request/i, 'Tidak dapat menyetujui permintaan sendiri'],
    [/payments_proof_url_check/i, 'URL bukti pembayaran harus diawali https://']
  ];
  function friendly(err) {
    var m = (err && (err.message || err.error_description || err.msg)) || String(err || 'Terjadi kesalahan');
    for (var i = 0; i < MESSAGES.length; i++) if (MESSAGES[i][0].test(m)) return MESSAGES[i][1];
    return m;
  }
  function fail(err) { var m = friendly(err); return { success: false, error: m, message: m }; }
  function num(v) { return v == null ? v : Number(v); }
  function idem() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }

  function mapCatalog(r) {
    return { id: r.id, name: r.name, category: r.category, description: r.description, price: num(r.price), stock: r.stock, active: r.active, trackStock: r.track_stock };
  }
  function mapOrder(o) {
    var items = (o.order_items || []).map(function (i) { return { id: i.catalog_item_id, name: i.name_snapshot, price: num(i.unit_price), quantity: i.quantity }; });
    return {
      orderId: o.order_no, id: o.id, customerId: o.customer_id,
      customerData: { name: o.customer_name || '', phone: o.customer_phone || '' },
      items: items, subtotal: num(o.subtotal), discount: num(o.discount_total), tax: num(o.tax), total: num(o.total),
      orderStatus: o.order_status, paymentStatus: o.payment_status, mechanicId: o.mechanic_id, createdAt: o.created_at
    };
  }
  function mapPart(p) {
    return { id: p.id, partId: p.id, name: p.name, category: p.category, unit: p.unit, quantity: p.quantity, minStock: p.min_stock, price: num(p.price), supplier: p.supplier || '', active: p.active };
  }
  function mapTicket(t) {
    return { id: t.id, ticketId: t.ticket_no, customerName: t.customer_name, customerPhone: t.customer_phone, lat: t.lat, lng: t.lng,
      complaint: t.complaint, status: t.status, assignedTo: t.assigned_to, distanceKm: num(t.distance_km), visitFee: num(t.visit_fee),
      distanceFee: num(t.distance_fee), estimatedCost: num(t.estimated_cost), actualCost: num(t.actual_cost), createdAt: t.created_at, completedAt: t.completed_at };
  }

  class SupabaseApiClient {
    constructor() {
      this.sb = factory(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      this._role = null;
      this._idMap = {};
    }
    setToken() { /* session is managed by supabase-js */ }

    // ---------- helpers ----------
    async _session() { var r = await this.sb.auth.getSession(); return r.data && r.data.session; }
    async ensureSession() {                       // guests get an anonymous Supabase identity (RLS-safe)
      var s = await this._session();
      if (s) return s;
      var r = await this.sb.auth.signInAnonymously();
      if (r.error) throw r.error;
      return r.data.session;
    }
    async _profile() {
      var s = await this._session(); if (!s) return null;
      var r = await this.sb.from('profiles').select('id,email,name,phone,role,active').eq('id', s.user.id).maybeSingle();
      if (r.data) this._role = r.data.role;
      return r.data;
    }
    async _isStaff() { if (!this._role) await this._profile(); return ['admin', 'manager', 'mechanic'].indexOf(this._role) >= 0; }
    async _orderUuid(ref) {                       // pages pass the display number (ORD-...) or uuid
      if (UUID.test(ref)) return ref;
      if (this._idMap[ref]) return this._idMap[ref];
      var r = await this.sb.from('orders').select('id').eq('order_no', ref).maybeSingle();
      if (r.error || !r.data) throw new Error('order not found');
      this._idMap[ref] = r.data.id; return r.data.id;
    }
    async _ticketUuid(ref) {
      if (UUID.test(ref)) return ref;
      var r = await this.sb.from('emergency_tickets').select('id').eq('ticket_no', ref).maybeSingle();
      if (r.error || !r.data) throw new Error('ticket not found');
      return r.data.id;
    }
    async _rpc(name, args) {
      try { var r = await this.sb.rpc(name, args); if (r.error) return fail(r.error); return r.data; } catch (e) { return fail(e); }
    }

    // ---------- Auth ----------
    async register(email, password, name) {
      var r = await this.sb.auth.signUp({ email: email, password: password, options: { data: { name: name } } });
      if (r.error) return fail(r.error);
      return { success: true, message: 'User registered successfully', needsConfirmation: !r.data.session };
    }
    async login(email, password) {
      var r = await this.sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) return fail(r.error);
      var p = await this._profile();
      if (!p || !p.active) { await this.sb.auth.signOut(); return fail(new Error('Invalid login credentials')); }
      return { success: true, token: r.data.session.access_token, user: { id: p.id, email: p.email, name: p.name, phone: p.phone, role: p.role } };
    }
    async logout() { this._role = null; await this.sb.auth.signOut(); return { success: true, message: 'Logged out' }; }
    async getCurrentUser() {
      var p = await this._profile();
      return p ? { success: true, user: { id: p.id, email: p.email, name: p.name, phone: p.phone, role: p.role } } : { success: false, error: 'Unauthorized' };
    }

    // ---------- Catalog ----------
    async getCatalog(filters) {
      filters = filters || {};
      var q = this.sb.from('catalog_items').select('*').order('name');
      if (!filters.includeInactive) q = q.eq('active', true);
      if (filters.category) q = q.eq('category', filters.category);
      var r = await q.limit(filters.limit || 500);
      return r.error ? fail(r.error) : { success: true, items: r.data.map(mapCatalog) };
    }
    async getCatalogItem(id) {
      var r = await this.sb.from('catalog_items').select('*').eq('id', id).maybeSingle();
      return r.error || !r.data ? { success: false, error: 'Item not found' } : { success: true, item: mapCatalog(r.data) };
    }
    async createCatalogItem(d) {
      var row = { name: d.name, category: d.category || 'lainnya', description: d.description || '', price: d.price, stock: d.stock || 0,
        track_stock: d.trackStock !== undefined ? d.trackStock : d.category !== 'jasa', active: d.active !== undefined ? d.active : true };
      var r = await this.sb.from('catalog_items').insert(row).select('id').single();
      return r.error ? fail(r.error) : { success: true, itemId: r.data.id };
    }
    async updateCatalogItem(id, d) {
      var u = {};
      ['name', 'category', 'description', 'price', 'stock', 'active'].forEach(function (k) { if (d[k] !== undefined) u[k] = d[k]; });
      var r = await this.sb.from('catalog_items').update(u).eq('id', id).select('id');
      return r.error ? fail(r.error) : (r.data.length ? { success: true } : { success: false, error: 'Item not found' });
    }
    async deleteCatalogItem(id) {                 // soft delete keeps order history intact
      return this.updateCatalogItem(id, { active: false });
    }

    // ---------- Orders ----------
    async createOrder(items, customerData, idempotencyKey) {
      try { await this.ensureSession(); } catch (e) { return fail(e); }
      var lines = (items || []).map(function (i) { return { id: i.id, quantity: parseInt(i.quantity, 10) }; });
      var res = await this._rpc('create_order', { p_items: lines, p_customer: customerData || {}, p_idempotency_key: idempotencyKey || idem() });
      if (res && res.success) { res.orderUuid = res.orderId; res.orderId = res.orderNo; }
      return res;
    }
    async getOrder(ref) {
      var q = this.sb.from('orders').select('*, order_items(*)');
      q = UUID.test(ref) ? q.eq('id', ref) : q.eq('order_no', ref);
      var r = await q.maybeSingle();
      return r.error || !r.data ? { success: false, error: 'Order not found' } : { success: true, order: mapOrder(r.data) };
    }
    async listOrders(filters) {
      filters = filters || {};
      var q = this.sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      var pay = ['pending', 'verified', 'failed'];
      if (filters.status) q = q.eq('order_status', filters.status);
      if (filters.paymentStatus) {
        if (pay.indexOf(filters.paymentStatus) >= 0) q = q.eq('payment_status', filters.paymentStatus);
        else q = q.eq('order_status', filters.paymentStatus);          // legacy pages pass 'pending_payment' here
      }
      var page = parseInt(filters.page || 0, 10), size = Math.min(parseInt(filters.limit || 100, 10), 200);
      var r = await q.range(page * size, page * size + size - 1);
      return r.error ? fail(r.error) : { success: true, orders: r.data.map(mapOrder), page: page, pageSize: size };
    }
    async updateOrderStatus(ref, status) {
      var id; try { id = await this._orderUuid(ref); } catch (e) { return fail(e); }
      if (status === 'payment_rejected') return this._rpc('verify_payment', { p_order_id: id, p_approve: false });
      if (status === 'payment_verified') return this._rpc('verify_payment', { p_order_id: id, p_approve: true });
      return this._rpc('update_order_status', { p_order_id: id, p_status: status });
    }
    async assignOrderMechanic(ref, mechanicId) {
      var id; try { id = await this._orderUuid(ref); } catch (e) { return fail(e); }
      return this._rpc('assign_order_mechanic', { p_order_id: id, p_mechanic_id: mechanicId });
    }
    async listMechanics() {
      var r = await this.sb.from('profiles').select('id,name,email').eq('role', 'mechanic').eq('active', true).order('name');
      return r.error ? fail(r.error) : { success: true, mechanics: r.data };
    }

    // ---------- Payments ----------
    async verifyPayment(ref, proof) {
      proof = proof || {};
      var id; try { id = await this._orderUuid(ref); } catch (e) { return fail(e); }
      if (await this._isStaff()) {
        return this._rpc('verify_payment', { p_order_id: id, p_approve: true, p_method: proof.method || 'qris', p_proof_url: proof.proofUrl || null, p_note: proof.note || null });
      }
      return this._rpc('submit_payment', { p_order_id: id, p_method: proof.method || 'qris', p_proof_url: proof.proofUrl || null, p_idempotency_key: proof.idempotencyKey || idem() });
    }
    async getPaymentStatus(ref) {
      var id; try { id = await this._orderUuid(ref); } catch (e) { return fail(e); }
      var r = await this.sb.from('payments').select('id,status,method,amount,verified_at,created_at').eq('order_id', id).order('created_at', { ascending: false });
      return r.error ? fail(r.error) : { success: true, payments: r.data, status: r.data[0] ? r.data[0].status : 'none' };
    }

    // ---------- Emergency ----------
    async createEmergency(d) {
      try { await this.ensureSession(); } catch (e) { return fail(e); }
      var phone = d.customerPhone && /^\+?[0-9]{8,16}$/.test(d.customerPhone) ? d.customerPhone : null;
      return this._rpc('create_emergency', { p_lat: d.lat, p_lng: d.lng, p_complaint: d.complaint || '', p_name: d.customerName || null, p_phone: phone, p_idempotency_key: d.idempotencyKey || idem() });
    }
    async getEmergency(ref) {
      var q = this.sb.from('emergency_tickets').select('*');
      q = UUID.test(ref) ? q.eq('id', ref) : q.eq('ticket_no', ref);
      var r = await q.maybeSingle();
      return r.error || !r.data ? { success: false, error: 'Ticket not found' } : { success: true, ticket: mapTicket(r.data) };
    }
    async listEmergency(filters) {
      var r = await this.sb.from('emergency_tickets').select('*').order('created_at', { ascending: false }).limit((filters && filters.limit) || 100);
      return r.error ? fail(r.error) : { success: true, tickets: r.data.map(mapTicket) };
    }
    async updateEmergencyStatus(ref, status, actualCost) {
      var id; try { id = await this._ticketUuid(ref); } catch (e) { return fail(e); }
      return this._rpc('update_emergency_status', { p_ticket_id: id, p_status: status, p_actual_cost: actualCost === undefined ? null : actualCost });
    }
    async assignEmergencyMechanic(ref, mechanicId) {
      var id; try { id = await this._ticketUuid(ref); } catch (e) { return fail(e); }
      return this._rpc('assign_mechanic', { p_ticket_id: id, p_mechanic_id: mechanicId });
    }
    async shareLocation(ref, lat, lng) {
      var id; try { id = await this._ticketUuid(ref); } catch (e) { return fail(e); }
      return this._rpc('share_location', { p_ticket_id: id, p_lat: lat, p_lng: lng });
    }
    async getMechanicLocation(ref) {
      var id; try { id = await this._ticketUuid(ref); } catch (e) { return fail(e); }
      var r = await this.sb.from('mechanic_locations').select('lat,lng,updated_at').eq('ticket_id', id).maybeSingle();
      return r.error ? fail(r.error) : { success: true, location: r.data };
    }

    // ---------- Inventory ----------
    async getInventory(filters) {
      var r = await this.sb.from('parts').select('*').eq('active', true).order('name').limit((filters && filters.limit) || 1000);
      return r.error ? fail(r.error) : { success: true, items: r.data.map(mapPart) };
    }
    async savePart(d) {                           // add / edit part metadata (quantity changes go through inventoryMutation)
      var row = { name: d.name, category: d.category, unit: d.unit, min_stock: d.minStock, price: d.price, supplier: d.supplier || null };
      if (d.id) row.id = d.id; else row.quantity = d.quantity;
      return this._rpc('upsert_parts', { p_rows: [row] });
    }
    async inventoryMutation(partId, type, quantity, reason, reference) {
      return this._rpc('inventory_mutation', { p_part_id: partId, p_type: type, p_quantity: parseInt(quantity, 10), p_reason: reason || null, p_reference: reference || null });
    }
    async importInventoryCSV(csvData) {           // header row: name,category,unit,quantity,min_stock,price,supplier
      var lines = String(csvData || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (lines.length < 2) return fail(new Error('File CSV kosong'));
      var head = lines[0].split(',').map(function (h) { return h.trim().toLowerCase().replace(/\s+/g, '_'); });
      var alias = { minstock: 'min_stock', stok_minimum: 'min_stock', nama: 'name', kategori: 'category', satuan: 'unit', jumlah: 'quantity', harga: 'price' };
      head = head.map(function (h) { return alias[h] || h; });
      var rows = lines.slice(1).map(function (l) {
        var c = l.split(','), o = {};
        head.forEach(function (h, i) { if (c[i] !== undefined && c[i].trim() !== '') o[h] = c[i].trim(); });
        return o;
      }).filter(function (o) { return o.name; });
      if (!rows.length) return fail(new Error('Tidak ada baris valid (kolom name wajib)'));
      return this._rpc('upsert_parts', { p_rows: rows });
    }

    // ---------- Discount ----------
    async requestDiscount(d) {
      var id; try { id = await this._orderUuid(d.orderId); } catch (e) { return fail(e); }
      return this._rpc('request_discount', { p_order_id: id, p_amount: d.amount !== undefined ? d.amount : d.discountAmount, p_reason: d.reason });
    }
    async approveDiscount(id, approved, reason) { return this._rpc('decide_discount', { p_request_id: id, p_approve: !!approved, p_note: reason || null }); }
    async listDiscounts(status) {
      var q = this.sb.from('discount_requests').select('*, orders(order_no,customer_name)').order('created_at', { ascending: false }).limit(100);
      if (status) q = q.eq('status', status);
      var r = await q;
      return r.error ? fail(r.error) : { success: true, requests: r.data };
    }

    // ---------- Dashboard / Audit ----------
    async getDashboard(portal) { return this._rpc('dashboard_summary', { p_portal: portal || 'admin' }); }
    async getAuditLog(filters) {
      filters = filters || {};
      var q = this.sb.from('audit_logs').select('*').order('at', { ascending: false }).limit(Math.min(filters.limit || 100, 500));
      if (filters.action) q = q.eq('action', filters.action);
      var r = await q;
      return r.error ? fail(r.error) : { success: true, logs: r.data };
    }
  }

  window.SupabaseApiClient = SupabaseApiClient;
  window.api = new SupabaseApiClient();
})();
