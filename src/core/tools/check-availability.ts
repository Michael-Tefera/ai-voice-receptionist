import type { ToolDefinition } from "@/core/types";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

interface SlotSeed {
  slotId: string;
  date: string;
  time: string;
}

const SLOT_SEEDS: readonly SlotSeed[] = [
  { slotId: "demo-slot-001", date: "2026-08-05", time: "09:30" },
  { slotId: "demo-slot-002", date: "2026-08-05", time: "14:00" },
  { slotId: "demo-slot-003", date: "2026-08-07", time: "10:15" },
];

/**
 * Build a human-readable slot label from calendar date + wall-clock time.
 * Parses YYYY-MM-DD and HH:mm as civil components (UTC calendar math) so
 * labels never shift by timezone when reading a date-only ISO string.
 */
export function formatDemoSlotLabel(date: string, time: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) {
    throw new Error(`Invalid demo slot date/time: ${date} ${time}`);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  // UTC calendar date avoids local-timezone day shifts for date-only values.
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const monthName = MONTHS[month - 1];
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minuteLabel = String(minutes).padStart(2, "0");

  return `${weekday}, ${monthName} ${day} at ${hour12}:${minuteLabel} ${period} (Fictional Demo)`;
}

function buildFictionalSlots() {
  return SLOT_SEEDS.map((seed) => ({
    slotId: seed.slotId,
    date: seed.date,
    time: seed.time,
    label: formatDemoSlotLabel(seed.date, seed.time),
  }));
}

export const checkAvailabilityTool: ToolDefinition = {
  name: "check_availability",
  description:
    "Return fictional available appointment slots for a requested date or general preference.",
  async execute({ input }) {
    const preference =
      typeof input.timePreference === "string" && input.timePreference.trim()
        ? input.timePreference.trim()
        : "general availability";

    return {
      timePreference: preference,
      slots: buildFictionalSlots(),
      disclaimer:
        "These are fictional demo slots only. No appointment has been booked.",
    };
  },
};
