"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import { triggerNotification } from "@/lib/notifications.functions";

/**
 * Fetch support tickets with filtering, searching, and pagination.
 */
export const getAdminTickets = createServerFn({ method: "POST" })
  .inputValidator((d: {
    status_filter?: string;
    category_filter?: string;
    department_filter?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { status_filter, category_filter, department_filter, search, page = 1, per_page = 20 } = data;
    const offset = (page - 1) * per_page;

    let query = supabase
      .from("support_tickets")
      .select(`
        *,
        user:user_id (
          display_name,
          email,
          username
        ),
        assignee:assigned_to (
          display_name,
          email,
          username
        )
      `, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    if (status_filter && status_filter !== "all") {
      query = query.eq("status", status_filter);
    }
    if (category_filter && category_filter !== "all") {
      query = query.eq("category", category_filter);
    }
    if (department_filter && department_filter !== "all") {
      query = query.eq("department", department_filter);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: tickets, error, count } = await query;

    if (error) {
      console.error("[Tickets] Fetch error:", error.message);
      throw new Error("Failed to fetch support tickets.");
    }

    return {
      tickets: tickets || [],
      total: count || 0,
      page,
      per_page,
    };
  });

/**
 * Fetch detailed support ticket details including message logs.
 */
export const getTicketDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { ticket_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { ticket_id } = data;

    // 1. Fetch ticket details
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select(`
        *,
        user:user_id (
          display_name,
          email,
          username
        ),
        assignee:assigned_to (
          display_name,
          email,
          username
        )
      `)
      .eq("id", ticket_id)
      .single();

    if (ticketErr) throw new Error("Ticket not found.");

    // 2. Fetch messages
    const { data: messages, error: msgErr } = await supabase
      .from("support_ticket_messages")
      .select(`
        *,
        sender:sender_id (
          display_name,
          email,
          avatar_url
        )
      `)
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });

    if (msgErr) throw new Error("Failed to fetch messages.");

    return {
      ticket,
      messages: messages || [],
    };
  });

/**
 * Create a new support ticket (usually called from customer side contact form).
 */
export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string;
    title: string;
    description: string;
    category: string;
    priority?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { user_id, title, description, category, priority = "normal" } = data;

    // Auto routing by category
    let department = "general";
    if (category === "billing" || category === "payment_issues" || category === "withdrawal_issues" || category === "top_up") {
      department = "finance";
    } else if (category === "verification_issues" || category === "verification") {
      department = "verification";
    } else if (category === "dispute_issues") {
      department = "dispute";
    } else if (category === "fraud_reports") {
      department = "fraud_investigation";
    } else if (category === "technical_issue" || category === "bug" || category === "bug_reports" || category === "technical_problems") {
      department = "technical";
    }

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .insert({
        user_id,
        title,
        description,
        category,
        priority,
        department,
        status: "open",
      })
      .select()
      .single();

    if (ticketErr) {
      console.error("[Tickets] Insert ticket error:", ticketErr.message);
      throw new Error("Failed to create ticket.");
    }

    // Add first message
    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: user_id,
      message: description,
    });

    return { success: true, ticket };
  });

/**
 * Update support ticket status.
 */
export const updateTicketStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { ticket_id: string; status: string; staff_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { ticket_id, status, staff_id } = data;

    const { error: tErr } = await supabase
      .from("support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticket_id);

    if (tErr) throw new Error("Failed to update status.");

    // Log action
    await supabase.from("staff_action_logs").insert({
      staff_id,
      action: "update_ticket_status",
      target_type: "support_ticket",
      target_id: ticket_id,
      new_value: status,
      notes: `Updated status to ${status.toUpperCase()}`,
    });

    // Insert system event message
    await supabase.from("support_ticket_messages").insert({
      ticket_id,
      message: `Ticket status changed to ${status.toUpperCase()}`,
      system_event: true,
    });

    return { success: true };
  });

/**
 * Assign support ticket to an employee or department queue.
 */
export const assignTicket = createServerFn({ method: "POST" })
  .inputValidator((d: {
    ticket_id: string;
    assigned_to: string | null;
    department?: string;
    staff_id: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { ticket_id, assigned_to, department, staff_id } = data;

    const updateFields: any = { updated_at: new Date().toISOString() };
    if (assigned_to !== undefined) updateFields.assigned_to = assigned_to;
    if (department !== undefined) updateFields.department = department;

    const { error: tErr } = await supabase
      .from("support_tickets")
      .update(updateFields)
      .eq("id", ticket_id);

    if (tErr) throw new Error("Failed to assign ticket.");

    // Log action
    await supabase.from("staff_action_logs").insert({
      staff_id,
      action: "assign_support_ticket",
      target_type: "support_ticket",
      target_id: ticket_id,
      new_value: assigned_to || department || "unassigned",
      notes: `Assigned ticket. Employee: ${assigned_to || 'None'}. Department: ${department || 'No Change'}`,
    });

    // Insert system message
    let systemMsg = "Ticket assignments updated.";
    if (assigned_to) {
      // Get assignee name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", assigned_to)
        .single();
      const name = profile?.display_name || profile?.username || "Staff member";
      systemMsg = `Ticket assigned to ${name}`;

      // Insert internal notification for assignee
      await supabase.from("internal_notifications").insert({
        user_id: assigned_to,
        title: "New Ticket Assigned",
        body: `Support ticket #${ticket_id.slice(0, 8)} has been assigned to you.`,
        type: "task",
        link: `/admin/tickets`,
      });
    } else if (department) {
      systemMsg = `Ticket routed to ${department.toUpperCase()} department`;
    }

    await supabase.from("support_ticket_messages").insert({
      ticket_id,
      message: systemMsg,
      system_event: true,
    });

    return { success: true };
  });

/**
 * Add a message reply to support ticket.
 */
export const addTicketReply = createServerFn({ method: "POST" })
  .inputValidator((d: {
    ticket_id: string;
    sender_id: string;
    message: string;
    is_internal?: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { ticket_id, sender_id, message, is_internal = false } = data;

    // 1. Check sender role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sender_id)
      .maybeSingle();

    const isStaffSender = ["staff", "admin", "super_admin", "moderator"].includes(roleRow?.role || "");

    // 2. Insert message
    const { error: msgErr } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id,
        sender_id,
        message,
        is_internal,
      });

    if (msgErr) throw new Error("Failed to post message.");

    // 3. Update ticket updated_at and status
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (!is_internal) {
      updatePayload.status = isStaffSender ? "waiting_for_user" : "waiting_for_staff";
    }

    const { data: ticket } = await supabase
      .from("support_tickets")
      .update(updatePayload)
      .eq("id", ticket_id)
      .select("user_id, title")
      .single();

    // 4. Send email notification if staff replied publicly to user
    if (isStaffSender && !is_internal && ticket) {
      try {
        await triggerNotification({
          data: {
            userId: ticket.user_id,
            kind: "ticket.reply",
            title: "New Support Reply",
            body: `You received a reply on your support ticket "${ticket.title}".`,
            emailPayload: {
              template: "supportReply",
              args: [ticket_id, ticket.title, message],
            },
          },
        });
      } catch (err) {
        console.warn("[Tickets] Notification trigger error:", err);
      }
    }

    return { success: true };
  });

/**
 * Submit CSAT Rating for completed ticket.
 */
export const submitCSATRating = createServerFn({ method: "POST" })
  .inputValidator((d: { ticket_id: string; rating: number; feedback: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { ticket_id, rating, feedback } = data;

    const { error: tErr } = await supabase
      .from("support_tickets")
      .update({
        rating,
        feedback,
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket_id);

    if (tErr) throw new Error("Failed to submit rating.");

    await supabase.from("support_ticket_messages").insert({
      ticket_id,
      message: `User rated the service: ${rating} Stars with feedback: "${feedback}"`,
      system_event: true,
    });

    return { success: true };
  });

/**
 * KB Articles Fetching.
 */
export const getKBArticles = createServerFn({ method: "POST" })
  .inputValidator((d: { category?: string; search?: string; include_unpublished?: boolean }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { category, search, include_unpublished = false } = data;

    let query = supabase.from("kb_articles").select("*");

    if (!include_unpublished) {
      query = query.eq("is_published", true);
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: articles, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error("Failed to fetch KB articles.");
    return articles || [];
  });

/**
 * Create/Update KB article.
 */
export const saveKBArticle = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string;
    category: string;
    title: string;
    content: string;
    is_published: boolean;
    featured?: boolean;
    created_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id, category, title, content, is_published, featured = false, created_by } = data;

    const record: any = { category, title, content, is_published, featured, updated_at: new Date().toISOString() };
    if (id) {
      record.id = id;
    } else {
      record.created_by = created_by;
    }

    const { data: article, error } = await supabase
      .from("kb_articles")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("[KB] Upsert error:", error.message);
      throw new Error("Failed to save article.");
    }

    return { success: true, article };
  });

/**
 * Delete KB article.
 */
export const deleteKBArticle = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id } = data;

    const { error } = await supabase
      .from("kb_articles")
      .delete()
      .eq("id", id);

    if (error) throw new Error("Failed to delete article.");
    return { success: true };
  });

/**
 * Get Support Center Dashboard Metrics & Leaderboards.
 */
export const getSupportStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const [
      totalRes,
      openRes,
      pendingRes,
      resolvedRes,
      closedRes,
      csatRes,
      allTicketsRes,
      staffProfilesRes,
    ] = await Promise.all([
      supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "closed"),
      supabase.from("support_tickets").select("rating").not("rating", "is", null),
      supabase.from("support_tickets").select("id, department, status, assigned_to, rating"),
      supabase.from("profiles").select("id, display_name, username, role"),
    ]);

    // Calculate CSAT Average
    const ratings = (csatRes.data || []).map((t: any) => t.rating).filter(Boolean);
    const csatAverage = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Group by department
    const departmentCounts: Record<string, number> = {};
    (allTicketsRes.data || []).forEach((t: any) => {
      const dept = t.department || "general";
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    // Employee workloads
    const employeeWorkloads = (staffProfilesRes.data || [])
      .filter((p: any) => ["staff", "admin", "super_admin", "moderator"].includes(p.role || ""))
      .map((p: any) => {
        const assigned = (allTicketsRes.data || []).filter((t: any) => t.assigned_to === p.id);
        const open = assigned.filter((t: any) => ["open", "pending", "waiting_for_staff"].includes(t.status || "")).length;
        const resolved = assigned.filter((t: any) => ["resolved", "closed"].includes(t.status || "")).length;
        const ratings = assigned.map((t: any) => t.rating).filter(Boolean);
        const csat = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

        return {
          employee_id: p.id,
          full_name: p.display_name || p.username || "Staff Member",
          role: p.role,
          tasks_assigned: assigned.length,
          tasks_completed: resolved,
          tasks_open: open,
          rating_average: csat,
        };
      });

    return {
      total_tickets: totalRes.count || 0,
      open_tickets: openRes.count || 0,
      pending_tickets: pendingRes.count || 0,
      resolved_tickets: resolvedRes.count || 0,
      closed_tickets: closedRes.count || 0,
      csat_average: csatAverage,
      department_counts: departmentCounts,
      employee_workloads: employeeWorkloads,
    };
  });

/**
 * Fetch domain configuration status.
 */
export const getDomainStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("smtp_configurations")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) return null;
    return data;
  });

/**
 * Update domain configuration status / SMTP credentials.
 */
export const updateSMTPConfig = createServerFn({ method: "POST" })
  .inputValidator((d: {
    provider: string;
    api_key?: string;
    from_email: string;
    reply_to?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_pass?: string;
    domain_verification_status?: string;
    spf_status?: string;
    dkim_status?: string;
    dmarc_status?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("smtp_configurations")
      .upsert({
        id: 1,
        ...data,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[SMTP] Update error:", error.message);
      throw new Error("Failed to update SMTP configurations.");
    }

    return { success: true };
  });
