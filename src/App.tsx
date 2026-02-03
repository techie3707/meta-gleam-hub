import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Search from "./pages/Search";
import Import from "./pages/Import";
import Collections from "./pages/Collections";
import Documents from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";
import Tasks from "./pages/Tasks";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/UserManagement";
import GroupManagement from "./pages/GroupManagement";
import WorkflowManagement from "./pages/WorkflowManagement";
import ProcessMonitoring from "./pages/ProcessMonitoring";
import MetadataRegistry from "./pages/MetadataRegistry";
import CreateItem from "./pages/CreateItem";
import EditItem from "./pages/EditItem";
import CreateCollection from "./pages/CreateCollection";
import PDFViewerPage from "./pages/PDFViewerPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/import"
              element={
                <ProtectedRoute>
                  <Import />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collections"
              element={
                <ProtectedRoute>
                  <Collections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <DocumentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/edit/:id"
              element={
                <ProtectedRoute>
                  <EditItem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdf/:id/:bitstreamId"
              element={
                <ProtectedRoute>
                  <PDFViewerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/create"
              element={
                <ProtectedRoute>
                  <CreateItem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collections/create"
              element={
                <ProtectedRoute adminOnly>
                  <CreateCollection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute adminOnly>
                  <GroupManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflow"
              element={
                <ProtectedRoute adminOnly>
                  <WorkflowManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/processes"
              element={
                <ProtectedRoute adminOnly>
                  <ProcessMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="/metadata"
              element={
                <ProtectedRoute adminOnly>
                  <MetadataRegistry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
