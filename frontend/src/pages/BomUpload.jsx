import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Chip, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Stack 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import api from '../services/api';

const BomUpload = () => {
  // --- Data States ---
  const [customers, setCustomers] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [allRevisions, setAllRevisions] = useState([]);
  
  // --- Filter States ---
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterModel, setFilterModel] = useState('');

  // --- UI States ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // --- Modal States: Upload ---
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCustomer, setUploadCustomer] = useState('');
  const [uploadModel, setUploadModel] = useState('');
  const [versionName, setVersionName] = useState('');
  const [file, setFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // --- Modal States: Preview & Delete ---
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState(null);

  // --- Silent Refresh (For Upload / Delete actions) ---
  const refreshMasterData = async () => {
    try {
      const [custRes, modRes, revRes] = await Promise.all([
        api.get('/customers'),
        api.get('/models'),
        api.get('/boms/revisions')
      ]);
      setCustomers(custRes.data);
      setAllModels(modRes.data);
      setAllRevisions(revRes.data);
    } catch (err) {
      console.error('Failed to refresh BOM data.', err);
    }
  };

  // --- EFFECT: Initial Page Load ---
  useEffect(() => {
    const initialLoad = async () => {
      try {
        const [custRes, modRes, revRes] = await Promise.all([
          api.get('/customers'),
          api.get('/models'),
          api.get('/boms/revisions') 
        ]);
        setCustomers(custRes.data);
        setAllModels(modRes.data);
        setAllRevisions(revRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load BOM data. Ensure the server is running.');
      } finally {
        setLoading(false); 
      }
    };
    initialLoad();
  }, []);

  // --- FILTER LOGIC ---
  const filterModelsOptions = filterCustomer 
    ? allModels.filter(m => m.customerId === filterCustomer) 
    : [];

  const displayedRevisions = allRevisions.filter(rev => {
    let match = true;
    if (filterCustomer && rev.model.customerId !== filterCustomer) match = false;
    if (filterModel && rev.modelId !== filterModel) match = false;
    return match;
  });

  // --- ACTION: Download Excel Template ---
  const handleDownloadTemplate = () => {
    // These headers exactly match your bomController.js mapping!
    const templateData = [{
      "MPN": "",
      "Designator": "",
      "Manufacturer": "",
      "Description": "",
      "Value": "",
      "Quantity/Board": "",
      "Alternative Part No.": "",
      "Package": "",
      "Tolerance": ""
    }];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BOM_Template");
    XLSX.writeFile(wb, "BOM_Upload_Template.xlsx");
  };

  // --- ACTION: Submit New Revision ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an Excel file.");

    setSubmitLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('modelId', uploadModel);
    formData.append('versionName', versionName);
    formData.append('file', file);

    try {
      const response = await api.post('/boms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`Success! ${response.data.totalComponents} components uploaded for ${versionName}.`);
      setUploadOpen(false);
      
      // Reset Form
      setUploadCustomer('');
      setUploadModel('');
      setVersionName('');
      setFile(null);
      
      refreshMasterData(); // Refresh list silently
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "An error occurred during upload.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // --- ACTIONS: Preview & Delete ---
  const handlePreview = async (revision) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/boms/${revision.id}/items`);
      setPreviewData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load preview data.');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/boms/${selectedRevisionId}`);
      setDeleteOpen(false);
      setMessage("Revision deleted successfully.");
      refreshMasterData(); // Refresh list silently
    } catch (err) {
      console.error(err);
      alert('Failed to delete revision. It may be linked to active IQC inspections.');
      setDeleteOpen(false);
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 10 }} />;

  return (
    <Box sx={{ mt: 4, mb: 8, px: 2 }}>
      {/* Header and Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">BOM Master List</Typography>
        <Button 
          variant="contained" color="primary" startIcon={<AddIcon />} 
          onClick={() => setUploadOpen(true)}
        >
          Upload New BOM
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      {/* FILTER BAR */}
      <Paper elevation={3} sx={{ p: 2, mb: 4, backgroundColor: '#f8f9fa' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Typography variant="subtitle1" fontWeight="bold">Filter By:</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select label="Customer" fullWidth size="small"
              value={filterCustomer}
              onChange={(e) => {
                setFilterCustomer(e.target.value);
                setFilterModel(''); // Reset model filter if customer changes
              }}
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value=""><em>All Customers</em></MenuItem>
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {/* Only show Model filter if a Customer is selected */}
          {filterCustomer && (
            <Grid item xs={12} md={4}>
              <TextField
                select label="Project (Model)" fullWidth size="small"
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value=""><em>All Projects</em></MenuItem>
                {filterModelsOptions.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.projectName}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* MAIN DATA GRID */}
      <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 650 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Customer</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Project Name</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>BOM Revision</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Upload Date</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Components</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRevisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>No BOM Revisions found.</TableCell>
                </TableRow>
              ) : (
                displayedRevisions.map((rev) => (
                  <TableRow key={rev.id} hover>
                    <TableCell>{rev.model.customer.companyName}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{rev.model.projectName}</TableCell>
                    <TableCell>
                      <Chip label={rev.versionName} color="secondary" variant="outlined" size="small" />
                    </TableCell>
                    <TableCell>{new Date(rev.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Chip label={rev._count.bomItems} size="small" color="primary" />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handlePreview(rev)}>
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => { setSelectedRevisionId(rev.id); setDeleteOpen(true); }}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --- UPLOAD NEW BOM DIALOG --- */}
      <Dialog open={uploadOpen} onClose={() => !submitLoading && setUploadOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUploadSubmit}>
          <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', mb: 2 }}>
            Upload New BOM Revision
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  select label="Select Customer" fullWidth required
                  value={uploadCustomer}
                  onChange={(e) => {
                    setUploadCustomer(e.target.value);
                    setUploadModel(''); 
                  }}
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select label="Select Project (Model)" fullWidth required
                  disabled={!uploadCustomer}
                  value={uploadModel}
                  onChange={(e) => setUploadModel(e.target.value)}
                >
                  {uploadCustomer ? allModels.filter(m => m.customerId === uploadCustomer).map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.projectName}</MenuItem>
                  )) : (
                    <MenuItem value="" disabled>Select Customer First</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Revision Name" fullWidth required
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g., Rev A"
                  helperText="Must be unique for this specific project."
                />
              </Grid>
              
              {/* --- NEW STACKED UPLOAD BUTTONS --- */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={2}>
                  <Button 
                    variant="outlined" color="secondary" fullWidth 
                    startIcon={<FileDownloadIcon />} onClick={handleDownloadTemplate}
                  >
                    Template
                  </Button>
                  <Button 
                    variant="outlined" component="label" fullWidth 
                    startIcon={<UploadFileIcon />}
                  >
                    {file ? file.name : "Select File"}
                    <input
                      type="file" hidden accept=".xlsx, .xls, .csv"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setUploadOpen(false)} color="inherit" disabled={submitLoading}>Cancel</Button>
            <Button 
              type="submit" variant="contained" color="primary" 
              disabled={submitLoading || !file || !versionName || !uploadModel}
              startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            >
              {submitLoading ? 'Uploading...' : 'Upload BOM'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- PREVIEW DIALOG --- */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
          BOM Revision Preview
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: '#eeeeee', fontWeight: 'bold' }}>MPN</TableCell>
                    <TableCell sx={{ backgroundColor: '#eeeeee', fontWeight: 'bold' }}>Designator</TableCell>
                    <TableCell sx={{ backgroundColor: '#eeeeee', fontWeight: 'bold' }}>Value</TableCell>
                    <TableCell sx={{ backgroundColor: '#eeeeee', fontWeight: 'bold' }}>Qty</TableCell>
                    <TableCell sx={{ backgroundColor: '#eeeeee', fontWeight: 'bold' }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{item.mpn}</TableCell>
                      <TableCell>{item.designator}</TableCell>
                      <TableCell>{item.value}</TableCell>
                      <TableCell>{item.quantityPerBoard}</TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} color="primary" variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this BOM Revision? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BomUpload;