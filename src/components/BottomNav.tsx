import { Link, useRouterState } from "@tanstack/react-router";
import { Siren, Sparkles, Scale, LibraryBig, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/", label: t("nav.emergency"), icon: Siren },
    { to: "/ai", label: t("nav.ai"), icon: Sparkles },
    { to: "/rights", label: t("nav.rights"), icon: Scale },
    { to: "/resources", label: t("nav.resources"), icon: LibraryBig },
    { to: "/profile", label: t("nav.profile"), icon: User },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md safe-bottom"
    >
      <div className="mx-3 mb-3 rounded-3xl border border-border bg-card/95 shadow-lifted backdrop-blur">
        <ul className="grid grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-3xl px-1 py-2 text-[10px] font-medium transition-colors"
                  aria-label={label}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" size={18} />
                  </span>
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
