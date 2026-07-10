import type { View, Mode } from "../App";

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  startNewApplication: () => void;
  currentMode: Mode;
  setCurrentMode: (mode: Mode) => void;
}

export default function Sidebar({
  activeView,
  setActiveView,
  startNewApplication,
  currentMode,
  setCurrentMode,
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

      {/* Workspace Mode Switcher Toggle */}
      <div className="mode-toggle-container" style={{ padding: "0 10px 24px" }}>
        <p className="eyebrow" style={{ color: "#9fb0d0", marginBottom: "8px", fontSize: "11px" }}>
          WORKSPACE MODE
        </p>
        <div style={{ display: "flex", background: "#1d3470", borderRadius: "8px", padding: "4px" }}>
          <button
            type="button"
            className={`nav-item ${currentMode === "borrower" ? "active" : ""}`}
            style={{ padding: "8px", fontSize: "13px", textAlign: "center", margin: 0 }}
            onClick={() => {
              setCurrentMode("borrower");
              setActiveView(activeView); //Used to be "dashboardList"
            }}
          >
            Borrower
          </button>
          <button
            type="button"
            className={`nav-item ${currentMode === "underwriter" ? "active" : ""}`}
            style={{ padding: "8px", fontSize: "13px", textAlign: "center", margin: 0 }}
            onClick={() => {
              setCurrentMode("underwriter");
              setActiveView(activeView); //Used to be "dashboardList"
            }}
          >
            Underwriter
          </button>
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
          {currentMode === "borrower" ? "My Saved Estimates" : "Application Queue"}
        </button>

        <button
          className={`nav-item ${activeView === "application" ? "active" : ""}`}
          type="button"
          onClick={startNewApplication}
        >
          {currentMode === "borrower" ? "Check My Readiness" : "Run New Underwrite"}
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-dot">{currentMode === "borrower" ? "ME" : "LS"}</div>
        <div>
          <strong>Demo Workspace</strong>
          <span>{currentMode === "borrower" ? "Applicant View" : "Underwriter View"}</span>
        </div>
      </div>
    </aside>
  );
}