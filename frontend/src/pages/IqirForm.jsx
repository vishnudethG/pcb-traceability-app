import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, MenuItem, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Grid 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import api from '../services/api';

const IqirForm = () => {
  // 1. Data States
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [bomItems, setBomItems] = useState([]);
  
  // 2. Header Form State
  const [headerData, setHeaderData] = useState({
    customerDcNumber: '',
    workOrderNumber: '',
    workOrderDate: new Date().toISOString().split('T')[0],
    kitQuantity: '',
  });

  // 3. Inspection Grid State (Array of objects)
  const [inspectionRows, setInspectionRows] = useState([]);

  // 4. UI States
  const [loading, setLoading] = useState(false);
  const [fetchingBom, setFetchingBom] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // -- Fetch all models when page loads (for the dropdown) --
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await api.get('/models');
        setModels(res.data);
      } catch (err) {
      console.error(err); // Uses the variable and logs the root cause
      setError('Failed to load projects.');
    }
    };
    fetchModels();
  }, []);

  // -- Fetch BOM items when a specific model is selected --
  useEffect(() => {
    if (!selectedModel) return;

    const fetchBom = async () => {
      setFetchingBom(true);
      try {
        const res = await api.get(`/models/${selectedModel}/bom`);
        setBomItems(res.data);
        
        // Initialize the inspection rows based on the BOM data
        // We default status to 'Accepted' to save the inspector time!
        const initialRows = res.data.map(item => ({
          bomItemId: item.id,
          receivedMake: '',
          receivedMpn: '',
          measuredValue: '',
          bodymarkPackage: '',
          dateCodeLotNumber: '',
          mslLevel: '',
          measuredTolerance: '',
          voltage: '',
          mslLevelCondition: '',
          status: 'Accepted', 
          remarks: ''
        }));
        setInspectionRows(initialRows);
      } catch (err) {
      console.error(err); // Uses the variable
      setError('Failed to load BOM items for this project.');
      setBomItems([]);
      setInspectionRows([]);
    } finally {
        setFetchingBom(false);
      }
    };
    fetchBom();
  }, [selectedModel]);

  // -- Handle typing in the grid --
  const handleGridChange = (index, field, value) => {
    const updatedRows = [...inspectionRows];
    updatedRows[index][field] = value;
    setInspectionRows(updatedRows);
  };

  // -- Submit the completed report --
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const payload = {
      modelId: selectedModel,
      customerDcNumber: headerData.customerDcNumber,
      workOrderNumber: headerData.workOrderNumber,
      workOrderDate: headerData.workOrderDate,
      kitQuantity: headerData.kitQuantity,
      records: inspectionRows
    };

    try {
      await api.post('/iqir/submit', payload);
      setMessage('Inspection Report saved successfully!');
      
      // Clear form after success
      setSelectedModel('');
      setHeaderData({ customerDcNumber: '', workOrderNumber: '', kitQuantity: '' });
      setBomItems([]);
      setInspectionRows([]);
    } catch (err) {
      console.error(err); // Uses the variable
      setError('Failed to submit report. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>New IQIR Inspection</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          
          {/* --- HEADER SECTION --- */}
          <Typography variant="h6" gutterBottom>1. Header Details</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <TextField
                select fullWidth label="Select Project (Model)" required
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {models.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.customer?.companyName} - {m.projectName} ({m.bomVersion})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth label="Customer DC No." required
                value={headerData.customerDcNumber}
                onChange={(e) => setHeaderData({...headerData, customerDcNumber: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth label="Work Order No." required
                value={headerData.workOrderNumber}
                onChange={(e) => setHeaderData({...headerData, workOrderNumber: e.target.value})}
              />
            </Grid>
            
            {/* --- NEW SECOND ROW --- */}
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth label="Work Order Date" type="date" required
                InputLabelProps={{ shrink: true }} // Keeps the label from overlapping the date text
                value={headerData.workOrderDate}
                onChange={(e) => setHeaderData({...headerData, workOrderDate: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth label="Kit Quantity" type="number" required
                value={headerData.kitQuantity}
                onChange={(e) => setHeaderData({...headerData, kitQuantity: e.target.value})}
              />
            </Grid>
          </Grid>

          {/* --- INSPECTION GRID SECTION --- */}
          <Typography variant="h6" gutterBottom>2. Component Inspection</Typography>
          
          {fetchingBom ? (
            <CircularProgress />
          ) : bomItems.length > 0 ? (
            <>
              {/* Added overflowX: 'auto' to allow horizontal scrolling for the wide table */}
              <TableContainer sx={{ maxHeight: 600, mb: 3, border: '1px solid #e0e0e0', overflowX: 'auto' }}>
                <Table stickyHeader size="small" sx={{ minWidth: 2000 }}> {/* Forced minimum width so columns don't squish */}
                  <TableHead>
                    <TableRow>
                      {/* BOM Reference Columns (Read-Only) */}
                      <TableCell sx={{ minWidth: 60, backgroundColor: '#e8f5e9' }}><strong>SL No</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Location</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Part No.</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e8f5e9' }}><strong>Alt Part No.</strong></TableCell>
                      <TableCell sx={{ minWidth: 250, backgroundColor: '#e8f5e9' }}><strong>Description</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e8f5e9' }}><strong>Value</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e8f5e9' }}><strong>Tolerance</strong></TableCell>
                      
                      {/* Inspector Input Columns (Editable) */}
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e3f2fd' }}><strong>Rcvd MPN</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e3f2fd' }}><strong>Received Make</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Meas. Value</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Bodymark/Pkg</strong></TableCell>
                      <TableCell sx={{ minWidth: 150, backgroundColor: '#e3f2fd' }}><strong>Date Code / Lot</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e3f2fd' }}><strong>MSL Level</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Meas. Tolerance</strong></TableCell>
                      <TableCell sx={{ minWidth: 100, backgroundColor: '#e3f2fd' }}><strong>Voltage</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>MSL Cond.</strong></TableCell>
                      <TableCell sx={{ minWidth: 120, backgroundColor: '#e3f2fd' }}><strong>Status</strong></TableCell>
                      <TableCell sx={{ minWidth: 200, backgroundColor: '#e3f2fd' }}><strong>Remarks</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bomItems.map((item, index) => (
                      <TableRow key={item.id} hover>
                        {/* Reference Data from BOM */}
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.designator}</TableCell>
                        <TableCell><strong>{item.mpn}</strong></TableCell>
                        <TableCell>{item.alternativePartNo || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{item.description}</TableCell>
                        <TableCell>{item.value}</TableCell>
                        <TableCell>{item.tolerance}</TableCell>
                        
                        {/* Input Fields for Inspector */}
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.receivedMpn || ''}
                            onChange={(e) => handleGridChange(index, 'receivedMpn', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.receivedMake || ''}
                            onChange={(e) => handleGridChange(index, 'receivedMake', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.measuredValue || ''}
                            onChange={(e) => handleGridChange(index, 'measuredValue', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.bodymarkPackage || ''}
                            onChange={(e) => handleGridChange(index, 'bodymarkPackage', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.dateCodeLotNumber || ''}
                            onChange={(e) => handleGridChange(index, 'dateCodeLotNumber', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.mslLevel || ''}
                            onChange={(e) => handleGridChange(index, 'mslLevel', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.measuredTolerance || ''}
                            onChange={(e) => handleGridChange(index, 'measuredTolerance', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.voltage || ''}
                            onChange={(e) => handleGridChange(index, 'voltage', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.mslLevelCondition || ''}
                            onChange={(e) => handleGridChange(index, 'mslLevelCondition', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField select size="small" fullWidth
                            value={inspectionRows[index]?.status || 'Accepted'}
                            onChange={(e) => handleGridChange(index, 'status', e.target.value)}
                            sx={{ 
                              backgroundColor: inspectionRows[index]?.status === 'Rejected' ? '#ffebee' : 'inherit' 
                            }}
                          >
                            <MenuItem value="Accepted">Accepted</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth
                            value={inspectionRows[index]?.remarks || ''}
                            onChange={(e) => handleGridChange(index, 'remarks', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button
                type="submit" variant="contained" color="primary" size="large"
                disabled={loading} startIcon={<SaveIcon />}
              >
                {loading ? 'Saving Report...' : 'Submit IQIR'}
              </Button>
            </>
          ) : (
            <Typography color="textSecondary">Please select a project to load components.</Typography>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default IqirForm;