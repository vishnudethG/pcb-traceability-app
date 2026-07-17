const prisma = require('../prismaClient');

// @desc    Submit a completed IQIR report
// @route   POST /api/iqir/submit
const submitIqir = async (req, res) => {
  try {
    const { 
      modelId, 
      customerDcNumber, 
      workOrderNumber, 
      workOrderDate, 
      kitQuantity, 
      records // This is an array of the inspected components
    } = req.body;

    if (!modelId || !records || records.length === 0) {
      return res.status(400).json({ error: 'Model ID and inspection records are required.' });
    }

    // --- AUTO-SEEDING HACK (For MVP / Development) ---
    // 1. Ensure at least one Document Setting exists
    let docSetting = await prisma.documentSetting.findFirst();
    if (!docSetting) {
      docSetting = await prisma.documentSetting.create({
        data: { documentNo: 'QA-F-042', revisionNumber: 'Rev 01', revisionDate: new Date() }
      });
    }

    // 2. Ensure at least one User exists to act as the Inspector
    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: { username: 'admin_inspector', passwordHash: 'hashed_password', role: 'IQC' }
      });
    }
    // --------------------------------------------------

    // 3. Database Transaction to save Header and Rows together
    const result = await prisma.$transaction(async (tx) => {
      
      // Step A: Create the Inspection Lot (The Header)
      const inspectionLot = await tx.inspectionLot.create({
        data: {
          modelId: parseInt(modelId),
          documentSettingId: docSetting.id,
          customerDcNumber: customerDcNumber || 'N/A',
          workOrderNumber: workOrderNumber || 'N/A',
          workOrderDate: workOrderDate ? new Date(workOrderDate) : new Date(),
          kitQuantity: parseInt(kitQuantity) || 0,
        }
      });

      // Step B: Map the incoming records to include the new Lot ID and Inspector ID
      const mappedRecords = records.map((record) => ({
        inspectionLotId: inspectionLot.id,
        bomItemId: parseInt(record.bomItemId),
        inspectorId: defaultUser.id,
        receivedMake: record.receivedMake || '',
        receivedMpn: record.receivedMpn || '',
        measuredValue: record.measuredValue || '',
        bodymarkPackage: record.bodymarkPackage || '',
        dateCodeLotNumber: record.dateCodeLotNumber || '',
        mslLevel: record.mslLevel || '',
        measuredTolerance: record.measuredTolerance || '',
        voltage: record.voltage || '',
        mslLevelCondition: record.mslLevelCondition || '',
        status: record.status || 'Pending',
        remarks: record.remarks || '',
      }));

      // Step C: Bulk Insert all rows
      await tx.iqirRecord.createMany({
        data: mappedRecords,
      });

      return inspectionLot;
    });

    res.status(201).json({ 
      message: 'IQIR Report successfully submitted', 
      inspectionLotId: result.id 
    });

  } catch (error) {
    console.error('Error submitting IQIR:', error);
    res.status(500).json({ error: 'Internal Server Error while saving report' });
  }
};

module.exports = {
  submitIqir,
};