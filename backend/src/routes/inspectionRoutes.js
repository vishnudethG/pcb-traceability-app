const express = require('express');
const router = express.Router();
const { 
  getItemsByRevisionId, 
  getDocumentSettings, 
  saveInspectionReport 
} = require('../controllers/inspectionController');

router.get('/revisions/:id/items', getItemsByRevisionId);
router.get('/document-settings', getDocumentSettings);
router.post('/', saveInspectionReport);

module.exports = router;