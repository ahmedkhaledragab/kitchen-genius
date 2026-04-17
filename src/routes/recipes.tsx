import { createFileRoute, redirect } from "@tanstack/react-router";

// Public recipe browsing is disabled. Regular users can only generate recipes
// from their ingredients on the home page; saved ones live in /profile.
// Admins manage the full catalog via /admin.
export const Route = createFileRoute("/recipes")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
});
