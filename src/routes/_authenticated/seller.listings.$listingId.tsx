import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/seller/listings/$listingId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/seller/listings",
      search: { listingId: params.listingId },
    });
  },
});
