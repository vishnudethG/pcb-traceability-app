const express = require('express');
const router = express.Router();
const { createGrn, getPendingGrns, getGrnById } = require('../controllers/grnController');


// Fetch pending GRNs
router.route('/pending')
  .get(getPendingGrns);

// Fetch a single GRN by ID
router.route('/:id')
  .get(getGrnById);

// Create a GRN
router.route('/')
  .post(createGrn);

module.exports = router;