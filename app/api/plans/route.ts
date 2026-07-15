import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Query params ?year=&month= son requeridos" }, { status: 400 });
  }

  const planMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("monthly_plans")
    .select("*")
    .eq("plan_month", planMonth)
    .order("day_number", { ascending: true });

  if (error) throw error;

  return NextResponse.json({ planMonth, days: data ?? [] });
}
