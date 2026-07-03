import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/seller/disputes/$disputeId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/seller/disputes",
      search: { disputeId: params.disputeId },
    });
  },
});
