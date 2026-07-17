import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Alert 
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import api from '../services/api';

const IqcDashboard = () => {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingGrns = async () => {
      try {
        const response = await api.get('/grns/pending');
        setGrns(response.data);
      } catch (err) {
        console.error("Error fetching GRNs:", err);
        setError("Failed to load the inspection queue.");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingGrns();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>IQC Dashboard - Pending Inspections</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {grns.length === 0 && !error ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          There are currently no GRNs awaiting inspection. The queue is clear!
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead sx={{ backgroundColor: '#eeeeee' }}>
              <TableRow>
                <TableCell><strong>GRN Number</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>DC Number</strong></TableCell>
                <TableCell><strong>Received Date</strong></TableCell>
                <TableCell align="center"><strong>Items (Pending / Total)</strong></TableCell>
                <TableCell align="center"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grns.map((grn) => {
                const totalItems = grn.grnItems.length;
                const pendingItems = grn.grnItems.filter(item => item.status === 'Pending').length;
                
                // Format the date nicely
                const receivedDate = new Date(grn.grnDate).toLocaleDateString();

                return (
                  <TableRow key={grn.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{grn.grnNumber}</TableCell>
                    <TableCell>{grn.customer?.companyName || 'Unknown Customer'}</TableCell>
                    <TableCell>{grn.dcNumber}</TableCell>
                    <TableCell>{receivedDate}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={`${pendingItems} / ${totalItems} Pending`} 
                        color={pendingItems === totalItems ? "error" : "warning"} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<AssignmentTurnedInIcon />}
                        // We will build this route next!
                        onClick={() => navigate(`/iqc/inspect/${grn.id}`)}
                      >
                        Begin Inspection
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default IqcDashboard;