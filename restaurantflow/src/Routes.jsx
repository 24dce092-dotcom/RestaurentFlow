import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import BillingPaymentManagement from './pages/billing-payment-management';
import Login from './pages/login';
import TableManagementHistory from './pages/table-management-history';
import WaiterOrderTaking from './pages/waiter-order-taking';
import OwnerLiveOrderDashboard from './pages/owner-live-order-dashboard';
import AnalyticsReportingDashboard from './pages/analytics-reporting-dashboard';
import SettingsPage from './pages/settings/SettingsPage';
import ServerSettings from './pages/server-settings';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
  {/* Define your route here */}
  <Route path="/" element={<WaiterOrderTaking />} />
        <Route path="/billing-payment-management" element={<BillingPaymentManagement />} />
  <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/table-management-history" element={<TableManagementHistory />} />
        <Route path="/waiter-order-taking" element={<WaiterOrderTaking />} />
        <Route path="/owner-live-order-dashboard" element={<OwnerLiveOrderDashboard />} />
        <Route path="/analytics-reporting-dashboard" element={<AnalyticsReportingDashboard />} />
  <Route path="/server-settings" element={<ServerSettings />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
