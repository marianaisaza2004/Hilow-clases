import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { year, month, dayNumber, blocks, editedBy } = body ?? {};

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(dayNumber) || !blocks) {
    return NextResponse.json(
      { error: "Body debe incluir { year, month, dayNumber, blocks }" },
      { status: 400 }
    );
  }

  const planMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("monthly_plans")
    .update({
      blocks,
      last_edited_by: typeof editedBy === "string" ? editedBy : null,
      last_edited_at: new Date().toISOString(),
    })
    .eq("plan_month", planMonth)
    .eq("day_number", dayNumber);

  if (error) throw error;

  return NextResponse.json({ ok: true });
}
