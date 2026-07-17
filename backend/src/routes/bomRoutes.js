const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadBom } = require('../controllers/bomController');

// Configure Multer to hold the file in memory (RAM)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// The 'upload.single("file")' middleware intercepts the file before it hits the controller
router.route('/upload')
  .post(upload.single('file'), uploadBom);

module.exports = router;