import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseDetails from './pages/CourseDetails';
import CodingPractice from './pages/CodingPractice';
import Profile from './pages/Profile';
import MLTraining from './pages/MLTraining';
import LiveProctorDashboard from './pages/LiveProctorDashboard';
import MyPerformance from './pages/MyPerformance';
import AssessmentBuilder from './pages/AssessmentBuilder';
import LiveAssessments from './pages/LiveAssessments';
import AssessmentResults from './pages/AssessmentResults';
import MLAdminDashboard from './components/Dashboard/MLAdminDashboard';

// Route protection wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="lms-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Route redirect helper for login/register pages
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="lms-spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const StaffRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><div className="lms-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return ['teacher', 'admin'].includes(user.role) ? children : <Navigate to="/dashboard" replace />;
};

const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><div className="lms-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'student' ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/behavior" element={<StaffRoute><LiveProctorDashboard /></StaffRoute>} />

          <Route path="/teacher/assessments/new" element={<StaffRoute><AssessmentBuilder /></StaffRoute>} />
          <Route path="/teacher/results" element={<StaffRoute><AssessmentResults /></StaffRoute>} />
          <Route path="/live-assessments" element={<ProtectedRoute><LiveAssessments /></ProtectedRoute>} />
          
          <Route path="/ml-admin" element={<MLAdminDashboard />} />

          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assignments/:id/coding"
            element={
              <ProtectedRoute>
                <CodingPractice />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ml-training"
            element={
              <StudentRoute>
                <MLTraining />
              </StudentRoute>
            }
          />

          <Route
            path="/my-performance"
            element={
              <ProtectedRoute>
                <MyPerformance />
              </ProtectedRoute>
            }
          />

          {/* /courses redirect — courses now live inside Dashboard as tabs */}
          <Route path="/courses" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />

          {/* Catch-all Fallback Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
