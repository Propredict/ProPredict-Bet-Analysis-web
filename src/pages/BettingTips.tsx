import { Navigate } from "react-router-dom";

// Betting Tips page redirects to All Tickets as the main tickets hub
export default function BettingTips() {
  return <Navigate to="/all-tickets" replace />;
}
