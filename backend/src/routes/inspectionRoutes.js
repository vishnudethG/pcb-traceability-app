const express = require('express');
const router = express.Router();
const { 
  getItemsByRevisionId, 
  getDocumentSettings, 
  saveInspectionReport,
  getAllInspectionLots,
  getInspectionById,
  deleteInspection,
  updateInspectionReport
} = require('../controllers/inspectionController');

router.get('/revisions/:id/items', getItemsByRevisionId);
router.get('/document-settings', getDocumentSettings);

router.route('/')
  .get(getAllInspectionLots)
  .post(saveInspectionReport);

// --- CRUD ROUTES FOR SINGLE REPORT ---
router.route('/:id')
  .get(getInspectionById)
  .delete(deleteInspection)
  .put(updateInspectionReport);

module.exports = router;