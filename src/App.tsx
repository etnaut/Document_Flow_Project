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
import ReleasedDocuments from "./pages/ReleasedDocuments";
import ReceivedRequests from "./pages/ReceivedRequests";
import DocumentResponses from "./pages/DocumentResponses";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ManageAdmins from "./pages/ManageAdmins";
import ManageEmployees from "./pages/ManageEmployees";
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
              <Route path="/released" element={<ReleasedDocuments />} />
              <Route path="/received" element={<ReceivedRequests />} />
              <Route path="/responses" element={<DocumentResponses />} />
              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/manage-admins" element={<ManageAdmins />} />
              {/* Admin Routes */}
              <Route path="/manage-employees" element={<ManageEmployees />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
