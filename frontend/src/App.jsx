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
import AttendExam from './pages/AttendExam';
import MyPerformance from './pages/MyPerformance';

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

          <Route
            path="/admin/behavior"
            element={
              <ProtectedRoute>
                <LiveProctorDashboard />
              </ProtectedRoute>
            }
          />

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
              <ProtectedRoute>
                <MLTraining />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attend-exam"
            element={
              <ProtectedRoute>
                <AttendExam />
              </ProtectedRoute>
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
