import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { extractTextFromUpload, parseExerciseDocument } from "@/lib/parse-exercise-doc";

const BUCKET = "manual-uploads";

async function ensureBucket(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
    return NextResponse.json({ error: "Solo se aceptan archivos PDF o DOCX" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text: string;
  try {
    text = await extractTextFromUpload(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo leer el archivo" },
      { status: 422 }
    );
  }

  const candidates = parseExerciseDocument(text);

  const supabase = createServiceSupabaseClient();
  await ensureBucket(supabase);

  const storagePath = `${Date.now()}-${file.name}`;
  const { error: storageError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type || undefined,
  });
  if (storageError) throw storageError;

  const { data: uploadRow, error: insertError } = await supabase
    .from("document_uploads")
    .insert({
      file_name: file.name,
      storage_path: storagePath,
      status: "pending_review",
      parsed_candidates: candidates,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return NextResponse.json({ uploadId: uploadRow.id, candidates });
}
