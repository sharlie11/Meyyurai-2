import { createFileRoute } from "@tanstack/react-router";
import { RightsScreen } from "./rights";

export const Route = createFileRoute("/_authenticated/legal")({
  head: () => ({
    meta: [{ title: "Legal Knowledge Base — Meyyurai" }],
  }),
  component: RightsScreen,
});
