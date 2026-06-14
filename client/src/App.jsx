import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ExercisesPage from './pages/ExercisesPage';
import WorkoutPlanPage from './pages/WorkoutPlanPage';
import WorkoutHistoryPage from './pages/WorkoutHistoryPage';
import RecommendationsPage from './pages/RecommendationsPage';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/exercises"
              element={
                <ProtectedRoute>
                  <ExercisesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workout-plan"
              element={
                <ProtectedRoute>
                  <WorkoutPlanPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <WorkoutHistoryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/recommendations"
              element={
                <ProtectedRoute>
                  <RecommendationsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;