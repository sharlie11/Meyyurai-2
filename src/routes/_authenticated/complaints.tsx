import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/complaints")({
  component: ComplaintsLayout,
});

function ComplaintsLayout() {
  return <Outlet />;
}
