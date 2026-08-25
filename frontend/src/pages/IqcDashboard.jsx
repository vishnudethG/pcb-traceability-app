import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip, 
  CircularProgress, Alert, Grid, Card, CardContent, Divider,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';

const IqcDashboard = () => {
  const navigate = useNavigate();
  
  // Data States
  const [pendingGrns, setPendingGrns] = useState([]);
  const [completedReports, setCompletedReports] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('completed'); 

  // Modal States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  // --- Silent Refresh (For actions like Delete) ---
  const refreshDashboardData = async () => {
    try {
      const [grnRes, reportRes] = await Promise.all([
        api.get('/grns/pending'),
        api.get('/inspections') 
      ]);
      setPendingGrns(grnRes.data);
      setCompletedReports(reportRes.data);
    } catch (err) {
      console.error("Error refreshing Dashboard Data:", err);
    }
  };

  // --- Initial Page Load ---
  useEffect(() => {
    const initialLoad = async () => {
      try {
        const [grnRes, reportRes] = await Promise.all([
          api.get('/grns/pending'),
          api.get('/inspections') 
        ]);
        setPendingGrns(grnRes.data);
        setCompletedReports(reportRes.data);
      } catch (err) {
        console.error("Error fetching Dashboard Data:", err);
        setError("Failed to load IQC data.");
      } finally {
        setLoading(false); // Clean asynchronous update
      }
    };

    initialLoad();
  }, []);

  // --- Actions ---
  const handleOpenDelete = (id) => {
    setSelectedReportId(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/inspections/${selectedReportId}`);
      setDeleteOpen(false);
      refreshDashboardData(); // Refresh the lists silently
    } catch (err) {
      console.error(err);
      alert('Failed to delete report.');
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ mt: 4, mb: 8, px: 2 }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">Quality Control (IQC)</Typography>
        <Button 
          variant="contained" color="primary" startIcon={<AddIcon />} 
          onClick={() => setActiveView('pending')}
        >
          New IQIR
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* DASHBOARD CARDS */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card 
            onClick={() => setActiveView('completed')}
            sx={{ 
              cursor: 'pointer', transition: '0.2s',
              backgroundColor: activeView === 'completed' ? '#e3f2fd' : 'white',
              border: activeView === 'completed' ? '2px solid #1976d2' : '2px solid transparent',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="h6">Finished IQI Reports</Typography>
                <Typography variant="h3" color="primary">{completedReports.length}</Typography>
              </Box>
              <DescriptionIcon sx={{ fontSize: 60, color: '#1976d2', opacity: 0.8 }} />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card 
            onClick={() => setActiveView('pending')}
            sx={{ 
              cursor: 'pointer', transition: '0.2s',
              backgroundColor: activeView === 'pending' ? '#fff3e0' : 'white',
              border: activeView === 'pending' ? '2px solid #ed6c02' : '2px solid transparent',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="h6">Pending IQI Queue</Typography>
                <Typography variant="h3" color="warning.main">{pendingGrns.length}</Typography>
              </Box>
              <PendingActionsIcon sx={{ fontSize: 60, color: '#ed6c02', opacity: 0.8 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4 }} />

      {/* VIEW: FINISHED IQI REPORTS */}
      {activeView === 'completed' && (
        <>
          <Typography variant="h5" gutterBottom color="textSecondary">Master List: Finished Reports</Typography>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead sx={{ backgroundColor: '#eeeeee' }}>
                <TableRow>
                  <TableCell><strong>Report ID</strong></TableCell>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell><strong>Project (Model)</strong></TableCell>
                  <TableCell><strong>DC Number</strong></TableCell>
                  <TableCell><strong>Completion Date</strong></TableCell>
                  <TableCell align="center"><strong>Parts Inspected</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completedReports.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No completed reports found.</TableCell></TableRow>
                ) : (
                  completedReports.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>IQIR-{String(report.id).padStart(4, '0')}</TableCell>
                      <TableCell>{report.bomRevision?.model?.customer?.companyName || 'Unknown'}</TableCell>
                      <TableCell>{report.bomRevision?.model?.projectName || 'Unknown'}</TableCell>
                      <TableCell>{report.customerDcNumber}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <Chip label={report._count.iqirRecords} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                      <IconButton color="primary" onClick={() => navigate(`/iqc/view/${report.id}`)}>
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton color="secondary" onClick={() => navigate(`/iqc/edit/${report.id}`)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleOpenDelete(report.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* VIEW: PENDING IQI QUEUE */}
      {activeView === 'pending' && (
        <>
          <Typography variant="h5" gutterBottom color="textSecondary">Action Required: Pending Queue</Typography>
          
          {pendingGrns.length === 0 && !error ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              There are currently no GRNs awaiting inspection. The queue is completely clear!
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
                  {pendingGrns.map((grn) => {
                    const totalItems = grn.grnItems.length;
                    const pendingItems = grn.grnItems.filter(item => item.status === 'Pending').length;
                    
                    return (
                      <TableRow key={grn.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{grn.grnNumber}</TableCell>
                        <TableCell>{grn.customer?.companyName || 'Unknown Customer'}</TableCell>
                        <TableCell>{grn.dcNumber}</TableCell>
                        <TableCell>{new Date(grn.grnDate).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${pendingItems} / ${totalItems} Pending`} 
                            color={pendingItems === totalItems ? "error" : "warning"} 
                            size="small" variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained" color="warning" size="small"
                            startIcon={<AssignmentTurnedInIcon />}
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
        </>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this IQI Report? The QA records will be permanently lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IqcDashboard;