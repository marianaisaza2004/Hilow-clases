# HiLow Planner

App para generar (con IA) y editar el plan mensual de clases HiLow, a partir del catálogo de
ejercicios del manual y del horario rotativo del estudio.

## Cómo funciona

- **Rotación de enfoques** (`lib/rotation.ts`): dos ciclos independientes corren en paralelo — pierna
  (5 días: Center Glutes → Isquiotibiales → Outer Glutes → Full Lower → Aductores) y tren superior
  (6 días: Hombros → Full Upper → Bíceps → Tríceps → Pecho → Espalda). Cada clase también incluye
  siempre Core/oblicuos.
- **Generación mensual**: el botón "Generar plan del mes" llama a `/api/plans/generate`, que arma un
  prompt con el catálogo completo, la estructura fija de bloques (`lib/class-template.ts`), el enfoque
  de cada día, y el historial de los últimos 2 meses (para variar la selección), y le pide a Claude
  que devuelva el plan estructurado (tool use).
- **Edición**: cualquier coach puede entrar a un día y cambiar los ejercicios de cada bloque desde el
  catálogo existente.
- **Catálogo de ejercicios**: sembrado inicialmente desde `data/exercises-seed.json` (extraído del
  manual PDF). Los coaches pueden subir un manual actualizado (PDF/DOCX) en `/exercises` — la
  extracción es automática pero **siempre requiere revisión manual** antes de mergear al catálogo
  (el parseo de texto libre no es 100% confiable).

## Setup local

1. **Node**: usa `nvm use --lts` (el proyecto no fija versión, cualquier LTS reciente sirve).
2. **Instalar dependencias**: `npm install`.
3. **Variables de entorno**: copia `.env.example` a `.env.local` y rellena:
   - `APP_PASSWORD`: la contraseña compartida que usarán los coaches para entrar.
   - `AUTH_SECRET`: cualquier string largo aleatorio (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: de tu proyecto en [supabase.com](https://supabase.com).
   - `ANTHROPIC_API_KEY`: de [console.anthropic.com](https://console.anthropic.com).
   - `ROTATION_ANCHOR` (opcional): fecha ISO donde el ciclo cae en Center Glutes + Hombros — ajústala
     para que coincida con el rotativo físico real del estudio.
4. **Base de datos**: en el SQL Editor de Supabase, corre `supabase/schema.sql`.
5. **Seed inicial del catálogo**: `npm run seed` (carga `data/exercises-seed.json`).
6. **Correr la app**: `npm run dev` → [http://localhost:3000](http://localhost:3000).

## Deploy

Pensado para Vercel + GitHub: conecta el repo, configura las mismas variables de entorno del paso 3
en el proyecto de Vercel, y despliega. `middleware`/`proxy.ts` corre en runtime Node (no Edge) porque
Next.js 16 lo permite de forma estable.
