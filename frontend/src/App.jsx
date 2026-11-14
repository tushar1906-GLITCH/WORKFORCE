import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WorkersPage from './pages/Workers/WorkersPage';
import WorkerDetailPage from './pages/Workers/WorkerDetailPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import AssignmentsPage from './pages/Assignments/AssignmentsPage';
import LeavePage from './pages/Leave/LeavePage';
import WorkSitesPage from './pages/WorkSites/WorkSitesPage';
import DepartmentsPage from './pages/Departments/DepartmentsPage';
import ShiftsPage from './pages/Shifts/ShiftsPage';
import PayrollPage from './pages/Payroll/PayrollPage';
import PayrollDetailPage from './pages/Payroll/PayrollDetailPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import UsersPage from './pages/Users/UsersPage';
import ActivityLogsPage from './pages/ActivityLogs/ActivityLogsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import AiAssistantPage from './pages/AiAssistant/AiAssistantPage';

// Admin Protected Route Wrapper
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="ai-assistant" element={<AiAssistantPage />} />
              <Route path="workers" element={<WorkersPage />} />
              <Route path="workers/:id" element={<WorkerDetailPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="leave" element={<LeavePage />} />
              <Route path="sites" element={<WorkSitesPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="shifts" element={<ShiftsPage />} />
              <Route path="reports" element={<ReportsPage />} />

              {/* Admin Only Routes */}
              <Route
                path="payroll"
                element={
                  <AdminRoute>
                    <PayrollPage />
                  </AdminRoute>
                }
              />
              <Route
                path="payroll/:id"
                element={
                  <AdminRoute>
                    <PayrollDetailPage />
                  </AdminRoute>
                }
              />
              <Route
                path="payments"
                element={
                  <AdminRoute>
                    <PaymentsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="users"
                element={
                  <AdminRoute>
                    <UsersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="activity-logs"
                element={
                  <AdminRoute>
                    <ActivityLogsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <AdminRoute>
                    <SettingsPage />
                  </AdminRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
