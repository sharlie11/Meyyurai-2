import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth-helper";
import { ProductAuthScreen } from "@/components/auth/ProductAuthScreen";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser();
    if (user) {
      throw redirect({ to: search.redirect || "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign In — Meyyurai Legal & Safety Platform" },
      {
        name: "description",
        content: "Sign in to your Meyyurai account to access AI legal guidance, FIR drafting, and evidence vault.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  return <ProductAuthScreen initialMode="login" redirectTarget={search.redirect || "/dashboard"} />;
}
