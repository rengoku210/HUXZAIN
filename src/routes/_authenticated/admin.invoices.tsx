// src/routes/_authenticated/admin.invoices.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState, StatusPill } from "@/components/seller/SellerShell";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
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
  FileCheck
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({ meta: [{ title: "Invoice Center — HUXZAIN Admin" }] }),
  component: InvoicesPage,
});

interface InvoiceField {
  label: string;
  value: string;
}

interface InvoiceProductLine {
  name: string;
  description: string;
  quantity: number;
  priceCents: number;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address: string;
  seller_name: string;
  seller_details: string;
  product_name: string;
  description: string;
  quantity: number;
  amount_cents: number;
  platform_fee_cents: number;
  discount_cents: number;
  tax_cents: number;
  final_total_cents: number;
  payment_method: string;
  payment_reference: string;
  notes: string;
  invoice_date: string;
  status: string;
  logo_url: string;
  gst_details: string;
  custom_fields: any;
  created_at: string;
}

function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dbAvailable, setDbAvailable] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  
  const [sellerName, setSellerName] = useState("HUXZAIN DIGITAL OUTLET");
  const [sellerDetails, setSellerDetails] = useState("Bangalore, Karnataka, India");
  const [gstDetails, setGstDetails] = useState("29AAAAA0000A1Z5");
  const [logoUrl, setLogoUrl] = useState("https://huxzain.shop/wp-content/uploads/2026/05/huxzain_gold_logo.png");
  
  // Single product line for basic implementation (can be extended to multiple)
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [amountINR, setAmountINR] = useState(0);
  
  const [platformFeeINR, setPlatformFeeINR] = useState(0);
  const [discountINR, setDiscountINR] = useState(0);
  const [taxRatePercent, setTaxRatePercent] = useState(18); // 18% GST default
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("Thank you for choosing HUXZAIN. Your secure digital marketplace.");
  const [invoiceStatus, setInvoiceStatus] = useState("pending");

  // Custom fields
  const [customFields, setCustomFields] = useState<InvoiceField[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const supabase = getSupabase();

  const loadInvoices = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST116" || error.message.includes("does not exist")) {
          setDbAvailable(false);
          console.warn("Invoices table not created in database. Falling back to local storage mock.");
          // Try loading from localStorage
          const local = localStorage.getItem("huxzain_mock_invoices");
          if (local) {
            setInvoices(JSON.parse(local));
          } else {
            setInvoices([]);
          }
        } else {
          throw error;
        }
      } else {
        setDbAvailable(true);
        setInvoices(data || []);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load invoices: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Compute subtotal, fees, taxes and totals
  const subtotalCents = Math.round(amountINR * quantity * 100);
  const discountCents = Math.round(discountINR * 100);
  
  // Auto platform fee calculation if left at 0 (default 4% escrow take-rate)
  const calculatedPlatformFeeCents = platformFeeINR > 0 
    ? Math.round(platformFeeINR * 100)
    : Math.round(subtotalCents * 0.04);

  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round(taxableCents * (taxRatePercent / 100));
  const finalTotalCents = taxableCents + taxCents + calculatedPlatformFeeCents;

  const autoGenerateInvoiceNumber = () => {
    const sequence = String(invoices.length + 1).padStart(4, "0");
    setInvoiceNumber(`HXZ-INV-${sequence}`);
  };

  useEffect(() => {
    if (showCreateForm && !invoiceNumber) {
      autoGenerateInvoiceNumber();
    }
  }, [showCreateForm, invoices.length]);

  const addCustomField = () => {
    if (!newFieldName.trim() || !newFieldValue.trim()) return;
    setCustomFields([...customFields, { label: newFieldName.trim(), value: newFieldValue.trim() }]);
    setNewFieldName("");
    setNewFieldValue("");
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const saveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) { toast.error("Invoice number is required."); return; }
    if (!customerEmail.trim()) { toast.error("Customer email is required."); return; }
    if (!productName.trim()) { toast.error("Product name is required."); return; }
    if (amountINR <= 0) { toast.error("Amount must be greater than zero."); return; }

    const invoiceData = {
      invoice_number: invoiceNumber,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      billing_address: billingAddress,
      seller_name: sellerName,
      seller_details: sellerDetails,
      product_name: productName,
      description: productDesc,
      quantity,
      amount_cents: Math.round(amountINR * 100),
      platform_fee_cents: calculatedPlatformFeeCents,
      discount_cents: discountCents,
      tax_cents: taxCents,
      final_total_cents: finalTotalCents,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      notes,
      invoice_date: new Date().toISOString(),
      status: invoiceStatus,
      logo_url: logoUrl,
      gst_details: gstDetails,
      custom_fields: customFields,
    };

    try {
      if (dbAvailable && supabase) {
        const { error } = await supabase.from("invoices").insert(invoiceData);
        if (error) throw error;
        toast.success("Invoice generated & saved to database.");
      } else {
        // Fallback save to localStorage
        const newInvoice: InvoiceRecord = {
          ...invoiceData,
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString()
        };
        const updated = [newInvoice, ...invoices];
        localStorage.setItem("huxzain_mock_invoices", JSON.stringify(updated));
        setInvoices(updated);
        toast.success("Invoice saved locally (Database table not initialized).");
      }
      
      setShowCreateForm(false);
      resetForm();
      await loadInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error(`Recreation failed: ${err.message}`);
    }
  };

  const resetForm = () => {
    setInvoiceNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setBillingAddress("");
    setProductName("");
    setProductDesc("");
    setQuantity(1);
    setAmountINR(0);
    setPlatformFeeINR(0);
    setDiscountINR(0);
    setTaxRatePercent(18);
    setPaymentReference("");
    setCustomFields([]);
  };

  const triggerPrint = (invoice: InvoiceRecord) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to print invoices.");
      return;
    }

    const customFieldsHtml = (invoice.custom_fields || []).map((f: any) => `
      <div class="row">
        <span>${f.label}:</span>
        <span>${f.value}</span>
      </div>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>HUXZAIN Invoice - ${invoice.invoice_number}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e1e1e; background-color: #ffffff; padding: 40px; margin: 0; }
            .invoice-box { max-width: 800px; margin: auto; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); padding: 30px; border-radius: 12px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .header-table td { vertical-align: top; }
            .logo { height: 50px; object-fit: contain; }
            .title { font-size: 28px; font-weight: bold; text-align: right; color: #bf9f62; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 14px; }
            .info-table td { width: 50%; vertical-align: top; }
            .section-title { font-weight: bold; color: #bf9f62; border-bottom: 2px solid #f4f4f4; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em; }
            .details-table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px; font-size: 14px; }
            .details-table th { background: #fafafa; border-bottom: 1px solid #eee; padding: 12px; font-weight: 600; }
            .details-table td { padding: 12px; border-bottom: 1px solid #eee; }
            .totals-box { width: 45%; margin-left: 55%; font-size: 14px; margin-bottom: 40px; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f9f9f9; }
            .row.total { font-weight: bold; border-top: 2px solid #bf9f62; border-bottom: none; font-size: 16px; color: #bf9f62; padding-top: 10px; }
            .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #777; text-align: center; line-height: 1.6; }
            @media print {
              body { padding: 0; background: none; }
              .invoice-box { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td>
                  <img src="${invoice.logo_url}" class="logo" alt="HUXZAIN Logo" />
                  <p style="margin-top: 8px; font-size: 12px; color: #666;">
                    <strong>${invoice.seller_name}</strong><br/>
                    ${invoice.seller_details}<br/>
                    GST: ${invoice.gst_details}
                  </p>
                </td>
                <td style="text-align: right;">
                  <div class="title">INVOICE</div>
                  <p style="margin-top: 8px; font-size: 13px; color: #333; line-height: 1.5;">
                    <strong>Invoice #:</strong> ${invoice.invoice_number}<br/>
                    <strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}<br/>
                    <strong>Status:</strong> ${invoice.status.toUpperCase()}
                  </p>
                </td>
              </tr>
            </table>

            <table class="info-table">
              <tr>
                <td>
                  <div class="section-title">Billed To</div>
                  <strong>${invoice.customer_name || 'Valued Customer'}</strong><br/>
                  ${invoice.billing_address || 'No address provided'}<br/>
                  ${invoice.customer_email}<br/>
                  ${invoice.customer_phone || ''}
                </td>
                <td style="padding-left: 20px;">
                  <div class="section-title">Payment Info</div>
                  <strong>Method:</strong> ${invoice.payment_method}<br/>
                  <strong>Reference:</strong> ${invoice.payment_reference || 'N/A'}<br/>
                  ${customFieldsHtml}
                </td>
              </tr>
            </table>

            <table class="details-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center; width: 80px;">Qty</th>
                  <th style="text-align: right; width: 120px;">Unit Price</th>
                  <th style="text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${invoice.product_name}</strong><br/>
                    <span style="font-size: 12px; color: #666;">${invoice.description || ''}</span>
                  </td>
                  <td style="text-align: center;">${invoice.quantity}</td>
                  <td style="text-align: right;">₹${(invoice.amount_cents / 100).toLocaleString()}</td>
                  <td style="text-align: right;">₹${(invoice.amount_cents * invoice.quantity / 100).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-box">
              <div class="row">
                <span>Subtotal:</span>
                <span>₹${(invoice.amount_cents * invoice.quantity / 100).toLocaleString()}</span>
              </div>
              <div class="row">
                <span>Discount:</span>
                <span>-₹${(invoice.discount_cents / 100).toLocaleString()}</span>
              </div>
              <div class="row">
                <span>GST:</span>
                <span>₹${(invoice.tax_cents / 100).toLocaleString()}</span>
              </div>
              <div class="row">
                <span>Platform Fee (4%):</span>
                <span>₹${(invoice.platform_fee_cents / 100).toLocaleString()}</span>
              </div>
              <div class="row total">
                <span>Grand Total:</span>
                <span>₹${(invoice.final_total_cents / 100).toLocaleString()}</span>
              </div>
            </div>

            <div class="footer">
              <p><strong>Notes/Remarks:</strong> ${invoice.notes}</p>
              <p style="margin-top: 20px; font-size: 11px; border-top: 1px solid #f4f4f4; padding-top: 10px;">
                This is a computer-generated invoice issued by HUXZAIN Marketplace. All transactions are securely held in escrow under platform policy terms. For support, contact support@huxzain.com.
              </p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.seller_name || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="size-6 text-gold" /> Invoices & Billing Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate professional manual invoices, track payments sequence, and print PDF receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 cursor-pointer border-none transition-all"
            >
              <Plus className="size-4" /> Create Manual Invoice
            </button>
          ) : (
            <button
              onClick={() => setShowCreateForm(false)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-surface/60 cursor-pointer transition-colors"
            >
              Back to History
            </button>
          )}
          <button
            onClick={loadInvoices}
            className="inline-flex items-center justify-center size-9 rounded-xl border border-border hover:border-gold/30 bg-surface/20 cursor-pointer"
          >
            <RefreshCw className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Database Warning */}
      {!dbAvailable && (
        <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex gap-3">
          <AlertCircle className="size-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Database table not detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The `invoices` table was not found in your Supabase schema cache. Invoices generated will be saved inside local storage temporarily. Paste the migration SQL file contents into the Supabase SQL editor to create the table.
            </p>
          </div>
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={saveInvoice} className="grid lg:grid-cols-3 gap-6">
          {/* Main Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <PanelCard title="Bill Details">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    placeholder="e.g. HXZ-INV-0001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-black focus:border-gold outline-none text-sm text-foreground"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Razorpay">Razorpay Card/Netbanking</option>
                    <option value="Cash / Other">Cash / Other</option>
                  </select>
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Billed To (Customer Details)">
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="Customer Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="customer@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="Phone details"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Billing Address</label>
                  <textarea
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    placeholder="Physical or Billing Address"
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Product / Service Lines">
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Item Name *</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="Product / Service title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      min="1"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Amount (₹) *</label>
                    <input
                      type="number"
                      value={amountINR || ""}
                      onChange={(e) => setAmountINR(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="Price per unit"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Platform Fee Override (₹)</label>
                    <input
                      type="number"
                      value={platformFeeINR || ""}
                      onChange={(e) => setPlatformFeeINR(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="Leave empty for default 4%"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Discount (₹)</label>
                    <input
                      type="number"
                      value={discountINR || ""}
                      onChange={(e) => setDiscountINR(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Item Description</label>
                  <textarea
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    placeholder="Short description of the product or deliverables"
                  />
                </div>
              </div>
            </PanelCard>
            
            <PanelCard title="Custom fields">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    placeholder="Field Name (e.g. UTR / KYC Status)"
                  />
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    placeholder="Field Value"
                  />
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="px-4 rounded-lg bg-surface hover:bg-surface/80 border border-border text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                {customFields.length > 0 && (
                  <div className="p-3 rounded-lg bg-surface/20 border border-border/60 divide-y divide-border/40">
                    {customFields.map((field, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-xs">
                        <span className="font-semibold text-muted-foreground">{field.label}:</span>
                        <div className="flex items-center gap-3">
                          <span className="text-foreground">{field.value}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomField(idx)}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PanelCard>
          </div>

          {/* Sidebar Summary & Branding */}
          <div className="space-y-6">
            <PanelCard title="Seller Info (Platform)">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Seller Branding Name</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Seller Details</label>
                  <input
                    type="text"
                    value={sellerDetails}
                    onChange={(e) => setSellerDetails(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">GST Rate (%)</label>
                    <input
                      type="number"
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">GST Registration</label>
                    <input
                      type="text"
                      value={gstDetails}
                      onChange={(e) => setGstDetails(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Logo URL</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Invoice Status">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Bill Status</label>
                  <select
                    value={invoiceStatus}
                    onChange={(e) => setInvoiceStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-black focus:border-gold outline-none text-sm text-foreground"
                  >
                    <option value="pending">Pending Payment</option>
                    <option value="paid">Paid & Approved</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reference / UTR ID</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground"
                    placeholder="e.g. UTR1289384792"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Billing Remarks/Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground animate-none text-xs"
                  />
                </div>
              </div>
            </PanelCard>

            {/* Calculations Panel */}
            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5 space-y-4">
              <h3 className="font-semibold text-sm text-gold flex items-center gap-2">
                <DollarSign className="size-4" /> Calculations Summary
              </h3>
              <div className="space-y-2 text-xs divide-y divide-border/40">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Items Subtotal:</span>
                  <span className="font-mono text-foreground font-semibold">₹{((amountINR * quantity)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Discount Applied:</span>
                  <span className="font-mono text-red-400 font-semibold">-₹{Number(discountINR).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">GST (${taxRatePercent}%):</span>
                  <span className="font-mono text-foreground">₹{(taxCents / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Platform Escrow Fee:</span>
                  <span className="font-mono text-foreground">₹{(calculatedPlatformFeeCents / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-sm border-t-2 border-gold/30">
                  <span className="font-bold text-gold">Grand Total:</span>
                  <span className="font-mono font-bold text-gold">₹{(finalTotalCents / 100).toLocaleString()}</span>
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 transition-all border-none"
              >
                <Save className="size-4" /> Save & Generate Invoice
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="grid md:grid-cols-4 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Invoice ID, Buyer, Seller..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Payment</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium">
              Showing {filteredInvoices.length} invoices
            </div>
          </div>

          {/* Invoices List Table */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="size-6 text-gold animate-spin" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              title="No invoices found"
              desc="Create your first manual invoice billing record."
              action={
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 cursor-pointer border-none"
                >
                  <Plus className="size-4" /> Create Manual Invoice
                </button>
              }
            />
          ) : (
            <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4">Invoice #</th>
                      <th className="px-6 py-4">Customer Details</th>
                      <th className="px-6 py-4">Product / Item</th>
                      <th className="px-6 py-4">Final Amount</th>
                      <th className="px-6 py-4">Billing Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface/20 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-gold">{inv.invoice_number}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{inv.customer_name || 'N/A'}</div>
                          <div className="text-[10px] text-muted-foreground">{inv.customer_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground truncate max-w-[200px]">{inv.product_name}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{inv.description || ''}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-foreground">
                          ₹{(inv.final_total_cents / 100).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-mono">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={inv.status === 'pending' ? 'Pending' : inv.status === 'paid' ? 'Completed' : 'Paused'} />
                        </td>
                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="inline-flex items-center justify-center size-8 rounded-lg bg-surface/60 hover:bg-surface border border-border text-foreground transition-colors cursor-pointer"
                            title="Quick Preview"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => triggerPrint(inv)}
                            className="inline-flex items-center justify-center size-8 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/20 text-gold transition-colors cursor-pointer"
                            title="Print / PDF"
                          >
                            <Printer className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-surface p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
              <h3 className="font-bold text-lg text-gold flex items-center gap-2">
                <FileCheck className="size-5" /> Invoice Preview ({viewingInvoice.invoice_number})
              </h3>
              <button
                onClick={() => setViewingInvoice(null)}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-surface/80 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 bg-white text-black p-6 rounded-2xl">
              {/* Logo / Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <img src={viewingInvoice.logo_url} alt="Logo" className="h-10 object-contain" />
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>{viewingInvoice.seller_name}</strong><br/>
                    {viewingInvoice.seller_details}<br/>
                    GST: {viewingInvoice.gst_details}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-gold font-display uppercase tracking-wider">Invoice</h2>
                  <p className="text-xs text-gray-700 mt-1">
                    <strong>Invoice #:</strong> {viewingInvoice.invoice_number}<br/>
                    <strong>Date:</strong> {new Date(viewingInvoice.invoice_date).toLocaleDateString()}<br/>
                    <strong>Status:</strong> <span className="font-bold text-gold uppercase">{viewingInvoice.status}</span>
                  </p>
                </div>
              </div>

              {/* Billed To / Payment Info */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-4 mb-6 text-xs text-gray-700">
                <div>
                  <h4 className="font-bold text-gold uppercase tracking-wider text-[10px] mb-2 border-b border-gray-100 pb-1">Billed To</h4>
                  <strong>{viewingInvoice.customer_name || 'Valued Customer'}</strong><br/>
                  {viewingInvoice.billing_address || 'No address details'}<br/>
                  {viewingInvoice.customer_email}<br/>
                  {viewingInvoice.customer_phone}
                </div>
                <div>
                  <h4 className="font-bold text-gold uppercase tracking-wider text-[10px] mb-2 border-b border-gray-100 pb-1">Payment info</h4>
                  <strong>Method:</strong> {viewingInvoice.payment_method}<br/>
                  <strong>Reference:</strong> {viewingInvoice.payment_reference || 'N/A'}<br/>
                  {(viewingInvoice.custom_fields || []).map((f: any, idx: number) => (
                    <div key={idx}><strong>{f.label}:</strong> {f.value}</div>
                  ))}
                </div>
              </div>

              {/* Item Table */}
              <table className="w-full text-xs text-left border-collapse mb-6 text-gray-800">
                <thead>
                  <tr className="bg-gray-50 font-semibold border-b border-gray-200">
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center w-16">Qty</th>
                    <th className="p-3 text-right w-28">Unit Price</th>
                    <th className="p-3 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="p-3">
                      <strong>{viewingInvoice.product_name}</strong>
                      <p className="text-[10px] text-gray-500 mt-0.5">{viewingInvoice.description}</p>
                    </td>
                    <td className="p-3 text-center">{viewingInvoice.quantity}</td>
                    <td className="p-3 text-right">₹{(viewingInvoice.amount_cents / 100).toLocaleString()}</td>
                    <td className="p-3 text-right">₹{(viewingInvoice.amount_cents * viewingInvoice.quantity / 100).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="w-[45%] ml-[55%] text-xs space-y-2 mb-6 text-gray-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{(viewingInvoice.amount_cents * viewingInvoice.quantity / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{(viewingInvoice.discount_cents / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>₹{(viewingInvoice.tax_cents / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (4%):</span>
                  <span>₹{(viewingInvoice.platform_fee_cents / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gold pt-2 font-bold text-gold text-sm">
                  <span>Grand Total:</span>
                  <span>₹{(viewingInvoice.final_total_cents / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* Note */}
              <div className="border-t border-gray-100 pt-4 text-[10px] text-gray-500 line-height-relaxed">
                <p><strong>Remarks:</strong> {viewingInvoice.notes}</p>
                <p className="text-center mt-4">
                  Issued under secure escrow guidelines. Thank you for your business.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4 mt-4 shrink-0">
              <button
                onClick={() => triggerPrint(viewingInvoice)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 cursor-pointer border-none"
              >
                <Printer className="size-4" /> Print / Save PDF
              </button>
              <button
                onClick={() => setViewingInvoice(null)}
                className="h-10 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-surface/80 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
