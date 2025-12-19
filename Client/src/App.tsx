import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SendDocument from "./pages/SendDocument";
import MyDocuments from "./pages/MyDocuments";
import AllDocuments from "./pages/AllDocuments";
import PendingDocuments from "./pages/PendingDocuments";
import ApprovedDocuments from "./pages/ApprovedDocuments";
import RevisionDocuments from "./pages/RevisionDocuments";
import ReceivedRequests from "./pages/ReceivedRequests";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ManageAdmins from "./pages/ManageAdmins";
import HeadDashboard from "./pages/HeadDashboard";
import RecordPage from "./pages/RecordPage";
import RecordLayout from "./components/layout/RecordLayout";
import DivisionHead from "./pages/DivisionHead";
// Note: ManageEmployees, ReleasedDocuments and DocumentResponses were removed
import NotFound from "./pages/NotFound";

// Layout
import Layout from "./components/layout/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/send-document" element={<SendDocument />} />
              <Route path="/my-documents" element={<MyDocuments />} />
              <Route path="/all-documents" element={<AllDocuments />} />
              <Route path="/pending" element={<PendingDocuments />} />
              <Route path="/approved" element={<ApprovedDocuments />} />
              <Route path="/revision" element={<RevisionDocuments />} />
              <Route path="/received" element={<ReceivedRequests />} />
              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/manage-admins" element={<ManageAdmins />} />
              {/* Head roles (DepartmentHead / DivisionHead / OfficerInCharge) */}
              <Route path="/head" element={<HeadDashboard />} />
              <Route path="/division-head" element={<DivisionHead />} />
              <Route path="/division-head" element={<DivisionHead />} />
              {/* Admin Routes */}
            </Route>

            {/* Recorder-specific standalone layout (no sidebar) */}
            <Route element={<RecordLayout />}>
              <Route path="/records" element={<RecordPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
