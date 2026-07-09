import type { View } from "../App";

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  startNewApplication: () => void;
}

export default function Sidebar({
  activeView,
  setActiveView,
  startNewApplication,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">LS</div>
        <div>
          <h1>LendScope</h1>
          <p>AI Loan Assistant</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <button
          className={`nav-item ${
            activeView === "dashboardList" || activeView === "dashboardDetail" ? "active" : ""
          }`}
          type="button"
          onClick={() => setActiveView("dashboardList")}
        >
          Dashboard
        </button>

        <button
          className={`nav-item ${activeView === "application" ? "active" : ""}`}
          type="button"
          onClick={startNewApplication}
        >
          New Application
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-dot">LS</div>
        <div>
          <strong>Demo Workspace</strong>
          <span>Underwriter View</span>
        </div>
      </div>
    </aside>
  );
}