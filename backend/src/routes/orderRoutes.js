const express = require('express');
const {
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
} = require('../controllers/orderController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createOrder);
router.post('/payment/sslcommerz/session', initiateSslCommerzSession);
router.delete('/payment/sslcommerz/pending/:orderId', deletePendingSslCommerzOrder);
router.post('/payment/sslcommerz/success', handleSslCommerzSuccess);
router.post('/payment/sslcommerz/fail', handleSslCommerzFail);
router.post('/payment/sslcommerz/cancel', handleSslCommerzCancel);
router.get('/payment/sslcommerz/success', handleSslCommerzSuccess);
router.get('/payment/sslcommerz/fail', handleSslCommerzFail);
router.get('/payment/sslcommerz/cancel', handleSslCommerzCancel);
router.get('/:id/public-status', getOrderPublicStatus);
router.get('/public/table/:tableId', getPublicOrdersByTable);
router.get('/', protect, allowRoles('admin', 'chef'), getAllOrders);
router.get('/archived/list', protect, allowRoles('admin'), getArchivedOrders);
router.patch('/:id/payment-status', protect, allowRoles('admin'), updatePaymentStatus);
router.patch('/:id/send-to-kitchen', protect, allowRoles('admin'), sendOrderToKitchen);
router.patch('/:id/kitchen-status', protect, allowRoles('chef', 'admin'), updateKitchenStatus);
router.patch('/:id/extend-timer', protect, allowRoles('chef', 'admin'), extendOrderPrepTimer);
router.patch('/:id/complete', protect, allowRoles('admin'), completeOrder);
router.delete('/:id', protect, allowRoles('admin'), removeCompletedOrder);

module.exports = router;
