import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { BadgeCheck, Upload, Shield, Mail, Phone, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/verification")({
  head: () => ({ meta: [{ title: "Verification — HUXZAIN Seller" }] }),
  component: Page,
});

const steps = [
  { k: "Email verified", icon: Mail, status: "done" },
  { k: "Phone verified", icon: Phone, status: "done" },
  { k: "Government ID (KYC)", icon: FileText, status: "pending" },
  { k: "Address proof", icon: Shield, status: "todo" },
];

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Verification & KYC</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verified sellers earn 3× more trust signals on listings.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface/40 p-6 flex items-center gap-5">
        <div className="size-16 rounded-2xl bg-gold/10 text-gold grid place-items-center">
          <BadgeCheck size={28} />
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            Verification level · <span className="text-gold">Silver</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Complete KYC and address proof to reach Gold and unlock higher withdrawal limits.
          </div>
          <div className="mt-3 h-2 rounded-full bg-background/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold/60"
              style={{ width: "50%" }}
            />
          </div>
        </div>
      </div>

      <PanelCard title="Verification checklist">
        <ul className="divide-y divide-border/50">
          {steps.map(({ k, icon: Icon, status }) => (
            <li key={k} className="py-4 flex items-center gap-4">
              <div
                className={`size-10 rounded-lg flex items-center justify-center ${status === "done" ? "bg-emerald-500/15 text-emerald-400" : status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground"}`}
              >
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{k}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {status === "done"
                    ? "Verified"
                    : status === "pending"
                      ? "Under review · 24-48h"
                      : "Not started"}
                </div>
              </div>
              {status !== "done" && (
                <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gold text-black font-semibold text-xs">
                  <Upload size={12} /> {status === "pending" ? "Replace" : "Upload"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </PanelCard>
    </div>
  );
}
