import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth-helper";
import { ProductAuthScreen } from "@/components/auth/ProductAuthScreen";

function AuthPending() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; mode?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode: typeof s.mode === "string" ? s.mode : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser();
    if (user) {
      throw redirect({ to: search.redirect || "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Authentication — Meyyurai" },
      {
        name: "description",
        content: "Sign in or register for Meyyurai legal safety, constitutional rights, and emergency guidance.",
      },
    ],
  }),
  component: AuthPage,
  pendingComponent: AuthPending,
});

function AuthPage() {
  const search = Route.useSearch();
  const initialMode = search.mode === "signup" || search.mode === "register" ? "register" : "login";
  return (
    <ProductAuthScreen
      initialMode={initialMode}
      redirectTarget={search.redirect || "/dashboard"}
    />
  );
}
