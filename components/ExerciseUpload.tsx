"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Candidate {
  name_es: string;
  muscle_group_section: string | null;
  duration_min_seconds: number | null;
  muscular_action: string | null;
  movement: string | null;
  modifications: string | null;
  amplifications: string | null;
  variations: string | null;
  common_errors: string | null;
  raw_excerpt: string;
}

const SECTIONS = ["TREN INFERIOR", "CORE", "BÍCEPS", "TRÍCEPS", "PECHO", "HOMBROS", "ESPALDA", "SIN CLASIFICAR"];

export function ExerciseUpload() {
  const router = useRouter();
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [included, setIncluded] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/exercises/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir el archivo");
      setUploadId(data.uploadId);
      setCandidates(data.candidates);
      setIncluded(data.candidates.map(() => true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function updateCandidate(i: number, field: keyof Candidate, value: string | number | null) {
    setCandidates((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  async function handleConfirm() {
    if (!uploadId) return;
    setLoading(true);
    setError(null);
    try {
      const approvedCandidates = candidates.filter((_, i) => included[i]);
      const res = await fetch("/api/exercises/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, approvedCandidates }),
      });
      if (!res.ok) throw new Error("No se pudo confirmar el import");
      setUploadId(null);
      setCandidates([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  if (!uploadId) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <label className="block text-sm font-medium text-white">
          Subir manual actualizado (PDF o DOCX)
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            disabled={loading}
            className="mt-2 block w-full text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-white hover:file:bg-orange-600"
          />
        </label>
        {loading && <p className="mt-3 text-sm text-neutral-400">Leyendo documento...</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="mb-4 text-sm text-neutral-400">
        Extracción automática (aproximada) — revisa y corrige cada campo antes de confirmar. Solo se
        importan los ejercicios marcados.
      </p>
      <div className="space-y-3">
        {candidates.map((c, i) => (
          <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={included[i]}
                onChange={(e) =>
                  setIncluded((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
                }
                className="mt-2"
              />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={c.name_es}
                  onChange={(e) => updateCandidate(i, "name_es", e.target.value)}
                  placeholder="Nombre del ejercicio"
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white"
                />
                <select
                  value={c.muscle_group_section ?? "SIN CLASIFICAR"}
                  onChange={(e) => updateCandidate(i, "muscle_group_section", e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={c.duration_min_seconds ?? ""}
                  onChange={(e) =>
                    updateCandidate(i, "duration_min_seconds", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="Duración mínima (segundos)"
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white sm:col-span-2"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Importando..." : `Confirmar e importar (${included.filter(Boolean).length})`}
        </button>
        <button
          onClick={() => {
            setUploadId(null);
            setCandidates([]);
          }}
          className="text-sm text-neutral-400 hover:text-white"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
