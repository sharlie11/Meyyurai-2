import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth-helper";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    // Gate onboarding: if profile not completed, force /onboarding
    if (!location.pathname.startsWith("/onboarding") && user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && profile.onboarded === false) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { user };
  },
  component: () => <Outlet />,
});
