import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/browse")({
  beforeLoad: () => {
    throw redirect({ to: "/search" });
  },
});
