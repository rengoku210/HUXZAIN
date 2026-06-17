import { getSupabase } from "../supabase-client";

const supabase = getSupabase()!;

export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type ReportTargetType = 'listing' | 'seller';
export type ReportReason = 'spam' | 'fraud' | 'inappropriate' | 'other';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  note?: string;
  screenshot_url?: string;
  status: ReportStatus;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

/** Submit a new report */
export async function submitReport(params: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note?: string;
  screenshotFile?: File;
}) {
  let screenshotUrl: string | undefined;
  if (params.screenshotFile) {
    const path = `screenshots/${Date.now()}_${params.screenshotFile.name}`;
    const { error } = await supabase.storage
      .from("report-screenshots")
      .upload(path, params.screenshotFile);
    if (error) throw error;
    // Store the in-bucket path; the bucket is private and is read via signed URLs.
    screenshotUrl = path;
  }

  const { data, error } = await supabase.from("reports").insert({
    reporter_id: params.reporterId,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
    note: params.note,
    screenshot_url: screenshotUrl,
    status: "open",
  }).select().single();

  if (error) throw error;
  return data as Report;
}

/** Admin fetch all reports */
export async function fetchReports(filter?: { targetType?: ReportTargetType; status?: ReportStatus }) {
  let query = supabase.from("reports").select("*");
  if (filter?.targetType) query = query.eq("target_type", filter.targetType);
  if (filter?.status) query = query.eq("status", filter.status);
  
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data as Report[];
}

/** Admin update report status */
export async function updateReportStatus(reportId: string, status: ReportStatus, staffId: string) {
  const { data, error } = await supabase
    .from("reports")
    .update({ 
      status, 
      resolved_by: staffId, 
      resolved_at: new Date().toISOString() 
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  return data as Report;
}
