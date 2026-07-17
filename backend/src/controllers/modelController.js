const prisma = require('../prismaClient');

// @desc    Create a new model manually
// @route   POST /api/models
const createModel = async (req, res) => {
  try {
    const { customerId, projectName } = req.body; // Removed bomVersion

    if (!customerId || !projectName) {
      return res.status(400).json({ error: 'Customer and Project Name are required.' });
    }

    const newModel = await prisma.model.create({
      data: {
        customerId: parseInt(customerId),
        projectName,
      },
      include: {
        customer: true, 
      }
    });

    res.status(201).json(newModel);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This Project Name already exists for this customer.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Get all models (with customer info attached)
// @route   GET /api/models
const getModels = async (req, res) => {
  try {
    const models = await prisma.model.findMany({
      include: {
        customer: true, // This tells Prisma to fetch the linked customer details automatically!
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Get all BOM items for a specific Model ID
// @route   GET /api/models/:id/bom
const getBomByModelId = async (req, res) => {
  try {
    const { id } = req.params;

    const bomItems = await prisma.bomItem.findMany({
      where: { modelId: parseInt(id) },
      orderBy: { designator: 'asc' }, // Sort by designator (e.g., C1, C2, R1)
    });

    if (!bomItems || bomItems.length === 0) {
      return res.status(404).json({ error: 'No BOM items found for this model' });
    }

    res.status(200).json(bomItems);
  } catch (error) {
    console.error('Error fetching BOM items:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Get all revisions for a specific model
// @route   GET /api/models/:id/revisions
const getModelRevisions = async (req, res) => {
  try {
    const { id } = req.params;
    const revisions = await prisma.bomRevision.findMany({
      where: { modelId: parseInt(id) },
      include: {
        _count: {
          select: { bomItems: true } // Automatically counts how many parts are in this revision!
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(revisions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createModel,
  getModels,
  getBomByModelId,
  getModelRevisions,
};