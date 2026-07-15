import "server-only";

export interface ParsedCandidate {
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

const KNOWN_SECTIONS = ["TREN INFERIOR", "CORE", "BÍCEPS", "TRÍCEPS", "PECHO", "HOMBROS", "ESPALDA"];

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromUpload(buffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return extractPdfText(buffer);
  if (lower.endsWith(".docx")) return extractDocxText(buffer);
  throw new Error("Formato no soportado. Sube un PDF o DOCX.");
}

function normalize(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

function grabLine(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}\\s*:?\\s*([^\\n]+)`, "i"));
  return match ? match[1].trim() : null;
}

function parseMinDuration(text: string): number | null {
  const match = text.match(/Duraci[oó]n m[ií]nima:?\s*(\d+)\s*minutos?/i);
  if (match) return Number(match[1]) * 60;
  const secMatch = text.match(/(?:al menos|m[ií]nimo de)?\s*(\d+)\s*segundos/i);
  if (secMatch) return Number(secMatch[1]);
  return null;
}

/**
 * Best-effort extraction of exercise blocks from an uploaded HiLow manual
 * (PDF/DOCX). This is intentionally approximate — free-text parsing of a
 * document that mixes multiple templates can't be 100% reliable, so every
 * candidate this produces MUST be reviewed by a coach before merging into
 * the live catalog (see app/api/exercises/confirm).
 */
export function parseExerciseDocument(rawText: string): ParsedCandidate[] {
  const text = normalize(rawText);

  // Split on the two known per-exercise markers (template A: "Nivel ... Básico",
  // template B: "RESORTES:" + "POSICIÓN BÁSICA DEL CUERPO:").
  const markerRegex = /(Nivel\s+B[aá]sico|RESORTES:\s*\n?.*POSICI[OÓ]N B[AÁ]SICA DEL CUERPO:)/gi;
  const markers = [...text.matchAll(markerRegex)];

  if (markers.length === 0) return [];

  const candidates: ParsedCandidate[] = [];
  let currentSection: string | null = null;

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index ?? 0;
    const end = i + 1 < markers.length ? (markers[i + 1].index ?? text.length) : text.length;

    // Look a bit before the marker for the exercise name (short caps line) and
    // any section header (TREN INFERIOR, CORE, etc.) crossed since the last block.
    const before = text.slice(Math.max(0, start - 400), start);
    const beforeLines = before
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of beforeLines) {
      const sectionMatch = KNOWN_SECTIONS.find((s) => line.toUpperCase() === s);
      if (sectionMatch) currentSection = sectionMatch;
    }

    // Exercise names appear as a contiguous run of short ALL-CAPS lines right
    // before the marker (Spanish name, then often an English name below it).
    const capsLineRun: string[] = [];
    for (const line of [...beforeLines].reverse()) {
      const isCapsName =
        line.length > 2 &&
        line.length < 60 &&
        line === line.toUpperCase() &&
        /[A-ZÁÉÍÓÚÑ]/.test(line) &&
        !KNOWN_SECTIONS.includes(line);
      if (isCapsName) {
        capsLineRun.unshift(line);
      } else if (capsLineRun.length > 0) {
        break;
      }
    }
    const nameLine = capsLineRun.length > 0 ? capsLineRun.join(" / ") : null;

    const block = text.slice(start, Math.min(end, start + 2500));

    candidates.push({
      name_es: nameLine ?? "(nombre no detectado — revisar)",
      muscle_group_section: currentSection,
      duration_min_seconds: parseMinDuration(block),
      muscular_action: grabLine(block, "Acci[oó]n\\s+m[uú]scular"),
      movement: grabLine(block, "Movimiento"),
      modifications: grabLine(block, "Modificaciones"),
      amplifications: grabLine(block, "Amplificaciones"),
      variations: grabLine(block, "Variaciones"),
      common_errors: grabLine(block, "Errores\\s+comunes"),
      raw_excerpt: block.slice(0, 600),
    });
  }

  return candidates;
}
