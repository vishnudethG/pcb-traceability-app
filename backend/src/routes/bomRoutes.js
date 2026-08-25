const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadBom, getBomItemsByRevision, deleteBomRevision, getAllBomRevisions } = require('../controllers/bomController');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.route('/upload')
  .post(upload.single('file'), uploadBom);

// Fetch ALL revisions for the master list
router.route('/revisions')
  .get(getAllBomRevisions);

// Fetch preview data for a specific revision
router.route('/:id/items')
  .get(getBomItemsByRevision);

// Delete a specific revision
router.route('/:id')
  .delete(deleteBomRevision);

module.exports = router;