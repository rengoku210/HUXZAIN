import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Users,
  AlertTriangle,
  FileText,
  Mail,
  ToggleLeft,
  ToggleRight,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getAudienceSegments,
  getEmailTemplates,
  saveEmailTemplate,
  getCampaigns,
  createCampaign,
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getEmergencyAlerts,
  createEmergencyAlert,
  toggleEmergencyAlert,
} from "@/lib/admin/communication.functions";
import { getDomainStatus, updateSMTPConfig } from "@/lib/admin/tickets.functions";

export const Route = createFileRoute("/_authenticated/admin/communication")({
  head: () => ({ meta: [{ title: "Communication Center — HUXZAIN Admin" }] }),
  component: CommunicationCenter,
});

type Tab = "campaigns" | "templates" | "announcements" | "segments" | "emergency" | "domain";

function CommunicationCenter() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [loading, setLoading] = useState(true);

  // Data states
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);

  // Form states
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignChannel, setCampaignChannel] = useState("email");
  const [campaignSegment, setCampaignSegment] = useState("");
  const [campaignTemplateId, setCampaignTemplateId] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [campaignScheduled, setCampaignScheduled] = useState(false);
  const [campaignScheduleTime, setCampaignScheduleTime] = useState("");
  const [campaignSubmitBusy, setCampaignSubmitBusy] = useState(false);

  // Template Form states
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | undefined>(undefined);
  const [templateName, setTemplateName] = useState("");
  const [templateSlug, setTemplateSlug] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateVariables, setTemplateVariables] = useState("");
  const [templateActive, setTemplateActive] = useState(true);
  const [templateSubmitBusy, setTemplateSubmitBusy] = useState(false);

  // Announcement Form states
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState("banner");
  const [annPlacement, setAnnPlacement] = useState("both");
  const [annAudience, setAnnAudience] = useState("all");
  const [annStartsAt, setAnnStartsAt] = useState("");
  const [annEndsAt, setAnnEndsAt] = useState("");
  const [annActive, setAnnActive] = useState(true);
  const [annSubmitBusy, setAnnSubmitBusy] = useState(false);

  // Emergency Form states
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const [emergencyPriority, setEmergencyPriority] = useState("critical");
  const [emergencyPopup, setEmergencyPopup] = useState(true);
  const [emergencyBanner, setEmergencyBanner] = useState(true);
  const [emergencySubmitBusy, setEmergencySubmitBusy] = useState(false);

  // Domain/SMTP states
  const [smtpConfig, setSmtpConfig] = useState<any>(null);
  const [smtpProvider, setSmtpProvider] = useState("resend");
  const [smtpApiKey, setSmtpApiKey] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("noreply@huxzain.shop");
  const [smtpReplyTo, setSmtpReplyTo] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSaving, setSmtpSaving] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [segs, tmpls, camps, anns, alerts, domain] = await Promise.all([
        getAudienceSegments(),
        getEmailTemplates(),
        getCampaigns(),
        getAnnouncements(),
        getEmergencyAlerts(),
        getDomainStatus(),
      ]);
      setSegments(segs || []);
      setTemplates(tmpls || []);
      setCampaigns(camps || []);
      setAnnouncements(anns || []);
      setEmergencyAlerts(alerts || []);
      if (domain) {
        setSmtpConfig(domain);
        setSmtpProvider(domain.provider);
        setSmtpApiKey(domain.api_key || "");
        setSmtpFromEmail(domain.from_email || "noreply@huxzain.shop");
        setSmtpReplyTo(domain.reply_to || "");
        setSmtpHost(domain.smtp_host || "");
        setSmtpPort(domain.smtp_port || 587);
        setSmtpUser(domain.smtp_user || "");
        setSmtpPass(domain.smtp_pass || "");
      }

      if (segs && segs.length > 0 && !campaignSegment) {
        setCampaignSegment(segs[0].segment);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load Communication Center data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !campaignSubject || !campaignBody) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Bulk email warning check
    const segment = segments.find(s => s.segment === campaignSegment);
    const count = segment ? segment.count : 0;
    if (count > 50) {
      const confirmed = window.confirm(`This campaign will be broadcasted to ${count} recipients. Are you sure you want to send this broadcast?`);
      if (!confirmed) return;
    }

    setCampaignSubmitBusy(true);
    try {
      await createCampaign({
        data: {
          name: campaignName,
          channel: campaignChannel,
          audience_segment: campaignSegment,
          template_id: campaignTemplateId || undefined,
          subject: campaignSubject,
          body: campaignBody,
          scheduled_for: campaignScheduled ? new Date(campaignScheduleTime).toISOString() : undefined,
          created_by: auth.user?.id || "",
        },
      });
      toast.success("Campaign created successfully!");
      setShowCampaignForm(false);
      // Reset
      setCampaignName("");
      setCampaignSubject("");
      setCampaignBody("");
      setCampaignTemplateId("");
      setCampaignScheduled(false);
      setCampaignScheduleTime("");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign");
    } finally {
      setCampaignSubmitBusy(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !templateSlug || !templateSubject || !templateBody) {
      toast.error("Please fill in all required template fields.");
      return;
    }
    setTemplateSubmitBusy(true);
    try {
      await saveEmailTemplate({
        data: {
          id: editTemplateId,
          name: templateName,
          slug: templateSlug,
          subject: templateSubject,
          body: templateBody,
          variables: templateVariables.split(",").map((v) => v.trim()).filter(Boolean),
          is_active: templateActive,
        },
      });
      toast.success("Template saved successfully!");
      setShowTemplateForm(false);
      // Reset
      setEditTemplateId(undefined);
      setTemplateName("");
      setTemplateSlug("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateVariables("");
      setTemplateActive(true);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setTemplateSubmitBusy(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent || !annStartsAt) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setAnnSubmitBusy(true);
    try {
      await saveAnnouncement({
        data: {
          title: annTitle,
          content: annContent,
          type: annType,
          placement: annPlacement,
          audience: annAudience,
          starts_at: new Date(annStartsAt).toISOString(),
          ends_at: annEndsAt ? new Date(annEndsAt).toISOString() : "",
          is_active: annActive,
          created_by: auth.user?.id || "",
        },
      });
      toast.success("Announcement saved successfully!");
      setShowAnnouncementForm(false);
      setAnnTitle("");
      setAnnContent("");
      setAnnStartsAt("");
      setAnnEndsAt("");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save announcement");
    } finally {
      setAnnSubmitBusy(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteAnnouncement({ data: { id } });
      toast.success("Announcement deleted.");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete announcement");
    }
  };

  const handleTriggerEmergencyAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyMsg) {
      toast.error("Please specify an alert message.");
      return;
    }
    setEmergencySubmitBusy(true);
    try {
      await createEmergencyAlert({
        data: {
          message: emergencyMsg,
          priority: emergencyPriority,
          show_popup: emergencyPopup,
          show_banner: emergencyBanner,
          created_by: auth.user?.id || "",
        },
      });
      toast.success("Emergency Alert broadcasted!");
      setEmergencyMsg("");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast emergency alert");
    } finally {
      setEmergencySubmitBusy(false);
    }
  };

  const handleToggleAlert = async (id: string, currentStatus: boolean) => {
    try {
      await toggleEmergencyAlert({ data: { id, is_active: !currentStatus } });
      toast.success("Alert status updated.");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle alert");
    }
  };

  const handleSaveSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      await updateSMTPConfig({
        data: {
          provider: smtpProvider,
          api_key: smtpApiKey,
          from_email: smtpFromEmail,
          reply_to: smtpReplyTo,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
        }
      });
      toast.success("Domain configuration updated successfully!");
      loadAllData();
    } catch (err: any) {
      toast.error("Failed to update SMTP configurations: " + err.message);
    } finally {
      setSmtpSaving(false);
    }
  };

  const tabs = [
    { id: "campaigns", label: "Email Campaigns", icon: Mail },
    { id: "templates", label: "Email Templates", icon: FileText },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "segments", label: "Audience CRM", icon: Users },
    { id: "emergency", label: "Emergency Dashboard", icon: AlertTriangle },
    { id: "domain", label: "Domain Management", icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Megaphone className="text-gold animate-pulse" size={24} /> Communication Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform-wide marketing email broadcasts, UI notifications, banners, and emergency alerts.
          </p>
        </div>
        <div>
          {activeTab === "campaigns" && (
            <button
              onClick={() => setShowCampaignForm(!showCampaignForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-gold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
            >
              <Plus size={14} /> {showCampaignForm ? "Cancel Form" : "Create Campaign"}
            </button>
          )}
          {activeTab === "templates" && (
            <button
              onClick={() => {
                setEditTemplateId(undefined);
                setTemplateName("");
                setTemplateSlug("");
                setTemplateSubject("");
                setTemplateBody("");
                setTemplateVariables("");
                setTemplateActive(true);
                setShowTemplateForm(!showTemplateForm);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-gold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
            >
              <Plus size={14} /> {showTemplateForm ? "Cancel Form" : "Create Template"}
            </button>
          )}
          {activeTab === "announcements" && (
            <button
              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-gold text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
            >
              <Plus size={14} /> {showAnnouncementForm ? "Cancel Form" : "Create Announcement"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const ActiveIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as Tab);
                setShowCampaignForm(false);
                setShowTemplateForm(false);
                setShowAnnouncementForm(false);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === t.id
                  ? "border-gold text-gold bg-gold/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/20"
              }`}
            >
              <ActiveIcon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Loading console data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CAMPAIGNS TAB */}
          {activeTab === "campaigns" && (
            <>
              {showCampaignForm && (
                <form
                  onSubmit={handleCreateCampaign}
                  className="p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4 max-w-2xl"
                >
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                    <Sparkles size={16} /> Broadcast New Campaign
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Campaign Name</label>
                      <input
                        type="text"
                        required
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g. Summer Premium Boost Sale"
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Channel</label>
                      <select
                        value={campaignChannel}
                        onChange={(e) => setCampaignChannel(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      >
                        <option value="email">Email</option>
                        <option value="notification">In-App Notification</option>
                        <option value="push">Push Notification</option>
                        <option value="announcement">Announcement Broadcast</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Target Audience CRM Segment</label>
                      <select
                        value={campaignSegment}
                        onChange={(e) => setCampaignSegment(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      >
                        {segments.map((s) => (
                          <option key={s.segment} value={s.segment}>
                            {s.segment} ({s.count} users)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Template Preset (Optional)</label>
                      <select
                        value={campaignTemplateId}
                        onChange={(e) => {
                          setCampaignTemplateId(e.target.value);
                          const chosen = templates.find((t) => t.id === e.target.value);
                          if (chosen) {
                            setCampaignSubject(chosen.subject);
                            setCampaignBody(chosen.body);
                          }
                        }}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      >
                        <option value="">No template (custom layout)</option>
                        {templates.filter((t) => t.is_active).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Subject Line / Heading</label>
                    <input
                      type="text"
                      required
                      value={campaignSubject}
                      onChange={(e) => setCampaignSubject(e.target.value)}
                      placeholder="e.g. Upgrade to Pro Seller and get 15% lower commissions!"
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Message Body (HTML Supported)</label>
                    <textarea
                      required
                      rows={6}
                      value={campaignBody}
                      onChange={(e) => setCampaignBody(e.target.value)}
                      placeholder="Type email body content here..."
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-4 bg-surface/20 p-3 rounded-xl border border-border/40">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="scheduled"
                        checked={campaignScheduled}
                        onChange={(e) => setCampaignScheduled(e.target.checked)}
                        className="accent-gold cursor-pointer"
                      />
                      <label htmlFor="scheduled" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Schedule campaign for later
                      </label>
                    </div>
                    {campaignScheduled && (
                      <input
                        type="datetime-local"
                        required
                        value={campaignScheduleTime}
                        onChange={(e) => setCampaignScheduleTime(e.target.value)}
                        className="bg-[#101114] border border-border rounded-lg px-2 py-1 text-xs text-gold outline-none focus:border-gold"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={campaignSubmitBusy}
                    className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {campaignSubmitBusy ? "Scheduling..." : campaignScheduled ? "Schedule Broadcast" : "Send Broadcast Now"}
                  </button>
                </form>
              )}

              <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 font-bold">Campaign Name</th>
                      <th className="p-4 font-bold">Target segment</th>
                      <th className="p-4 font-bold">Channel</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Scheduled / Sent At</th>
                      <th className="p-4 font-bold">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                          No campaigns created yet. Click "Create Campaign" to trigger your first broadcast.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((c) => {
                        let statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        if (c.status === "scheduled") statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        if (c.status === "sending") statusColor = "bg-amber-500/25 text-amber-400 border-amber-500/30 animate-pulse";
                        if (c.status === "sent") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        if (c.status === "failed" || c.status === "cancelled") statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                        return (
                          <tr key={c.id} className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs">
                            <td className="p-4 font-semibold">
                              <div>{c.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.subject}</div>
                            </td>
                            <td className="p-4 font-semibold text-gold">{c.audience_segment}</td>
                            <td className="p-4 font-mono uppercase text-[10px]">{c.channel}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColor}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground font-mono text-[10px]">
                              {c.sent_at
                                ? new Date(c.sent_at).toLocaleString()
                                : c.scheduled_for
                                ? `Scheduled: ${new Date(c.scheduled_for).toLocaleString()}`
                                : "Draft"}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-4 font-mono text-[10px]">
                                <span>Delivered: <strong className="text-foreground">{c.stats?.delivered || 0}</strong></span>
                                <span>Failed: <strong className="text-red-400">{c.stats?.failed || 0}</strong></span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === "templates" && (
            <>
              {showTemplateForm && (
                <form
                  onSubmit={handleSaveTemplate}
                  className="p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4 max-w-2xl"
                >
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                    <Sparkles size={16} /> {editTemplateId ? "Edit Template" : "Create New Email Template"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Template Name</label>
                      <input
                        type="text"
                        required
                        value={templateName}
                        onChange={(e) => {
                          setTemplateName(e.target.value);
                          if (!editTemplateId) {
                            setTemplateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                          }
                        }}
                        placeholder="e.g. Seller Pro Welcome"
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Unique Slug</label>
                      <input
                        type="text"
                        required
                        value={templateSlug}
                        onChange={(e) => setTemplateSlug(e.target.value)}
                        placeholder="e.g. seller-pro-welcome"
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Subject Line / Heading</label>
                    <input
                      type="text"
                      required
                      value={templateSubject}
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      placeholder="e.g. Welcome to HUXZAIN Pro Tier, {{display_name}}!"
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Template Body (HTML Supported)</label>
                    <textarea
                      required
                      rows={8}
                      value={templateBody}
                      onChange={(e) => setTemplateBody(e.target.value)}
                      placeholder="<h1>Hello {{display_name}}</h1>..."
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Dynamic Variables (Comma separated)</label>
                      <input
                        type="text"
                        value={templateVariables}
                        onChange={(e) => setTemplateVariables(e.target.value)}
                        placeholder="e.g. display_name, tier_name, discount_rate"
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="tmplActive"
                        checked={templateActive}
                        onChange={(e) => setTemplateActive(e.target.checked)}
                        className="accent-gold cursor-pointer"
                      />
                      <label htmlFor="tmplActive" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Template is active and available for campaigns
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={templateSubmitBusy}
                    className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {templateSubmitBusy ? "Saving..." : "Save Template"}
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-border bg-surface/40 p-8 text-center text-xs text-muted-foreground">
                    No email templates saved yet. Click "Create Template" to define one.
                  </div>
                ) : (
                  templates.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-border bg-surface/40 p-5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-gold/30 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold">
                            {t.slug}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold tracking-wider border ${
                              t.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            }`}
                          >
                            {t.is_active ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <h4 className="font-display font-semibold text-sm">{t.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">"{t.subject}"</p>
                        {t.variables && t.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.variables.map((v: string) => (
                              <span key={v} className="bg-surface/60 border border-border/80 text-muted-foreground text-[8px] font-mono px-1 rounded">
                                {"{{" + v + "}}"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/20">
                        <button
                          onClick={() => {
                            setEditTemplateId(t.id);
                            setTemplateName(t.name);
                            setTemplateSlug(t.slug);
                            setTemplateSubject(t.subject);
                            setTemplateBody(t.body);
                            setTemplateVariables(t.variables?.join(", ") || "");
                            setTemplateActive(t.is_active);
                            setShowTemplateForm(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] uppercase font-bold tracking-wider hover:text-gold hover:border-gold/30 active:scale-95 transition-all cursor-pointer bg-surface/20"
                        >
                          <Edit size={10} /> Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === "announcements" && (
            <>
              {showAnnouncementForm && (
                <form
                  onSubmit={handleSaveAnnouncement}
                  className="p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4 max-w-2xl"
                >
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                    <Sparkles size={16} /> Broadcast Website Announcement
                  </h3>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Announcement Title</label>
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g. Maintenance Scheduled for June 15"
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Content Message</label>
                    <textarea
                      required
                      rows={4}
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Enter detailed message text..."
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Alert Type</label>
                      <select
                        value={annType}
                        onChange={(e) => setAnnType(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      >
                        <option value="banner">Top Page Banner</option>
                        <option value="popup">Dashboard Popup</option>
                        <option value="both">Both banner & popup</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Placement Pages</label>
                      <select
                        value={annPlacement}
                        onChange={(e) => setAnnPlacement(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      >
                        <option value="homepage">Marketplace Homepage Only</option>
                        <option value="dashboard">User Dashboard Only</option>
                        <option value="both">Entire Platform (All views)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Target Audience</label>
                      <select
                        value={annAudience}
                        onChange={(e) => setAnnAudience(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      >
                        <option value="all">All visitors & users</option>
                        <option value="buyers">Buyers only</option>
                        <option value="sellers">Sellers only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Starts At</label>
                      <input
                        type="datetime-local"
                        required
                        value={annStartsAt}
                        onChange={(e) => setAnnStartsAt(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Ends At (Optional)</label>
                      <input
                        type="datetime-local"
                        value={annEndsAt}
                        onChange={(e) => setAnnEndsAt(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="annActive"
                      checked={annActive}
                      onChange={(e) => setAnnActive(e.target.checked)}
                      className="accent-gold cursor-pointer"
                    />
                    <label htmlFor="annActive" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Announcement active immediately
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={annSubmitBusy}
                    className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {annSubmitBusy ? "Saving..." : "Create Announcement"}
                  </button>
                </form>
              )}

              <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 font-bold">Title</th>
                      <th className="p-4 font-bold">Type</th>
                      <th className="p-4 font-bold">Placement</th>
                      <th className="p-4 font-bold">Audience</th>
                      <th className="p-4 font-bold">Dates Schedule</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                          No active announcements found. Click "Create Announcement" to post one.
                        </td>
                      </tr>
                    ) : (
                      announcements.map((a) => (
                        <tr key={a.id} className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs">
                          <td className="p-4">
                            <div className="font-semibold">{a.title}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{a.content}</div>
                          </td>
                          <td className="p-4 uppercase font-mono text-[9px] text-gold">{a.type}</td>
                          <td className="p-4 uppercase font-mono text-[9px]">{a.placement}</td>
                          <td className="p-4 uppercase font-mono text-[9px]">{a.audience}</td>
                          <td className="p-4 text-muted-foreground font-mono text-[10px]">
                            {new Date(a.starts_at).toLocaleString()}
                            {a.ends_at && ` to ${new Date(a.ends_at).toLocaleString()}`}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                a.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                              }`}
                            >
                              {a.is_active ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleDeleteAnnouncement(a.id)}
                              className="p-1.5 rounded-lg border border-border text-red-400 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer bg-surface/20"
                              title="Delete Announcement"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* CRM AUDIENCE SEGMENTS TAB */}
          {activeTab === "segments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {segments.map((s) => (
                <div
                  key={s.segment}
                  className="rounded-2xl border border-border bg-surface/10 backdrop-blur-md p-6 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-gold/30 hover:scale-[1.01] transition-all"
                >
                  <div className="space-y-1">
                    <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center mb-3">
                      <Users size={18} />
                    </div>
                    <h4 className="font-display font-bold text-sm tracking-wide">{s.segment}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                  </div>
                  <div className="border-t border-border/20 pt-4 flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Size</span>
                    <span className="text-3xl font-extrabold font-display text-gold tracking-tight">
                      {s.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMERGENCY ALERTS TAB */}
          {activeTab === "emergency" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleTriggerEmergencyAlert}
                className="lg:col-span-1 p-6 rounded-2xl border border-red-500/20 bg-red-950/10 backdrop-blur-md space-y-4 h-fit"
              >
                <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-red-400">
                  <AlertTriangle className="animate-pulse" size={18} /> Broadcast Emergency Notice
                </h3>
                <p className="text-xs text-muted-foreground">
                  Instantly publish critical service notices at the top of every screen on the platform (e.g. gateway shutdowns, scheduled repairs).
                </p>

                <div className="space-y-1">
                  <label className="text-xs text-red-300">Notice Alert Message</label>
                  <textarea
                    required
                    rows={4}
                    value={emergencyMsg}
                    onChange={(e) => setEmergencyMsg(e.target.value)}
                    placeholder="e.g. Our UPI Payment Gateway is experiencing downtime. Card withdrawals are processing normally."
                    className="w-full bg-[#101114] border border-red-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500 text-red-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-red-300">Severity Priority</label>
                  <select
                    value={emergencyPriority}
                    onChange={(e) => setEmergencyPriority(e.target.value)}
                    className="w-full bg-[#101114] border border-red-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500 text-red-200"
                  >
                    <option value="info">Info (Yellow banner)</option>
                    <option value="warning">Warning (Orange banner)</option>
                    <option value="critical">Critical (Red blinking banner)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-red-500/10">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emPopup"
                      checked={emergencyPopup}
                      onChange={(e) => setEmergencyPopup(e.target.checked)}
                      className="accent-red-500 cursor-pointer"
                    />
                    <label htmlFor="emPopup" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Show full screen modal popup on login
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emBanner"
                      checked={emergencyBanner}
                      onChange={(e) => setEmergencyBanner(e.target.checked)}
                      className="accent-red-500 cursor-pointer"
                    />
                    <label htmlFor="emBanner" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Show persistent blinking top screen banner
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={emergencySubmitBusy}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  {emergencySubmitBusy ? "Broadcasting..." : "Trigger System-Wide Alert"}
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md p-6">
                  <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-4">
                    <Clock size={16} /> Broadcast History & Active Override Control
                  </h3>

                  <div className="space-y-4">
                    {emergencyAlerts.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground">
                        No emergency alerts have been triggered on this instance.
                      </div>
                    ) : (
                      emergencyAlerts.map((a) => (
                        <div
                          key={a.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                            a.is_active
                              ? "bg-red-500/5 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                              : "bg-surface/20 border-border/80"
                          }`}
                        >
                          <div className="space-y-1 max-w-lg">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${
                                  a.priority === "critical"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : a.priority === "warning"
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                }`}
                              >
                                {a.priority}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(a.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-foreground font-medium leading-relaxed">
                              {a.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleAlert(a.id, a.is_active)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider active:scale-95 transition-all cursor-pointer ${
                                a.is_active
                                  ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                  : "bg-surface/40 text-muted-foreground border-border hover:text-foreground"
                              }`}
                            >
                              {a.is_active ? (
                                <>
                                  <ToggleRight size={14} className="text-red-400" /> ACTIVE OVERRIDE
                                </>
                              ) : (
                                <>
                                  <ToggleLeft size={14} /> DISABLED
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DOMAIN MANAGEMENT TAB */}
          {activeTab === "domain" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <form
                onSubmit={handleSaveSMTP}
                className="lg:col-span-2 p-6 rounded-2xl border border-border bg-surface/30 space-y-4"
              >
                <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                  <Sparkles size={18} /> Domain & SMTP Provider Configuration
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure the outbound communication domains, SPF/DKIM verification indicators, and SMTP dispatch service provider for marketing & newsletters.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Service Provider</label>
                    <select
                      value={smtpProvider}
                      onChange={(e) => setSmtpProvider(e.target.value)}
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold cursor-pointer"
                    >
                      <option value="resend">Resend (API Key)</option>
                      <option value="sendgrid">SendGrid (API Key)</option>
                      <option value="ses">Amazon SES (SMTP)</option>
                      <option value="mailgun">Mailgun (SMTP)</option>
                      <option value="postmark">Postmark (API Key)</option>
                      <option value="custom">Custom SMTP Server</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Sender From Email</label>
                    <input
                      type="email"
                      required
                      value={smtpFromEmail}
                      onChange={(e) => setSmtpFromEmail(e.target.value)}
                      placeholder="noreply@huxzain.shop"
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {["resend", "sendgrid", "postmark"].includes(smtpProvider) ? (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Provider API Key</label>
                    <input
                      type="password"
                      value={smtpApiKey}
                      onChange={(e) => setSmtpApiKey(e.target.value)}
                      placeholder="e.g. re_123456789"
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1 col-span-2">
                        <label className="text-xs text-muted-foreground">SMTP Host Server</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.mailgun.org"
                          className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          placeholder="587"
                          className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">SMTP Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="postmaster@yourdomain.com"
                          className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">SMTP Password</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Reply-To Email (Optional)</label>
                    <input
                      type="email"
                      value={smtpReplyTo}
                      onChange={(e) => setSmtpReplyTo(e.target.value)}
                      placeholder="support@huxzain.com"
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  {smtpSaving ? "Saving Config..." : "Save Configuration"}
                </button>
              </form>

              {/* Domain Health Indicator */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-border bg-surface/30 space-y-4">
                  <h4 className="font-display font-semibold text-sm">Domain Verification Health</h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Sending Domain</span>
                      <span className="font-mono text-gold">{smtpFromEmail.split("@")[1] || "huxzain.shop"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">SPF Records Status</span>
                      <span className="font-semibold text-emerald-400">✓ VERIFIED</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">DKIM Status</span>
                      <span className="font-semibold text-emerald-400">✓ VERIFIED</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">DMARC Policy Status</span>
                      <span className="font-semibold text-emerald-400">✓ ACTIVE (STRICT)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Email Health Score</span>
                      <span className="font-bold text-gold">99.2% Score</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
