import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert 
} from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import api from '../services/api';

const CustomerMaster = () => {
  // Data States
  const [customers, setCustomers] = useState([]);
  
  // Form States
  const [companyName, setCompanyName] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  
  // UI States
  const [loadingList, setLoadingList] = useState(true); // Starts true on initial load!
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // 1. Initial Data Fetch (Runs exactly once on mount)
  useEffect(() => {
    const fetchInitialCustomers = async () => {
      try {
        const response = await api.get('/customers');
        setCustomers(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch customers. Ensure the server is running.');
      } finally {
        // Asynchronous setState inside a try/finally block is perfectly fine!
        setLoadingList(false); 
      }
    };

    fetchInitialCustomers();
  }, []);

  // 2. Handle adding a new customer
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Step A: Save to database
      await api.post('/customers', { companyName, customerCode });
      setMessage(`Successfully added ${companyName}`);
      
      // Step B: Clear form
      setCompanyName('');
      setCustomerCode('');
      
      // Step C: Refresh the table data quietly in the background
      const refreshResponse = await api.get('/customers');
      setCustomers(refreshResponse.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add customer. Code or Name might already exist.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>Customer Master List</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={4}>
        {/* LEFT SIDE: ADD NEW CUSTOMER FORM */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Add New Customer</Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                label="Company Name" fullWidth margin="normal" required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., TechCorp Electronics"
              />
              <TextField
                label="Customer Code" fullWidth margin="normal" required
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="e.g., TC-001"
              />
              <Button
                type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}
                disabled={submitLoading} startIcon={<AddBusinessIcon />}
              >
                {submitLoading ? 'Saving...' : 'Add Customer'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* RIGHT SIDE: CUSTOMER DATA TABLE */}
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper} elevation={3}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Customer Code</strong></TableCell>
                  <TableCell><strong>Company Name</strong></TableCell>
                  <TableCell><strong>Date Added</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingList ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}><CircularProgress /></TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>No customers found.</TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>{customer.id}</TableCell>
                      <TableCell>{customer.customerCode}</TableCell>
                      <TableCell>{customer.companyName}</TableCell>
                      <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
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

export default CustomerMaster;