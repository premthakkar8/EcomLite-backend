const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/orderModel');

// @desc    Get PayU payment link
// @route   GET /api/payment/link
// @access  Private
router.get('/link', protect, asyncHandler(async (req, res) => {
  try {
    res.json({ paymentLink: process.env.PAYU_PAYMENT_LINK });
  } catch (error) {
    console.error('Error retrieving PayU payment link:', error);
    res.status(500);
    throw new Error('Error retrieving payment link');
  }
}));

// @desc    Update order payment status
// @route   POST /api/payment/update-status
// @access  Private
router.post('/update-status', protect, asyncHandler(async (req, res) => {
  const { orderId, paymentId, status } = req.body;
  
  // Update order payment status
  const order = await Order.findById(orderId);
  
  if (order) {
    order.isPaid = status === 'success';
    order.paidAt = Date.now();
    order.paymentResult = {
      id: paymentId,
      status: status === 'success' ? 'completed' : 'failed',
      update_time: Date.now(),
    };
    
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
}));

module.exports = router;