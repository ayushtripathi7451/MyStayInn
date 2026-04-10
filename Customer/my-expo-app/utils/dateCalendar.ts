/**
 * Format a Date as YYYY-MM-DD using the device's local calendar.
 * Use this for calendar picks (move-in, DOB, etc.) — never use
 * `toISOString().split("T")[0]` for that, or UTC can shift the day
 * backward in timezones ahead of UTC (e.g. IST).
 */
export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
