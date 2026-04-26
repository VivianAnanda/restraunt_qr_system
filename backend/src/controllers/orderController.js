const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

const KITCHEN_STATUS_VALUES = ['started', 'cooking', 'almost-done', 'ready-to-serve'];
const KITCHEN_STATUS_WITH_QUEUE_VALUES = ['queued', 'started', 'cooking', 'almost-done', 'ready-to-serve'];
const PAYMENT_STATUS_VALUES = ['pending', 'paid'];
const DIGITAL_PAYMENT_METHODS = ['card', 'bkash'];
const TRACKER_HIDE_DELAY_MS = 60 * 1000;
const TIMER_EXTENSION_MINUTES = 5;
const SSL_SESSION_API_URL = process.env.SSLCOMMERZ_SESSION_API_URL || 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
const SSL_VALIDATION_API_URL = process.env.SSLCOMMERZ_VALIDATION_API_URL || 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';

const toValidPrice = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

const toLegacyStatus = (order) => {
  if (order.completedAt) {
    return 'completed';
  }

  if (!order.sentToKitchen) {
    return 'pending';
  }

  return 'in-progress';
};

const startPrepTimer = (order) => {
  const now = new Date();
  order.prepStartedAt = now;
  order.prepEndsAt = new Date(now.getTime() + order.estimatedPrepTime * 60 * 1000);
};

const clearPrepTimer = (order) => {
  order.prepStartedAt = null;
  order.prepEndsAt = null;
};

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const getBackendPublicBaseUrl = () => {
  const explicitBaseUrl = trimTrailingSlash(process.env.BACKEND_PUBLIC_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

const getDefaultFrontendBaseUrl = () => {
  const explicitBaseUrl = trimTrailingSlash(process.env.FRONTEND_PUBLIC_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  return 'http://localhost:5173';
};

const normalizeFrontendBaseUrl = (candidate) => {
  const fallbackUrl = getDefaultFrontendBaseUrl();
  const value = trimTrailingSlash(candidate);

  if (!value) {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackUrl;
    }

    return trimTrailingSlash(parsed.toString());
  } catch (_error) {
    return fallbackUrl;
  }
};

const getRequiredSslCredentials = () => {
  const storeId = String(process.env.SSLCOMMERZ_STORE_ID || '').trim();
  const storePassword = String(process.env.SSLCOMMERZ_STORE_PASSWORD || '').trim();

  if (!storeId || !storePassword) {
    return null;
  }

  return {
    storeId,
    storePassword,
  };
};

const generateTranId = () => `SSL-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const isTemporaryGatewayOrder = (order) =>
  order.paymentGateway === 'sslcommerz' && order.paymentGatewayStatus === 'initiated';

const getAllowedSslGatewaysByPaymentMethod = (paymentMethod) => {
  if (paymentMethod === 'bkash') {
    return 'bkash';
  }

  if (paymentMethod === 'card') {
    return '';
  }

  return '';
};

const getPreferredSslCheckoutUrl = (gatewayData, paymentMethod) => {
  const fallbackUrl = String(gatewayData.GatewayPageURL || '').trim();
  const genericRedirectUrl = String(gatewayData.redirectGatewayURL || '').trim();
  const gateways = Array.isArray(gatewayData.desc) ? gatewayData.desc : [];

  if (paymentMethod === 'bkash') {
    const bkashGateway = gateways.find(
      (gateway) => String(gateway?.gw || '').toLowerCase() === 'bkash'
    );

    return String(bkashGateway?.redirectGatewayURL || '').trim() || genericRedirectUrl || fallbackUrl;
  }

  if (paymentMethod === 'card') {
    return fallbackUrl || genericRedirectUrl;
  }

  return genericRedirectUrl || fallbackUrl;
};

const buildOrderCreationPayload = async ({ tableId, items, orderType, paymentMethod }) => {
  if (!tableId || !items || items.length === 0 || !orderType || !paymentMethod) {
    return {
      error: 'tableId, items, orderType, paymentMethod are required',
      statusCode: 400,
    };
  }

  const menuIds = items.map((item) => item.menuItem);
  const menuItems = await MenuItem.find({ _id: { $in: menuIds } });

  if (menuItems.length !== menuIds.length) {
    return {
      error: 'One or more menu items are invalid',
      statusCode: 400,
    };
  }

  const menuMap = new Map(menuItems.map((item) => [item._id.toString(), item]));

  let totalAmount = 0;
  let estimatedPrepTime = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = menuMap.get(item.menuItem);
    const quantity = item.quantity || 1;
    const unitPrice = toValidPrice(item.unitPrice) ?? menuItem.price;

    orderItems.push({
      menuItem: item.menuItem,
      quantity,
      specialInstructions: item.specialInstructions || '',
      optionKey: item.optionKey || '',
      optionLabel: item.optionLabel || '',
      unitPrice,
    });

    totalAmount += unitPrice * quantity;
    estimatedPrepTime += menuItem.prepTime * quantity;
  }

  return {
    payload: {
      tableId: tableId.trim().toUpperCase(),
      items: orderItems,
      orderType,
      paymentMethod,
      paymentStatus: 'pending',
      sentToKitchen: false,
      kitchenStatus: 'queued',
      prepStartedAt: null,
      prepEndsAt: null,
      status: 'pending',
      totalAmount,
      estimatedPrepTime,
    },
  };
};

const buildFrontendPaymentRedirectUrl = ({ order, payment, note }) => {
  const baseUrl = normalizeFrontendBaseUrl(order.paymentReturnBaseUrl);
  const redirectUrl = new URL('/customer/order', `${baseUrl}/`);

  if (order.tableId) {
    redirectUrl.searchParams.set('tableId', order.tableId);
  }

  redirectUrl.searchParams.set('payment', payment);
  redirectUrl.searchParams.set('orderId', String(order._id));

  if (note) {
    redirectUrl.searchParams.set('note', note);
  }

  return redirectUrl.toString();
};

const resolveGatewayPayload = (req) => (Object.keys(req.body || {}).length ? req.body : req.query || {});

const createOrder = async (req, res) => {
  try {
    const { tableId, items, orderType, paymentMethod } = req.body;

    if (DIGITAL_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: 'Use the secure payment session endpoint for card and bKash orders',
      });
    }

    const creationResult = await buildOrderCreationPayload({ tableId, items, orderType, paymentMethod });

    if (creationResult.error) {
      return res.status(creationResult.statusCode).json({ message: creationResult.error });
    }

    const order = await Order.create(creationResult.payload);

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(201).json(populatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deletePendingSslCommerzOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!isTemporaryGatewayOrder(order)) {
      return res.status(400).json({ message: 'Only pending SSLCOMMERZ payment intents can be removed' });
    }

    await Order.deleteOne({ _id: order._id });

    return res.status(200).json({ message: 'Pending SSLCOMMERZ order removed' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const initiateSslCommerzSession = async (req, res) => {
  try {
    const { tableId, items, orderType, paymentMethod, returnBaseUrl } = req.body;

    if (!DIGITAL_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'paymentMethod must be card or bkash for secure gateway checkout' });
    }

    const sslCredentials = getRequiredSslCredentials();
    if (!sslCredentials) {
      return res.status(500).json({
        message: 'SSLCOMMERZ credentials are missing in backend environment variables',
      });
    }

    const creationResult = await buildOrderCreationPayload({ tableId, items, orderType, paymentMethod });

    if (creationResult.error) {
      return res.status(creationResult.statusCode).json({ message: creationResult.error });
    }

    const tranId = generateTranId();
    const frontendBaseUrl = normalizeFrontendBaseUrl(returnBaseUrl);
    const backendBaseUrl = getBackendPublicBaseUrl();

    const order = await Order.create({
      ...creationResult.payload,
      paymentGateway: 'sslcommerz',
      paymentGatewayStatus: 'initiated',
      paymentGatewayTranId: tranId,
      paymentReturnBaseUrl: frontendBaseUrl,
    });

    const successUrl = `${backendBaseUrl}/api/orders/payment/sslcommerz/success`;
    const failUrl = `${backendBaseUrl}/api/orders/payment/sslcommerz/fail`;
    const cancelUrl = `${backendBaseUrl}/api/orders/payment/sslcommerz/cancel`;

    const sessionPayload = new URLSearchParams({
      store_id: sslCredentials.storeId,
      store_passwd: sslCredentials.storePassword,
      total_amount: Number(order.totalAmount).toFixed(2),
      currency: 'BDT',
      tran_id: tranId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      ipn_url: successUrl,
      shipping_method: 'NO',
      product_name: 'Restaurant Order',
      product_category: 'Food',
      product_profile: 'general',
      cus_name: `Table ${order.tableId}`,
      cus_email: 'customer@example.com',
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_postcode: '1200',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      multi_card_name: getAllowedSslGatewaysByPaymentMethod(paymentMethod),
    });

    const gatewayResponse = await fetch(SSL_SESSION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionPayload,
    });

    const gatewayData = await gatewayResponse.json();

    const checkoutUrl = getPreferredSslCheckoutUrl(gatewayData, paymentMethod);

    if (!gatewayResponse.ok || !checkoutUrl) {
      await Order.deleteOne({ _id: order._id });

      return res.status(502).json({
        message: gatewayData.failedreason || gatewayData.message || 'Failed to initialize SSLCOMMERZ payment session',
      });
    }

    return res.status(201).json({
      orderId: order._id,
      gatewayUrl: checkoutUrl,
      sessionKey: gatewayData.sessionkey || '',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const handleSslCommerzSuccess = async (req, res) => {
  try {
    const payload = resolveGatewayPayload(req);
    const tranId = String(payload.tran_id || '').trim();
    const valId = String(payload.val_id || '').trim();

    if (!tranId) {
      return res.status(400).send('Missing tran_id');
    }

    const order = await Order.findOne({ paymentGatewayTranId: tranId });

    if (!order) {
      return res.status(404).send('Order not found for this transaction');
    }

    const sslCredentials = getRequiredSslCredentials();
    if (!sslCredentials) {
      const failedRedirect = buildFrontendPaymentRedirectUrl({
        order,
        payment: 'failed',
        note: 'Gateway credentials missing on server',
      });
      return res.redirect(failedRedirect);
    }

    const validationQuery = new URLSearchParams({
      val_id: valId,
      store_id: sslCredentials.storeId,
      store_passwd: sslCredentials.storePassword,
      v: '1',
      format: 'json',
    });

    const validationResponse = await fetch(`${SSL_VALIDATION_API_URL}?${validationQuery.toString()}`);
    const validationData = await validationResponse.json();
    const validationStatus = String(validationData.status || '').toUpperCase();
    const isValidStatus = validationStatus === 'VALID' || validationStatus === 'VALIDATED';

    if (!validationResponse.ok || !isValidStatus) {
      await Order.deleteOne({ _id: order._id });

      const failedRedirect = buildFrontendPaymentRedirectUrl({
        order,
        payment: 'failed',
        note: 'Payment validation failed',
      });
      return res.redirect(failedRedirect);
    }

    order.paymentStatus = 'paid';
    order.paymentGatewayStatus = 'validated';
    order.paymentGatewayValId = valId;
    order.status = toLegacyStatus(order);
    await order.save();

    const successRedirect = buildFrontendPaymentRedirectUrl({
      order,
      payment: 'success',
      note: 'Payment completed through SSLCOMMERZ sandbox',
    });
    return res.redirect(successRedirect);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const handleSslCommerzFail = async (req, res) => {
  try {
    const payload = resolveGatewayPayload(req);
    const tranId = String(payload.tran_id || '').trim();

    const order = tranId
      ? await Order.findOne({ paymentGatewayTranId: tranId })
      : null;

    if (order) {
      await Order.deleteOne({ _id: order._id });

      const failedRedirect = buildFrontendPaymentRedirectUrl({
        order,
        payment: 'failed',
        note: 'Payment failed or was declined',
      });
      return res.redirect(failedRedirect);
    }

    return res.status(400).send('Payment failed');
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const handleSslCommerzCancel = async (req, res) => {
  try {
    const payload = resolveGatewayPayload(req);
    const tranId = String(payload.tran_id || '').trim();

    const order = tranId
      ? await Order.findOne({ paymentGatewayTranId: tranId })
      : null;

    if (order) {
      await Order.deleteOne({ _id: order._id });

      const cancelledRedirect = buildFrontendPaymentRedirectUrl({
        order,
        payment: 'cancelled',
        note: 'Payment was cancelled',
      });
      return res.redirect(cancelledRedirect);
    }

    return res.status(400).send('Payment cancelled');
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ archivedAt: null })
      .where('paymentGatewayStatus').ne('initiated')
      .populate('items.menuItem', 'name price prepTime')
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getArchivedOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ archivedAt: { $ne: null } })
      .where('paymentGatewayStatus').ne('initiated')
      .populate('items.menuItem', 'name price prepTime')
      .sort({ archivedAt: -1, updatedAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getOrderPublicStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).select(
      '_id tableId paymentMethod paymentStatus paymentGatewayStatus sentToKitchen kitchenStatus prepStartedAt prepEndsAt completedAt archivedAt status totalAmount estimatedPrepTime updatedAt'
    );

    if (!order || order.paymentGatewayStatus === 'initiated') {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!PAYMENT_STATUS_VALUES.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status value' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.paymentStatus = paymentStatus;
    order.status = toLegacyStatus(order);
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(200).json(populatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendOrderToKitchen = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order payment must be paid before sending to chef' });
    }

    order.sentToKitchen = true;

    if (!KITCHEN_STATUS_WITH_QUEUE_VALUES.includes(order.kitchenStatus)) {
      order.kitchenStatus = 'queued';
    }

    if (order.kitchenStatus !== 'started') {
      clearPrepTimer(order);
    }

    order.status = toLegacyStatus(order);
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(200).json(populatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateKitchenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { kitchenStatus } = req.body;

    if (!KITCHEN_STATUS_WITH_QUEUE_VALUES.includes(kitchenStatus)) {
      return res.status(400).json({ message: 'Invalid kitchen status value' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.sentToKitchen) {
      return res.status(400).json({ message: 'Order must be sent to kitchen first' });
    }

    order.kitchenStatus = kitchenStatus;

    if (kitchenStatus === 'started' && !order.prepStartedAt) {
      startPrepTimer(order);
    }

    if (kitchenStatus === 'queued') {
      clearPrepTimer(order);
    }

    order.status = toLegacyStatus(order);
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(200).json(populatedOrder);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.sentToKitchen) {
      return res.status(400).json({ message: 'Order must be sent to kitchen first' });
    }

    if (order.kitchenStatus !== 'ready-to-serve') {
      return res.status(400).json({ message: 'Order must be ready to serve before completing' });
    }

    if (!order.completedAt) {
      order.completedAt = new Date();
    }

    order.status = 'completed';
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(200).json(populatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const extendOrderPrepTimer = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.completedAt) {
      return res.status(400).json({ message: 'Completed orders cannot be extended' });
    }

    if (!order.sentToKitchen || !KITCHEN_STATUS_VALUES.includes(order.kitchenStatus)) {
      return res.status(400).json({ message: 'Order must be active in kitchen to extend timer' });
    }

    if (!order.prepStartedAt || !order.prepEndsAt) {
      return res.status(400).json({ message: 'Prep timer has not started yet' });
    }

    order.prepEndsAt = new Date(new Date(order.prepEndsAt).getTime() + TIMER_EXTENSION_MINUTES * 60 * 1000);
    order.estimatedPrepTime += TIMER_EXTENSION_MINUTES;
    order.status = toLegacyStatus(order);
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(200).json(populatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeCompletedOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.completedAt && order.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed orders can be removed' });
    }

    if (!order.archivedAt) {
      order.archivedAt = new Date();
      await order.save();
    }

    return res.status(200).json({ message: 'Completed order archived successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicOrdersByTable = async (req, res) => {
  try {
    const { tableId } = req.params;

    if (!tableId) {
      return res.status(400).json({ message: 'tableId is required' });
    }

    const orders = await Order.find({
      tableId: tableId.trim().toUpperCase(),
      archivedAt: null,
      paymentGatewayStatus: { $ne: 'initiated' },
    })
      .populate('items.menuItem', 'name price prepTime')
      .sort({ createdAt: 1 });

    const nowMs = Date.now();
    const visibleOrders = orders.filter((order) => {
      if (!order.completedAt) {
        return true;
      }

      const completedAtMs = new Date(order.completedAt).getTime();
      if (!Number.isFinite(completedAtMs)) {
        return true;
      }

      return nowMs - completedAtMs < TRACKER_HIDE_DELAY_MS;
    });

    return res.status(200).json(visibleOrders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  initiateSslCommerzSession,
  deletePendingSslCommerzOrder,
  handleSslCommerzSuccess,
  handleSslCommerzFail,
  handleSslCommerzCancel,
  getAllOrders,
  getArchivedOrders,
  getOrderPublicStatus,
  getPublicOrdersByTable,
  updatePaymentStatus,
  sendOrderToKitchen,
  updateKitchenStatus,
  extendOrderPrepTimer,
  completeOrder,
  removeCompletedOrder,
};
