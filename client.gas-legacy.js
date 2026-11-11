// API Client for PAS-One
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || window.APP_CONFIG?.APPS_SCRIPT_URL || '';
    this.token = localStorage.getItem('auth_token');
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      this.headers['Authorization'] = `Bearer ${this.token}`;
    }
  }

  setToken(token) {
    this.token = token;
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}?endpoint=${endpoint}`;
    const fetchOptions = {
      method: options.method || 'GET',
      headers: this.headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Auth
  async register(email, password, name) {
    return this.request('auth/register', {
      method: 'POST',
      body: { email, password, name }
    });
  }

  async login(email, password) {
    return this.request('auth/login', {
      method: 'POST',
      body: { email, password }
    });
  }

  async logout() {
    return this.request('auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('auth/me');
  }

  // Catalog
  async getCatalog(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`catalog/list?${params}`);
  }

  async getCatalogItem(id) {
    return this.request(`catalog/get?id=${id}`);
  }

  async createCatalogItem(data) {
    return this.request('catalog/create', { method: 'POST', body: data });
  }

  async updateCatalogItem(id, data) {
    return this.request(`catalog/update?id=${id}`, { method: 'PUT', body: data });
  }

  async deleteCatalogItem(id) {
    return this.request(`catalog/delete?id=${id}`, { method: 'DELETE' });
  }

  // Orders
  async createOrder(items, customerData) {
    return this.request('orders/create', {
      method: 'POST',
      body: { items, customerData }
    });
  }

  async getOrder(id) {
    return this.request(`orders/get?id=${id}`);
  }

  async listOrders(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`orders/list?${params}`);
  }

  async updateOrderStatus(id, status) {
    return this.request(`orders/update-status?id=${id}`, {
      method: 'PATCH',
      body: { status }
    });
  }

  // Payments
  async verifyPayment(orderId, proof) {
    return this.request('payments/verify', {
      method: 'POST',
      body: { orderId, proof }
    });
  }

  async getPaymentStatus(orderId) {
    return this.request(`payments/status?orderId=${orderId}`);
  }

  // Emergency
  async createEmergency(data) {
    return this.request('emergency/create', {
      method: 'POST',
      body: data
    });
  }

  async getEmergency(id) {
    return this.request(`emergency/get?id=${id}`);
  }

  async updateEmergencyStatus(id, status) {
    return this.request(`emergency/update?id=${id}`, {
      method: 'PATCH',
      body: { status }
    });
  }

  // Location
  async shareLocation(emergencyId, lat, lng) {
    return this.request('location/share', {
      method: 'POST',
      body: { emergencyId, lat, lng, timestamp: Date.now() }
    });
  }

  async getMechanicLocation(emergencyId) {
    return this.request(`location/mechanic?emergencyId=${emergencyId}`);
  }

  // Inventory
  async getInventory(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`inventory/list?${params}`);
  }

  async importInventoryCSV(csvData) {
    return this.request('inventory/import', {
      method: 'POST',
      body: { csvData }
    });
  }

  // Discount
  async requestDiscount(data) {
    return this.request('discount/request', {
      method: 'POST',
      body: data
    });
  }

  async approveDiscount(id, approved, reason) {
    return this.request(`discount/approve?id=${id}`, {
      method: 'PATCH',
      body: { approved, reason }
    });
  }

  // Dashboard
  async getDashboard(portal) {
    return this.request(`dashboard/${portal}`);
  }

  // Audit Log
  async getAuditLog(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`audit/list?${params}`);
  }
}

window.api = new ApiClient();
