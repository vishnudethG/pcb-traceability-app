const prisma = require('../prismaClient');

// @desc    Get all BOM items for a specific revision
// @route   GET /api/inspections/revisions/:id/items
const getItemsByRevisionId = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await prisma.bomItem.findMany({
      where: { bomRevisionId: parseInt(id) },
      orderBy: { designator: 'asc' }
    });
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch BOM items for this revision.' });
  }
};

// @desc    Get active document settings for the headers
// @route   GET /api/inspections/document-settings
const getDocumentSettings = async (req, res) => {
  try {
    const settings = await prisma.documentSetting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document settings.' });
  }
};

// @desc    Save complete IQIR Report & Update GRN State Machine
// @route   POST /api/inspections
// @desc    Save complete IQIR Report & Update GRN State Machine
// @route   POST /api/inspections
const saveInspectionReport = async (req, res) => {
  const {
    bomRevisionId,
    documentSettingId,
    customerDcNumber,
    workOrderNumber,
    workOrderDate,
    kitQuantity,
    grnId,
    records // We now extract mapping logic directly from the records array!
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create the master Inspection Lot header
      const lot = await tx.inspectionLot.create({
        data: {
          bomRevisionId: parseInt(bomRevisionId),
          documentSettingId: parseInt(documentSettingId),
          customerDcNumber,
          workOrderNumber,
          workOrderDate: new Date(workOrderDate),
          kitQuantity: parseInt(kitQuantity)
        }
      });

      // 2. Create all individual test record rows linked to this lot
      const recordsData = records.map(r => ({
        inspectionLotId: lot.id,
        bomItemId: parseInt(r.bomItemId),
        receivedMake: r.receivedMake || '',
        receivedMpn: r.receivedMpn || '',
        measuredValue: r.measuredValue || '',
        bodymarkPackage: r.bodymarkPackage || '',
        dateCodeLotNumber: r.dateCodeLotNumber || '',
        mslLevel: r.mslLevel || '',
        measuredTolerance: r.measuredTolerance || null,
        voltage: r.voltage || null,
        mslLevelCondition: r.mslLevelCondition || null,
        inspectorId: parseInt(r.inspectorId || 1), // Default fallback to system user
        status: r.status, 
        remarks: r.remarks || null
      }));

      await tx.iqirRecord.createMany({ data: recordsData });

      // 3. Process Physical GRN Item Status & Handle Typo Corrections
      for (const r of records) {
        if (r.grnItemId && r.grnItemId !== '') {
          const updateData = { status: 'Mapped' };
          
          // If QC flagged this as a Store typing error, permanently fix the database record!
          if (r.mapAction === 'Typo') {
            updateData.partNumber = r.receivedMpn;
          }

          await tx.grnItem.update({
            where: { id: parseInt(r.grnItemId) },
            data: updateData
          });
        }
      }

      // 4. Check if the GRN has any remaining physical items left unmapped
      const remainingPendingItems = await tx.grnItem.count({
        where: {
          grnId: parseInt(grnId),
          status: 'Pending'
        }
      });

      // 5. If all items are accounted for, safely Close the whole delivery shipment
      if (remainingPendingItems === 0) {
        await tx.grn.update({
          where: { id: parseInt(grnId) },
          data: { status: 'Closed' }
        });
      }

      return lot;
    });

    res.status(201).json({ message: 'IQIR saved successfully!', lotId: result.id });
  } catch (error) {
    console.error('Transaction rolled back. Error saving inspection:', error);
    res.status(500).json({ error: 'Database transaction failed. Report was not saved.' });
  }
};

// @desc    Get all completed Inspection Lots (IQIR Reports)
// @route   GET /api/inspections
const getAllInspectionLots = async (req, res) => {
  try {
    const lots = await prisma.inspectionLot.findMany({
      include: {
        bomRevision: {
          include: {
            model: {
              include: {
                customer: true // Pulls in Company Name
              }
            }
          }
        },
        documentSetting: true,
        _count: {
          select: { iqirRecords: true } // Counts how many items were inspected
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(lots);
  } catch (error) {
    console.error('Error fetching inspection lots:', error);
    res.status(500).json({ error: 'Failed to fetch inspection reports.' });
  }
};

// @desc    Get a single Inspection Lot by ID (for View/Edit)
// @route   GET /api/inspections/:id
const getInspectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await prisma.inspectionLot.findUnique({
      where: { id: parseInt(id) },
      include: {
        bomRevision: {
          include: {
            model: {
              include: { customer: true }
            }
          }
        },
        documentSetting: true,
        iqirRecords: {
          include: {
            bomItem: true // Pulls in target MPN, designator, etc.
          }
        }
      }
    });

    if (!lot) return res.status(404).json({ error: 'Inspection report not found.' });
    res.status(200).json(lot);
  } catch (error) {
    console.error('Error fetching inspection report:', error);
    res.status(500).json({ error: 'Failed to fetch report details.' });
  }
};

// @desc    Delete an Inspection Lot
// @route   DELETE /api/inspections/:id
const deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Because of onDelete: Cascade in the schema, this safely deletes 
    // the header AND all the associated IqirRecords!
    await prisma.inspectionLot.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ message: 'Inspection report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
};

// @desc    Update an existing Inspection Lot and its Records
// @route   PUT /api/inspections/:id
const updateInspectionReport = async (req, res) => {
  const { id } = req.params;
  const {
    documentSettingId,
    customerDcNumber,
    workOrderNumber,
    workOrderDate,
    kitQuantity,
    records 
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the Header
      const updatedLot = await tx.inspectionLot.update({
        where: { id: parseInt(id) },
        data: {
          documentSettingId: parseInt(documentSettingId),
          customerDcNumber,
          workOrderNumber,
          workOrderDate: new Date(workOrderDate),
          kitQuantity: parseInt(kitQuantity)
        }
      });

      // 2. Loop through and update the individual measured records
      for (const r of records) {
        await tx.iqirRecord.update({
          where: { id: parseInt(r.id) },
          data: {
            receivedMake: r.receivedMake || '',
            receivedMpn: r.receivedMpn || '',
            measuredValue: r.measuredValue || '',
            bodymarkPackage: r.bodymarkPackage || '',
            dateCodeLotNumber: r.dateCodeLotNumber || '',
            mslLevel: r.mslLevel || '',
            measuredTolerance: r.measuredTolerance || null,
            voltage: r.voltage || null,
            mslLevelCondition: r.mslLevelCondition || null,
            status: r.status,
            remarks: r.remarks || null
          }
        });
      }

      return updatedLot;
    });

    res.status(200).json({ message: 'IQIR updated successfully!', lotId: result.id });
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Failed to update report.' });
  }
};

module.exports = {
  getItemsByRevisionId,
  getDocumentSettings,
  saveInspectionReport,
  getAllInspectionLots,
  getInspectionById,
  deleteInspection,
  updateInspectionReport
};