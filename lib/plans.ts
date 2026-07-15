import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase";

export interface PlanDayRow {
  id: string;
  plan_month: string;
  day_number: number;
  lower_focus: string;
  upper_focus: string;
  blocks: Record<string, { exercise_id: string; name_es: string; duration_seconds: number; sequence_note?: string }[]>;
  generated_at: string;
  last_edited_by: string | null;
  last_edited_at: string | null;
}

function planMonthKey(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
}

export async function getPlanForMonth(year: number, month: number): Promise<PlanDayRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("monthly_plans")
    .select("*")
    .eq("plan_month", planMonthKey(year, month))
    .order("day_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PlanDayRow[];
}

export async function getPlanForDay(year: number, month: number, day: number): Promise<PlanDayRow | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("monthly_plans")
    .select("*")
    .eq("plan_month", planMonthKey(year, month))
    .eq("day_number", day)
    .maybeSingle();

  if (error) throw error;
  return data as PlanDayRow | null;
}
