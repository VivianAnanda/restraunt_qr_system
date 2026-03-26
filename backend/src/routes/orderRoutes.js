const express = require('express');
const {
  createOrder,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createOrder);
router.get('/', protect, allowRoles('admin', 'chef'), getAllOrders);
router.patch('/:id/status', protect, allowRoles('chef', 'admin'), updateOrderStatus);

module.exports = router;
