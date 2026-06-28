"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";
import { CourseForm } from "./CourseForm";
import { deleteCourse } from "@/app/actions/course";

interface Props {
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
    examDate: string | null;
    color: string;
    lockOrder: boolean;
    syllabus: string | null;
    semesterId: string;
    units: { status: string }[];
    pct: number;
  };
}

export function CourseCard({ course }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const daysLeft = course.examDate
    ? Math.ceil((new Date(course.examDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      <div className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
        <Link href={`/course/${course.id}`} className="block">
          {/* Color bar + header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-ink-muted">{course.code}</span>
                {daysLeft !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-accent-light text-accent"}`}>
                    {daysLeft > 0 ? `${daysLeft}d` : "exam passed"}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-ink mt-0.5 truncate">{course.name}</h3>
              <p className="text-xs text-ink-muted mt-0.5">{course.credits} credit{course.credits !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Unit spine */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {course.units.map((u, i) => {
              const colors: Record<string, string> = {
                DONE: "#15803D",
                ONGOING: "#1D4ED8",
                REVISE: "#C2410C",
                NONE: "#E7E5E4",
              };
              return (
                <div
                  key={i}
                  title={u.status}
                  className="h-2 flex-1 min-w-[8px] rounded-full"
                  style={{ backgroundColor: colors[u.status] ?? "#E7E5E4" }}
                />
              );
            })}
            {course.units.length === 0 && (
              <div className="h-2 flex-1 rounded-full bg-border" />
            )}
          </div>

          <p className="text-xs text-ink-muted">{course.pct}% complete · {course.units.length} unit{course.units.length !== 1 ? "s" : ""}</p>
        </Link>

        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <button onClick={() => setEditing(true)} className="text-xs text-ink-muted hover:text-ink transition-colors">Edit</button>
          <button onClick={() => setDeleting(true)} className="text-xs text-red-500 hover:text-red-700 transition-colors ml-auto">Delete</button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit subject">
        <CourseForm
          semesterId={course.semesterId}
          onClose={() => setEditing(false)}
          existing={{
            id: course.id,
            code: course.code,
            name: course.name,
            credits: course.credits,
            examDate: course.examDate,
            syllabus: course.syllabus,
            color: course.color,
            lockOrder: course.lockOrder,
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleting}
        title="Delete subject?"
        description={`This will permanently delete "${course.name}" and all its units and resources.`}
        onConfirm={async () => {
          await deleteCourse(course.id, course.semesterId);
          setDeleting(false);
        }}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
