import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';

const GrnList = () => {
  const navigate = useNavigate();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Delete Modal State
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedGrnId, setSelectedGrnId] = useState(null);

  const fetchGrns = async () => {
    try {
      const res = await api.get('/grns');
      setGrns(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to refresh GRNs.');
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        const res = await api.get('/grns');
        setGrns(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load GRNs.');
      } finally {
        setLoading(false);
      }
    };
    initialLoad();
  }, []);

  const handleOpenDelete = (id) => {
    setSelectedGrnId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/grns/${selectedGrnId}`);
      setOpenDelete(false);
      fetchGrns();
    } catch (err) {
      console.error(err);
      alert('Failed to delete GRN.');
      setOpenDelete(false);
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 8, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">Goods Received Notes (GRN)</Typography>
        <Button 
          variant="contained" color="primary" startIcon={<AddIcon />} 
          onClick={() => navigate('/grns/create')} // Route to your form
        >
          Create New GRN
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 650 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>GRN Number</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Customer</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>DC Number</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Received Date</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>No GRNs found.</TableCell>
                  </TableRow>
                ) : (
                  grns.map((grn) => (
                    <TableRow key={grn.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{grn.grnNumber}</TableCell>
                      <TableCell>{grn.customer?.companyName}</TableCell>
                      <TableCell>{grn.dcNumber}</TableCell>
                      <TableCell>{new Date(grn.grnDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={grn.status} 
                          color={grn.status === 'Closed' ? 'success' : 'warning'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          color="primary" 
                          onClick={() => navigate(`/grns/edit/${grn.id}`)} // Route to edit
                          disabled={grn.status === 'Closed'} // Prevent editing finalized GRNs
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleOpenDelete(grn.id)}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this GRN? All logged items will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GrnList;