import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard } from "@/components/seller/SellerShell";
import { Palette, Save, AlertCircle, Eye, FileText, CheckCircle, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF, type TemplateSnapshot } from "@/lib/invoice/invoice-pdf";

export const Route = createFileRoute("/_authenticated/admin/invoice-templates")({
  head: () => ({ meta: [{ title: "Invoice Templates — HUXZAIN Admin" }] }),
  component: AdminInvoiceTemplatesPage,
});

function AdminInvoiceTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateSnapshot>({
    company_name: "HUXZAIN DIGITAL OUTLET",
    company_address: "Bangalore, Karnataka, India",
    gst_number: "29AAAAA0000A1Z5",
    support_email: "support@huxzain.shop",
    support_phone: "",
    website_url: "https://huxzain.shop",
    logo_url: "https://huxzain.shop/wp-content/uploads/2026/05/huxzain_gold_logo.png",
    footer_text: "Thank you for choosing HUXZAIN — your secure digital marketplace.",
    terms_text: "All transactions held in escrow under platform policy.",
    primary_color: "#BF9F62",
    accent_color: "#0B0C10",
    border_style: "solid",
    watermark_opacity: 0.08,
  });

  const supabase = getSupabase();

  useEffect(() => {
    const loadTemplate = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("invoice_templates")
          .select("*")
          .eq("singleton", true)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          // Exclude singleton and database ids
          const { singleton, active_version_id, updated_at, ...snap } = data;
          setTemplate(snap);
        }
      } catch (e: any) {
        console.error(e);
        toast.error(`Failed to load template settings: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTemplate((prev) => ({
      ...prev,
      [name]: name === "watermark_opacity" ? parseFloat(value) : value,
    }));
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      // 1. Insert new version to template_versions
      const { data: newVersion, error: verErr } = await supabase
        .from("invoice_template_versions")
        .insert({
          snapshot: template,
          created_by: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .select("id")
        .single();

      if (verErr) throw verErr;

      // 2. Upsert singleton in invoice_templates pointing to new version
      const { error: upsErr } = await supabase
        .from("invoice_templates")
        .upsert({
          singleton: true,
          active_version_id: newVersion.id,
          ...template,
          updated_at: new Date().toISOString(),
        });

      if (upsErr) throw upsErr;

      toast.success("Invoice template settings and branding version archived successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to save template: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const dummyInvoice: any = {
        invoice_number: "HX-INV-2026-000000",
        invoice_date: new Date().toISOString(),
        gross_amount_cents: 500000, // INR 5,000
        platform_fee_cents: 7500, // INR 75
        gst_on_fee_cents: 0,
        net_seller_cents: 492500, // INR 4,925
        buyer_name: "John Doe",
        buyer_email: "johndoe@example.com",
        buyer_gstin: "29AABBC1122D1Z0",
        seller_display_name: "Apex Trading Co.",
        product_title: "Apex Logo Package & Branding Kit",
        payment_method: "UPI",
        payment_reference: "upi_ref_12345",
        status: "issued",
        source: "auto",
      };

      const blob = await generateInvoicePDF(dummyInvoice, template, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "HUXZAIN-Sample-Invoice.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Sample PDF downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to generate sample PDF: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Invoice Templates & Branding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure default corporate headers, address records, custom palettes, and RLS template snapshots.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadSample}
            className="h-10 px-4 rounded-xl border border-border bg-surface text-foreground font-semibold hover:bg-border/30 text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} /> Download Sample PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-4 rounded-xl bg-gold text-black font-semibold hover:brightness-110 disabled:opacity-50 text-xs inline-flex items-center gap-1.5 cursor-pointer border-none"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save size={14} />}
            Save Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 rounded-3xl border border-border bg-surface/10 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="size-8 animate-spin text-gold" />
          <p className="text-sm text-muted-foreground">Loading template branding settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Settings Form */}
          <div className="lg:col-span-6 space-y-6">
            <PanelCard title="Template Branding Settings" action={<Palette size={14} className="text-gold" />}>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Company Name</label>
                    <input
                      type="text"
                      name="company_name"
                      value={template.company_name}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">GSTIN (Corporate)</label>
                    <input
                      type="text"
                      name="gst_number"
                      value={template.gst_number}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Company Physical Address</label>
                  <textarea
                    name="company_address"
                    value={template.company_address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Support Email</label>
                    <input
                      type="email"
                      name="support_email"
                      value={template.support_email}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Support Phone (Optional)</label>
                    <input
                      type="text"
                      name="support_phone"
                      value={template.support_phone}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Website URL</label>
                    <input
                      type="url"
                      name="website_url"
                      value={template.website_url}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Logo URL</label>
                    <input
                      type="url"
                      name="logo_url"
                      value={template.logo_url}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Primary Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        name="primary_color"
                        value={template.primary_color}
                        onChange={handleChange}
                        className="size-8 p-0 border-none bg-transparent rounded-lg overflow-hidden cursor-pointer"
                      />
                      <input
                        type="text"
                        name="primary_color"
                        value={template.primary_color}
                        onChange={handleChange}
                        className="w-full h-8 px-2 rounded-lg bg-background border border-border text-[10px] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Accent Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        name="accent_color"
                        value={template.accent_color}
                        onChange={handleChange}
                        className="size-8 p-0 border-none bg-transparent rounded-lg overflow-hidden cursor-pointer"
                      />
                      <input
                        type="text"
                        name="accent_color"
                        value={template.accent_color}
                        onChange={handleChange}
                        className="w-full h-8 px-2 rounded-lg bg-background border border-border text-[10px] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Border Style</label>
                    <select
                      name="border_style"
                      value={template.border_style}
                      onChange={handleChange}
                      className="w-full h-8 px-2 rounded-lg bg-background border border-border text-xs outline-none"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="double">Double</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-muted-foreground">Watermark Opacity</label>
                    <span className="text-[10px] font-bold text-gold">{template.watermark_opacity}</span>
                  </div>
                  <input
                    type="range"
                    name="watermark_opacity"
                    min="0.0"
                    max="0.5"
                    step="0.01"
                    value={template.watermark_opacity}
                    onChange={handleChange}
                    className="w-full accent-gold bg-border rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Invoice Terms & Conditions</label>
                  <textarea
                    name="terms_text"
                    value={template.terms_text}
                    onChange={handleChange}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Footer Text</label>
                  <textarea
                    name="footer_text"
                    value={template.footer_text}
                    onChange={handleChange}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-background border border-border focus:border-gold/40 text-xs outline-none resize-none"
                  />
                </div>
              </div>
            </PanelCard>
          </div>

          {/* Realtime HTML Preview — matches premium PDF layout */}
          <div className="lg:col-span-6 space-y-6">
            <PanelCard title="Live Invoice Preview" action={<Eye size={14} className="text-gold" />}>
              <div className="pt-2">
                <div className="border border-border rounded-2xl overflow-hidden bg-white text-black shadow-md max-w-full font-sans text-[10px] leading-relaxed scale-95 origin-top">
                  
                  {/* Dark header band */}
                  <div className="px-5 py-4" style={{ backgroundColor: template.accent_color }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-sm font-bold text-white">{template.company_name}</h2>
                        <p className="text-[7px] mt-1" style={{ color: template.primary_color }}>SECURE DIGITAL MARKETPLACE · ESCROW-PROTECTED</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] text-gray-400">{template.website_url}</p>
                        <p className="text-[7px] text-gray-400">{template.support_email}</p>
                      </div>
                    </div>
                    <h3 className="text-xs font-bold mt-3" style={{ color: template.primary_color }}>TAX INVOICE (B2B)</h3>
                  </div>

                  {/* Gold accent strip */}
                  <div className="h-[3px]" style={{ backgroundColor: template.primary_color }} />

                  {/* Meta row */}
                  <div className="bg-gray-50 px-5 py-3 grid grid-cols-5 gap-2">
                    {[
                      { l: "INVOICE NO", v: "HX-INV-2026-000000" },
                      { l: "ISSUE DATE", v: new Date().toLocaleDateString("en-IN") },
                      { l: "ORDER ID", v: "A1B2C3D4" },
                      { l: "PAYMENT", v: "UPI" },
                      { l: "STATUS", v: "ISSUED" },
                    ].map((m) => (
                      <div key={m.l}>
                        <p className="text-[6px] font-bold text-gray-400 tracking-wider">{m.l}</p>
                        <p className={`text-[8px] font-bold ${m.l === "STATUS" ? "text-green-600" : "text-gray-800"}`}>{m.v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Billing parties */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[7px] font-bold text-gray-400 mb-1">BILLED TO</p>
                        <div className="w-8 h-[2px] mb-2" style={{ backgroundColor: template.primary_color }} />
                        <p className="font-bold text-[9px]">John Doe</p>
                        <p className="text-gray-500 text-[8px]">johndoe@example.com</p>
                        <p className="font-bold text-[7px] text-gray-700 mt-1">GSTIN: 29AABBC1122D1Z0</p>
                        <p className="text-[6px] text-gray-400 italic">B2B Transaction — ITC Eligible</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[7px] font-bold text-gray-400 mb-1">MERCHANT / SELLER</p>
                        <div className="w-8 h-[2px] mb-2" style={{ backgroundColor: template.primary_color }} />
                        <p className="font-bold text-[9px]">Apex Trading Co.</p>
                        <p className="text-gray-500 text-[8px]">HUXZAIN Verified Merchant</p>
                        <p className="font-bold text-[7px] text-gray-700 mt-1">Platform GSTIN: {template.gst_number}</p>
                      </div>
                    </div>

                    {/* Line items table */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[7px] text-white" style={{ backgroundColor: template.accent_color }}>
                          <th className="text-left p-1.5 border border-gray-300">Description</th>
                          <th className="text-center p-1.5 border border-gray-300 w-12">HSN/SAC</th>
                          <th className="text-center p-1.5 border border-gray-300 w-8">Qty</th>
                          <th className="text-right p-1.5 border border-gray-300 w-16">Unit Price</th>
                          <th className="text-right p-1.5 border border-gray-300 w-16">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="p-1.5 border border-gray-200">Apex Logo Package &amp; Branding Kit</td>
                          <td className="text-center p-1.5 border border-gray-200">998314</td>
                          <td className="text-center p-1.5 border border-gray-200">1</td>
                          <td className="text-right p-1.5 border border-gray-200">INR 5,000.00</td>
                          <td className="text-right p-1.5 border border-gray-200 font-bold">INR 5,000.00</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Financial summary */}
                    <div className="flex justify-between items-start">
                      {/* QR placeholder */}
                      <div className="bg-gray-50 p-2 rounded-lg flex items-center gap-2 max-w-[170px]">
                        <div className="size-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 border text-[6px] font-bold">QR</div>
                        <div>
                          <p className="font-bold text-[7px]">SCAN TO VERIFY</p>
                          <p className="text-[6px] text-gray-400">huxzain.shop/verify/HX-INV-...</p>
                        </div>
                      </div>

                      {/* Summary box */}
                      <div className="w-44 bg-gray-50 p-3 rounded-lg space-y-1.5" style={{ borderLeft: `3px solid ${template.primary_color}` }}>
                        <div className="flex justify-between text-[7px] text-gray-500">
                          <span>Buyer Paid (Gross)</span>
                          <span className="font-medium text-gray-700">INR 5,000.00</span>
                        </div>
                        <div className="flex justify-between text-[7px] text-gray-500">
                          <span>Platform Fee Deducted</span>
                          <span>– INR 75.00</span>
                        </div>
                        <div className="border-t border-gray-300 !my-2" />
                        <div className="flex justify-between text-[8px] font-bold">
                          <span className="text-gray-700">Seller Receives (Net)</span>
                          <span className="text-green-600">INR 4,925.00</span>
                        </div>
                        <p className="text-[5px] text-gray-400 italic pt-0.5">
                          Gross 5,000 − Fee 75 = Net 4,925
                        </p>
                      </div>
                    </div>

                    {/* Terms */}
                    <p className="text-[7px] text-gray-400 italic border-l-2 pl-2" style={{ borderLeftColor: template.primary_color }}>
                      {template.terms_text}
                    </p>
                  </div>

                  {/* Footer band */}
                  <div className="h-[2px]" style={{ backgroundColor: template.primary_color }} />
                  <div className="px-5 py-3 text-center" style={{ backgroundColor: template.accent_color }}>
                    <p className="text-[7px] text-gray-400">{template.footer_text}</p>
                    <p className="text-[6px] text-gray-500 mt-1">{template.company_address} | {template.support_email}</p>
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        </div>
      )}
    </div>
  );
}
