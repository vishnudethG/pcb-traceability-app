import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, IconButton, Alert, CircularProgress, Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';

const CustomerMaster = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog States
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  
  // Action States
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  
  // Form Data State
  const initialFormState = { companyName: '', customerCode: '', contactPerson: '', email: '', phone: '', address: '' };
  const [formData, setFormData] = useState(initialFormState);

// --- Background Refresh (Used after Add/Edit/Delete) ---
  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to refresh customers.');
    }
  };

  // --- Initial Page Load ---
  useEffect(() => {
    const initialLoad = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load customers.');
      } finally {
        setLoading(false); // Only executes after the await finishes
      }
    };

    initialLoad();
  }, []);

  // --- Handlers for Form Dialog ---
  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setOpenForm(true);
  };

  const handleOpenEdit = (customer) => {
    setFormData({
      companyName: customer.companyName || '',
      customerCode: customer.customerCode || '', // ADD THIS LINE
      contactPerson: customer.contactPerson || '',    
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setSelectedCustomerId(customer.id);
    setIsEditing(true);
    setOpenForm(true);        
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setFormData(initialFormState);
    setSelectedCustomerId(null);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/customers/${selectedCustomerId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      handleCloseForm();
      fetchCustomers(); // Refresh grid
    } catch (err) {
      console.error(err);
      alert(`Failed to ${isEditing ? 'update' : 'add'} customer.`);
    }
  };

  // --- Handlers for Delete Dialog ---
  const handleOpenDelete = (id) => {
    setSelectedCustomerId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/customers/${selectedCustomerId}`);
      setOpenDelete(false);
      fetchCustomers(); // Refresh grid
    } catch (err) {
      console.error(err);
      alert('Failed to delete customer. They may be linked to existing GRNs or Models.');
      setOpenDelete(false);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">Customer Master</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleOpenAdd}
        >
          Add New Customer
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* --- CUSTOMERS DATA GRID --- */}
      <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 650 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Company Name</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Contact Person</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Phone</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No customers found. Click "Add New Customer" to begin.</TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{customer.companyName}</TableCell>
                      <TableCell>{customer.contactPerson || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton color="primary" onClick={() => handleOpenEdit(customer)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleOpenDelete(customer.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* --- ADD / EDIT FORM DIALOG --- */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveCustomer}>
          <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', mb: 2 }}>
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  name="companyName" label="Company Name" required fullWidth 
                  value={formData.companyName} onChange={handleFormChange} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  name="customerCode" label="Customer Code" required fullWidth 
                  value={formData.customerCode} onChange={handleFormChange} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  name="contactPerson" label="Contact Person" fullWidth 
                  value={formData.contactPerson} onChange={handleFormChange} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  name="phone" label="Phone Number" fullWidth 
                  value={formData.phone} onChange={handleFormChange} 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  name="email" label="Email Address" type="email" fullWidth 
                  value={formData.email} onChange={handleFormChange} 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  name="address" label="Company Address" multiline rows={3} fullWidth 
                  value={formData.address} onChange={handleFormChange} 
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseForm} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {isEditing ? 'Save Changes' : 'Create Customer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this customer? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerMaster;