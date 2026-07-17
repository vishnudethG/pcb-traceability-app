import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api from '../services/api';

const BomUpload = () => {
  // 1. Master Data States
  const [customers, setCustomers] = useState([]);
  const [allModels, setAllModels] = useState([]); // Holds ALL models
  const [revisions, setRevisions] = useState([]); // Holds history for selected model

  // 2. Form Selection States
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [versionName, setVersionName] = useState('');
  const [file, setFile] = useState(null);

  // 3. UI States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [fetchingRevisions, setFetchingRevisions] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // --- EFFECT 1: Fetch Master Data on Load ---
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [custRes, modRes] = await Promise.all([
          api.get('/customers'),
          api.get('/models')
        ]);
        setCustomers(custRes.data);
        setAllModels(modRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load initial data. Is the server running?');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchMasterData();
  }, []);

  // --- Calculate Filtered Models (No Effect Needed!) ---
  const filteredModels = selectedCustomer 
    ? allModels.filter(m => m.customerId === selectedCustomer) 
    : [];

  // --- EFFECT 3: Fetch BOM History when a Model is Selected ---
  useEffect(() => {
    if (selectedModel) {
      const fetchHistory = async () => {
        setFetchingRevisions(true);
        try {
          const res = await api.get(`/models/${selectedModel}/revisions`);
          setRevisions(res.data);
        } catch (err) {
          console.error(err);
          setError('Failed to fetch revision history.');
        } finally {
          setFetchingRevisions(false);
        }
      };
      fetchHistory();
    }
  }, [selectedModel]);

  // --- ACTION: Submit New Revision ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please select an Excel file.");

    setSubmitLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('modelId', selectedModel);
    formData.append('versionName', versionName);
    formData.append('file', file);

    try {
      const response = await api.post('/boms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(`Success! ${response.data.totalComponents} components processed for ${versionName}.`);
      setVersionName('');
      setFile(null);
      document.getElementById('bom-file-input').value = ""; 

      // Quietly refresh the history table to show the new upload!
      const refreshRes = await api.get(`/models/${selectedModel}/revisions`);
      setRevisions(refreshRes.data);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "An error occurred during upload.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loadingInitial) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 10 }} />;

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>BOM Upload Workspace</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      {/* TOP BAR: Project Selection */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select label="1. Select Customer" fullWidth required
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setSelectedModel(''); 
                setRevisions([]);     
              }}
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }} // <-- Forces label to the top
              sx={{ minWidth: '250px' }}         // <-- Absolutely prevents the box from shrinking
            >
              <MenuItem value="" disabled>
                <em>-- Choose a Customer --</em>
              </MenuItem>
              
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select label="2. Select Project (Model)" fullWidth required
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedCustomer}
              SelectProps={{ displayEmpty: true }} // <--- ADD THIS LINE
              InputLabelProps={{ shrink: true }} // <-- Forces label to the top
              sx={{ minWidth: '250px' }}         // <-- Absolutely prevents the box from shrinking
            >
              <MenuItem value="" disabled>
                <em>-- Choose a Project --</em>
              </MenuItem>
              
              {filteredModels.length === 0 ? (
                <MenuItem disabled value="none">No projects found for this customer</MenuItem>
              ) : (
                filteredModels.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.projectName}</MenuItem>
                ))
              )}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* BOTTOM SPLIT: History vs Upload Form */}
      {selectedModel && (
        <Grid container spacing={4}>
          
          {/* LEFT SIDE: Revision History */}
          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom>Existing BOM Revisions</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#eeeeee' }}>
                  <TableRow>
                    <TableCell><strong>Revision</strong></TableCell>
                    <TableCell><strong>Upload Date</strong></TableCell>
                    <TableCell align="center"><strong>Components</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fetchingRevisions ? (
                    <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={24}/></TableCell></TableRow>
                  ) : revisions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No revisions uploaded yet.</TableCell></TableRow>
                  ) : (
                    revisions.map((rev) => (
                      <TableRow key={rev.id} hover>
                        <TableCell><strong>{rev.versionName}</strong></TableCell>
                        <TableCell>{new Date(rev.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <Chip label={rev._count.bomItems} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          {rev.isActive ? (
                            <Chip label="Active" size="small" color="success" />
                          ) : (
                            <Chip label="Archived" size="small" color="default" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* RIGHT SIDE: The Upload Tool */}
          <Grid item xs={12} md={5}>
            <Paper elevation={3} sx={{ p: 3, borderTop: '4px solid #1976d2' }}>
              <Typography variant="h6" gutterBottom>Upload New Revision</Typography>
              <form onSubmit={handleSubmit}>
                <TextField
                  label="New Revision Name" fullWidth margin="normal" required
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g., Rev A"
                  helperText="Must be a unique name for this project."
                />
                <Box sx={{ mt: 3, mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Select Excel/CSV File:
                  </Typography>
                  <input
                    id="bom-file-input"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ display: 'block' }}
                  />
                </Box>
                <Button
                  type="submit" variant="contained" color="primary" fullWidth size="large"
                  disabled={submitLoading || !file || !versionName} 
                  startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                >
                  {submitLoading ? 'Processing File...' : 'Upload Data'}
                </Button>
              </form>
            </Paper>
          </Grid>

        </Grid>
      )}
    </Box>
  );
};

export default BomUpload;