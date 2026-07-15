"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASS_TEMPLATE } from "@/lib/class-template";
import { formatDuration } from "@/lib/format";
import type { PlanDayRow } from "@/lib/plans";
import type { ExerciseRow } from "@/lib/exercise-catalog";

type ExerciseRef = { exercise_id: string; name_es: string; duration_seconds: number; sequence_note?: string };
type Blocks = Record<string, ExerciseRef[]>;

export function DayEditor({
  plan,
  catalog,
  year,
  month,
}: {
  plan: PlanDayRow;
  catalog: ExerciseRow[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Blocks>(plan.blocks);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const catalogById = new Map(catalog.map((ex) => [ex.id, ex]));

  function swapExercise(blockKey: string, index: number, newExerciseId: string) {
    const newExercise = catalogById.get(newExerciseId);
    if (!newExercise) return;
    setBlocks((prev) => {
      const updated = [...prev[blockKey]];
      updated[index] = {
        ...updated[index],
        exercise_id: newExercise.id,
        name_es: newExercise.name_es,
        duration_seconds: newExercise.duration_min_seconds ?? updated[index].duration_seconds,
      };
      return { ...prev, [blockKey]: updated };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/plans/day", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, dayNumber: plan.day_number, blocks }),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      setSavedAt(Date.now());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Día {plan.day_number}</h1>
          <p className="text-sm text-neutral-400">
            Pierna: {plan.lower_focus} · Torso: {plan.upper_focus}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-sm text-emerald-400">Guardado ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {CLASS_TEMPLATE.map((block) => {
          const exercises = blocks[block.key] ?? [];
          const relevantCatalog = catalog.filter((ex) =>
            block.key === "pierna_izquierda" || block.key === "pierna_derecha"
              ? ex.muscle_group_section === "TREN INFERIOR"
              : block.key === "tren_superior"
                ? ["BÍCEPS", "TRÍCEPS", "PECHO", "HOMBROS", "ESPALDA"].includes(ex.muscle_group_section)
                : block.key === "core" || block.key === "oblicuos"
                  ? ex.muscle_group_section === "CORE"
                  : true
          );

          return (
            <div key={block.key} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className={block.key === "shavasana" ? "" : "mb-3"}>
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-white">{block.label}</h2>
                  <span className="text-xs text-neutral-500">{block.durationMinutes} min</span>
                </div>
                {block.key === "shavasana" && (
                  <p className="mt-1 text-sm text-neutral-500">{block.notes}</p>
                )}
              </div>
              {block.key !== "shavasana" && (
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-neutral-800/60 p-3">
                    <select
                      value={ex.exercise_id}
                      onChange={(e) => swapExercise(block.key, i, e.target.value)}
                      className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-white"
                    >
                      {!catalogById.has(ex.exercise_id) && (
                        <option value={ex.exercise_id}>{ex.name_es}</option>
                      )}
                      {relevantCatalog.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name_es}
                        </option>
                      ))}
                    </select>
                    <span className="w-24 text-right text-xs text-neutral-500">
                      {formatDuration(ex.duration_seconds)}
                    </span>
                  </div>
                ))}
                {exercises.length === 0 && (
                  <p className="text-sm text-neutral-600">Sin ejercicios en este bloque.</p>
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
