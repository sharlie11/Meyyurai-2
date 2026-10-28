import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth-helper";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Gate onboarding: if profile not completed, force /onboarding
    if (!location.pathname.startsWith("/onboarding") && user.id && isValidUuid(user.id)) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", user.id)
          .maybeSingle();
        if (profile && profile.onboarded === false) {
          throw redirect({ to: "/onboarding" });
        }
      } catch (e) {
        if ((e as any)?.to) throw e;
      }
    }
    return { user };
  },
  component: () => <Outlet />,
});
