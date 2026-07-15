import Link from "next/link";
import { getPlanForDay } from "@/lib/plans";
import { getFullCatalog } from "@/lib/exercise-catalog";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SetupNotice } from "@/components/SetupNotice";
import { DayEditor } from "@/components/DayEditor";

export default async function DayPage({
  params,
  searchParams,
}: {
  params: Promise<{ day: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const { day } = await params;
  const query = await searchParams;
  const now = new Date();
  const year = Number(query.year) || now.getUTCFullYear();
  const month = Number(query.month) || now.getUTCMonth() + 1;
  const dayNumber = Number(day);

  const [plan, catalog] = await Promise.all([getPlanForDay(year, month, dayNumber), getFullCatalog()]);

  if (!plan) {
    return (
      <div>
        <Link href={`/dashboard?year=${year}&month=${month}`} className="text-sm text-neutral-400 hover:text-white">
          ← Volver al calendario
        </Link>
        <p className="mt-6 text-neutral-400">
          Todavía no hay un plan generado para el día {dayNumber}. Genera el plan del mes desde el
          calendario primero.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/dashboard?year=${year}&month=${month}`} className="text-sm text-neutral-400 hover:text-white">
        ← Volver al calendario
      </Link>
      <DayEditor plan={plan} catalog={catalog} year={year} month={month} />
    </div>
  );
}
