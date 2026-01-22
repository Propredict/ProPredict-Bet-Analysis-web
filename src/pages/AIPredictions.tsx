import { Navigate } from "react-router-dom";

// AI Predictions page redirects to Daily Tips as the main predictions hub
export default function AIPredictions() {
  return <Navigate to="/daily-tips" replace />;
}
