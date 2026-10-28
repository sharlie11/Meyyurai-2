import { Link, useLocation } from "@tanstack/react-router";
import { Siren, Sparkles, Scale, FileText, Search, ShieldAlert, User, Settings, FolderKanban } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  const mobileItems = [
    { to: "/dashboard", label: t("nav.dashboard") || "Dashboard", icon: Siren },
    { to: "/assistant", label: t("nav.ai") || "AI Assistant", icon: Sparkles },
    { to: "/search", label: t("nav.search") || "Search", icon: Search },
    { to: "/complaints", label: "Complaints", icon: FileText },
    { to: "/emergency", label: "Emergency", icon: ShieldAlert },
    { to: "/profile", label: t("nav.profile") || "Profile", icon: User },
  ];

  const desktopItems = [
    { to: "/dashboard", label: "Dashboard", icon: Siren },
    { to: "/assistant", label: "AI Legal Assistant", icon: Sparkles },
    { to: "/legal", label: "Legal Knowledge Base", icon: Scale },
    { to: "/search", label: "Search Laws", icon: Search },
    { to: "/complaints", label: "Complaints Generator", icon: FileText },
    { to: "/evidence", label: "Evidence Vault", icon: FolderKanban },
    { to: "/emergency", label: "Emergency Help", icon: ShieldAlert },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Navigation Header */}
      <header className="hidden md:block sticky top-0 z-50 w-full border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              ⚖️
            </span>
            <span>MEYYURAI</span>
          </Link>
          <nav className="flex items-center gap-1">
            {desktopItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md safe-bottom"
      >
        <div className="mx-3 mb-3 rounded-3xl border border-border bg-card/95 shadow-lifted backdrop-blur">
          <ul className="grid grid-cols-6">
            {mobileItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <li key={to}>
                  <Link
                    to={to}
                    data-status={active ? "active" : "inactive"}
                    className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-3xl px-0.5 py-2 text-[9px] font-medium transition-colors"
                    aria-label={label}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-2xl transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`truncate max-w-full ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
