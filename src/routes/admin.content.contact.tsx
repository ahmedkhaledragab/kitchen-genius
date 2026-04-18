import { createFileRoute } from "@tanstack/react-router";
import { PageContentEditor } from "@/components/admin/PageContentEditor";

export const Route = createFileRoute("/admin/content/contact")({
  component: () => <PageContentEditor pageKey="contact" />,
});
