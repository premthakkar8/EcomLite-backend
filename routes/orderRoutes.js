const express = require('express');
const router = express.Router();

// Example order route
router.get('/', (req, res) => {
  res.send('Order routes are working!');
});

module.exports = router;