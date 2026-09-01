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
const saveInspectionReport = async (req, res) => {
  const {
    bomRevisionId,
    documentSettingId,
    customerDcNumber,
    workOrderNumber,
    workOrderDate,
    kitQuantity,
    grnId,
    records 
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

      // 2. Prepare today's date prefix for the Traceability ID (YYMMDD)
      const today = new Date();
      const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // e.g., "260828"

      // 3. Create records ONE BY ONE so we can capture their DB ID and assign the Traceability ID
      const savedRecords = [];
      
      for (const r of records) {
        // First, insert the row without the traceability ID
        const createdRecord = await tx.iqirRecord.create({
          data: {
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
            inspectorId: parseInt(r.inspectorId || 1),
            status: r.status, 
            remarks: r.remarks || null
          }
        });

        // If Accepted, generate and update the Traceability ID using the newly generated Row ID
        let tId = null;
        if (r.status === 'Accepted') {
          tId = `TRC-${datePrefix}-${createdRecord.id}`;
          
          await tx.iqirRecord.update({
            where: { id: createdRecord.id },
            data: { traceabilityId: tId }
          });
        }
        
        // Push to array to send back to frontend for barcode printing
        savedRecords.push({
          ...createdRecord,
          traceabilityId: tId,
          printQty: r.receivedQuantity || 0 // We will need to pass this from the frontend!
        });
      }

      // 4. Process Physical GRN Item Status & Handle Typo Corrections
      for (const r of records) {
        if (r.grnItemId && r.grnItemId !== '') {
          const updateData = { status: 'Mapped' };
          
          if (r.mapAction === 'Typo') {
            updateData.partNumber = r.receivedMpn;
          }

          await tx.grnItem.update({
            where: { id: parseInt(r.grnItemId) },
            data: updateData
          });
        }
      }

      // 5. Check if the GRN has any remaining physical items left unmapped
      const remainingPendingItems = await tx.grnItem.count({
        where: {
          grnId: parseInt(grnId),
          status: 'Pending'
        }
      });

      if (remainingPendingItems === 0) {
        await tx.grn.update({
          where: { id: parseInt(grnId) },
          data: { status: 'Closed' }
        });
      }

      // Return the generated records so the frontend knows what barcodes to print
      return { lotId: lot.id, generatedLabels: savedRecords.filter(r => r.traceabilityId !== null) };
    });

    res.status(201).json({ 
      message: 'IQIR saved successfully!', 
      lotId: result.lotId,
      labels: result.generatedLabels 
    });
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