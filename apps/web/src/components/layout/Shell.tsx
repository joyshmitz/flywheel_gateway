import { Outlet } from "@tanstack/react-router";
import { CommandPalette } from "../ui/CommandPalette";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Shell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
