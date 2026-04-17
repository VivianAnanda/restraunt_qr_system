const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

const KITCHEN_STATUS_VALUES = ['started', 'cooking', 'almost-done', 'ready-to-serve'];
const KITCHEN_STATUS_WITH_QUEUE_VALUES = ['queued', 'started', 'cooking', 'almost-done', 'ready-to-serve'];
const PAYMENT_STATUS_VALUES = ['pending', 'paid'];
const TRACKER_HIDE_DELAY_MS = 60 * 1000;

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

const createOrder = async (req, res) => {
  try {
    const { tableId, items, orderType, paymentMethod } = req.body;

    if (!tableId || !items || items.length === 0 || !orderType || !paymentMethod) {
      return res.status(400).json({ message: 'tableId, items, orderType, paymentMethod are required' });
    }

    const menuIds = items.map((item) => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuIds } });

    if (menuItems.length !== menuIds.length) {
      return res.status(400).json({ message: 'One or more menu items are invalid' });
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

    const paymentStatus = paymentMethod === 'cash' ? 'pending' : 'paid';

    const order = await Order.create({
      tableId,
      items: orderItems,
      orderType,
      paymentMethod,
      paymentStatus,
      sentToKitchen: false,
      kitchenStatus: 'queued',
      prepStartedAt: null,
      prepEndsAt: null,
      status: 'pending',
      totalAmount,
      estimatedPrepTime,
    });

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem', 'name price prepTime');

    return res.status(201).json(populatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find({ archivedAt: null })
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
      '_id tableId paymentMethod paymentStatus sentToKitchen kitchenStatus prepStartedAt prepEndsAt completedAt archivedAt status totalAmount estimatedPrepTime updatedAt'
    );

    if (!order) {
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
  getAllOrders,
  getArchivedOrders,
  getOrderPublicStatus,
  getPublicOrdersByTable,
  updatePaymentStatus,
  sendOrderToKitchen,
  updateKitchenStatus,
  completeOrder,
  removeCompletedOrder,
};
