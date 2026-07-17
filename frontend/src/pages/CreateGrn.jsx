import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';
import api from '../services/api';

const getToday = () => new Date().toISOString().split('T')[0];

const CreateGrn = () => {
  // --- 1. Master Data & Header State ---
  const [customers, setCustomers] = useState([]);
  const [header, setHeader] = useState(() => ({
    customerId: '',
    dcNumber: '',
    dcDate: getToday(),
    grnNumber: `GRN-${Date.now().toString().slice(-6)}`,
    grnDate: getToday(),
  }));

  // --- 2. Dynamic Grid State ---
  const emptyRow = { partNumber: '', dcQuantity: '', receivedQuantity: '', description: '', varianceStatus: '' };
  const [items, setItems] = useState([{ ...emptyRow }]);

  // --- 3. UI & Modal States ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [storeRemarks, setStoreRemarks] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load customers.");
      }
    };
    fetchCustomers();
  }, []);

  // --- Grid Logic ---
  const calculateVariance = (dcQty, recQty) => {
    if (recQty === '' || recQty === null || recQty === undefined) return '';
    const dc = parseInt(dcQty) || 0;
    const rec = parseInt(recQty) || 0;

    if (dc === 0 && rec > 0) return 'Unlisted';
    if (dc === rec) return 'Matched';
    if (rec < dc) return 'Shortage';
    if (rec > dc) return 'Excess';
    return '';
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'dcQuantity' || field === 'receivedQuantity') {
      newItems[index].varianceStatus = calculateVariance(
        newItems[index].dcQuantity, 
        newItems[index].receivedQuantity
      );
    }
    setItems(newItems);
  };

  const addRow = () => setItems([...items, { ...emptyRow }]);
  
  const removeRow = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length ? newItems : [{ ...emptyRow }]);
  };

  // --- EXCEL IMPORT / EXPORT LOGIC ---
  const handleDownloadTemplate = () => {
    const templateData = [{
      "Part Number": "",
      "Description": "",
      "DC Quantity": "",
      "Received Quantity": ""
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GRN_Template");
    XLSX.writeFile(wb, "GRN_Upload_Template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setError("The uploaded Excel file is empty.");
          return;
        }

        const parsedItems = data.map(row => {
          const dcQty = row["DC Quantity"] ?? '';
          const recQty = row["Received Quantity"] ?? '';
          
          return {
            partNumber: row["Part Number"]?.toString() || '',
            description: row["Description"]?.toString() || '',
            dcQuantity: dcQty,
            receivedQuantity: recQty,
            varianceStatus: calculateVariance(dcQty, recQty)
          };
        }).filter(item => item.partNumber !== ''); // Skip completely blank rows

        // Replace the default empty row, or append to existing rows
        setItems(prev => {
          const isDefaultEmpty = prev.length === 1 && prev[0].partNumber === '' && prev[0].receivedQuantity === '';
          return isDefaultEmpty ? parsedItems : [...prev, ...parsedItems];
        });
        
        setMessage("Excel data successfully imported!");
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        console.error(err);
        setError("Failed to parse the Excel file. Please ensure you used the correct template.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset input so the same file can be uploaded again if needed
  };

  // --- Submission Logic ---
  const handleInitialSubmit = (e) => {
    e.preventDefault();
    const hasDiscrepancy = items.some(item => 
      item.varianceStatus === 'Shortage' || 
      item.varianceStatus === 'Excess' || 
      item.varianceStatus === 'Unlisted'
    );

    if (hasDiscrepancy) {
      setModalOpen(true); 
    } else {
      executeSaveGrn(false); 
    }
  };

  const executeSaveGrn = async (isDiscrepancyReported) => {
    setLoading(true);
    setError(null);
    setModalOpen(false);

    try {
      const payload = {
        ...header,
        discrepancyReported: isDiscrepancyReported,
        storeRemarks: isDiscrepancyReported ? storeRemarks : null,
        items: items.map(i => ({
          partNumber: i.partNumber,
          dcQuantity: parseInt(i.dcQuantity) || null,
          receivedQuantity: parseInt(i.receivedQuantity),
          varianceStatus: i.varianceStatus,
          description: i.description
        }))
      };

      // Find the customer's actual company name for the email
      const selectedCustomer = customers.find(c => c.id === header.customerId);
      const customerName = selectedCustomer ? selectedCustomer.companyName : 'Customer';

      // 1. Save to the database first
      await api.post('/grns', payload); 
      
      // 2. If there's a discrepancy, draft the email with the customerName included
      if (isDiscrepancyReported) {
        generateEmailDraft(payload.dcNumber, storeRemarks, payload.items, customerName);
      }

      setMessage("GRN Successfully Saved!");
      
      // 3. Reset Form safely
      setItems([{ ...emptyRow }]);
      setHeader({ ...header, dcNumber: '', dcDate: getToday() });
      setStoreRemarks('');
      
    } catch (err) {
      console.error(err);
      setError("Failed to save GRN.");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Email Client Generator ---
  const generateEmailDraft = (dcNum, remarks, allItems, customerName) => {
    // 1. Filter down to only the problem items
    const discrepantItems = allItems.filter(i => 
      i.varianceStatus !== 'Matched' && i.varianceStatus !== ''
    );

    // 2. Generate and auto-download the Excel file
    const excelData = discrepantItems.map(item => ({
      "Part Number": item.partNumber,
      "Variance Status": item.varianceStatus,
      "Expected Quantity": item.dcQuantity || 0,
      "Received Quantity": item.receivedQuantity
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Discrepancies");
    XLSX.writeFile(wb, `Discrepancy_DC_${dcNum}.xlsx`);

    // 3. Trigger the user's default email client
    const subject = encodeURIComponent(`Discrepancy Report: ${customerName} - Delivery Challan ${dcNum}`);

    let body = `Hello,\n\nWe have identified a discrepancy regarding ${customerName} Delivery Challan: ${dcNum}.\n\n`;
    
    if (remarks) {
      body += `Store Manager Remarks:\n${remarks}\n\n`;
    }

    body += `Please see the attached Excel file for the complete breakdown of missing, excess, or unlisted parts.\n\n`;
    body += `Please advise on the next steps.\n\nThank you.`;

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  const getChipColor = (status) => {
    switch(status) {
      case 'Matched': return 'success';
      case 'Shortage': return 'error';
      case 'Excess': return 'warning';
      case 'Unlisted': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>Create Goods Receiving Note (GRN)</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <form onSubmit={handleInitialSubmit}>
        {/* HEADER SECTION */}
        <Paper elevation={3} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h6" gutterBottom color="primary">1. Delivery Info</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                select label="Customer *" fullWidth required
                value={header.customerId}
                onChange={(e) => setHeader({ ...header, customerId: e.target.value })}
                SelectProps={{ displayEmpty: true }} 
                InputLabelProps={{ shrink: true }}   
                sx={{ minWidth: '200px' }}           
              >
                <MenuItem value="" disabled>
                  <em>-- Choose Customer --</em>
                </MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="DC Number *" fullWidth required
                value={header.dcNumber}
                onChange={(e) => setHeader({ ...header, dcNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="DC Date *" type="date" fullWidth required
                value={header.dcDate}
                onChange={(e) => setHeader({ ...header, dcDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="GRN Date *" type="date" fullWidth required
                value={header.grnDate}
                onChange={(e) => setHeader({ ...header, grnDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* DYNAMIC GRID SECTION */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary">2. Received Items Verification</Typography>
            
            {/* EXCEL IMPORT TOOLBAR */}
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                startIcon={<FileDownloadIcon />} 
                onClick={handleDownloadTemplate}
                size="small"
              >
                Download Template
              </Button>
              <Button 
                variant="contained" 
                component="label"
                startIcon={<UploadFileIcon />}
                size="small"
                color="secondary"
              >
                Upload Excel
                <input 
                  type="file" 
                  hidden 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                />
              </Button>
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#eeeeee' }}>
                <TableRow>
                  <TableCell>Part Number *</TableCell>
                  <TableCell width="120px">DC Qty</TableCell>
                  <TableCell width="120px">Received Qty *</TableCell>
                  <TableCell width="120px">Variance</TableCell>
                  <TableCell>Description (Optional)</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField size="small" fullWidth required
                        value={item.partNumber}
                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" fullWidth
                        placeholder="0 for Unlisted"
                        value={item.dcQuantity}
                        onChange={(e) => handleItemChange(index, 'dcQuantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" fullWidth required
                        value={item.receivedQuantity}
                        onChange={(e) => handleItemChange(index, 'receivedQuantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      {item.varianceStatus && (
                        <Chip label={item.varianceStatus} color={getChipColor(item.varianceStatus)} size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <TextField size="small" fullWidth
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton color="error" onClick={() => removeRow(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Button startIcon={<AddCircleIcon />} onClick={addRow} sx={{ mt: 2 }}>
            Add Another Part
          </Button>
        </Paper>

        {/* SUBMIT BUTTON */}
        <Button 
          type="submit" variant="contained" color="primary" size="large" 
          disabled={loading || !header.customerId}
          startIcon={<SaveIcon />}
        >
          {loading ? 'Processing...' : 'Complete GRN Verification'}
        </Button>
      </form>

      {/* --- DISCREPANCY INTERCEPT MODAL --- */}
      <Dialog open={modalOpen} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#d32f2f', color: 'white' }}>
          Discrepancy Detected - Draft Email to Customer
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" paragraph>
            The system detected quantity mismatches or unlisted items in this GRN. Please review the automated report and add any physical context for the customer before submitting.
          </Typography>
          
          <TextField
            label="Store Manager Remarks (Will be included in the email)"
            multiline rows={4} fullWidth variant="outlined"
            placeholder="e.g., Box #2 arrived heavily damaged, explaining the shortage of capacitors."
            value={storeRemarks}
            onChange={(e) => setStoreRemarks(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" color="textSecondary">Discrepancy Summary (Auto-Generated):</Typography>
          <ul>
            {items.filter(i => i.varianceStatus !== 'Matched' && i.varianceStatus !== '').map((item, idx) => (
              <li key={idx}>
                <strong>{item.partNumber}</strong>: {item.varianceStatus} (Expected: {item.dcQuantity || 0}, Received: {item.receivedQuantity})
              </li>
            ))}
          </ul>
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">Cancel & Edit Grid</Button>
          <Button 
            onClick={() => executeSaveGrn(true)} 
            variant="contained" color="error" 
            startIcon={<SendIcon />}
          >
            Send Email & Complete GRN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreateGrn;