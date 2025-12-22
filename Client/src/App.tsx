import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Employees/Dashboard";
import SendDocument from "./pages/Employees/SendDocument";
import MyDocuments from "./pages/Employees/MyDocuments";
import MyPendingDocuments from "./pages/Employees/MyPendingDocuments";
import MyApprovedDocuments from "./pages/Employees/MyApprovedDocuments";
import AllDocuments from "./pages/admin/AllDocuments";
import PendingDocuments from "./pages/admin/PendingDocuments";
import ApprovedDocuments from "./pages/admin/ApprovedDocuments";
import RevisionDocuments from "./pages/admin/RevisionDocuments";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import ManageAdmins from "./pages/SuperAdmin/ManageAdmins";
import HeadDashboard from "./pages/Heads/HeadDashboard";
import RecordPage from "./pages/Recorder/RecordPage";
import AllRecorderDocuments from "./pages/Recorder/AllRecorderDocuments";
import RecordLayout from "./components/layout/RecordLayout";
import DivisionHead from "./pages/Heads/DivisionHead";
import ReleaserDashboard from "./pages/Releaser/ReleaserDashboard";
import ReleaserAllDocuments from "./pages/Releaser/ReleaserAllDocuments";
import ReleaserPendingDocuments from "./pages/Releaser/ReleaserPendingDocuments";
import ReleaserReleasedDocuments from "./pages/Releaser/ReleaserReleasedDocuments";
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
              <Route path="/my-documents/pending" element={<MyPendingDocuments />} />
              <Route path="/my-documents/approved" element={<MyApprovedDocuments />} />
              <Route path="/all-documents" element={<AllDocuments />} />
              <Route path="/pending" element={<PendingDocuments />} />
              <Route path="/approved" element={<ApprovedDocuments />} />
              <Route path="/revision" element={<RevisionDocuments />} />
              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/manage-admins" element={<ManageAdmins />} />
              {/* Head roles (DepartmentHead / DivisionHead / OfficerInCharge) */}
              <Route path="/head" element={<HeadDashboard />} />
              <Route path="/division-head" element={<DivisionHead />} />
              <Route path="/division-head" element={<DivisionHead />} />
              {/* Releaser Routes */}
              <Route path="/releaser" element={<ReleaserDashboard />} />
              <Route path="/releaser/all" element={<ReleaserAllDocuments />} />
              <Route path="/releaser/pending" element={<ReleaserPendingDocuments />} />
              <Route path="/releaser/released" element={<ReleaserReleasedDocuments />} />
              {/* Admin Routes */}
            </Route>

            {/* Recorder-specific standalone layout (no sidebar) */}
            <Route element={<RecordLayout />}>
              <Route path="/records" element={<RecordPage />} />
              <Route path="/records/all" element={<AllRecorderDocuments />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
