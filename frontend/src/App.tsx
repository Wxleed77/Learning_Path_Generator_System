import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import GoalFormPage from "./pages/GoalFormPage";
import QuizPage from "./pages/QuizPage";
import AccountPage from "./pages/AccountPage";
import RequireAuth from "./hooks/RequireAuth";
import AppLayout from "./components/AppLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/goal" element={<GoalFormPage />} />
            <Route path="/quiz/:taskId" element={<QuizPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
