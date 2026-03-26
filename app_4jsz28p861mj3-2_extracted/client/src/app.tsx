import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import LoginPage from './pages/LoginPage/LoginPage';
import PatientCreatePage from './pages/PatientCreatePage/PatientCreatePage';
import HomePage from './pages/HomePage/HomePage';
import ReportUploadPage from './pages/ReportUploadPage/ReportUploadPage';
import ReportDetailPage from './pages/ReportDetailPage/ReportDetailPage';
import ReportEditPage from './pages/ReportEditPage/ReportEditPage';
import TrendsPage from './pages/TrendsPage/TrendsPage';
import ReminderSettingsPage from './pages/ReminderSettingsPage/ReminderSettingsPage';
import GradeReferencePage from './pages/GradeReferencePage/GradeReferencePage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/patient/create" element={<PatientCreatePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/report/upload" element={<ReportUploadPage />} />
      <Route path="/report/:id" element={<ReportDetailPage />} />
      <Route path="/report/:id/edit" element={<ReportEditPage />} />
      <Route path="/trends" element={<TrendsPage />} />
      <Route path="/reminder/settings" element={<ReminderSettingsPage />} />
      <Route path="/reference" element={<GradeReferencePage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
