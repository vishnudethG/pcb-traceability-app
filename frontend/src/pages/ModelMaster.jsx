import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem, IconButton, 
  Alert, CircularProgress, Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';

const ModelMaster = () => {
  const [models, setModels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog States
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  
  // Action States
  const [isEditing, setIsEditing] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(null);
  
  // Form Data State
  const initialFormState = { customerId: '', projectName: '' };
  const [formData, setFormData] = useState(initialFormState);

  // --- Background Refresh ---
  const fetchModels = async () => {
    try {
      const res = await api.get('/models');
      setModels(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to refresh models.');
    }
  };

  // --- Initial Page Load ---
  useEffect(() => {
    const initialLoad = async () => {
      try {
        const [modelsRes, customersRes] = await Promise.all([
          api.get('/models'),
          api.get('/customers')
        ]);
        setModels(modelsRes.data);
        setCustomers(customersRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
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

  const handleOpenEdit = (model) => {
    setFormData({
      customerId: model.customerId || '',
      projectName: model.projectName || ''
    });
    setSelectedModelId(model.id);
    setIsEditing(true);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setFormData(initialFormState);
    setSelectedModelId(null);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveModel = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/models/${selectedModelId}`, formData);
      } else {
        await api.post('/models', formData);
      }
      handleCloseForm();
      fetchModels(); // Refresh grid silently
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'add'} model.`);
    }
  };

  // --- Handlers for Delete Dialog ---
  const handleOpenDelete = (id) => {
    setSelectedModelId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/models/${selectedModelId}`);
      setOpenDelete(false);
      fetchModels(); // Refresh grid silently
    } catch (err) {
      console.error(err);
      alert('Failed to delete model. It may have existing BOM revisions or inspections tied to it.');
      setOpenDelete(false);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">Model / Project Master</Typography>
        <Button 
          variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenAdd}
        >
          Add New Model
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* --- MODELS DATA GRID --- */}
      <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 650 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Customer</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Project Name</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Date Created</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>No models found. Click "Add New Model" to begin.</TableCell>
                  </TableRow>
                ) : (
                  models.map((model) => (
                    <TableRow key={model.id} hover>
                      <TableCell>{model.customer?.companyName || 'Unknown Customer'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{model.projectName}</TableCell>
                      <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <IconButton color="primary" onClick={() => handleOpenEdit(model)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleOpenDelete(model.id)}>
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
        <form onSubmit={handleSaveModel}>
          <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', mb: 2 }}>
            {isEditing ? 'Edit Project Model' : 'Add New Project Model'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  select name="customerId" label="Select Customer" required fullWidth
                  value={formData.customerId} onChange={handleFormChange}
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.companyName} ({c.customerCode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  name="projectName" label="Project Name" required fullWidth 
                  value={formData.projectName} onChange={handleFormChange} 
                  placeholder="e.g., Alpha Board"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseForm} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {isEditing ? 'Save Changes' : 'Create Model'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this model? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModelMaster;