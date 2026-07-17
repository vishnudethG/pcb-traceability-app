const express = require('express');
const router = express.Router();
const { createModel, getModels, getBomByModelId, getModelRevisions } = require('../controllers/modelController');

router.route('/')
  .post(createModel)
  .get(getModels);

router.route('/:id/bom')
  .get(getBomByModelId);

router.route('/:id/revisions')
  .get(getModelRevisions);

module.exports = router;