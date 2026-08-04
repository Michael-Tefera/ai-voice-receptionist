import { describe, expect, it } from "vitest";
import {
  checkAvailabilityTool,
  formatDemoSlotLabel,
} from "@/core/tools/check-availability";
import type { ToolExecutionContext } from "@/core/types";

interface DemoSlot {
  slotId: string;
  date: string;
  time: string;
  label: string;
}

function createContext(input: Record<string, unknown>): ToolExecutionContext {
  return {
    tenant: {
      tenantId: "fictional-dental-clinic",
      displayName: "Bright Smile Dental (Fictional)",
      branding: {
        agentName: "Alex",
        greeting: "Thank you for calling Bright Smile Dental.",
        language: "en-US",
      },
      enabledModules: ["receptionist", "appointments"],
    },
    session: {
      id: "test-session",
      tenantId: "fictional-dental-clinic",
      status: "active",
      messages: [],
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
    },
    input,
  };
}

describe("formatDemoSlotLabel", () => {
  it("formats 2026-08-05 as Wednesday without timezone shift", () => {
    expect(formatDemoSlotLabel("2026-08-05", "09:30")).toBe(
      "Wednesday, August 5 at 9:30 AM (Fictional Demo)",
    );
    expect(formatDemoSlotLabel("2026-08-05", "14:00")).toBe(
      "Wednesday, August 5 at 2:00 PM (Fictional Demo)",
    );
  });

  it("formats 2026-08-07 as Friday without timezone shift", () => {
    expect(formatDemoSlotLabel("2026-08-07", "10:15")).toBe(
      "Friday, August 7 at 10:15 AM (Fictional Demo)",
    );
  });
});

describe("checkAvailabilityTool", () => {
  it("executes successfully and returns fictional slots", async () => {
    const result = await checkAvailabilityTool.execute(
      createContext({ timePreference: "next week" }),
    );

    expect(checkAvailabilityTool.name).toBe("check_availability");
    expect(result.timePreference).toBe("next week");
    expect(Array.isArray(result.slots)).toBe(true);
    expect(result.slots).toHaveLength(3);

    const slots = result.slots as DemoSlot[];
    expect(slots[0]).toMatchObject({
      slotId: "demo-slot-001",
      date: "2026-08-05",
      time: "09:30",
      label: "Wednesday, August 5 at 9:30 AM (Fictional Demo)",
    });
  });

  it("ensures every slot label matches its ISO date and time", async () => {
    const result = await checkAvailabilityTool.execute(
      createContext({ timePreference: "next week" }),
    );
    const slots = result.slots as DemoSlot[];

    for (const slot of slots) {
      expect(slot.label).toBe(formatDemoSlotLabel(slot.date, slot.time));
    }

    expect(slots.map((slot) => slot.label)).toEqual([
      "Wednesday, August 5 at 9:30 AM (Fictional Demo)",
      "Wednesday, August 5 at 2:00 PM (Fictional Demo)",
      "Friday, August 7 at 10:15 AM (Fictional Demo)",
    ]);
  });

  it("includes a fictional-demo disclaimer and does not claim booking", async () => {
    const result = await checkAvailabilityTool.execute(
      createContext({ timePreference: "morning" }),
    );

    expect(result.disclaimer).toBe(
      "These are fictional demo slots only. No appointment has been booked.",
    );
    expect(result).not.toHaveProperty("bookingId");
    expect(result).not.toHaveProperty("confirmation");
    expect(result).not.toHaveProperty("appointmentId");
    expect(result).not.toHaveProperty("booked");
  });

  it("handles missing preference safely", async () => {
    const result = await checkAvailabilityTool.execute(createContext({}));

    expect(result.timePreference).toBe("general availability");
    expect(result.slots).toHaveLength(3);
    expect(result.disclaimer).toContain("No appointment has been booked");
  });

  it("handles malformed preference safely", async () => {
    const cases: Record<string, unknown>[] = [
      { timePreference: "" },
      { timePreference: "   " },
      { timePreference: 42 },
      { timePreference: null },
      { timePreference: { day: "Tuesday" } },
    ];

    for (const input of cases) {
      const result = await checkAvailabilityTool.execute(createContext(input));
      expect(result.timePreference).toBe("general availability");
      expect(result.slots).toHaveLength(3);
      expect(result.disclaimer).toContain("fictional demo slots");
    }
  });
});
