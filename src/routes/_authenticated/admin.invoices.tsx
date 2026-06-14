// src/routes/_authenticated/admin.invoices.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState } from "@/components/seller/SellerShell";
import { 
  FileText, 
  Plus, 
  Download, 
  Search, 
  Eye, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  User, 
  Building, 
  DollarSign, 
  Save,
  CheckCircle,
  FileCheck,
  Loader2,
  XCircle,
  ShieldCheck,
  History
} from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF, type InvoiceRecord } from "@/lib/invoice/invoice-pdf";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({ meta: [{ title: "Invoice Center — HUXZAIN Admin" }] }),
  component: InvoicesPage,
});

interface InvoiceField {
  label: string;
  value: string;
}

function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [amountINR, setAmountINR] = useState(0);
  const [platformFeeINR, setPlatformFeeINR] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("Thank you for choosing HUXZAIN. Your secure digital marketplace.");

  // Custom fields
  const [customFields, setCustomFields] = useState<InvoiceField[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  // Void and Credit Note states
  const [voidingInvoice, setVoidingInvoice] = useState<InvoiceRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const [creditingInvoice, setCreditingInvoice] = useState<InvoiceRecord | null>(null);
  const [creditAmountINR, setCreditAmountINR] = useState(0);
  const [creditReason, setCreditReason] = useState("");
  const [crediting, setCrediting] = useState(false);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeAuditInvoiceId, setActiveAuditInvoiceId] = useState<string | null>(null);

  const supabase = getSupabase();

  const loadInvoices = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("generated_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load invoices: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, role");
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      console.warn("Failed to load profiles for filters:", e);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadProfiles();
  }, []);

  const loadAuditLogs = async (invoiceId: string) => {
    if (!supabase) return;
    setLoadingAudit(true);
    setActiveAuditInvoiceId(invoiceId);
    try {
      const { data, error } = await supabase
        .from("invoice_audit_logs")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (e: any) {
      toast.error("Failed to load audit logs: " + e.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Compute calculated amounts for manual invoice form
  const subtotalCents = Math.round(amountINR * quantity * 100);
  const calculatedPlatformFeeCents = Math.round(platformFeeINR * 100);

  const saveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail.trim()) { toast.error("Customer email is required."); return; }
    if (!productName.trim()) { toast.error("Product name is required."); return; }
    if (amountINR <= 0) { toast.error("Amount must be greater than zero."); return; }

    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      
      const { error } = await supabase.rpc("create_admin_manual_invoice", {
        p_invoice_number: invoiceNumber.trim() || null,
        p_gross_amount_cents: subtotalCents,
        p_platform_fee_cents: calculatedPlatformFeeCents,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_product_title: productName,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
        p_notes: notes,
        p_custom_fields: customFields,
      });

      if (error) throw error;

      toast.success("Manual invoice generated and saved server-side!");
      setShowCreateForm(false);
      resetForm();
      await loadInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error(`Creation failed: ${err.message}`);
    }
  };

  const handleVoidInvoice = async () => {
    if (!supabase || !voidingInvoice) return;
    if (!voidReason.trim()) {
      toast.error("Please enter a reason for voiding.");
      return;
    }
    setVoiding(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "void",
          voided_at: new Date().toISOString(),
          voided_reason: voidReason,
          voided_by: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .eq("id", voidingInvoice.id);

      if (error) throw error;

      // Log to audit log
      await supabase.from("invoice_audit_logs").insert({
        invoice_id: voidingInvoice.id,
        action: "voided",
        actor_id: (await supabase.auth.getUser()).data.user?.id || null,
        metadata: { reason: voidReason }
      });

      toast.success(`Invoice ${voidingInvoice.invoice_number} voided successfully.`);
      setVoidingInvoice(null);
      setVoidReason("");
      await loadInvoices();
    } catch (e: any) {
      toast.error("Void failed: " + e.message);
    } finally {
      setVoiding(false);
    }
  };

  const handleIssueCreditNote = async () => {
    if (!supabase || !creditingInvoice) return;
    if (creditAmountINR <= 0) {
      toast.error("Please enter a valid credit note amount.");
      return;
    }
    if (!creditReason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    setCrediting(true);
    try {
      const creditAmountCents = Math.round(creditAmountINR * 100);
      const year = new Date().getFullYear();
      const cnNumber = `CN-${year}-${Math.random().toString().substring(2, 8)}`;
      
      const { error } = await supabase
        .from("credit_notes")
        .insert({
          credit_number: cnNumber,
          invoice_id: creditingInvoice.id,
          order_id: creditingInvoice.order_id || null,
          amount_cents: creditAmountCents,
          reason: creditReason,
          issued_by: (await supabase.auth.getUser()).data.user?.id || null,
        });

      if (error) throw error;

      // Log to audit log
      await supabase.from("invoice_audit_logs").insert({
        invoice_id: creditingInvoice.id,
        action: "credit_note_issued",
        actor_id: (await supabase.auth.getUser()).data.user?.id || null,
        metadata: { credit_number: cnNumber, amount: creditAmountCents, reason: creditReason }
      });

      toast.success(`Credit note ${cnNumber} issued successfully.`);
      setCreditingInvoice(null);
      setCreditAmountINR(0);
      setCreditReason("");
      await loadInvoices();
    } catch (e: any) {
      toast.error("Credit note failed: " + e.message);
    } finally {
      setCrediting(false);
    }
  };

  const handleDownloadInvoice = async (invoice: InvoiceRecord) => {
    if (!supabase) return;
    try {
      const { data: temp } = await supabase
        .from("invoice_templates")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();

      const blob = await generateInvoicePDF(invoice, temp || undefined, true);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HUXZAIN-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Invoice PDF downloaded successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate PDF: " + e.message);
    }
  };

  const resetForm = () => {
    setInvoiceNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setProductName("");
    setProductDesc("");
    setQuantity(1);
    setAmountINR(0);
    setPlatformFeeINR(0);
    setPaymentReference("");
    setCustomFields([]);
  };

  const addCustomField = () => {
    if (!newFieldName.trim() || !newFieldValue.trim()) return;
    setCustomFields([...customFields, { label: newFieldName.trim(), value: newFieldValue.trim() }]);
    setNewFieldName("");
    setNewFieldValue("");
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesSeller = sellerFilter === "all" || inv.seller_id === sellerFilter;
    const matchesBuyer = buyerFilter === "all" || inv.buyer_id === buyerFilter;

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

    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyer_email.toLowerCase().includes(search.toLowerCase()) ||
      inv.product_title.toLowerCase().includes(search.toLowerCase()) ||
      (inv.manual_customer_name || "").toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSeller && matchesBuyer && matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Invoice Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin portal to search, audit, void, issue credit notes, and print tax receipts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadInvoices}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border bg-surface text-xs font-semibold hover:bg-border/30"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="h-10 px-4 rounded-xl bg-gold text-black font-semibold hover:brightness-110 text-xs inline-flex items-center gap-1.5 cursor-pointer border-none"
          >
            <Plus size={14} /> Create Manual Invoice
          </button>
        </div>
      </div>

      {/* Manual invoice form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-border bg-surface/20 p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-sm font-bold flex items-center gap-1.5"><FileText size={16} /> Create Manual Invoice</h2>
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground text-xs bg-transparent border-none cursor-pointer">✕ Cancel</button>
          </div>

          <form onSubmit={saveInvoice} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Invoice Number (Optional - Auto generated if empty)</label>
              <input
                type="text"
                placeholder="e.g. HX-INV-2026-000001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Customer Email *</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Product Title *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Unit Price (INR) *</label>
              <input
                type="number"
                value={amountINR || ""}
                onChange={(e) => setAmountINR(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Platform Fee (INR)</label>
              <input
                type="number"
                value={platformFeeINR || ""}
                onChange={(e) => setPlatformFeeINR(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-2 rounded-xl bg-background border border-border text-xs outline-none"
              >
                <option value="UPI">UPI / GPay</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Credit Card</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Payment Reference / UTR</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
              />
            </div>

            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <label className="text-xs text-muted-foreground">Invoice Notes / Footer Terms</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none resize-none"
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); resetForm(); }}
                className="h-10 px-4 rounded-xl border border-border bg-surface text-foreground text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-gold text-black text-xs font-bold cursor-pointer border-none"
              >
                Generate Invoice Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-2xl border border-border bg-surface/20 p-4">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3.5 top-3 text-muted-foreground size-4" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, email, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 bg-background text-xs">
          <Calendar size={13} className="text-gold" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-muted-foreground text-xs w-full py-2.5"
          >
            <option value="all">All Dates</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last 365 Days</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 bg-background text-xs">
          <User size={13} className="text-gold" />
          <select
            value={buyerFilter}
            onChange={(e) => setBuyerFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-muted-foreground text-xs w-full py-2.5"
          >
            <option value="all">All Buyers</option>
            {profiles.filter(p => p.role === "buyer").map(p => (
              <option key={p.id} value={p.id}>{p.display_name || p.email}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 bg-background text-xs">
          <Building size={13} className="text-gold" />
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-muted-foreground text-xs w-full py-2.5"
          >
            <option value="all">All Sellers</option>
            {profiles.filter(p => p.role === "admin" || p.role === "seller").map(p => (
              <option key={p.id} value={p.id}>{p.display_name || p.email}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="size-8 text-gold animate-spin" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          desc="Ensure filters are reset or generate your first manual invoice."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/60 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  <th className="px-5 py-4">Invoice #</th>
                  <th className="px-5 py-4">Billed Customer</th>
                  <th className="px-5 py-4">Item Package</th>
                  <th className="px-5 py-4">Gross Total</th>
                  <th className="px-5 py-4">Net Seller</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInvoices.map((inv) => {
                  const customerNameText = inv.source === "admin_manual" ? inv.manual_customer_name : inv.buyer_name;
                  const customerEmailText = inv.source === "admin_manual" ? inv.manual_customer_email : inv.buyer_email;
                  
                  return (
                    <tr key={inv.id} className="hover:bg-surface/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-gold">{inv.invoice_number}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">{customerNameText || "Valued Buyer"}</div>
                        <div className="text-[10px] text-muted-foreground">{customerEmailText}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[150px]">{inv.product_title}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                        ₹{(inv.gross_amount_cents / 100).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">
                        ₹{(inv.net_seller_cents / 100).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5 uppercase text-[9px] font-bold text-muted-foreground">
                        {inv.source === "admin_manual" ? "Manual" : "Auto"}
                      </td>
                      <td className="px-5 py-3.5 text-right pr-6 space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="inline-flex items-center justify-center size-8 rounded-lg bg-surface/60 hover:bg-surface border border-border text-foreground transition-colors cursor-pointer"
                          title="Quick Preview"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="inline-flex items-center justify-center size-8 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/20 text-gold transition-colors cursor-pointer"
                          title="Print / PDF"
                        >
                          <Download className="size-3.5" />
                        </button>
                        <button
                          onClick={() => loadAuditLogs(inv.id)}
                          className="inline-flex items-center justify-center size-8 rounded-lg bg-surface/60 hover:bg-surface border border-border text-foreground transition-colors cursor-pointer"
                          title="View Audit Trail"
                        >
                          <History className="size-3.5" />
                        </button>
                        {inv.status !== "void" && (
                          <>
                            <button
                              onClick={() => setVoidingInvoice(inv)}
                              className="inline-flex items-center justify-center size-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-colors cursor-pointer"
                              title="Void Invoice"
                            >
                              <XCircle className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setCreditingInvoice(inv)}
                              className="inline-flex items-center justify-center size-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 transition-colors cursor-pointer"
                              title="Issue Credit Note"
                            >
                              <FileCheck className="size-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Viewing Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setViewingInvoice(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xs bg-transparent border-none cursor-pointer"
            >
              ✕ Close
            </button>
            <h2 className="text-sm font-bold flex items-center gap-1.5"><Eye size={16} /> Invoice Details</h2>

            <div className="space-y-2 text-xs border border-border rounded-xl p-4 bg-surface/20">
              <div className="flex justify-between border-b border-border/20 pb-2">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-bold text-gold">{viewingInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-2">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold uppercase">{viewingInvoice.status}</span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-2">
                <span className="text-muted-foreground">Gross Amount:</span>
                <span className="font-bold text-foreground">₹{(viewingInvoice.gross_amount_cents / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-2">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span className="text-foreground">-₹{(viewingInvoice.platform_fee_cents / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-2">
                <span className="text-muted-foreground">Net Seller:</span>
                <span className="font-bold text-emerald-400">₹{(viewingInvoice.net_seller_cents / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-2">
                <span className="text-muted-foreground">Customer:</span>
                <span>{viewingInvoice.source === "admin_manual" ? viewingInvoice.manual_customer_name : viewingInvoice.buyer_name} ({viewingInvoice.buyer_email || viewingInvoice.manual_customer_email})</span>
              </div>
              {viewingInvoice.buyer_gstin && (
                <div className="flex justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground">Buyer GSTIN:</span>
                  <span className="font-bold">{viewingInvoice.buyer_gstin}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-semibold text-right truncate max-w-[200px]">{viewingInvoice.product_title}</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleDownloadInvoice(viewingInvoice)}
                className="h-10 px-4 rounded-xl bg-gold text-black text-xs font-bold inline-flex items-center gap-1.5 border-none cursor-pointer"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Invoice Modal */}
      {voidingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-red-500 flex items-center gap-1.5"><XCircle size={16} /> Void Invoice</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Are you sure you want to void invoice <strong className="text-foreground">{voidingInvoice.invoice_number}</strong>? This action is permanent and blocks public verification access.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Void Reason *</label>
              <input
                type="text"
                placeholder="Enter void reason..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setVoidingInvoice(null); setVoidReason(""); }}
                className="h-9 px-4 rounded-xl border border-border bg-surface text-xs text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidInvoice}
                disabled={voiding || !voidReason.trim()}
                className="h-9 px-4 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer border-none disabled:opacity-50"
              >
                {voiding ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {creditingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-blue-400 flex items-center gap-1.5"><FileCheck size={16} /> Issue Credit Note</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Issuing a credit note offsets value against invoice <strong className="text-gold">{creditingInvoice.invoice_number}</strong> (Max: ₹{(creditingInvoice.gross_amount_cents / 100).toLocaleString()}).
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Credit Amount (INR) *</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={creditAmountINR || ""}
                  onChange={(e) => setCreditAmountINR(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Credit Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Buyer refund / Order cancelled"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setCreditingInvoice(null); setCreditReason(""); setCreditAmountINR(0); }}
                className="h-9 px-4 rounded-xl border border-border bg-surface text-xs text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueCreditNote}
                disabled={crediting || creditAmountINR <= 0 || !creditReason.trim()}
                className="h-9 px-4 rounded-xl bg-blue-500 text-white text-xs font-bold cursor-pointer border-none disabled:opacity-50"
              >
                {crediting ? "Issuing..." : "Confirm Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {activeAuditInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveAuditInvoiceId(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xs bg-transparent border-none cursor-pointer"
            >
              ✕ Close
            </button>
            <h2 className="text-sm font-bold flex items-center gap-1.5"><History size={16} /> Invoice Audit Log</h2>

            {loadingAudit ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="size-6 text-gold animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No audit trail records found for this invoice.</p>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border border-border/40 rounded-xl p-3 bg-surface/10 space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-foreground">
                      <span className="uppercase text-[9px] tracking-wide text-gold">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{new Date(log.occurred_at).toLocaleString("en-IN")}</span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="text-[10px] text-muted-foreground bg-surface/50 border border-border/30 p-1.5 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveAuditInvoiceId(null)}
                className="h-9 px-4 rounded-xl border border-border bg-surface text-xs text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
