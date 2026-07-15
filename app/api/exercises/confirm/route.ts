import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { ParsedCandidate } from "@/lib/parse-exercise-doc";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const uploadId = body?.uploadId as string | undefined;
  const approvedCandidates = body?.approvedCandidates as ParsedCandidate[] | undefined;

  if (!uploadId || !Array.isArray(approvedCandidates)) {
    return NextResponse.json(
      { error: "Body debe incluir { uploadId, approvedCandidates }" },
      { status: 400 }
    );
  }

  const supabase = createServiceSupabaseClient();

  const rows = approvedCandidates.map((c) => ({
    name_es: c.name_es,
    muscle_group_section: c.muscle_group_section ?? "SIN CLASIFICAR",
    muscle_group_primary: [],
    muscle_group_secondary: [],
    level_springs: {},
    duration_min_seconds: c.duration_min_seconds,
    muscular_action: c.muscular_action,
    starting_position: null,
    movement: c.movement,
    modifications: c.modifications,
    amplifications: c.amplifications,
    variations: c.variations,
    related_exercises: [],
    common_errors: c.common_errors,
    focus_notes: null,
    is_minimal_entry: !c.movement,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("exercises").insert(rows);
    if (insertError) throw insertError;
  }

  const { error: updateError } = await supabase
    .from("document_uploads")
    .update({ status: "merged", reviewed_at: new Date().toISOString() })
    .eq("id", uploadId);

  if (updateError) throw updateError;

  return NextResponse.json({ ok: true, inserted: rows.length });
}
