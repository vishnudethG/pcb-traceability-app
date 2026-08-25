const express = require('express');
const router = express.Router();
const { createModel, getModels, getBomByModelId, getModelRevisions, updateModel, deleteModel } = require('../controllers/modelController');

router.route('/')
  .post(createModel)
  .get(getModels);

router.route('/:id/bom')
  .get(getBomByModelId);

router.route('/:id/revisions')
  .get(getModelRevisions);

router.put('/:id', updateModel);
router.delete('/:id', deleteModel);

module.exports = router;