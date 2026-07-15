export function SetupNotice() {
  return (
    <div className="rounded-xl border border-orange-900/50 bg-orange-950/30 p-6 text-sm text-orange-200">
      <p className="mb-2 font-medium text-orange-100">Falta configurar Supabase.</p>
      <ol className="list-inside list-decimal space-y-1">
        <li>
          Crea un proyecto en{" "}
          <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline">
            supabase.com
          </a>
          .
        </li>
        <li>
          Corre <code className="rounded bg-black/30 px-1">supabase/schema.sql</code> en su editor SQL.
        </li>
        <li>
          Rellena <code className="rounded bg-black/30 px-1">.env.local</code> con la URL y las keys del
          proyecto.
        </li>
        <li>
          Corre <code className="rounded bg-black/30 px-1">npm run seed</code> para cargar el catálogo
          inicial de ejercicios.
        </li>
      </ol>
    </div>
  );
}
