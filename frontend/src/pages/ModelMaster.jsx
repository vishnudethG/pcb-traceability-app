import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert 
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import api from '../services/api';

const ModelMaster = () => {
  // Data States
  const [models, setModels] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Form States
  const [customerId, setCustomerId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [bomVersion, setBomVersion] = useState('');
  
  // UI States
  const [loadingList, setLoadingList] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch initial data (Both Models and Customers)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Run both API calls at the exact same time for maximum speed!
        const [modelsRes, customersRes] = await Promise.all([
          api.get('/models'),
          api.get('/customers')
        ]);
        
        setModels(modelsRes.data);
        setCustomers(customersRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data. Ensure the server is running.');
      } finally {
        setLoadingList(false);
      }
    };

    fetchData();
  }, []);

  // Handle adding a new model
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setMessage(null);

    try {
      await api.post('/models', { customerId, projectName, bomVersion });
      setMessage(`Successfully added ${projectName}`);
      
      // Clear form
      setCustomerId('');
      setProjectName('');
      setBomVersion('');
      
      // Refresh only the models table
      const refreshResponse = await api.get('/models');
      setModels(refreshResponse.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add model.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>Model (Project) Master List</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={4}>
        {/* LEFT SIDE: ADD NEW MODEL FORM */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Add New Model</Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                select label="Select Customer" fullWidth margin="normal" required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.companyName} ({c.customerCode})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Project Name" fullWidth margin="normal" required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Alpha Board"
              />
              <TextField
                label="BOM Version" fullWidth margin="normal" required
                value={bomVersion}
                onChange={(e) => setBomVersion(e.target.value)}
                placeholder="e.g., Rev A"
              />
              <Button
                type="submit" variant="contained" color="secondary" fullWidth sx={{ mt: 2 }}
                disabled={submitLoading} startIcon={<PrecisionManufacturingIcon />}
              >
                {submitLoading ? 'Saving...' : 'Add Model'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* RIGHT SIDE: MODEL DATA TABLE */}
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper} elevation={3}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell><strong>Project Name</strong></TableCell>
                  <TableCell><strong>Version</strong></TableCell>
                  <TableCell><strong>Date Added</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingList ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}><CircularProgress /></TableCell>
                  </TableRow>
                ) : models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>No models found.</TableCell>
                  </TableRow>
                ) : (
                  models.map((model) => (
                    <TableRow key={model.id} hover>
                      <TableCell>{model.customer?.companyName}</TableCell>
                      <TableCell>{model.projectName}</TableCell>
                      <TableCell>{model.bomVersion}</TableCell>
                      <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelMaster;