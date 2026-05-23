import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/_authenticated/seller")({
  head: () => ({ meta: [{ title: "Seller Panel — HUXZAIN" }] }),
  component: () => (
    <SellerShell>
      <Outlet />
    </SellerShell>
  ),
});
