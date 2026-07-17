const express = require('express');
const router = express.Router();
const { submitIqir } = require('../controllers/iqirController');

router.route('/submit')
  .post(submitIqir);

module.exports = router;