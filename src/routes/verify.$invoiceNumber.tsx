import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CheckCircle2, AlertTriangle, ShieldCheck, Calendar, User, ShoppingBag, CreditCard, ArrowLeft, Loader2 } from "lucide-react";
import { InvoiceRecord } from "@/lib/invoice/invoice-pdf";

export const Route = createFileRoute("/verify/$invoiceNumber")({
  head: () => ({ meta: [{ title: "Verify HUXZAIN Invoice" }] }),
  component: VerifyInvoicePage,
});

function VerifyInvoicePage() {
  const { invoiceNumber } = Route.useParams() as any;
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Database not connected");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from("invoices")
          .select("*")
          .eq("invoice_number", invoiceNumber)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        
        if (!data) {
          setError("Invoice not found. Please check the invoice number or URL.");
        } else if (data.status === "void") {
          setInvoice(data);
          setError("This invoice has been VOIDED by administrators.");
        } else {
          setInvoice(data);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to verify invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceNumber]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px] pointer-events-none -z-10" />

        <div className="w-full max-w-lg mx-auto">
          {loading ? (
            <div className="rounded-3xl border border-border bg-surface/30 p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
              <Loader2 className="size-8 animate-spin text-gold" />
              <p className="text-sm text-muted-foreground">Verifying invoice authenticity...</p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center flex flex-col items-center gap-5">
              <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <AlertTriangle className="size-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-display text-red-500">Verification Failed</h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{error}</p>
              </div>

              {invoice && invoice.status === "void" && (
                <div className="w-full rounded-2xl border border-border bg-surface/30 p-4 text-left space-y-2 mt-2">
                  <div className="flex justify-between border-b border-border/20 pb-2 text-xs">
                    <span className="font-semibold">Invoice No:</span>
                    <span className="font-mono">{invoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Voided Reason:</span>
                    <span className="font-semibold text-red-400">{invoice.voided_reason || "No reason specified"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Voided Date:</span>
                    <span className="font-semibold">
                      {invoice.voided_at ? new Date(invoice.voided_at).toLocaleDateString("en-IN") : ""}
                    </span>
                  </div>
                </div>
              )}

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Homepage
              </Link>
            </div>
          ) : (
            invoice && (
              <div className="rounded-3xl border border-emerald-500/20 bg-surface/30 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400 to-emerald-500/40" />

                {/* Badge Header */}
                <div className="flex flex-col items-center text-center gap-3 border-b border-border/40 pb-6">
                  <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="size-9 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">
                      <ShieldCheck size={11} /> Authentic Invoice
                    </span>
                    <h1 className="text-xl font-bold font-display tracking-tight text-foreground mt-2">
                      HUXZAIN Verification
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      This invoice record is registered and validated by the platform.
                    </p>
                  </div>
                </div>

                {/* Details Table */}
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between border-b border-border/20 pb-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><ShieldCheck size={14} /> Invoice Number</span>
                    <span className="font-mono font-bold text-foreground">{invoice.invoice_number}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/20 pb-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar size={14} /> Date Issued</span>
                    <span className="font-medium text-foreground">{new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/20 pb-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><User size={14} /> Seller Account</span>
                    <span className="font-semibold text-foreground">{invoice.seller_display_name}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/20 pb-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><ShoppingBag size={14} /> Product / Listing</span>
                    <span className="font-semibold text-foreground text-right max-w-[200px] truncate">{invoice.product_title}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/20 pb-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard size={14} /> Total Value</span>
                    <span className="font-display font-extrabold text-gold text-lg">
                      ₹{(invoice.gross_amount_cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {invoice.pdf_hash && (
                    <div className="flex flex-col gap-1 pt-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">PDF SHA-256 Hash</span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-surface/50 border border-border p-2 rounded-lg break-all select-all">
                        {invoice.pdf_hash}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  {invoice.invoice_pdf_url && (
                    <a
                      href={invoice.invoice_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 px-5 items-center justify-center rounded-xl bg-surface hover:bg-border/40 text-xs font-semibold border border-border text-foreground transition-all gap-1.5 w-full cursor-pointer"
                    >
                      Download Original PDF
                    </a>
                  )}
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
                  >
                    <ArrowLeft size={14} /> Back to Homepage
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
