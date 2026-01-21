import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Employees/Dashboard";
import SendDocument from "./pages/Employees/SendDocument";
import MyDocuments from "./pages/Employees/MyDocuments";
import MyPendingDocuments from "./pages/Employees/MyPendingDocuments";
import MyApprovedDocuments from "./pages/Employees/MyApprovedDocuments";
import MyRevisionDocuments from "./pages/Employees/MyRevisionDocuments";
import AllDocuments from "./pages/admin/AllDocuments";
import PendingDocuments from "./pages/admin/PendingDocuments";
import ApprovedDocuments from "./pages/admin/ApprovedDocuments";
import RevisionDocuments from "./pages/admin/RevisionDocuments";
import ReceivedRequests from "./pages/admin/ReceivedRequests";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import ManageAdmins from "./pages/SuperAdmin/ManageAdmins";
import HeadDashboard from "./pages/Heads/HeadDashboard";
import HeadAllDocuments from "./pages/Heads/HeadAllDocuments";
import HeadNotForwarded from "./pages/Heads/HeadNotForwarded";
import HeadForwarded from "./pages/Heads/HeadForwarded";
import RecorderDashboard from "./pages/Recorder/RecorderDashboard";
import AllRecorderDocuments from "./pages/Recorder/AllRecorderDocuments";
import NotRecordedDocuments from "./pages/Recorder/NotRecordedDocuments";
import RecordedDocuments from "./pages/Recorder/RecordedDocuments";
import RecordLayout from "./components/layout/RecordLayout";
import DivisionHead from "./pages/Heads/DivisionHead";
import ManageEmployees from "./pages/Heads/ManageEmployees";
import ReleaserDashboard from "./pages/Releaser/ReleaserDashboard";
import ReleaserAllDocuments from "./pages/Releaser/ReleaserAllDocuments";
import ReleaserPendingDocuments from "./pages/Releaser/ReleaserPendingDocuments";
import ReleaserReleasedDocuments from "./pages/Releaser/ReleaserReleasedDocuments";
import DocumentViewer from "./pages/DocumentViewer";
import Settings from "./pages/Settings";
// Note: ManageEmployees, ReleasedDocuments and DocumentResponses were removed
import NotFound from "./pages/NotFound";

// Layout
import Layout from "./components/layout/Layout";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/", element: <Index /> },
    { path: "/login", element: <Login /> },

    // Protected routes that share the main app layout
    {
      element: <Layout />,
      children: [
        { path: "/dashboard", element: <Dashboard /> },
        { path: "/send-document", element: <SendDocument /> },
        { path: "/my-documents", element: <MyDocuments /> },
        { path: "/my-documents/pending", element: <MyPendingDocuments /> },
        { path: "/my-documents/approved", element: <MyApprovedDocuments /> },
        { path: "/my-documents/revision", element: <MyRevisionDocuments /> },
        { path: "/all-documents", element: <AllDocuments /> },
        { path: "/pending", element: <PendingDocuments /> },
        { path: "/approved", element: <ApprovedDocuments /> },
        { path: "/revision", element: <RevisionDocuments /> },
        { path: "/received", element: <ReceivedRequests /> },
        { path: "/documents/view/:id", element: <DocumentViewer /> },
        { path: "/super-admin", element: <SuperAdminDashboard /> },
        { path: "/manage-admins", element: <ManageAdmins /> },
        { path: "/head", element: <HeadDashboard /> },
        { path: "/head/all-documents", element: <HeadAllDocuments /> },
        { path: "/head/not-forwarded", element: <HeadNotForwarded /> },
        { path: "/head/forwarded", element: <HeadForwarded /> },
        { path: "/division-head", element: <DivisionHead /> },
        { path: "/head/manage-employees", element: <ManageEmployees /> },
        { path: "/releaser", element: <ReleaserDashboard /> },
        { path: "/releaser/all", element: <ReleaserAllDocuments /> },
        { path: "/releaser/pending", element: <ReleaserPendingDocuments /> },
        { path: "/releaser/released", element: <ReleaserReleasedDocuments /> },
        { path: "/settings", element: <Settings /> },
      ],
    },

    // Recorder-specific standalone layout (no sidebar)
    {
      element: <RecordLayout />,
      children: [
        { path: "/records", element: <RecorderDashboard /> },
        { path: "/records/all", element: <AllRecorderDocuments /> },
        { path: "/records/not-recorded", element: <NotRecordedDocuments /> },
        { path: "/records/recorded", element: <RecordedDocuments /> },
        { path: "/settings", element: <Settings /> },
      ],
    },

    { path: "*", element: <NotFound /> },
  ],
  { future: { v7_startTransition: true, v7_relativeSplatPath: true } as any }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
