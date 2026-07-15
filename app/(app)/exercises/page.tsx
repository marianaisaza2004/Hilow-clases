import { isSupabaseConfigured } from "@/lib/supabase";
import { SetupNotice } from "@/components/SetupNotice";
import { getFullCatalog } from "@/lib/exercise-catalog";
import { ExerciseUpload } from "@/components/ExerciseUpload";

export default async function ExercisesPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const catalog = await getFullCatalog();
  const bySection = new Map<string, typeof catalog>();
  for (const ex of catalog) {
    const list = bySection.get(ex.muscle_group_section) ?? [];
    list.push(ex);
    bySection.set(ex.muscle_group_section, list);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-white">Catálogo de ejercicios</h1>

      <div className="mb-8">
        <ExerciseUpload />
      </div>

      {catalog.length === 0 ? (
        <p className="text-neutral-400">
          El catálogo está vacío. Corre <code className="rounded bg-black/30 px-1">npm run seed</code> o
          sube el manual arriba.
        </p>
      ) : (
        <div className="space-y-8">
          {[...bySection.entries()].map(([section, exercises]) => (
            <div key={section}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                {section}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {exercises.map((ex) => (
                  <div key={ex.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                    <div className="font-medium text-white">{ex.name_es}</div>
                    {ex.name_en && <div className="text-xs text-neutral-500">{ex.name_en}</div>}
                    {ex.muscular_action && (
                      <div className="mt-2 text-xs text-neutral-400">Acción: {ex.muscular_action}</div>
                    )}
                    {ex.duration_min_seconds && (
                      <div className="text-xs text-neutral-400">
                        Duración mín.: {Math.round(ex.duration_min_seconds / 60)} min
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
