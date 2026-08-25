const express = require('express');
const router = express.Router();
const { 
  createGrn, getAllGrns, getPendingGrns, 
  getGrnById, updateGrn, deleteGrn 
} = require('../controllers/grnController');

// Fetch pending GRNs
router.route('/pending').get(getPendingGrns);

// Standard CRUD operations
router.route('/')
  .get(getAllGrns)
  .post(createGrn);

router.route('/:id')
  .get(getGrnById)
  .put(updateGrn)
  .delete(deleteGrn);

module.exports = router;