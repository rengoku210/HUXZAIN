import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { Download, Receipt, Inbox, RefreshCw, Search, FileText, Calendar, Filter, Sparkles, Loader2, ExternalLink, Copy, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { generateInvoicePDF, type InvoiceRecord } from "@/lib/invoice/invoice-pdf";

export const Route = createFileRoute("/_authenticated/seller/transactions")({
  head: () => ({ meta: [{ title: "Transactions & Invoices — HUXZAIN Seller" }] }),
  component: TransactionsPage,
});

type TabType = "ledger" | "invoices";

function TransactionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("ledger");

  // Ledger state
  const [txns, setTxns] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // 'all', 'month', 'year'
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const supabase = getSupabase();

  // Load Wallet transactions
  async function loadTransactions() {
    if (!user || !supabase) return;
    try {
      setLoadingLedger(true);
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTxns(data || []);
    } catch (e: any) {
      toast.error("Failed to load transactions: " + e.message);
    } finally {
      setLoadingLedger(false);
    }
  }

  // Load Invoices
  async function loadInvoices() {
    if (!user || !supabase) return;
    try {
      setLoadingInvoices(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("seller_id", user.id)
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (e: any) {
      toast.error("Failed to load invoices: " + e.message);
    } finally {
      setLoadingInvoices(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadInvoices();
    }
  }, [user]);

  const handleDownloadInvoice = async (orderId: string, invoiceId?: string) => {
    if (!supabase) return;
    setDownloadingId(orderId);
    try {
      // 1. RPC to create or get invoice
      const { data: inv, error: invErr } = await supabase.rpc("create_seller_invoice", {
        p_order_id: orderId,
      });

      if (invErr) throw invErr;
      if (!inv) throw new Error("Could not retrieve or create invoice");

      // 2. Load template details
      const { data: temp } = await supabase
        .from("invoice_templates")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();

      // 3. Generate PDF and upload for archival if not archived yet
      const blob = await generateInvoicePDF(inv as InvoiceRecord, temp || undefined, true);

      // 4. Download locally
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HUXZAIN-${inv.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Invoice ${inv.invoice_number} downloaded successfully!`);
      // Reload invoices to get updated PDF url
      loadInvoices();
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to download invoice: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyNumber = (invoiceNumber: string) => {
    navigator.clipboard.writeText(invoiceNumber).then(() => {
      toast.success(`Copied ${invoiceNumber} to clipboard`);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.buyer_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

    let matchesDate = true;
    if (dateFilter === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      matchesDate = new Date(inv.invoice_date) >= oneMonthAgo;
    } else if (dateFilter === "year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      matchesDate = new Date(inv.invoice_date) >= oneYearAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate stats
  const totalInvoicedGross = filteredInvoices.reduce((acc, curr) => acc + curr.gross_amount_cents, 0) / 100;
  const totalNetEarnings = filteredInvoices.reduce((acc, curr) => acc + curr.net_seller_cents, 0) / 100;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Finances & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your transaction ledger, audit sales revenues, and download auto-generated tax invoices.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={activeTab === "ledger" ? loadTransactions : loadInvoices}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border bg-surface text-xs font-semibold hover:bg-border/30"
          >
            <RefreshCw className={`size-3.5 ${loadingLedger || loadingInvoices ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "ledger"
              ? "border-gold text-gold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Transaction Ledger
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "invoices"
              ? "border-gold text-gold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tax Invoices
        </button>
      </div>

      {/* TAB 1: Ledger */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {loadingLedger ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-6 animate-spin text-gold" />
              <span>Loading ledger data...</span>
            </div>
          ) : (
            <PanelCard title="Wallet Ledger History" action={<Receipt size={14} className="text-gold" />}>
              {txns.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                    <Inbox size={20} />
                  </div>
                  <p className="font-medium">No ledger records yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Transactions appear automatically as sales, payouts, or subscription events occur.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left font-medium pb-2.5">Date</th>
                        <th className="text-left font-medium">Description</th>
                        <th className="text-left font-medium">Type</th>
                        <th className="text-center font-medium">Invoice</th>
                        <th className="text-right font-medium">Status</th>
                        <th className="text-right font-medium pr-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t) => {
                        const isSale = t.type === "sale";
                        return (
                          <tr
                            key={t.id}
                            className="border-b border-border/40 hover:bg-surface/20 transition-colors"
                          >
                            <td className="py-3.5 text-xs text-muted-foreground">
                              {new Date(t.created_at).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 font-medium text-foreground max-w-md truncate">
                              {t.description}
                            </td>
                            <td className="py-3.5">
                              <span className="text-xs uppercase px-2 py-0.5 rounded-full border bg-surface/40 border-border text-gold/80 text-[10px] font-bold">
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3.5 text-center">
                              {isSale && t.reference_id ? (
                                <button
                                  onClick={() => handleDownloadInvoice(t.reference_id)}
                                  disabled={downloadingId === t.reference_id}
                                  className="inline-flex h-7 px-2.5 rounded-lg border border-gold/20 hover:border-gold/50 bg-gold/5 text-[10px] font-bold text-gold items-center gap-1 cursor-pointer transition-colors"
                                >
                                  {downloadingId === t.reference_id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <FileText size={11} />
                                  )}
                                  PDF
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-3.5 text-right">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  t.status === "completed"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : t.status === "rejected"
                                      ? "bg-red-500/10 text-destructive border border-red-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td
                              className={`py-3.5 text-right font-mono font-bold ${
                                t.amount < 0 ? "text-destructive" : "text-emerald-400"
                              }`}
                            >
                              {t.amount < 0 ? "-" : "+" }
                              {formatCurrency(Math.abs(t.amount))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelCard>
          )}
        </div>
      )}

      {/* TAB 2: Invoices */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-surface/20 p-5">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Total Invoiced (Gross)
              </span>
              <p className="text-2xl font-display font-extrabold text-gold mt-1">
                {formatCurrency(totalInvoicedGross)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/20 p-5">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Total Net Settlement
              </span>
              <p className="text-2xl font-display font-extrabold text-emerald-400 mt-1">
                {formatCurrency(totalNetEarnings)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/20 p-5">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Total Invoices Issued
              </span>
              <p className="text-2xl font-display font-extrabold text-foreground mt-1">
                {filteredInvoices.length}
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="rounded-2xl border border-border bg-surface/25 p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-muted-foreground size-4" />
              <input
                type="text"
                placeholder="Search by invoice number, product name, buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 bg-background text-xs">
                <Calendar size={13} className="text-gold" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-muted-foreground text-xs"
                >
                  <option value="all">All Dates</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last 365 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 bg-background text-xs">
                <Filter size={13} className="text-gold" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-muted-foreground text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="issued">Issued</option>
                  <option value="viewed">Viewed</option>
                  <option value="void">Voided</option>
                </select>
              </div>
            </div>
          </div>

          {loadingInvoices ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-6 animate-spin text-gold" />
              <span>Loading invoice logs...</span>
            </div>
          ) : (
            <PanelCard title="Issued Invoices Ledger" action={<Sparkles size={14} className="text-gold" />}>
              {filteredInvoices.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                    <FileText size={20} />
                  </div>
                  <p className="font-medium">No invoices found</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Try adjusting your filters or query. Invoices generate automatically once an order enters escrow completed status.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left font-medium pb-2.5">Invoice #</th>
                        <th className="text-left font-medium">Issued Date</th>
                        <th className="text-left font-medium">Listing Product</th>
                        <th className="text-left font-medium">Billed Buyer</th>
                        <th className="text-right font-medium">Gross Amount</th>
                        <th className="text-right font-medium">Net Settlement</th>
                        <th className="text-center font-medium">Status</th>
                        <th className="text-right font-medium pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b border-border/40 hover:bg-surface/20 transition-colors"
                        >
                          <td className="py-3.5 font-mono font-bold text-foreground">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5 text-xs text-muted-foreground">
                            {new Date(inv.invoice_date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-3.5 font-medium text-foreground max-w-xs truncate">
                            {inv.product_title}
                          </td>
                          <td className="py-3.5 text-xs text-muted-foreground">
                            {inv.buyer_name || "Valued Customer"}
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-foreground">
                            {formatCurrency(inv.gross_amount_cents / 100)}
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                            {formatCurrency(inv.net_seller_cents / 100)}
                          </td>
                          <td className="py-3.5 text-center">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                inv.status === "issued"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : inv.status === "viewed"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-red-500/10 text-destructive border border-red-500/20"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-2">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => setOpenDropdownId(openDropdownId === inv.id ? null : inv.id)}
                                disabled={downloadingId === inv.order_id}
                                className="inline-flex h-8 px-3 rounded-lg border border-border hover:border-gold/40 text-xs font-semibold text-foreground items-center gap-1.5 cursor-pointer bg-surface/20 hover:bg-surface/40 transition-colors"
                              >
                                {downloadingId === inv.order_id ? (
                                  <Loader2 className="size-3 animate-spin text-gold" />
                                ) : (
                                  <Download size={13} />
                                )}
                                Actions
                                <ChevronDown size={11} className={`transition-transform ${openDropdownId === inv.id ? 'rotate-180' : ''}`} />
                              </button>

                              {openDropdownId === inv.id && (
                                <>
                                  {/* Backdrop */}
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenDropdownId(null)}
                                  />
                                  {/* Dropdown Menu */}
                                  <div className="absolute right-0 mt-1 w-56 rounded-xl border border-border bg-surface shadow-xl z-20 py-1 overflow-hidden">
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleDownloadInvoice(inv.order_id || "", inv.id);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-border/30 transition-colors cursor-pointer text-left"
                                    >
                                      <Download size={13} className="text-gold" />
                                      Download PDF Invoice
                                    </button>

                                    <a
                                      href={`/verify/${inv.invoice_number}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => setOpenDropdownId(null)}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-border/30 transition-colors cursor-pointer text-left"
                                    >
                                      <ExternalLink size={13} className="text-blue-400" />
                                      Open Verification Page
                                    </a>

                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleCopyNumber(inv.invoice_number);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-border/30 transition-colors cursor-pointer text-left"
                                    >
                                      <Copy size={13} className="text-muted-foreground" />
                                      Copy Invoice Number
                                    </button>

                                    {inv.invoice_pdf_url && (
                                      <a
                                        href={inv.invoice_pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setOpenDropdownId(null)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-border/30 transition-colors cursor-pointer text-left border-t border-border/40"
                                      >
                                        <FileText size={13} className="text-emerald-400" />
                                        View Archived PDF
                                      </a>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelCard>
          )}
        </div>
      )}
    </div>
  );
}
