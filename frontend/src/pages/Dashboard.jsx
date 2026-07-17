import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import api from '../services/api';

const Dashboard = () => {
  // State to hold the data from the database
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect runs automatically when this page first loads
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await api.get('/models');
        setModels(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch projects. Ensure your backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Projects Dashboard
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell><strong>Project Name</strong></TableCell>
              <TableCell><strong>BOM Version</strong></TableCell>
              <TableCell><strong>Upload Date</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Show a spinner while fetching data */}
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  No projects found. Please upload a BOM to get started.
                </TableCell>
              </TableRow>
            ) : (
              /* Map through the array of models and create a row for each */
              models.map((model) => (
                <TableRow key={model.id} hover>
                  {/* Notice how we access the nested customer data we 'included' in Prisma! */}
                  <TableCell>{model.customer?.companyName || 'Unknown Customer'}</TableCell>
                  <TableCell>{model.projectName}</TableCell>
                  <TableCell>{model.bomVersion}</TableCell>
                  <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Dashboard;