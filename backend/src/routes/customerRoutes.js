const express = require('express');
const router = express.Router();
const { createCustomer, getCustomers, updateCustomer, deleteCustomer } = require('../controllers/customerController');

router.post('/', createCustomer);
router.get('/', getCustomers);
router.put('/:id', updateCustomer);     // NEW
router.delete('/:id', deleteCustomer);  // NEW

module.exports = router;