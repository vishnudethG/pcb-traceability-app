import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import BomUpload from './pages/BomUpload';
import Dashboard from './pages/Dashboard';
import IqirForm from './pages/IqirForm';
import CustomerMaster from './pages/CustomerMaster';
import ModelMaster from './pages/ModelMaster';
import CreateGrn from './pages/CreateGrn';


function App() {
  return (
    <Router>
      {/* Navigation Bar */}
      <AppBar position="static" sx={{ marginBottom: 4 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            EMS Traceability
          </Typography>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/customers">Customers</Button>
          <Button color="inherit" component={Link} to="/models">Models</Button>
          <Button color="inherit" component={Link} to="/store/grn">Store (GRN)</Button>
          <Button color="inherit" component={Link} to="/upload-bom">Upload BOM</Button>
          <Button color="inherit" component={Link} to="/iqir">New IQIR</Button>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Container maxWidth="xl">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomerMaster />} />
          <Route path="/store/grn" element={<CreateGrn />} />
          <Route path="/models" element={<ModelMaster />} />
          <Route path="/upload-bom" element={<BomUpload />} />
          <Route path="/iqir" element={<IqirForm />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;