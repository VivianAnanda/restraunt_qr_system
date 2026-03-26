const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

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

    for (const item of items) {
      const menuItem = menuMap.get(item.menuItem);
      const quantity = item.quantity || 1;

      totalAmount += menuItem.price * quantity;
      estimatedPrepTime += menuItem.prepTime * quantity;
    }

    const order = await Order.create({
      tableId,
      items,
      orderType,
      paymentMethod,
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
    const orders = await Order.find()
      .populate('items.menuItem', 'name price prepTime')
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('items.menuItem', 'name price prepTime');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  updateOrderStatus,
};
