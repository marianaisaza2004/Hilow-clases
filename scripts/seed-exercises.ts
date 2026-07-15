// One-off script: loads data/exercises-seed.json into the `exercises` table.
// Usage: npm run seed
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: path.join(process.cwd(), ".env.local") });

interface SeedExercise {
  name_es: string;
  name_en: string | null;
  muscle_group_section: string;
  muscle_group_primary: string[];
  muscle_group_secondary: string[];
  level_springs: { basico: string | null; intermedio: string | null; avanzado: string | null };
  duration_min_seconds: number | null;
  muscular_action: string | null;
  starting_position: string | null;
  movement: string | null;
  cues_considerations: string | null;
  modifications: string | null;
  amplifications: string | null;
  variations: string | null;
  related_exercises: string[];
  common_errors: string | null;
  focus_notes: string | null;
  source_page_range: [number, number] | null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local.\n" +
        "Create your Supabase project, run supabase/schema.sql in its SQL editor, then fill in .env.local before seeding."
    );
    process.exit(1);
  }

  const seedPath = path.join(process.cwd(), "data", "exercises-seed.json");
  const raw = readFileSync(seedPath, "utf-8");
  const exercises: SeedExercise[] = JSON.parse(raw);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const rows = exercises.map((ex) => ({
    name_es: ex.name_es,
    name_en: ex.name_en,
    muscle_group_section: ex.muscle_group_section,
    muscle_group_primary: ex.muscle_group_primary ?? [],
    muscle_group_secondary: ex.muscle_group_secondary ?? [],
    level_springs: ex.level_springs ?? {},
    duration_min_seconds: ex.duration_min_seconds,
    muscular_action: ex.muscular_action,
    starting_position: ex.starting_position,
    movement: ex.movement,
    cues_considerations: ex.cues_considerations,
    modifications: ex.modifications,
    amplifications: ex.amplifications,
    variations: ex.variations,
    related_exercises: ex.related_exercises ?? [],
    common_errors: ex.common_errors,
    focus_notes: ex.focus_notes,
    source_page_range: ex.source_page_range
      ? `[${ex.source_page_range[0]},${ex.source_page_range[1]}]`
      : null,
    is_minimal_entry: !ex.movement && !ex.starting_position,
  }));

  const { error, count } = await supabase.from("exercises").insert(rows, { count: "exact" });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${count ?? rows.length} exercises.`);
}

main();
