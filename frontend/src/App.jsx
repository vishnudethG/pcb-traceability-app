import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import BomUpload from './pages/BomUpload';
import Dashboard from './pages/Dashboard';
import CustomerMaster from './pages/CustomerMaster';
import ModelMaster from './pages/ModelMaster';
import GrnList from './pages/GrnList';       // NEW IMPORT
import CreateGrn from './pages/CreateGrn';
import IqcDashboard from './pages/IqcDashboard';
import IqcInspect from './pages/IqcInspect';
import IqcForm from './pages/IqcForm';
import IqcEdit from './pages/IqcEdit';

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
          <Button color="inherit" component={Link} to="/grns">Store (GRN)</Button> {/* UPDATED LINK */}
          <Button color="inherit" component={Link} to="/upload-bom">Upload BOM</Button>
          <Button color="inherit" component={Link} to="/iqc">IQC Dashboard</Button>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Container maxWidth="xl">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomerMaster />} />
          <Route path="/models" element={<ModelMaster />} />
          <Route path="/upload-bom" element={<BomUpload />} />
          
          {/* --- NEW GRN ROUTING LOGIC --- */}
          <Route path="/grns" element={<GrnList />} />
          <Route path="/grns/create" element={<CreateGrn />} />
          <Route path="/grns/edit/:id" element={<CreateGrn />} />
          
          {/* --- IQC ROUTING LOGIC --- */}
          <Route path="/iqc" element={<IqcDashboard />} />
          <Route path="/iqc/inspect/:id" element={<IqcInspect />} />
          <Route path="/iqc/form" element={<IqcForm />} />
          <Route path="/iqc/edit/:id" element={<IqcEdit />} />
          <Route path="/iqc/view/:id" element={<IqcEdit />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;