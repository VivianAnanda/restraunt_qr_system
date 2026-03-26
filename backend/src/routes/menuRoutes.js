const express = require('express');
const {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllMenuItems);
router.post('/', protect, allowRoles('admin'), createMenuItem);
router.put('/:id', protect, allowRoles('admin'), updateMenuItem);
router.delete('/:id', protect, allowRoles('admin'), deleteMenuItem);

module.exports = router;
