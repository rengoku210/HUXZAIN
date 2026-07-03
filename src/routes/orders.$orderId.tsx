import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/orders/$orderId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/messages",
      search: { orderId: params.orderId },
    });
  },
});
