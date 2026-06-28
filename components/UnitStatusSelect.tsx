"use client";

import { useTransition } from "react";
import { UnitStatus } from "@prisma/client";
import { setUnitStatus } from "@/app/actions/unit";
import { statusColors } from "@/lib/theme";

interface Props {
  unitId: string;
  courseId: string;
  status: UnitStatus;
}

export function UnitStatusSelect({ unitId, courseId, status }: Props) {
  const [, startTransition] = useTransition();
  const colors = statusColors[status];

  return (
    <select
      name="status"
      defaultValue={status}
      onChange={(e) => {
        const next = e.target.value as UnitStatus;
        startTransition(() => setUnitStatus(unitId, courseId, next));
      }}
      className="text-sm px-3 py-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-accent"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {(["NONE", "ONGOING", "REVISE", "DONE"] as UnitStatus[]).map((s) => (
        <option key={s} value={s}>{statusColors[s].label}</option>
      ))}
    </select>
  );
}
