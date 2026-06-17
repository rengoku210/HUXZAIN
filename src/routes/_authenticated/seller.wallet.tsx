import { createFileRoute, redirect } from "@tanstack/react-router";

// G2 / ESC-10: The generic pooled "wallet" (Available balance + Withdraw button)
// is deprecated. Part 35 mandates per-order settlement only — sellers withdraw
// individual cleared orders via /seller/withdrawals, and view read-only
// aggregates on /seller/earnings. This route now redirects so any bookmarked
// links land on the correct surface instead of the removed wallet UI.
export const Route = createFileRoute("/_authenticated/seller/wallet")({
  beforeLoad: () => {
    throw redirect({ to: "/seller/earnings" });
  },
});
