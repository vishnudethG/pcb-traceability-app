const prisma = require('../prismaClient');

// @desc    Create a new GRN with items
// @route   POST /api/grns
const createGrn = async (req, res) => {
  try {
    const { 
      customerId, dcNumber, dcDate, 
      discrepancyReported, storeRemarks, items 
    } = req.body;

    if (!customerId || !dcNumber || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer, DC Number, and at least one item are required.' });
    }

    const timestamp = Date.now().toString().slice(-6);
    const serverGrnNumber = `GRN-${timestamp}-${Math.floor(Math.random() * 100)}`;
    const serverGrnDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const newGrn = await tx.grn.create({
        data: {
          customerId: parseInt(customerId),
          dcNumber,
          dcDate: new Date(dcDate),
          grnNumber: serverGrnNumber,
          grnDate: serverGrnDate,
          discrepancyReported: discrepancyReported || false,
          storeRemarks: storeRemarks || null,
          status: 'Awaiting IQC',
        }
      });

      const grnItemsData = items.map(item => ({
        grnId: newGrn.id,
        partNumber: item.partNumber,
        dcQuantity: item.dcQuantity ? parseInt(item.dcQuantity) : null,
        receivedQuantity: parseInt(item.receivedQuantity),
        varianceStatus: item.varianceStatus,
        description: item.description || null,
        status: 'Pending' 
      }));

      await tx.grnItem.createMany({ data: grnItemsData });
      return newGrn;
    });

    res.status(201).json({ message: 'GRN successfully saved', grn: result });
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: 'Internal Server Error while saving GRN.' });
  }
};

// @desc    Get all GRNs (For the new Master List)
// @route   GET /api/grns
const getAllGrns = async (req, res) => {
  try {
    const grns = await prisma.grn.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

// @desc    Get all GRNs awaiting IQC
// @route   GET /api/grns/pending
const getPendingGrns = async (req, res) => {
  try {
    const pendingGrns = await prisma.grn.findMany({
      where: { status: 'Awaiting IQC' },
      include: { customer: true, grnItems: true },
      orderBy: { grnDate: 'asc' }
    });
    res.status(200).json(pendingGrns);
  } catch (error) {
    console.error('Error fetching pending GRNs:', error);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

// @desc    Get a single GRN by ID
// @route   GET /api/grns/:id
const getGrnById = async (req, res) => {
  try {
    const { id } = req.params;
    const grn = await prisma.grn.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        grnItems: true // Include all items for editing
      }
    });

    if (!grn) return res.status(404).json({ error: 'GRN not found' });
    res.status(200).json(grn);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

// @desc    Update a GRN
// @route   PUT /api/grns/:id
const updateGrn = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, dcNumber, dcDate, items } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Header
      const updatedGrn = await tx.grn.update({
        where: { id: parseInt(id) },
        data: {
          customerId: parseInt(customerId),
          dcNumber,
          dcDate: new Date(dcDate),
        }
      });

      // 2. Wipe old items and insert new ones (Safest way to handle dynamic grid edits)
      await tx.grnItem.deleteMany({ where: { grnId: parseInt(id) } });

      const grnItemsData = items.map(item => ({
        grnId: parseInt(id),
        partNumber: item.partNumber,
        dcQuantity: item.dcQuantity ? parseInt(item.dcQuantity) : null,
        receivedQuantity: parseInt(item.receivedQuantity),
        varianceStatus: item.varianceStatus,
        description: item.description || null,
        status: item.status || 'Pending' 
      }));

      await tx.grnItem.createMany({ data: grnItemsData });
      return updatedGrn;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating GRN:', error);
    res.status(500).json({ error: 'Failed to update GRN.' });
  }
};

// @desc    Delete a GRN
// @route   DELETE /api/grns/:id
const deleteGrn = async (req, res) => {
  try {
    const { id } = req.params;
    // Cascade delete in schema will automatically delete linked grnItems
    await prisma.grn.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ message: 'GRN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    res.status(500).json({ error: 'Failed to delete GRN.' });
  }
};

module.exports = {
  createGrn, getAllGrns, getPendingGrns, getGrnById, updateGrn, deleteGrn
};