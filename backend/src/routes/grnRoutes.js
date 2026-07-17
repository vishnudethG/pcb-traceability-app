const express = require('express');
const router = express.Router();
const { createGrn } = require('../controllers/grnController');

router.route('/')
  .post(createGrn);

module.exports = router;