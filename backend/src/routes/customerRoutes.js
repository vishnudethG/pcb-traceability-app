const express = require('express');
const router = express.Router();
const { createCustomer, getCustomers } = require('../controllers/customerController');

// Map the routes to the controller functions
router.route('/')
  .post(createCustomer)
  .get(getCustomers);

module.exports = router;