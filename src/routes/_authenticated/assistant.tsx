import { createFileRoute } from "@tanstack/react-router";
import { AiScreen } from "./ai";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Legal Assistant — Meyyurai" },
      {
        name: "description",
        content: "Ask your legal question in plain language and receive clear legal rights, acts, and next steps.",
      },
    ],
  }),
  component: AiScreen,
});
