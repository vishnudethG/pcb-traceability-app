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

    // Best Practice: Generate the official GRN Number on the server, not the frontend
    const timestamp = Date.now().toString().slice(-6);
    const serverGrnNumber = `GRN-${timestamp}-${Math.floor(Math.random() * 100)}`;
    const serverGrnDate = new Date();

    // Execute the database transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // Step 1: Create the GRN Header
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

      // Step 2: Map the frontend array into the database format
      const grnItemsData = items.map(item => ({
        grnId: newGrn.id,
        partNumber: item.partNumber,
        dcQuantity: item.dcQuantity ? parseInt(item.dcQuantity) : null,
        receivedQuantity: parseInt(item.receivedQuantity),
        varianceStatus: item.varianceStatus,
        description: item.description || null,
        status: 'Pending' // The starting state for the IQC Inspector
      }));

      // Step 3: Bulk insert all the items
      await tx.grnItem.createMany({
        data: grnItemsData
      });

      return newGrn;
    });

    res.status(201).json({ 
      message: 'GRN successfully saved', 
      grn: result,
      totalItems: items.length
    });

  } catch (error) {
    console.error('Error creating GRN:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A GRN with this number already exists.' });
    }
    res.status(500).json({ error: 'Internal Server Error while saving GRN.' });
  }
};

module.exports = {
  createGrn
};

// @desc    Get all GRNs awaiting IQC
// @route   GET /api/grns/pending
const getPendingGrns = async (req, res) => {
  try {
    const pendingGrns = await prisma.grn.findMany({
      where: {
        status: 'Awaiting IQC'
      },
      include: {
        customer: true, // Pulls in the company name
        grnItems: true  // Pulls in the items so we can count 'Pending' vs 'Mapped'
      },
      orderBy: {
        grnDate: 'asc' // Oldest GRNs first (First In, First Out)
      }
    });

    res.status(200).json(pendingGrns);
  } catch (error) {
    console.error('Error fetching pending GRNs:', error);
    res.status(500).json({ error: 'Internal Server Error while fetching pending GRNs.' });
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
        grnItems: {
          where: { status: 'Pending' } // We only want to map items that haven't been processed yet!
        }
      }
    });

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    res.status(200).json(grn);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ error: 'Internal Server Error while fetching GRN.' });
  }
};

module.exports = {
  createGrn,
  getPendingGrns,
  getGrnById,
};

