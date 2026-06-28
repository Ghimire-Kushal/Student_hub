"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { logStudySession } from "@/app/actions/study-session";

interface DayData {
  date: string; // YYYY-MM-DD
  minutes: number;
}

interface Props {
  weekMinutes: number;
  streak: number;
  heatmapData: DayData[];
  courses: { id: string; name: string; code: string }[];
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function getLevel(m: number) {
  if (m === 0) return 0;
  if (m < 30) return 1;
  if (m < 60) return 2;
  if (m < 120) return 3;
  return 4;
}
const LEVEL_COLORS = [
  "bg-border",
  "bg-accent/20",
  "bg-accent/40",
  "bg-accent/70",
  "bg-accent",
];

export function StudyLog({ weekMinutes, streak, heatmapData, courses }: Props) {
  const [mode, setMode] = useState<"manual" | "timer">("manual");
  const [manualMin, setManualMin] = useState("");
  const [courseId, setCourseId] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function submit(minutes: number) {
    if (minutes <= 0) { setMsg("Enter a valid duration."); return; }
    startTransition(async () => {
      try {
        await logStudySession(minutes, courseId || undefined);
        setMsg(`✓ Logged ${minutes} min`);
        setManualMin("");
        setElapsed(0);
        setRunning(false);
        setTimeout(() => setMsg(null), 3000);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    });
  }

  // Build 15-week grid (105 days) ending today
  const today = new Date();
  const cells: (DayData & { weekday: number })[] = [];
  for (let i = 104; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const entry = heatmapData.find((h) => h.date === iso);
    cells.push({ date: iso, minutes: entry?.minutes ?? 0, weekday: d.getDay() });
  }
  // Group into weeks (columns)
  const weeks: (DayData & { weekday: number })[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <section className="mb-8">
      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-ink">{Math.round(weekMinutes / 60 * 10) / 10}h</span>
          <span className="text-sm text-ink-muted">this week</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="text-2xl font-semibold text-ink">{streak}</span>
          <span className="text-sm text-ink-muted">day streak</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:text-ink transition-colors"
        >
          {open ? "Hide" : "Log study time"}
        </button>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-0.5" style={{ minWidth: `${weeks.length * 13}px` }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${LEVEL_COLORS[getLevel(day.minutes)]}`}
                  title={`${day.date}: ${day.minutes} min`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-muted mt-1">
        Less <span className="inline-flex gap-0.5 align-middle mx-1">
          {LEVEL_COLORS.map((c, i) => <span key={i} className={`inline-block w-2.5 h-2.5 rounded-sm ${c}`} />)}
        </span> More
      </p>

      {/* Log panel */}
      {open && (
        <div className="mt-4 bg-white border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setMode("manual")} className={`text-sm px-3 py-1 rounded-lg border transition-colors ${mode === "manual" ? "bg-accent text-white border-accent" : "border-border text-ink-muted"}`}>Manual</button>
            <button onClick={() => setMode("timer")} className={`text-sm px-3 py-1 rounded-lg border transition-colors ${mode === "timer" ? "bg-accent text-white border-accent" : "border-border text-ink-muted"}`}>Timer</button>
          </div>

          {/* Course selector */}
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">No specific subject</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>

          {mode === "manual" ? (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={720}
                value={manualMin}
                onChange={(e) => setManualMin(e.target.value)}
                placeholder="Minutes studied"
                className="flex-1 text-sm px-3 py-2 border border-border rounded-lg bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={() => submit(parseInt(manualMin, 10))}
                disabled={isPending}
                className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg disabled:opacity-50"
              >
                Log
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl font-mono text-center text-ink">
                {pad(Math.floor(elapsed / 3600))}:{pad(Math.floor((elapsed % 3600) / 60))}:{pad(elapsed % 60)}
              </div>
              <div className="flex gap-2 justify-center">
                {!running ? (
                  <button onClick={() => setRunning(true)} className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg">
                    {elapsed > 0 ? "Resume" : "Start"}
                  </button>
                ) : (
                  <button onClick={() => setRunning(false)} className="px-4 py-2 text-sm border border-border text-ink rounded-lg">
                    Pause
                  </button>
                )}
                {elapsed > 0 && (
                  <>
                    <button
                      onClick={() => submit(Math.max(1, Math.round(elapsed / 60)))}
                      disabled={isPending}
                      className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                    >
                      Save {Math.round(elapsed / 60)}m
                    </button>
                    <button onClick={() => { setElapsed(0); setRunning(false); }} className="px-4 py-2 text-sm border border-border text-ink-muted rounded-lg">
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {msg && <p className="text-sm text-center text-ink-muted">{msg}</p>}
        </div>
      )}
    </section>
  );
}
