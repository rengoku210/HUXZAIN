import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/seller/orders/$orderId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/messages",
      search: { orderId: params.orderId },
    });
  },
});
