import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
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

        // --- CLIENT SIDE AUTO-MAPPING ENGINE ---
        const initializedRows = bomItems.map(bomItem => {
          const physicalMatch = grn.grnItems.find(grnItem => 
            grnItem.status !== 'Mapped' && 
            (grnItem.partNumber.trim().toLowerCase() === bomItem.mpn.trim().toLowerCase() ||
             (bomItem.alternativePartNo && grnItem.partNumber.trim().toLowerCase() === bomItem.alternativePartNo.trim().toLowerCase()))
          );

          return {
            // Read-Only BOM Data
            bomItemId: bomItem.id,
            designator: bomItem.designator,
            mpn: bomItem.mpn,
            alternativePartNo: bomItem.alternativePartNo || '-',
            description: bomItem.description || '',
            bomValue: bomItem.value || '-',
            bomTolerance: bomItem.tolerance || '-',
            
            // Tracking Physical Part linkage & Edge Cases
            grnItemId: physicalMatch ? physicalMatch.id : '',
            mapAction: physicalMatch ? 'Auto' : 'None', // 'None', 'Auto', 'Typo', 'Alt', 'CPN'
            
            // Editable Inspector Inputs
            receivedMpn: physicalMatch ? physicalMatch.partNumber : '',
            receivedMake: physicalMatch ? (bomItem.manufacturer || '') : '',
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

  // --- Dynamic Unmapped Items Filter ---
  // Filters out items that are already mapped in the DB, OR currently selected in another row in the UI
  const getAvailableGrnItems = (currentRowGrnItemId) => {
    const currentlyUsedIds = rows.map(r => r.grnItemId).filter(id => id !== '');
    return grn?.grnItems?.filter(item => 
      item.status !== 'Mapped' && 
      (!currentlyUsedIds.includes(item.id) || item.id === currentRowGrnItemId)
    ) || [];
  };

  // --- Row Change Handlers ---
  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  const handleGrnItemSelect = (index, grnItemId) => {
    const updatedRows = [...rows];
    
    // If the user unselects the part, clear the row completely
    if (!grnItemId) {
      updatedRows[index].grnItemId = '';
      updatedRows[index].receivedMpn = '';
      updatedRows[index].mapAction = 'None';
      updatedRows[index].remarks = '';
      setRows(updatedRows);
      return;
    }

    // Force the dropdown value back to an integer so it perfectly matches the database ID
    const parsedId = parseInt(grnItemId, 10);
    const selectedGrnItem = grn.grnItems.find(item => item.id === parsedId);
    
    updatedRows[index].grnItemId = parsedId;
    updatedRows[index].receivedMpn = selectedGrnItem ? selectedGrnItem.partNumber : '';
    updatedRows[index].mapAction = 'Auto'; // Default to standard map
    updatedRows[index].remarks = ''; 
    setRows(updatedRows);
  };

  const handleMapActionChange = (index, action) => {
    const updatedRows = [...rows];
    updatedRows[index].mapAction = action;

    // Apply strict business logic based on the action selected
    if (action === 'Alt') {
      updatedRows[index].remarks = `Approved alternative used in place of ${updatedRows[index].mpn}`;
    } else if (action === 'CPN') {
      updatedRows[index].receivedMpn = ''; // Clear it so they are forced to type the actual manufacturer MPN
      updatedRows[index].remarks = 'Verified physical manufacturer part against Customer Part Number.';
    } else if (action === 'Typo') {
      updatedRows[index].remarks = 'Store typing error corrected by QC.';
    } else if (action === 'Auto') {
      // Reset the MPN to the original GRN part number and clear remarks
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

    // --- STRICT TYPO VALIDATION ENGINE ---
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.mapAction === 'Typo') {
        const correctedMpn = row.receivedMpn.trim().toLowerCase();
        const targetMpn = row.mpn.trim().toLowerCase();
        
        // Split the alternative parts string by commas or slashes, then clean each item
        const altMpns = row.alternativePartNo && row.alternativePartNo !== '-' 
          ? row.alternativePartNo.split(/[,/]/).map(part => part.trim().toLowerCase())
          : [];

        // Check if the correction matches the target OR exists in the alternatives array
        if (correctedMpn !== targetMpn && !altMpns.includes(correctedMpn)) {
          alert(`Validation Failed on Row ${i + 1} (${row.designator}):\n\nThe corrected typo "${row.receivedMpn}" does not match the Target MPN or any approved Alternative Part Numbers.\n\nIf this is a valid unlisted substitute, please reject the part or use the 'Alt Part' action instead.`);
          return; // Instantly halt submission
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

      await api.post('/inspections', payload);
      alert("IQIR Report generated and stored securely!");
      navigate('/iqc');
    } catch (err) {
      console.error(err);
      alert("Failed to archive the target inspection lot.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !isRoutingValid) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

  return (
    <Box sx={{ mt: 3, mb: 8, px: 1 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        New IQIR Inspection
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        DC Linkage: <strong>{grn?.dcNumber}</strong> | Customer Origin: <strong>{grn?.customer?.companyName}</strong>
      </Typography>
      
      {error && isRoutingValid && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Divider sx={{ my: 2 }} />

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmitReport}>
          
          <Typography variant="h6" gutterBottom>1. Header Details</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <TextField
                select fullWidth label="Format Spec / Doc No" required size="small"
                value={selectedDocSetting}
                onChange={(e) => setSelectedDocSetting(e.target.value)}
              >
                {docSettings.map(ds => (
                  <MenuItem key={ds.id} value={ds.id}>
                    {ds.documentNo} (Rev {ds.revisionNumber})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                fullWidth label="Work Order No." required size="small"
                value={workOrderNumber} onChange={(e) => setWorkOrderNumber(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                fullWidth label="Work Order Date" type="date" required size="small"
                InputLabelProps={{ shrink: true }}
                value={workOrderDate} onChange={(e) => setWorkOrderDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                fullWidth label="Kit Quantity" type="number" required size="small"
                value={kitQuantity} onChange={(e) => setKitQuantity(e.target.value)}
              />
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
                      {/* BOM Reference Columns */}
                      <TableCell sx={{ minWidth: 60, backgroundColor: '#e8f5e9' }}><strong>SL</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Location</strong></TableCell>
                      <TableCell sx={{ minWidth: 180, backgroundColor: '#e8f5e9' }}><strong>Target MPN</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Alt Part No.</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e8f5e9' }}><strong>Value</strong></TableCell>
                      
                      {/* Physical Mapping Logic */}
                      <TableCell sx={{ minWidth: 200, backgroundColor: '#fff3e0' }}><strong>Physical GRN Item</strong></TableCell>
                      <TableCell sx={{ minWidth: 130, backgroundColor: '#fff3e0' }}><strong>Map Action</strong></TableCell>
                      
                      {/* Editable Inspector Inputs */}
                      <TableCell sx={{ minWidth: 180, backgroundColor: '#e3f2fd' }}><strong>True Rcvd MPN</strong></TableCell>
                      <TableCell sx={{ minWidth: 130, backgroundColor: '#e3f2fd' }}><strong>Received Make</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e3f2fd' }}><strong>Meas. Value</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Bodymark/Pkg</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e3f2fd' }}><strong>Date Code / Lot</strong></TableCell>
                      <TableCell sx={{ minWidth: 80, backgroundColor: '#e3f2fd' }}><strong>MSL</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Tolerance</strong></TableCell>
                      <TableCell sx={{ minWidth: 90, backgroundColor: '#e3f2fd' }}><strong>Voltage</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>MSL Cond.</strong></TableCell>
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
                        <TableCell>{row.alternativePartNo}</TableCell>
                        <TableCell>{row.bomValue}</TableCell>
                        
                        {/* 1. Select the Physical Part from the Box */}
                        <TableCell>
                          <TextField select size="small" fullWidth
                            value={row.grnItemId} 
                            onChange={(e) => handleGrnItemSelect(index, e.target.value)}
                            sx={{ backgroundColor: 'white' }}
                          >
                            <MenuItem value=""><em>-- Unmapped --</em></MenuItem>
                            {availableItems.map(item => (
                              <MenuItem key={item.id} value={item.id}>
                                {item.partNumber} ({item.receivedQuantity} pcs)
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>

                        {/* 2. Select the Action (Only enabled if a part is selected) */}
                        <TableCell>
                          <TextField select size="small" fullWidth
                            value={row.mapAction} 
                            onChange={(e) => handleMapActionChange(index, e.target.value)}
                            disabled={!row.grnItemId}
                            sx={{ backgroundColor: 'white' }}
                          >
                            <MenuItem value="None" disabled><em>Select</em></MenuItem>
                            <MenuItem value="Auto">Auto-Match</MenuItem>
                            <MenuItem value="Typo">Fix Typo</MenuItem>
                            <MenuItem value="Alt">Alt Part</MenuItem>
                            <MenuItem value="CPN">Verify CPN</MenuItem>
                          </TextField>
                        </TableCell>
                        
                        {/* 3. The Received MPN Field (Locks or Unlocks based on Action) */}
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.receivedMpn} 
                            onChange={(e) => handleRowChange(index, 'receivedMpn', e.target.value)}
                            disabled={!isManualTyping && row.grnItemId !== ''} 
                            placeholder={isManualTyping ? "Type True MPN..." : ""}
                            inputProps={{ style: { fontFamily: 'monospace' } }}
                          />
                        </TableCell>

                        {/* Standard Editable Fields */}
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.receivedMake} onChange={(e) => handleRowChange(index, 'receivedMake', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.measuredValue} onChange={(e) => handleRowChange(index, 'measuredValue', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.bodymarkPackage} onChange={(e) => handleRowChange(index, 'bodymarkPackage', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.dateCodeLotNumber} onChange={(e) => handleRowChange(index, 'dateCodeLotNumber', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.mslLevel} onChange={(e) => handleRowChange(index, 'mslLevel', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.measuredTolerance} onChange={(e) => handleRowChange(index, 'measuredTolerance', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.voltage} onChange={(e) => handleRowChange(index, 'voltage', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.mslLevelCondition} onChange={(e) => handleRowChange(index, 'mslLevelCondition', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField select size="small" fullWidth
                            value={row.status} onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                            sx={{ backgroundColor: row.status === 'Rejected' ? '#ffebee' : 'inherit' }}
                          >
                            <MenuItem value="Accepted">Accepted</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={row.remarks} onChange={(e) => handleRowChange(index, 'remarks', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit" variant="contained" color="success" size="large"
                  disabled={loading} startIcon={<SaveIcon />} sx={{ px: 4, py: 1.2 }}
                >
                  Commit Data & Finalize IQIR
                </Button>
              </Box>
            </>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default IqcForm;