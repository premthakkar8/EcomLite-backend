const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/orderModel');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay order
// @route   POST /api/payment/create-order
// @access  Private
router.post('/create-order', protect, asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', receipt, notes } = req.body;
  
  // Create order
  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency,
    receipt,
    notes,
  };
  
  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500);
    throw new Error('Error creating payment order');
  }
}));

// @desc    Verify Razorpay payment
// @route   POST /api/payment/verify
// @access  Private
router.post('/verify', protect, asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  
  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');
  
  // Compare signatures
  const isAuthentic = expectedSignature === razorpay_signature;
  
  if (isAuthentic) {
    // Update order payment status
    const order = await Order.findById(orderId);
    
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: razorpay_payment_id,
        status: 'completed',
        update_time: Date.now(),
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      };
      
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error('Order not found');
    }
  } else {
    res.status(400);
    throw new Error('Payment verification failed');
  }
}));

// @desc    Get Razorpay key ID
// @route   GET /api/payment/key
// @access  Public
router.get('/key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

module.exports = router;