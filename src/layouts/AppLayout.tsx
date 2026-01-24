import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <Sidebar />

      <div className="page-main">
        <Navbar />

        <main className="flex-1">
          <div className="page-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
