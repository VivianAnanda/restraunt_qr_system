const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    specialInstructions: {
      type: String,
      default: '',
      trim: true,
      maxlength: 280,
    },
    optionKey: {
      type: String,
      default: '',
      trim: true,
    },
    optionLabel: {
      type: String,
      default: '',
      trim: true,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    tableId: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (value) => value.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bkash'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paymentGateway: {
      type: String,
      enum: ['none', 'sslcommerz'],
      default: 'none',
    },
    paymentGatewayStatus: {
      type: String,
      enum: ['none', 'initiated', 'validated', 'failed', 'cancelled'],
      default: 'none',
    },
    paymentGatewayTranId: {
      type: String,
      default: '',
      trim: true,
    },
    paymentGatewayValId: {
      type: String,
      default: '',
      trim: true,
    },
    paymentReturnBaseUrl: {
      type: String,
      default: '',
      trim: true,
    },
    sentToKitchen: {
      type: Boolean,
      default: false,
    },
    kitchenStatus: {
      type: String,
      enum: ['queued', 'started', 'cooking', 'almost-done', 'ready-to-serve'],
      default: 'queued',
    },
    prepStartedAt: {
      type: Date,
      default: null,
    },
    prepEndsAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedPrepTime: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
