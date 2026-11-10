// PAS-One Google Apps Script Main Entry Point
// Deploy as Web App: Execute as "Me", Who has access "Anyone"

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const SHEETS = {
  USERS: 'Users',
  CATALOG: 'Catalog',
  ORDERS: 'Orders',
  PAYMENTS: 'Payments',
  EMERGENCY: 'Emergency',
  INVENTORY: 'Inventory',
  DISCOUNT_REQUESTS: 'DiscountRequests',
  AUDIT_LOG: 'AuditLog',
  SETTINGS: 'Settings'
};

function doGet(e) {
  return HtmlService.createHtmlOutput('PAS-One API - POST to use');
}

function doPost(e) {
  try {
    const endpoint = e.parameter.endpoint;
    const payload = e.postData ? JSON.parse(e.postData.contents) : {};
    const token = e.parameter.token || getHeaderToken(e);

    // Log request
    logAudit('API_REQUEST', endpoint, payload);

    let response = { success: false, error: 'Unknown endpoint' };

    // Routes
    if (endpoint.startsWith('auth/')) {
      response = handleAuth(endpoint, payload, token);
    } else if (endpoint.startsWith('catalog/')) {
      response = handleCatalog(endpoint, payload, token);
    } else if (endpoint.startsWith('orders/')) {
      response = handleOrders(endpoint, payload, token);
    } else if (endpoint.startsWith('payments/')) {
      response = handlePayments(endpoint, payload, token);
    } else if (endpoint.startsWith('emergency/')) {
      response = handleEmergency(endpoint, payload, token);
    } else if (endpoint.startsWith('inventory/')) {
      response = handleInventory(endpoint, payload, token);
    } else if (endpoint.startsWith('discount/')) {
      response = handleDiscount(endpoint, payload, token);
    } else if (endpoint.startsWith('location/')) {
      response = handleLocation(endpoint, payload, token);
    } else if (endpoint.startsWith('dashboard/')) {
      response = handleDashboard(endpoint, payload, token);
    } else if (endpoint.startsWith('audit/')) {
      response = handleAudit(endpoint, payload, token);
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========== Auth Handlers ==========
function handleAuth(endpoint, payload, token) {
  const action = endpoint.split('/')[1];

  if (action === 'register') {
    return registerUser(payload.email, payload.password, payload.name);
  } else if (action === 'login') {
    return loginUser(payload.email, payload.password);
  } else if (action === 'logout') {
    return { success: true, message: 'Logged out' };
  } else if (action === 'me') {
    const user = verifyToken(token);
    return user ? { success: true, user } : { success: false, error: 'Unauthorized' };
  }

  return { success: false, error: 'Unknown auth action' };
}

function registerUser(email, password, name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();

  // Check if user exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email) {
      return { success: false, error: 'Email already registered' };
    }
  }

  const hashedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  const userId = Utilities.getUuid();
  const createdAt = new Date();

  usersSheet.appendRow([
    userId,
    email,
    Utilities.base64Encode(hashedPassword),
    name,
    'customer',  // role
    createdAt,
    true  // active
  ]);

  logAudit('USER_REGISTERED', email, { userId });

  return { success: true, message: 'User registered successfully' };
}

function loginUser(email, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email) {
      const storedHash = Utilities.base64Decode(data[i][2]);
      const inputHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);

      if (storedHash.toString() === inputHash.toString()) {
        const token = generateToken({ userId: data[i][0], email, role: data[i][4] });
        logAudit('USER_LOGIN', email, { userId: data[i][0] });

        return {
          success: true,
          token,
          user: {
            id: data[i][0],
            email,
            name: data[i][3],
            role: data[i][4]
          }
        };
      }
    }
  }

  return { success: false, error: 'Invalid credentials' };
}

// ========== Catalog Handlers ==========
function handleCatalog(endpoint, payload, token) {
  const action = endpoint.split('/')[1];
  const user = verifyToken(token);

  if (action === 'list') {
    return listCatalog(payload);
  } else if (action === 'get') {
    return getCatalogItem(payload.id);
  } else if (action === 'create' && user?.role === 'admin') {
    return createCatalogItem(payload, user);
  } else if (action === 'update' && user?.role === 'admin') {
    return updateCatalogItem(payload.id, payload, user);
  } else if (action === 'delete' && user?.role === 'admin') {
    return deleteCatalogItem(payload.id, user);
  }

  return { success: false, error: 'Unauthorized' };
}

function listCatalog(filters) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CATALOG);
  const data = sheet.getDataRange().getValues();

  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][6]) { // active
      items.push({
        id: data[i][0],
        name: data[i][1],
        category: data[i][2],
        description: data[i][3],
        price: data[i][4],
        stock: data[i][5],
        active: data[i][6]
      });
    }
  }

  return { success: true, items };
}

function getCatalogItem(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CATALOG);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return {
        success: true,
        item: {
          id: data[i][0],
          name: data[i][1],
          category: data[i][2],
          description: data[i][3],
          price: data[i][4],
          stock: data[i][5],
          active: data[i][6]
        }
      };
    }
  }

  return { success: false, error: 'Item not found' };
}

function createCatalogItem(data, user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CATALOG);

  const itemId = Utilities.getUuid();
  sheet.appendRow([
    itemId,
    data.name,
    data.category,
    data.description,
    data.price,
    data.stock || 0,
    true,
    new Date()
  ]);

  logAudit('CATALOG_CREATED', itemId, { name: data.name, createdBy: user.email });

  return { success: true, itemId };
}

function updateCatalogItem(id, data, user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CATALOG);
  const range = sheet.getDataRange();
  const values = range.getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      if (data.name) values[i][1] = data.name;
      if (data.category) values[i][2] = data.category;
      if (data.description) values[i][3] = data.description;
      if (data.price !== undefined) values[i][4] = data.price;
      if (data.stock !== undefined) values[i][5] = data.stock;
      if (data.active !== undefined) values[i][6] = data.active;

      range.setValues(values);
      logAudit('CATALOG_UPDATED', id, { updatedBy: user.email });
      return { success: true };
    }
  }

  return { success: false, error: 'Item not found' };
}

function deleteCatalogItem(id, user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CATALOG);
  const range = sheet.getDataRange();
  const values = range.getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      sheet.deleteRow(i + 1);
      logAudit('CATALOG_DELETED', id, { deletedBy: user.email });
      return { success: true };
    }
  }

  return { success: false, error: 'Item not found' };
}

// ========== Orders Handlers ==========
function handleOrders(endpoint, payload, token) {
  const action = endpoint.split('/')[1];
  const user = verifyToken(token);

  if (!user) return { success: false, error: 'Unauthorized' };

  if (action === 'create') {
    return createOrder(payload, user);
  } else if (action === 'list') {
    return listOrders(user);
  } else if (action === 'get') {
    return getOrder(payload.id, user);
  } else if (action === 'update-status') {
    return updateOrderStatus(payload.id, payload.status, user);
  }

  return { success: false, error: 'Unknown action' };
}

function createOrder(data, user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ordersSheet = ss.getSheetByName(SHEETS.ORDERS);

  const orderId = 'ORD-' + Date.now();
  const items = JSON.stringify(data.items || []);
  const subtotal = calculateSubtotal(data.items);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  ordersSheet.appendRow([
    orderId,
    user.userId || 'GUEST',
    JSON.stringify(data.customerData || {}),
    items,
    subtotal,
    tax,
    total,
    'pending_payment',
    'pending',
    new Date(),
    user.email
  ]);

  logAudit('ORDER_CREATED', orderId, { customerId: user.userId, total });

  return { success: true, orderId, total };
}

function listOrders(user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (user.role === 'admin' || data[i][1] === user.userId) {
      orders.push({
        orderId: data[i][0],
        customerId: data[i][1],
        items: JSON.parse(data[i][3]),
        total: data[i][6],
        orderStatus: data[i][7],
        paymentStatus: data[i][8],
        createdAt: data[i][9]
      });
    }
  }

  return { success: true, orders };
}

function getOrder(orderId, user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === orderId) {
      return {
        success: true,
        order: {
          orderId: data[i][0],
          customerId: data[i][1],
          customerData: JSON.parse(data[i][2]),
          items: JSON.parse(data[i][3]),
          subtotal: data[i][4],
          tax: data[i][5],
          total: data[i][6],
          orderStatus: data[i][7],
          paymentStatus: data[i][8]
        }
      };
    }
  }

  return { success: false, error: 'Order not found' };
}

function updateOrderStatus(orderId, status, user) {
  if (user.role !== 'admin') return { success: false, error: 'Unauthorized' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  const range = sheet.getDataRange();
  const values = range.getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === orderId) {
      values[i][7] = status;
      range.setValues(values);
      logAudit('ORDER_STATUS_UPDATED', orderId, { status, updatedBy: user.email });
      return { success: true };
    }
  }

  return { success: false, error: 'Order not found' };
}

// ========== Utilities ==========
function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function generateToken(data) {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY') || 'default-secret';
  const payload = JSON.stringify({ ...data, iat: Date.now() });
  return Utilities.base64Encode(payload);
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(Utilities.base64Decode(token));
    return payload;
  } catch (e) {
    return null;
  }
}

function getHeaderToken(e) {
  const headers = e.parameter || {};
  return headers.Authorization ? headers.Authorization.replace('Bearer ', '') : null;
}

function logAudit(action, resource, details) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.AUDIT_LOG);

  sheet.appendRow([
    Utilities.getUuid(),
    new Date(),
    action,
    resource,
    JSON.stringify(details || {}),
    Session.getActiveUser().getEmail()
  ]);
}

// ========== Placeholder Handlers (Stub) ==========
function handlePayments(endpoint, payload, token) {
  return { success: true, message: 'Payment handler' };
}

function handleEmergency(endpoint, payload, token) {
  if (endpoint.includes('create')) {
    const emergencyId = 'EMG-' + Date.now();
    return { success: true, ticketId: emergencyId };
  }
  return { success: true };
}

function handleInventory(endpoint, payload, token) {
  return { success: true };
}

function handleDiscount(endpoint, payload, token) {
  return { success: true };
}

function handleLocation(endpoint, payload, token) {
  return { success: true };
}

function handleDashboard(endpoint, payload, token) {
  return {
    success: true,
    bookingToday: 5,
    paymentPending: 2,
    workActive: 3,
    emergency: 1,
    revenue: 5000000,
    discountPending: 2
  };
}

function handleAudit(endpoint, payload, token) {
  return { success: true, logs: [] };
}
