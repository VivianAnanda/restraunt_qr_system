const MenuItem = require('../models/MenuItem');

const getAllMenuItems = async (_req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ createdAt: -1 });
    return res.status(200).json(menuItems);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, prepTime, isAvailable } = req.body;

    if (!name || price == null || prepTime == null) {
      return res.status(400).json({ message: 'name, price and prepTime are required' });
    }

    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      category,
      prepTime,
      isAvailable,
    });

    return res.status(201).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    return res.status(200).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndDelete(id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    return res.status(200).json({ message: 'Menu item deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
