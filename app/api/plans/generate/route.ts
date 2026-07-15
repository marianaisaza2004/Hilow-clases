import { NextRequest, NextResponse } from "next/server";
import { getMonthFocuses, type DayFocus } from "@/lib/rotation";
import { CLASS_TEMPLATE } from "@/lib/class-template";
import { getFullCatalog, type ExerciseRow } from "@/lib/exercise-catalog";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

const BLOCK_KEYS = CLASS_TEMPLATE.map((b) => b.key);
// Shavasana is just "lie down, breathe" — there's no meaningful exercise to pick
// from the strength catalog for it, so Claude isn't asked to fill it at all.
const GENERATED_BLOCK_KEYS = BLOCK_KEYS.filter((key) => key !== "shavasana");
const CHUNK_SIZE = 4; // small chunks so 7-8 calls/month stay well under max_tokens each.

const EXERCISE_REF_SCHEMA = {
  type: "object" as const,
  properties: {
    ref: { type: "string", description: "Referencia corta del catálogo, ej. 'e23'" },
    duration_seconds: { type: "number" },
    note: {
      type: "string",
      description: "Nota MUY breve (máx. 8 palabras) de variación/amplificación. Omitir si no aporta.",
    },
  },
  required: ["ref", "duration_seconds"],
};

const DAY_PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    day_number: { type: "number" },
    blocks: {
      type: "object" as const,
      properties: Object.fromEntries(
        GENERATED_BLOCK_KEYS.map((key) => [key, { type: "array", items: EXERCISE_REF_SCHEMA }])
      ),
      required: GENERATED_BLOCK_KEYS,
    },
  },
  required: ["day_number", "blocks"],
};

const SUBMIT_PLAN_TOOL: Anthropic.Tool = {
  name: "submit_days_plan",
  description: "Entrega el plan de clases HiLow para el tramo de días pedido.",
  input_schema: {
    type: "object",
    properties: {
      days: { type: "array", items: DAY_PLAN_SCHEMA },
    },
    required: ["days"],
  },
};

type RawExerciseRef = { ref: string; duration_seconds: number; note?: string };
type GeneratedDay = { day_number: number; blocks: Record<string, RawExerciseRef[]> };
type ResolvedDay = { day_number: number; blocks: Record<string, { exercise_id: string; name_es: string; duration_seconds: number; sequence_note?: string }[]> };

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/** Short stable refs (e1, e2, ...) so Claude doesn't have to echo full UUIDs back, which was blowing past max_tokens. */
function buildRefMap(catalog: ExerciseRow[]) {
  const refToExercise = new Map<string, ExerciseRow>();
  catalog.forEach((ex, i) => refToExercise.set(`e${i + 1}`, ex));
  return refToExercise;
}

function buildPrompt(params: {
  year: number;
  month: number;
  chunkDays: DayFocus[];
  refToExercise: Map<string, ExerciseRow>;
  monthSoFar: GeneratedDay[];
  recentHistory: { day_number: number; lower_focus: string; upper_focus: string; blocks: unknown }[];
}) {
  const { year, month, chunkDays, refToExercise, monthSoFar, recentHistory } = params;

  const catalogForPrompt = [...refToExercise.entries()].map(([ref, ex]) => ({
    ref,
    name_es: ex.name_es,
    section: ex.muscle_group_section,
    primary: ex.muscle_group_primary,
    secondary: ex.muscle_group_secondary,
    min_duration_seconds: ex.duration_min_seconds,
  }));

  return `Eres el coordinador de programación del estudio HiLow (entrenamiento tipo Lagree/megaformer). Genera el plan de clases para el tramo de días indicado de ${month}/${year}.

PRINCIPIOS DEL MÉTODO (deben respetarse en cada bloque):
- Tiempo bajo tensión (TUT): cada ejercicio se guía un mínimo de 60-120 segundos continuos.
- Tempo lento y controlado (4 tiempos abajo, 4 tiempos arriba).
- Fatigar un grupo muscular por completo antes de pasar al siguiente (no alternar).
- Cada clase incluye SIEMPRE Core y Oblicuos, sin importar el enfoque del día.
- Los bloques de pierna (Pierna Izquierda / Pierna Derecha) tocan los 4 sub-grupos (Center Glutes, Outer Glutes, Isquios, Aductores) en cada clase, pero el "enfoque principal" del día (ver más abajo) debe dominar esos bloques — los otros sub-grupos aparecen de forma complementaria y más breve.
- Igual para Tren Superior: si el enfoque del día es un solo músculo (ej. Bíceps), ese músculo domina el bloque; si es "Full Upper", se reparte entre los 5 grupos de tren superior.
- Varía la selección de ejercicios entre días con el mismo enfoque y respecto a días/meses anteriores (abajo) para que las clases se sientan dinámicas, sin sacrificar los principios anteriores.

ESTRUCTURA FIJA DE BLOQUES POR CLASE (usa exactamente estas claves en "blocks" — NO incluyas "shavasana", ese bloque no lleva ejercicios, es solo acostarse y respirar):
${GENERATED_BLOCK_KEYS.map((key) => CLASS_TEMPLATE.find((b) => b.key === key)!).map((b) => `- "${b.key}" (${b.label}, ${b.durationMinutes} min): ${b.focusDescription}. ${b.notes}`).join("\n")}

CATÁLOGO DE EJERCICIOS DISPONIBLES — usa SOLO el campo "ref" (ej. "e23") para referenciarlos, nunca el nombre completo:
${JSON.stringify(catalogForPrompt)}

DÍAS A GENERAR EN ESTA LLAMADA (enfoque fijo, no lo cambies — solo elige los ejercicios):
${chunkDays.map((d) => `Día ${d.dayNumber}: enfoque principal pierna = "${d.lowerFocus}", enfoque principal tren superior = "${d.upperFocus}"`).join("\n")}

${
  monthSoFar.length > 0
    ? `DÍAS YA GENERADOS ANTES EN ESTE MISMO MES (para no repetir la misma selección) — solo refs y duración:\n${JSON.stringify(monthSoFar)}`
    : ""
}

${
  recentHistory.length > 0
    ? `EJERCICIOS USADOS RECIENTEMENTE (meses anteriores) PARA LOS MISMOS ENFOQUES — evita repetir la misma selección exacta cuando sea razonable:\n${JSON.stringify(recentHistory)}`
    : "No hay historial de meses anteriores todavía."
}

Llama a la herramienta submit_days_plan SOLO con los días listados arriba (${chunkDays.map((d) => d.dayNumber).join(", ")}). Cada ejercicio de cada bloque debe llevar únicamente "ref" (del catálogo de arriba), "duration_seconds", y opcionalmente "note" muy breve (máx. 8 palabras, solo si aporta algo no obvio). Sé conciso — no repitas nombres ni texto del catálogo.`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const year = Number(body?.year);
  const month = Number(body?.month);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Body debe incluir { year, month } válidos" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const days = getMonthFocuses(year, month);
  const catalog = await getFullCatalog();

  if (catalog.length === 0) {
    return NextResponse.json(
      { error: "El catálogo de ejercicios está vacío. Corre el seed o sube el manual primero." },
      { status: 409 }
    );
  }

  const refToExercise = buildRefMap(catalog);

  const twoMonthsAgo = new Date(Date.UTC(year, month - 1, 1));
  twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
  const { data: history, error: historyError } = await supabase
    .from("monthly_plans")
    .select("day_number,lower_focus,upper_focus,blocks")
    .gte("plan_month", twoMonthsAgo.toISOString().slice(0, 10))
    .lt("plan_month", new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10));

  if (historyError) throw historyError;

  const anthropic = getAnthropicClient();
  const planMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const dayFocusByNumber = new Map(days.map((d) => [d.dayNumber, d]));

  const monthSoFar: GeneratedDay[] = [];
  const allRows: {
    plan_month: string;
    day_number: number;
    lower_focus: string;
    upper_focus: string;
    blocks: ResolvedDay["blocks"];
    generated_at: string;
  }[] = [];

  for (const chunkDays of chunk(days, CHUNK_SIZE)) {
    const prompt = buildPrompt({
      year,
      month,
      chunkDays,
      refToExercise,
      monthSoFar,
      recentHistory: history ?? [],
    });

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      tools: [SUBMIT_PLAN_TOOL],
      tool_choice: { type: "tool", name: "submit_days_plan" },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          error: `Claude cortó la respuesta por límite de tokens generando los días ${chunkDays
            .map((d) => d.dayNumber)
            .join(", ")}. Ya se guardaron los días anteriores (${monthSoFar.length}); intenta generar de nuevo (los días ya generados no se vuelven a pedir si vuelves a correrlo después de bajar CHUNK_SIZE).`,
        },
        { status: 502 }
      );
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUse) {
      return NextResponse.json(
        { error: `Claude no devolvió un plan estructurado para los días ${chunkDays.map((d) => d.dayNumber).join(", ")}` },
        { status: 502 }
      );
    }

    const { days: generatedDays } = toolUse.input as { days: GeneratedDay[] };

    if (!Array.isArray(generatedDays)) {
      return NextResponse.json(
        { error: "La respuesta de Claude no tuvo la forma esperada (falta 'days')" },
        { status: 502 }
      );
    }

    for (const gd of generatedDays) {
      const focus = dayFocusByNumber.get(gd.day_number);
      const resolvedBlocks: ResolvedDay["blocks"] = {};

      for (const blockKey of BLOCK_KEYS) {
        const refs = gd.blocks[blockKey] ?? [];
        resolvedBlocks[blockKey] = refs
          .map((r) => {
            const exercise = refToExercise.get(r.ref);
            if (!exercise) return null;
            return {
              exercise_id: exercise.id,
              name_es: exercise.name_es,
              duration_seconds: r.duration_seconds,
              sequence_note: r.note,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
      }

      allRows.push({
        plan_month: planMonth,
        day_number: gd.day_number,
        lower_focus: focus?.lowerFocus ?? "",
        upper_focus: focus?.upperFocus ?? "",
        blocks: resolvedBlocks,
        generated_at: new Date().toISOString(),
      });
      monthSoFar.push(gd);
    }
  }

  const { error: upsertError } = await supabase
    .from("monthly_plans")
    .upsert(allRows, { onConflict: "plan_month,day_number" });

  if (upsertError) throw upsertError;

  return NextResponse.json({ ok: true, planMonth, daysGenerated: allRows.length });
}
