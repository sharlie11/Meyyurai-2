import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth-helper";
import { ProductAuthScreen } from "@/components/auth/ProductAuthScreen";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>): { email?: string; redirect?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
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
      { title: "Create Account — Meyyurai Legal & Safety Platform" },
      {
        name: "description",
        content: "Register for Meyyurai to unlock AI legal assistant, emergency response, and tamper-proof evidence vault.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const search = Route.useSearch();
  return (
    <ProductAuthScreen
      initialMode="register"
      redirectTarget={search.redirect || "/dashboard"}
      initialEmail={search.email || ""}
    />
  );
}
