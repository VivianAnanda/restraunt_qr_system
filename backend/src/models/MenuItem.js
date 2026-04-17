const mongoose = require('mongoose');

const menuItemVariantSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    variants: {
      type: [menuItemVariantSchema],
      default: [],
    },
    prepTime: {
      type: Number,
      required: true,
      min: 1,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
