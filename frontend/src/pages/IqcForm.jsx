import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { QRCodeSVG } from 'qrcode.react'; // NEW: QR Code Generator
import api from '../services/api';

const IqcForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { grn, revisionId } = location.state || {};
  const isRoutingValid = Boolean(grn && revisionId);
  
  const [loading, setLoading] = useState(isRoutingValid);
  const [error, setError] = useState(
    !isRoutingValid ? "Missing routing navigation parameters. Please restart from the dashboard." : null
  );
  
  const [docSettings, setDocSettings] = useState([]);
  
  // Header Form State
  const [selectedDocSetting, setSelectedDocSetting] = useState('');
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [workOrderDate, setWorkOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [kitQuantity, setKitQuantity] = useState('');

  // Inspection Grid State
  const [rows, setRows] = useState([]);

  // --- NEW: Print Modal States ---
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [labelsToPrint, setLabelsToPrint] = useState([]);

  useEffect(() => {
    if (!isRoutingValid) return;

    const loadEngineData = async () => {
      try {
        const [bomItemsRes, docSettingsRes] = await Promise.all([
          api.get(`/inspections/revisions/${revisionId}/items`),
          api.get('/inspections/document-settings')
        ]);

        const bomItems = bomItemsRes.data;
        setDocSettings(docSettingsRes.data);
        if (docSettingsRes.data.length > 0) {
          setSelectedDocSetting(docSettingsRes.data[0].id);
        }

        const initializedRows = bomItems.map(bomItem => {
          const physicalMatch = grn.grnItems.find(grnItem => 
            grnItem.status !== 'Mapped' && 
            (grnItem.partNumber.trim().toLowerCase() === bomItem.mpn.trim().toLowerCase() ||
             (bomItem.alternativePartNo && grnItem.partNumber.trim().toLowerCase() === bomItem.alternativePartNo.trim().toLowerCase()))
          );

          return {
            bomItemId: bomItem.id,
            designator: bomItem.designator,
            mpn: bomItem.mpn,
            alternativePartNo: bomItem.alternativePartNo || '-',
            description: bomItem.description || '',
            bomValue: bomItem.value || '-',
            bomTolerance: bomItem.tolerance || '-',
            
            grnItemId: physicalMatch ? physicalMatch.id : '',
            mapAction: physicalMatch ? 'Auto' : 'None',
            
            receivedMpn: physicalMatch ? physicalMatch.partNumber : '',
            receivedMake: physicalMatch ? (bomItem.manufacturer || '') : '',
            // NEW: Track quantity for the barcode!
            receivedQuantity: physicalMatch ? physicalMatch.receivedQuantity : 0, 
            
            measuredValue: physicalMatch ? (bomItem.value || '') : '',
            bodymarkPackage: physicalMatch ? (bomItem.package || '') : '',
            dateCodeLotNumber: '',
            mslLevel: physicalMatch ? (bomItem.package?.includes('SMD') ? '3' : '1') : '',
            measuredTolerance: physicalMatch ? (bomItem.tolerance || '') : '',
            voltage: '',
            mslLevelCondition: physicalMatch ? 'Pass' : '',
            status: 'Accepted',
            remarks: physicalMatch ? '' : 'Not included in this delivery'
          };
        });

        setRows(initializedRows);
      } catch (err) {
        console.error(err);
        setError("Failed to compile target BOM specifications.");
      } finally {
        setLoading(false);
      }
    };

    loadEngineData();
  }, [grn, revisionId, isRoutingValid]);

  const getAvailableGrnItems = (currentRowGrnItemId) => {
    const currentlyUsedIds = rows.map(r => r.grnItemId).filter(id => id !== '');
    return grn?.grnItems?.filter(item => 
      item.status !== 'Mapped' && 
      (!currentlyUsedIds.includes(item.id) || item.id === currentRowGrnItemId)
    ) || [];
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  const handleGrnItemSelect = (index, grnItemId) => {
    const updatedRows = [...rows];
    
    if (!grnItemId) {
      updatedRows[index].grnItemId = '';
      updatedRows[index].receivedMpn = '';
      updatedRows[index].receivedQuantity = 0; // Clear qty
      updatedRows[index].mapAction = 'None';
      updatedRows[index].remarks = '';
      setRows(updatedRows);
      return;
    }

    const parsedId = parseInt(grnItemId, 10);
    const selectedGrnItem = grn.grnItems.find(item => item.id === parsedId);
    
    updatedRows[index].grnItemId = parsedId;
    updatedRows[index].receivedMpn = selectedGrnItem ? selectedGrnItem.partNumber : '';
    updatedRows[index].receivedQuantity = selectedGrnItem ? selectedGrnItem.receivedQuantity : 0; // Capture qty
    updatedRows[index].mapAction = 'Auto';
    updatedRows[index].remarks = ''; 
    setRows(updatedRows);
  };

  const handleMapActionChange = (index, action) => {
    const updatedRows = [...rows];
    updatedRows[index].mapAction = action;

    if (action === 'Alt') {
      updatedRows[index].remarks = `Approved alternative used in place of ${updatedRows[index].mpn}`;
    } else if (action === 'CPN') {
      updatedRows[index].receivedMpn = ''; 
      updatedRows[index].remarks = 'Verified physical manufacturer part against Customer Part Number.';
    } else if (action === 'Typo') {
      updatedRows[index].remarks = 'Store typing error corrected by QC.';
    } else if (action === 'Auto') {
      const selectedGrnItem = grn.grnItems.find(item => item.id === updatedRows[index].grnItemId);
      updatedRows[index].receivedMpn = selectedGrnItem ? selectedGrnItem.partNumber : '';
      updatedRows[index].remarks = '';
    }

    setRows(updatedRows);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedDocSetting || !workOrderNumber || !kitQuantity) {
      alert("Please enter all required header properties before saving.");
      return;
    }

    // Typo Validation Engine...
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.mapAction === 'Typo') {
        const correctedMpn = row.receivedMpn.trim().toLowerCase();
        const targetMpn = row.mpn.trim().toLowerCase();
        const altMpns = row.alternativePartNo && row.alternativePartNo !== '-' 
          ? row.alternativePartNo.split(/[,/]/).map(part => part.trim().toLowerCase())
          : [];

        if (correctedMpn !== targetMpn && !altMpns.includes(correctedMpn)) {
          alert(`Validation Failed on Row ${i + 1}:\n\nThe corrected typo "${row.receivedMpn}" does not match.`);
          return; 
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        bomRevisionId: parseInt(revisionId),
        documentSettingId: parseInt(selectedDocSetting),
        customerDcNumber: grn.dcNumber,
        workOrderNumber,
        workOrderDate,
        kitQuantity: parseInt(kitQuantity),
        grnId: grn.id,
        records: rows
      };

      const response = await api.post('/inspections', payload);
      
      // --- NEW: Intercept the response and trigger print modal if labels exist ---
      if (response.data.labels && response.data.labels.length > 0) {
        setLabelsToPrint(response.data.labels);
        setPrintModalOpen(true);
      } else {
        alert("IQIR Report saved successfully! (No accepted items to print)");
        navigate('/iqc');
      }

    } catch (err) {
      console.error(err);
      alert("Failed to archive the target inspection lot.");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Execute Print ---
  const handlePrint = () => {
    window.print();
  };

  const handleClosePrintModal = () => {
    setPrintModalOpen(false);
    navigate('/iqc'); // Return to dashboard when done
  };

  if (error && !isRoutingValid) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

  return (
    <Box sx={{ mt: 3, mb: 8, px: 1 }}>
      
      {/* CSS Print Logic: Hides everything except the labels when window.print() is called */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          /* Ensure backgrounds print for the labels */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <Typography variant="h4" color="primary" gutterBottom className="no-print">
        New IQIR Inspection
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom className="no-print">
        DC Linkage: <strong>{grn?.dcNumber}</strong> | Customer Origin: <strong>{grn?.customer?.companyName}</strong>
      </Typography>
      
      <Divider sx={{ my: 2 }} className="no-print" />

      <Paper elevation={3} sx={{ p: 3, mb: 4 }} className="no-print">
        <form onSubmit={handleSubmitReport}>
          
          <Typography variant="h6" gutterBottom>1. Header Details</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth label="Format Spec / Doc No" required size="small"
                value={selectedDocSetting} onChange={(e) => setSelectedDocSetting(e.target.value)}>
                {docSettings.map(ds => (
                  <MenuItem key={ds.id} value={ds.id}>{ds.documentNo} (Rev {ds.revisionNumber})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Work Order No." required size="small"
                value={workOrderNumber} onChange={(e) => setWorkOrderNumber(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Work Order Date" type="date" required size="small"
                InputLabelProps={{ shrink: true }}
                value={workOrderDate} onChange={(e) => setWorkOrderDate(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Kit Quantity" type="number" required size="small"
                value={kitQuantity} onChange={(e) => setKitQuantity(e.target.value)} />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>2. Component Inspection</Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 600, mb: 3, border: '1px solid #e0e0e0', overflowX: 'auto' }}>
                <Table stickyHeader size="small" sx={{ minWidth: 2200 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 60, backgroundColor: '#e8f5e9' }}><strong>SL</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Location</strong></TableCell>
                      <TableCell sx={{ minWidth: 180, backgroundColor: '#e8f5e9' }}><strong>Target MPN</strong></TableCell>
                      
                      <TableCell sx={{ minWidth: 200, backgroundColor: '#fff3e0' }}><strong>Physical GRN Item</strong></TableCell>
                      <TableCell sx={{ minWidth: 130, backgroundColor: '#fff3e0' }}><strong>Map Action</strong></TableCell>
                      
                      <TableCell sx={{ minWidth: 180, backgroundColor: '#e3f2fd' }}><strong>True Rcvd MPN</strong></TableCell>
                      <TableCell sx={{ minWidth: 130, backgroundColor: '#e3f2fd' }}><strong>Received Make</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e3f2fd' }}><strong>Meas. Value</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Bodymark/Pkg</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Status</strong></TableCell>
                      <TableCell sx={{ minWidth: 250, backgroundColor: '#e3f2fd' }}><strong>Remarks</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => {
                      const availableItems = getAvailableGrnItems(row.grnItemId);
                      const isManualTyping = row.mapAction === 'Typo' || row.mapAction === 'CPN';

                      return (
                      <TableRow key={row.bomItemId} hover sx={{ backgroundColor: row.grnItemId ? 'white' : '#fff9c4' }}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.designator}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{row.mpn}</TableCell>
                        
                        <TableCell>
                          <TextField select size="small" fullWidth value={row.grnItemId} 
                            onChange={(e) => handleGrnItemSelect(index, e.target.value)} sx={{ backgroundColor: 'white' }}>
                            <MenuItem value=""><em>-- Unmapped --</em></MenuItem>
                            {availableItems.map(item => (
                              <MenuItem key={item.id} value={item.id}>{item.partNumber} ({item.receivedQuantity} pcs)</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>

                        <TableCell>
                          <TextField select size="small" fullWidth value={row.mapAction} 
                            onChange={(e) => handleMapActionChange(index, e.target.value)}
                            disabled={!row.grnItemId} sx={{ backgroundColor: 'white' }}>
                            <MenuItem value="None" disabled><em>Select</em></MenuItem>
                            <MenuItem value="Auto">Auto-Match</MenuItem>
                            <MenuItem value="Typo">Fix Typo</MenuItem>
                            <MenuItem value="Alt">Alt Part</MenuItem>
                            <MenuItem value="CPN">Verify CPN</MenuItem>
                          </TextField>
                        </TableCell>
                        
                        <TableCell>
                          <TextField size="small" fullWidth value={row.receivedMpn} 
                            onChange={(e) => handleRowChange(index, 'receivedMpn', e.target.value)}
                            disabled={!isManualTyping && row.grnItemId !== ''} 
                            inputProps={{ style: { fontFamily: 'monospace' } }} />
                        </TableCell>

                        <TableCell><TextField size="small" fullWidth value={row.receivedMake} onChange={(e) => handleRowChange(index, 'receivedMake', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" fullWidth value={row.measuredValue} onChange={(e) => handleRowChange(index, 'measuredValue', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" fullWidth value={row.bodymarkPackage} onChange={(e) => handleRowChange(index, 'bodymarkPackage', e.target.value)} /></TableCell>
                        
                        <TableCell>
                          <TextField select size="small" fullWidth value={row.status} 
                            onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                            sx={{ backgroundColor: row.status === 'Rejected' ? '#ffebee' : 'inherit' }}>
                            <MenuItem value="Accepted">Accepted</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell><TextField size="small" fullWidth value={row.remarks} onChange={(e) => handleRowChange(index, 'remarks', e.target.value)} /></TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" color="success" size="large"
                  disabled={loading} startIcon={<SaveIcon />} sx={{ px: 4, py: 1.2 }}>
                  Commit Data & Finalize IQIR
                </Button>
              </Box>
            </>
          )}
        </form>
      </Paper>

      {/* --- NEW: PRINT LABELS DIALOG --- */}
      <Dialog 
        open={printModalOpen} 
        maxWidth="md" 
        fullWidth
        // Prevent accidental closing without acknowledging
        onClose={(event, reason) => { if (reason !== 'backdropClick') handleClosePrintModal(); }}
      >
        <DialogTitle sx={{ backgroundColor: '#e8f5e9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" /> IQIR Saved Successfully!
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }} className="no-print">
          <Typography variant="body1" paragraph>
            Inspection is complete. The system has generated <strong>{labelsToPrint.length}</strong> unique Traceability Barcodes for the accepted parts.
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Load your 35x12mm thermal labels into the printer, then click Print.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Label Previews:</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {labelsToPrint.map((lbl, idx) => (
               <Chip 
                 key={idx} 
                 label={`${lbl.traceabilityId} (${lbl.printQty} pcs)`} 
                 variant="outlined" 
                 color="primary" 
               />
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }} className="no-print">
          <Button onClick={handleClosePrintModal} color="inherit">Skip Printing</Button>
          <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />}>
            Print Labels
          </Button>
        </DialogActions>

        {/* --- THE ACTUAL PRINTABLE AREA --- */}
        {/* We keep it hidden from the UI, but it becomes visible via CSS when printing */}
        <Box id="print-area" sx={{ display: 'none', '@media print': { display: 'block' } }}>
          {labelsToPrint.map((label, index) => {
            // The Pipe-Delimited String for maximum scanning speed
            const qrData = `${label.traceabilityId}|${label.receivedMpn}|${label.printQty}`;
            
            return (
              <Box 
                key={index} 
                sx={{ 
                  // Exact CSS for a 35mm x 12mm label layout
                  width: '35mm', 
                  height: '12mm',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  padding: '1mm',
                  overflow: 'hidden',
                  pageBreakAfter: 'always', // Forces a new sticker for each label
                  backgroundColor: '#fff',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                {/* QR Code on the Left */}
                <Box sx={{ width: '10mm', height: '10mm', flexShrink: 0 }}>
                  <QRCodeSVG 
                    value={qrData} 
                    size={38} // Size in pixels (~10mm)
                    level="L" // Lowest error correction for least dense grid!
                  />
                </Box>
                
                {/* Human Readable Text on the Right */}
                <Box sx={{ ml: '1.5mm', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: '5.5pt', fontWeight: 'bold', lineHeight: 1, mb: '0.5mm' }}>
                    {label.receivedMpn.length > 15 ? label.receivedMpn.substring(0, 15) + '...' : label.receivedMpn}
                  </Typography>
                  <Typography sx={{ fontSize: '4.5pt', lineHeight: 1, color: '#333' }}>
                    ID: {label.traceabilityId}
                  </Typography>
                  <Typography sx={{ fontSize: '4.5pt', lineHeight: 1, color: '#333' }}>
                    QTY: {label.printQty}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Dialog>
    </Box>
  );
};

export default IqcForm;