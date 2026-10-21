import { createRoot } from "react-dom/client";
import "./index.css";
import { RateAppPopup } from "./components/RateAppPopup";
createRoot(document.getElementById("root")!).render(<RateAppPopup open onClose={()=>{}} onSubmit={async()=>({success:true})} submitting={false} />);
