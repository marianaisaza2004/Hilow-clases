import Link from "next/link";
import { getMonthFocuses } from "@/lib/rotation";
import { getPlanForMonth } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SetupNotice } from "@/components/SetupNotice";
import { GenerateMonthButton } from "@/components/GenerateMonthButton";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function monthNav(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getUTCFullYear();
  const month = Number(params.month) || now.getUTCMonth() + 1;

  const days = getMonthFocuses(year, month);
  const planDays = await getPlanForMonth(year, month);
  const planByDay = new Map(planDays.map((d) => [d.day_number, d]));

  const prev = monthNav(year, month, -1);
  const next = monthNav(year, month, 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard?year=${prev.year}&month=${prev.month}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ← Anterior
          </Link>
          <h1 className="text-xl font-semibold text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h1>
          <Link
            href={`/dashboard?year=${next.year}&month=${next.month}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Siguiente →
          </Link>
        </div>
        {planDays.length === 0 && <GenerateMonthButton year={year} month={month} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {days.map((d) => {
          const plan = planByDay.get(d.dayNumber);
          return (
            <Link
              key={d.dayNumber}
              href={`/dashboard/${d.dayNumber}?year=${year}&month=${month}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-orange-500/50 hover:bg-neutral-800"
            >
              <div className="mb-2 text-lg font-semibold text-white">{d.dayNumber}</div>
              <div className="text-xs text-neutral-400">Pierna: {d.lowerFocus}</div>
              <div className="text-xs text-neutral-400">Torso: {d.upperFocus}</div>
              {plan ? (
                <div className="mt-2 text-xs font-medium text-emerald-400">Plan generado</div>
              ) : (
                <div className="mt-2 text-xs text-neutral-600">Sin generar</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
