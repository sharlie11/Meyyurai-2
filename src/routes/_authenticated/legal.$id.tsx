import { createFileRoute } from "@tanstack/react-router";
import { CategoryDetailContent } from "./rights.$category";

export const Route = createFileRoute("/_authenticated/legal/$id")({
  component: LegalDetailScreen,
});

function LegalDetailScreen() {
  const { id } = Route.useParams();
  return <CategoryDetailContent categorySlug={id} />;
}
