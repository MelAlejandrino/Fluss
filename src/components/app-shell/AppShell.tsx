import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Sidebar />
      {/* always reserve the scroll track (styled invisible when unused) so the
          scrollbar never appears/disappears or shifts layout on navigation */}
      <main className="flex-1 overflow-y-scroll">{children}</main>
    </div>
  );
}
