import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Divider, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import api from '../services/api';

const IqcEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detect if the user clicked the View button instead of Edit
  const isReadOnly = location.pathname.includes('/view/');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docSettings, setDocSettings] = useState([]);
  
  // Header Form State
  const [selectedDocSetting, setSelectedDocSetting] = useState('');
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [workOrderDate, setWorkOrderDate] = useState('');
  const [kitQuantity, setKitQuantity] = useState('');
  const [headerInfo, setHeaderInfo] = useState({});

  // Inspection Grid State
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportRes, docSettingsRes] = await Promise.all([
          api.get(`/inspections/${id}`),
          api.get('/inspections/document-settings')
        ]);

        const report = reportRes.data;
        setDocSettings(docSettingsRes.data);

        // Populate Header Data
        setSelectedDocSetting(report.documentSettingId);
        setWorkOrderNumber(report.workOrderNumber);
        setWorkOrderDate(new Date(report.workOrderDate).toISOString().split('T')[0]);
        setKitQuantity(report.kitQuantity);
        setHeaderInfo({
          dcNumber: report.customerDcNumber,
          customerName: report.bomRevision?.model?.customer?.companyName || 'Unknown',
          projectName: report.bomRevision?.model?.projectName || 'Unknown',
          revisionName: report.bomRevision?.versionName || 'Unknown'
        });

        // Map Existing Rows
        const mappedRows = report.iqirRecords.map(record => ({
          id: record.id,
          bomItemId: record.bomItem.id,
          traceabilityId: record.traceabilityId || 'N/A',
          designator: record.bomItem.designator,
          mpn: record.bomItem.mpn,
          alternativePartNo: record.bomItem.alternativePartNo || '-',
          bomValue: record.bomItem.value || '-',
          receivedMpn: record.receivedMpn || '',
          receivedMake: record.receivedMake || '',
          measuredValue: record.measuredValue || '',
          bodymarkPackage: record.bodymarkPackage || '',
          dateCodeLotNumber: record.dateCodeLotNumber || '',
          mslLevel: record.mslLevel || '',
          measuredTolerance: record.measuredTolerance || '',
          voltage: record.voltage || '',
          mslLevelCondition: record.mslLevelCondition || '',
          status: record.status || 'Accepted',
          remarks: record.remarks || ''
        }));

        setRows(mappedRows);
      } catch (err) {
        console.error(err);
        setError("Failed to load inspection report details.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedDocSetting || !workOrderNumber || !kitQuantity) {
      alert("Please ensure all required header fields are filled.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        documentSettingId: parseInt(selectedDocSetting),
        customerDcNumber: headerInfo.dcNumber,
        workOrderNumber,
        workOrderDate,
        kitQuantity: parseInt(kitQuantity),
        records: rows
      };

      await api.put(`/inspections/${id}`, payload);
      alert("IQIR Report updated successfully!");
      navigate('/iqc');
    } catch (err) {
      console.error(err);
      alert("Failed to update the inspection lot.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 4, mx: 2 }}>{error}</Alert>;

  return (
    <Box sx={{ mt: 3, mb: 8, px: 1 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        {isReadOnly ? 'IQIR Report Viewer' : 'Edit IQIR Report'} (ID: {id})
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Customer: <strong>{headerInfo.customerName}</strong> | Project: <strong>{headerInfo.projectName} ({headerInfo.revisionName})</strong> | DC Linkage: <strong>{headerInfo.dcNumber}</strong>
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSaveChanges}>
          <Typography variant="h6" gutterBottom>1. Header Details</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <TextField
                select fullWidth label="Format Spec / Doc No" required size="small"
                value={selectedDocSetting}
                onChange={(e) => setSelectedDocSetting(e.target.value)}
                disabled={isReadOnly}
                variant={isReadOnly ? "filled" : "outlined"}
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
                disabled={isReadOnly} variant={isReadOnly ? "filled" : "outlined"}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                fullWidth label="Work Order Date" type="date" required size="small"
                InputLabelProps={{ shrink: true }} disabled={isReadOnly}
                value={workOrderDate} onChange={(e) => setWorkOrderDate(e.target.value)}
                variant={isReadOnly ? "filled" : "outlined"}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                fullWidth label="Kit Quantity" type="number" required size="small"
                value={kitQuantity} onChange={(e) => setKitQuantity(e.target.value)}
                disabled={isReadOnly} variant={isReadOnly ? "filled" : "outlined"}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>2. Component Inspection Results</Typography>
          <TableContainer sx={{ maxHeight: 650, mb: 3, border: '1px solid #e0e0e0', overflowX: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 2000 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 60, backgroundColor: '#e8f5e9' }}><strong>SL</strong></TableCell>
                  <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Location</strong></TableCell>
                  <TableCell sx={{ minWidth: 180, backgroundColor: '#e8f5e9' }}><strong>Target MPN</strong></TableCell>
                  <TableCell sx={{ minWidth: 150, backgroundColor: '#e8f5e9' }}><strong>Alt Part No.</strong></TableCell>
                  <TableCell sx={{ minWidth: 100, backgroundColor: '#e8f5e9' }}><strong>BOM Value</strong></TableCell>
                  <TableCell sx={{ minWidth: 180, backgroundColor: '#e3f2fd' }}><strong>Received MPN</strong></TableCell>
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
                  <TableCell sx={{ minWidth: 160, backgroundColor: '#e3f2fd' }}><strong>Barcode ID</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id} hover sx={{ backgroundColor: 'white' }}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.designator}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{row.mpn}</TableCell>
                    <TableCell>{row.alternativePartNo}</TableCell>
                    <TableCell>{row.bomValue}</TableCell>

                    {/* DYNAMIC CELLS: Plain text for View Mode, TextFields for Edit Mode */}
                    <TableCell>
                      {isReadOnly ? (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.receivedMpn || '-'}</Typography>
                      ) : (
                        <TextField size="small" fullWidth value={row.receivedMpn} 
                          onChange={(e) => handleRowChange(index, 'receivedMpn', e.target.value)} 
                          inputProps={{ style: { fontFamily: 'monospace' } }} />
                      )}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.receivedMake || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.receivedMake} 
                          onChange={(e) => handleRowChange(index, 'receivedMake', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.measuredValue || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.measuredValue} 
                          onChange={(e) => handleRowChange(index, 'measuredValue', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.bodymarkPackage || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.bodymarkPackage} 
                          onChange={(e) => handleRowChange(index, 'bodymarkPackage', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.dateCodeLotNumber || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.dateCodeLotNumber} 
                          onChange={(e) => handleRowChange(index, 'dateCodeLotNumber', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.mslLevel || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.mslLevel} 
                          onChange={(e) => handleRowChange(index, 'mslLevel', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.measuredTolerance || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.measuredTolerance} 
                          onChange={(e) => handleRowChange(index, 'measuredTolerance', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.voltage || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.voltage} 
                          onChange={(e) => handleRowChange(index, 'voltage', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.mslLevelCondition || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.mslLevelCondition} 
                          onChange={(e) => handleRowChange(index, 'mslLevelCondition', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? (
                        <Chip 
                          label={row.status} size="small" 
                          color={row.status === 'Rejected' ? 'error' : 'success'} 
                        />
                      ) : (
                        <TextField select size="small" fullWidth value={row.status} 
                          onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                          sx={{ backgroundColor: row.status === 'Rejected' ? '#ffebee' : 'inherit' }}
                        >
                          <MenuItem value="Accepted">Accepted</MenuItem>
                          <MenuItem value="Rejected">Rejected</MenuItem>
                        </TextField>
                      )}
                    </TableCell>

                    <TableCell>
                      {isReadOnly ? <Typography variant="body2">{row.remarks || '-'}</Typography> : 
                        <TextField size="small" fullWidth value={row.remarks} 
                          onChange={(e) => handleRowChange(index, 'remarks', e.target.value)} />}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: row.traceabilityId !== 'N/A' ? '#1976d2' : 'inherit' }}>
                        {row.traceabilityId}
                      </Typography>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" color="inherit" size="large" onClick={() => navigate('/iqc')}>
              {isReadOnly ? 'Back to Dashboard' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" variant="contained" color="primary" size="large" startIcon={<SaveIcon />}>
                Save Updates
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default IqcEdit;