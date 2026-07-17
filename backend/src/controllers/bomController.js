const prisma = require('../prismaClient');
const xlsx = require('xlsx');

// @desc    Upload Customer BOM and create Model
// @route   POST /api/boms/upload
const uploadBom = async (req, res) => {
  try {
    // 1. Check if file and metadata exist
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel or CSV file' });
    }
    
    const { modelId, versionName } = req.body; // Notice we use modelId and versionName now!
    if (!modelId || !versionName) {
      return res.status(400).json({ error: 'modelId and versionName are required' });
    }

    // 2. Parse the Excel file from memory
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Grab the first sheet
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON array
    const rawData = xlsx.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty' });
    }

    // 3. Map Excel columns to our Database Schema
    // NOTE: This assumes your Excel file has exact headers like 'MPN', 'Designator', etc.
    const bomItemsData = rawData.map((row) => ({
      mpn: row['MPN'] ? String(row['MPN']).trim() : 'UNKNOWN', // MPN is usually mandatory
      designator: row['Designator'] ? String(row['Designator']).trim() : '',
      manufacturer: row['Manufacturer'] ? String(row['Manufacturer']).trim() : '',
      description: row['Description'] ? String(row['Description']).trim() : '',
      value: row['Value'] ? String(row['Value']).trim() : '',
      quantityPerBoard: parseInt(row['Quantity/Board']) || 1, // Defaults to 1 if missing
      alternativePartNo: row['Alternative Part No.'] ? String(row['Alternative Part No.']).trim() : '',
      package: row['Package'] ? String(row['Package']).trim() : '',
      tolerance: row['Tolerance'] ? String(row['Tolerance']).trim() : '',
    }));

    // 4. Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Create the new Revision under the existing Model
      const newRevision = await tx.bomRevision.create({
        data: {
          modelId: parseInt(modelId),
          versionName,
          isActive: true,
        },
      });

      // Step B: Attach the new Revision ID to all BOM items
      const itemsWithRevisionId = bomItemsData.map(item => ({
        ...item,
        bomRevisionId: newRevision.id // Changed from modelId
      }));

      // Step C: Bulk Insert BOM Items
      await tx.bomItem.createMany({
        data: itemsWithRevisionId,
      });

      return newRevision;
    });

    res.status(201).json({ 
      message: 'BOM Revision successfully uploaded', 
      revision: result,
      totalComponents: bomItemsData.length 
    });

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This BOM Revision already exists for this project.' });
    }
    console.error('BOM Upload Error:', error);
    res.status(500).json({ error: 'Internal Server Error during BOM processing' });
  }
};

module.exports = {
  uploadBom,
};