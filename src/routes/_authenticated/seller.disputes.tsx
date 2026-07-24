import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { Inbox, AlertCircle, Calendar, MessageSquare, Loader2, RefreshCw, Paperclip, Send, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchUserDisputes, respondToDispute } from "@/lib/marketplace/disputeService";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { SignedImage } from "@/components/SignedImage";

export const Route = createFileRoute("/_authenticated/seller/disputes")({
  validateSearch: (s: Record<string, unknown>): { disputeId?: string } => ({
    disputeId: s.disputeId ? String(s.disputeId) : undefined,
  }),
  head: () => ({ meta: [{ title: "Disputes — HUXZAIN Seller" }] }),
  component: Page,
});

function EvidenceLink({ path }: { path: string }) {
  const [resolved, setResolved] = useState("");
  return (
    <a
      href={resolved || undefined}
      target="_blank"
      rel="noreferrer"
      className="group relative h-20 rounded-lg border border-border overflow-hidden bg-background flex items-center justify-center cursor-pointer hover:border-gold/50"
    >
      <SignedImage
        path={path}
        bucket="dispute-evidence"
        onResolved={setResolved}
        className="w-full h-full object-cover group-hover:scale-105 transition-all"
        alt="Dispute evidence"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-all">
        <ExternalLink size={10} className="mr-1" /> View Full
      </div>
    </a>
  );
}

function Page() {
  const { user } = useAuth();
  const { disputeId } = Route.useSearch() as any;
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (disputeId && disputes.length > 0) {
      const matched = disputes.find((x: any) => x.id === disputeId);
      if (matched) setSelectedCase(matched);
    }
  }, [disputeId, disputes]);

  // Response Form States
  const [responseNotes, setResponseNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function loadDisputes() {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await fetchUserDisputes(user.id);
      
      // Filter disputes where current user is the seller
      const sellerCases = (data || []).filter((d: any) => d.order?.seller_id === user.id);
      
      // Fetch associated listing details and buyer usernames for each dispute
      const supabase = getSupabase();
      if (supabase && sellerCases.length > 0) {
        const orderIds = sellerCases.map((c: any) => c.order_id);
        const buyerIds = sellerCases.map((c: any) => c.order?.buyer_id).filter(Boolean);

        const [ordersRes, buyersRes] = await Promise.all([
          supabase.from("orders").select("id, listing_title, amount_inr").in("id", orderIds),
          supabase.from("profiles").select("id, display_name, username").in("id", buyerIds)
        ]);

        const ordersMap = new Map((ordersRes.data || []).map((o: any) => [o.id, o]));
        const buyersMap = new Map((buyersRes.data || []).map((b: any) => [b.id, b]));

        const enriched = sellerCases.map((c: any) => {
          const associatedOrder = ordersMap.get(c.order_id);
          const associatedBuyer = buyersMap.get(c.order?.buyer_id);
          return {
            ...c,
            listing_title: associatedOrder?.listing_title || "Marketplace Item",
            amount: associatedOrder?.amount_inr || associatedOrder?.amount_total || 0,
            buyer: associatedBuyer || { display_name: "Buyer", username: "buyer" }
          };
        });
        
        setDisputes(enriched);
        
        // Refresh selected case details if one is active
        if (selectedCase) {
          const updatedSelected = enriched.find((x: any) => x.id === selectedCase.id);
          if (updatedSelected) setSelectedCase(updatedSelected);
        }
      } else {
        setDisputes([]);
      }
    } catch (e: any) {
      console.error("Failed to load disputes:", e);
      toast.error("Failed to load disputes ledger: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDisputes();
  }, [user?.id]);

  async function handleResponseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase) return;
    if (!responseNotes.trim()) {
      toast.error("Please enter your response explanation notes.");
      return;
    }

    try {
      setSubmitting(true);
      await respondToDispute({
        disputeId: selectedCase.id,
        responseNotes: responseNotes.trim(),
        evidenceFiles: evidenceFiles.length > 0 ? evidenceFiles : undefined
      });

      toast.success("Response submitted successfully! Dispute status updated to Investigating.");
      setResponseNotes("");
      setEvidenceFiles([]);
      
      // Reload disputes
      await loadDisputes();
    } catch (err: any) {
      toast.error("Failed to submit response: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Disputes Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resolve buyer claims quickly, review evidence payloads, and present counter-claims.
          </p>
        </div>
        <button
          onClick={loadDisputes}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-10 min-h-[44px] px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 text-gold animate-spin" />
          <span className="text-xs text-muted-foreground">Hydrating active disputes...</span>
        </div>
      ) : disputes.length === 0 ? (
        <PanelCard title="Active Disputes Cases">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={40} className="text-muted-foreground mb-4 opacity-75" />
            <h2 className="text-base font-semibold">Clean Transaction Record</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              You have no active disputes. Keep up the consistent deliveries to protect your seller rating!
            </p>
          </div>
        </PanelCard>
      ) : (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* List panel */}
          <div className="order-2 lg:order-1 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Active Cases ({disputes.length})
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {disputes.map((d) => {
                const active = selectedCase?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedCase(d);
                      setResponseNotes("");
                      setEvidenceFiles([]);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2.5 cursor-pointer ${
                      active
                        ? "border-gold bg-gold/5 shadow-[0_0_12px_rgba(212,175,55,0.1)]"
                        : "border-border/60 bg-surface/20 hover:border-gold/30 hover:bg-surface/30"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full">
                      <div className="font-bold text-xs truncate text-foreground flex-1">
                        {d.listing_title}
                      </div>
                      <StatusPill status={d.status === "open" ? "Open" : d.status === "investigating" ? "Review" : "Completed"} />
                    </div>

                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3" />
                      Opened: {new Date(d.created_at).toLocaleDateString()}
                    </div>

                    <div className="flex items-center justify-between w-full border-t border-border/20 pt-2 text-[10px]">
                      <span className="text-muted-foreground">Buyer: {d.buyer?.display_name || d.buyer?.username}</span>
                      <span className="font-bold text-foreground">₹{d.amount.toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details & Counter-claim Responder panel */}
          <div className="order-1 lg:order-2">
            {selectedCase ? (
              <div className="space-y-6">
                <PanelCard title="Case Review">
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div className="flex justify-between items-start border-b border-border/40 pb-4 gap-3 flex-wrap">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Associated Order</div>
                        <div className="font-bold text-base text-foreground mt-0.5">{selectedCase.listing_title}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">ID: {selectedCase.order_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Value</div>
                        <div className="text-lg font-extrabold text-gold mt-0.5">₹{selectedCase.amount.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 border-b border-border/40 pb-4">
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Claim Initiated By:</div>
                        <div className="text-xs font-bold text-foreground mt-0.5">
                          {selectedCase.buyer?.display_name || selectedCase.buyer?.username}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium font-mono">Case ID:</div>
                        <div className="text-xs font-mono font-bold text-foreground mt-0.5">{selectedCase.id}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <AlertCircle className="size-3.5 text-rose-400" /> Buyer's Reason for Dispute:
                      </div>
                      <div className="mt-1.5 p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 text-xs text-muted-foreground">
                        {selectedCase.reason}
                      </div>
                    </div>

                    {selectedCase.resolution && (
                      <div>
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <MessageSquare className="size-3.5 text-gold" /> Your Counter-Claim Response:
                        </div>
                        <div className="mt-1.5 p-4 rounded-xl border border-gold/25 bg-gold/5 text-xs text-muted-foreground">
                          {selectedCase.resolution}
                        </div>
                      </div>
                    )}

                    {selectedCase.evidence_urls && selectedCase.evidence_urls.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Case Evidence Payload:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {selectedCase.evidence_urls.map((url: string, index: number) => (
                            <EvidenceLink key={index} path={url} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </PanelCard>

                {/* Counter-claim Submit Panel */}
                {selectedCase.status !== "resolved_buyer" && selectedCase.status !== "resolved_seller" && selectedCase.status !== "closed" ? (
                  <PanelCard title="Submit Response & Counter-Evidence">
                    <form onSubmit={handleResponseSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Your Counter-Claim Explanation</label>
                        <textarea
                          placeholder="Provide detailed evidence, screenshots of service delivery, logs showing credential dispatch, or explain your side of the dispute..."
                          value={responseNotes}
                          onChange={(e) => setResponseNotes(e.target.value)}
                          className="mt-1.5 w-full min-h-[120px] p-3 rounded-lg bg-background border border-border text-xs focus:border-gold/50 outline-none leading-relaxed"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block mb-1">Counter-Evidence Screenshots</label>
                        <label className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border hover:bg-surface text-xs font-semibold cursor-pointer active:scale-95 transition-all">
                          <Paperclip size={12} /> Select counter-evidence screenshots
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) {
                                setEvidenceFiles(Array.from(e.target.files));
                                toast.success(`Selected ${e.target.files.length} evidence file(s).`);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {evidenceFiles.length > 0 && (
                          <div className="text-[10px] text-emerald-400 font-medium mt-2 flex items-center gap-1">
                            <ImageIcon size={12} /> Queued: {evidenceFiles.map(f => f.name).join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={submitting || !responseNotes.trim()}
                          className="h-10 px-6 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Submitting response...
                            </>
                          ) : (
                            <>
                              <Send className="size-3.5" /> Submit Response Arguments
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </PanelCard>
                ) : (
                  <PanelCard title="Case Settled">
                    <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-xs text-muted-foreground flex gap-2 items-start leading-relaxed">
                      <AlertCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Settled Case File</div>
                        <p className="mt-1">
                          This dispute has been fully investigated and resolved. The case files are archived. Status: **{selectedCase.status.toUpperCase()}**.
                        </p>
                      </div>
                    </div>
                  </PanelCard>
                )}
              </div>
            ) : (
              <PanelCard>
                <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <AlertCircle size={32} className="text-gold mb-3 opacity-60" />
                  <span className="text-sm font-semibold">No Case Selected</span>
                  <span className="text-xs mt-1">Select an active dispute case file from the sidebar list to inspect details.</span>
                </div>
              </PanelCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
