import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { UserPlanProvider } from "@/hooks/useUserPlan";

createRoot(document.getElementById("root")!).render(
  <UserPlanProvider>
    <App />
  </UserPlanProvider>,
);
