import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { LowerFocus, UpperFocus } from "@/lib/rotation";

const UPPER_FOCUS_TO_SECTIONS: Record<UpperFocus, string[]> = {
  Biceps: ["BÍCEPS"],
  Triceps: ["TRÍCEPS"],
  Pecho: ["PECHO"],
  Hombros: ["HOMBROS"],
  Espalda: ["ESPALDA"],
  "Full Upper": ["BÍCEPS", "TRÍCEPS", "PECHO", "HOMBROS", "ESPALDA"],
};

export interface ExerciseRow {
  id: string;
  name_es: string;
  name_en: string | null;
  muscle_group_section: string;
  muscle_group_primary: string[];
  muscle_group_secondary: string[];
  level_springs: Record<string, string | null>;
  duration_min_seconds: number | null;
  muscular_action: string | null;
  starting_position: string | null;
  movement: string | null;
  variations: string | null;
  is_minimal_entry: boolean;
}

const ALL_SECTIONS = ["TREN INFERIOR", "CORE", "BÍCEPS", "TRÍCEPS", "PECHO", "HOMBROS", "ESPALDA"];

/** Fetches the whole usable catalog (all sections a class ever pulls from) in one query. */
export async function getFullCatalog(): Promise<ExerciseRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id,name_es,name_en,muscle_group_section,muscle_group_primary,muscle_group_secondary,level_springs,duration_min_seconds,muscular_action,starting_position,movement,variations,is_minimal_entry"
    )
    .in("muscle_group_section", ALL_SECTIONS)
    .eq("is_minimal_entry", false);

  if (error) throw error;
  return (data ?? []) as ExerciseRow[];
}

/**
 * Fetches the candidate pool for a day's rotating focus. Lower-body always
 * pulls the whole "TREN INFERIOR" section — the specific lowerFocus (e.g.
 * "Center Glutes") isn't a separate catalog section, it's a coaching emphasis
 * within shared exercises (see each exercise's focus_notes), so Claude needs
 * the full section to pick and weight appropriately. Upper-body narrows to
 * the relevant section(s) since those genuinely are separate catalog sections.
 */
export async function getCandidatePools(lowerFocus: LowerFocus, upperFocus: UpperFocus) {
  const supabase = createServiceSupabaseClient();

  const [{ data: lower, error: lowerErr }, { data: core, error: coreErr }, { data: upper, error: upperErr }] =
    await Promise.all([
      supabase
        .from("exercises")
        .select(
          "id,name_es,name_en,muscle_group_section,muscle_group_primary,muscle_group_secondary,level_springs,duration_min_seconds,muscular_action,starting_position,movement,variations,is_minimal_entry"
        )
        .eq("muscle_group_section", "TREN INFERIOR")
        .eq("is_minimal_entry", false),
      supabase
        .from("exercises")
        .select(
          "id,name_es,name_en,muscle_group_section,muscle_group_primary,muscle_group_secondary,level_springs,duration_min_seconds,muscular_action,starting_position,movement,variations,is_minimal_entry"
        )
        .eq("muscle_group_section", "CORE")
        .eq("is_minimal_entry", false),
      supabase
        .from("exercises")
        .select(
          "id,name_es,name_en,muscle_group_section,muscle_group_primary,muscle_group_secondary,level_springs,duration_min_seconds,muscular_action,starting_position,movement,variations,is_minimal_entry"
        )
        .in("muscle_group_section", UPPER_FOCUS_TO_SECTIONS[upperFocus])
        .eq("is_minimal_entry", false),
    ]);

  if (lowerErr) throw lowerErr;
  if (coreErr) throw coreErr;
  if (upperErr) throw upperErr;

  return {
    lower: (lower ?? []) as ExerciseRow[],
    core: (core ?? []) as ExerciseRow[],
    upper: (upper ?? []) as ExerciseRow[],
  };
}
