import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, 
  CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, Divider 
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import api from '../services/api';

const IqcInspect = () => {
  const { id: grnId } = useParams();
  const navigate = useNavigate();

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [grn, setGrn] = useState(null);
  const [models, setModels] = useState([]);
  const [revisions, setRevisions] = useState([]);

  const [selectedModel, setSelectedModel] = useState('');
  const [selectedRevision, setSelectedRevision] = useState('');

  // --- Initial Data Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch GRN details and the list of Models simultaneously
        const [grnRes, modelsRes] = await Promise.all([
          api.get(`/grns/${grnId}`),
          api.get('/models')
        ]);
        
        setGrn(grnRes.data);
        setModels(modelsRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load inspection data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [grnId]);

  // --- Fetch Revisions when a Model is selected ---
  useEffect(() => {
    if (!selectedModel) return; // Just exit early if no model is selected

    const fetchRevisions = async () => {
      try {
        const res = await api.get(`/models/${selectedModel}/revisions`);
        setRevisions(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load revisions for this model.');
      }
    };
    fetchRevisions();
  }, [selectedModel]);

  // --- Handlers ---
  const handleProceedToMapping = () => {
    // We will navigate to the actual IQIR form and pass our selections in the background state!
    navigate(`/iqc/form`, { 
      state: { 
        grn, 
        modelId: selectedModel, 
        revisionId: selectedRevision 
      } 
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  if (!grn) return <Alert severity="warning" sx={{ mt: 4 }}>GRN not found.</Alert>;

    // Only show models that belong to the customer who sent this GRN
    const filteredModels = grn ? models.filter(m => m.customerId === grn.customerId) : [];

  return (
    <Box sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>Project Mapping</Typography>
      
      <Grid container spacing={4}>
        {/* LEFT COLUMN: The Physical Box (GRN) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Physical Delivery Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body1"><strong>GRN Number:</strong> {grn.grnNumber}</Typography>
            <Typography variant="body1"><strong>Customer:</strong> {grn.customer?.companyName}</Typography>
            <Typography variant="body1"><strong>DC Number:</strong> {grn.dcNumber}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              <strong>Pending Items to Inspect:</strong> <Chip label={grn.grnItems?.length || 0} color="warning" size="small" />
            </Typography>

            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Part Number</TableCell>
                    <TableCell align="right">Qty Received</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grn.grnItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{item.partNumber}</TableCell>
                      <TableCell align="right">{item.receivedQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: The Engineering Design (Model) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', backgroundColor: '#f8f9fa' }}>
            <Typography variant="h6" color="secondary" gutterBottom>
              Engineering Blueprint Selection
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Typography variant="body2" color="textSecondary" paragraph>
              Select the target Project and BOM Revision for this delivery. The system will automatically attempt to match the physical parts to the engineering requirements.
            </Typography>

            <TextField
              select label="Select Project (Model)" fullWidth required
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setRevisions([]);        
                setSelectedRevision(''); 
              }}
              sx={{ mb: 3, backgroundColor: 'white' }}
            >
              <MenuItem value="" disabled><em>-- Choose Project --</em></MenuItem>
              {filteredModels.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.projectName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select label="Select BOM Revision" fullWidth required
              value={selectedRevision}
              onChange={(e) => setSelectedRevision(e.target.value)}
              disabled={!selectedModel}
              sx={{ mb: 4, backgroundColor: 'white' }}
            >
              <MenuItem value="" disabled><em>-- Choose Revision --</em></MenuItem>
              {revisions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.versionName} ({r._count?.bomItems || 0} parts)
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained" color="primary" size="large" fullWidth
              startIcon={<AutoFixHighIcon />}
              disabled={!selectedModel || !selectedRevision}
              onClick={handleProceedToMapping}
              sx={{ py: 1.5 }}
            >
              Auto-Map Parts & Begin Inspection
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IqcInspect;