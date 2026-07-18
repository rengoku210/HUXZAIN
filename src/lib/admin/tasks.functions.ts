"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

/**
 * Fetch all staff tasks with assigned employee profile info.
 */
export const getStaffTasks = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("staff_tasks")
      .select(`
        *,
        profiles:assigned_to (
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Tasks] Fetch staff tasks error:", error.message);
      throw new Error("Failed to fetch staff tasks.");
    }

    return data;
  });

/**
 * Create a new staff task and notify the assignee.
 */
export const createStaffTask = createServerFn({ method: "POST" })
  .inputValidator((d: {
    title: string;
    description: string;
    priority: string;
    assigned_to: string;
    department: string;
    due_date?: string;
    notes: string;
    created_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { title, description, priority, assigned_to, department, due_date, notes, created_by } = data;

    // 1. Insert the task
    const { data: task, error: taskErr } = await supabase
      .from("staff_tasks")
      .insert({
        title,
        description,
        priority,
        assigned_to,
        department,
        due_date: due_date || null,
        notes,
        created_by,
        status: "pending",
      })
      .select()
      .single();

    if (taskErr) {
      console.error("[Tasks] Create staff task error:", taskErr.message);
      throw new Error("Failed to create staff task.");
    }

    // 2. Insert task history entry
    await supabase.from("staff_task_history").insert({
      task_id: task.id,
      status_to: "pending",
      changed_by: created_by,
      notes: "Task created",
    });

    // 3. Notify the assignee
    await supabase.from("internal_notifications").insert({
      user_id: assigned_to,
      title: "New Task Assigned",
      body: `You have been assigned a new task: "${title}"`,
      type: "task",
      category: "general",
      link: "/admin/tasks",
    });

    return { success: true, task };
  });

/**
 * Update a staff task's status.
 */
export const updateStaffTaskStatus = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    status: string;
    notes: string;
    changed_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id, status, notes, changed_by } = data;

    const updatePayload: any = { status };
    if (status === "completed") {
      updatePayload.completed_at = new Date().toISOString();
    }

    // 1. Update the task
    const { error: updateErr } = await supabase
      .from("staff_tasks")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      console.error("[Tasks] Update task status error:", updateErr.message);
      throw new Error("Failed to update task status.");
    }

    // 2. Insert task history
    await supabase.from("staff_task_history").insert({
      task_id: id,
      status_to: status,
      changed_by,
      notes: notes || `Status changed to ${status}`,
    });

    return { success: true };
  });

/**
 * Get performance statistics for each employee.
 */
export const getStaffPerformanceStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Fetch all employees
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, full_name, department, role");

    if (empErr) {
      console.error("[Tasks] Fetch employees error:", empErr.message);
      throw new Error("Failed to fetch employees.");
    }

    // Fetch all tasks
    const { data: tasks, error: taskErr } = await supabase
      .from("staff_tasks")
      .select("assigned_to, status, due_date");

    if (taskErr) {
      console.error("[Tasks] Fetch tasks error:", taskErr.message);
      throw new Error("Failed to fetch tasks.");
    }

    const now = new Date().toISOString();

    const stats = (employees || []).map((emp: any) => {
      const empTasks = (tasks || []).filter((t: any) => t.assigned_to === emp.id);
      const tasksCompleted = empTasks.filter((t: any) => t.status === "completed").length;
      const tasksAssigned = empTasks.length;
      const tasksOverdue = empTasks.filter(
        (t: any) => t.status !== "completed" && t.due_date && t.due_date < now
      ).length;

      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        department: emp.department,
        role: emp.role,
        tasks_completed: tasksCompleted,
        tasks_assigned: tasksAssigned,
        tasks_overdue: tasksOverdue,
      };
    });

    return stats;
  });

/**
 * Fetch all role permissions.
 */
export const getRolePermissions = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("role_permissions")
      .select("*");

    if (error) {
      console.error("[Tasks] Fetch role permissions error:", error.message);
      throw new Error("Failed to fetch role permissions.");
    }

    return data;
  });

/**
 * Update permissions for a specific role.
 */
export const updateRolePermissions = createServerFn({ method: "POST" })
  .inputValidator((d: { role: string; permissions: string[] }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("role_permissions")
      .update({ permissions: data.permissions })
      .eq("role", data.role);

    if (error) {
      console.error("[Tasks] Update role permissions error:", error.message);
      throw new Error("Failed to update role permissions.");
    }

    return { success: true };
  });

/**
 * Fetch internal notifications for a specific user.
 */
export const getInternalNotifications = createServerFn({ method: "POST" })
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data: notifications, error } = await supabase
      .from("internal_notifications")
      .select("*")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Tasks] Fetch notifications error:", error.message);
      throw new Error("Failed to fetch notifications.");
    }

    return notifications;
  });

/**
 * Mark a notification as read.
 */
export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("internal_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id);

    if (error) {
      console.error("[Tasks] Mark notification read error:", error.message);
      throw new Error("Failed to mark notification as read.");
    }

    return { success: true };
  });
