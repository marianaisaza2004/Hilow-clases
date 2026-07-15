/** "45s" below a minute, otherwise "1 minuto" / "2.5 minutos". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = seconds / 60;
  if (Number.isInteger(minutes)) {
    return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  }

  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded} minutos`;
}
