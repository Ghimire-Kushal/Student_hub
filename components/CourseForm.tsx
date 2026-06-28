"use client";

import { createCourse, updateCourse } from "@/app/actions/course";

interface Existing {
  id: string;
  code: string;
  name: string;
  credits: number;
  examDate: string | null;
  syllabus: string | null;
  color: string;
  lockOrder: boolean;
}

interface Props {
  semesterId: string;
  onClose: () => void;
  existing?: Existing;
}

const COLORS = ["#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4","#84CC16"];

export function CourseForm({ semesterId, onClose, existing }: Props) {
  async function action(formData: FormData) {
    if (existing) {
      await updateCourse(existing.id, semesterId, formData);
    } else {
      await createCourse(semesterId, formData);
    }
    onClose();
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Code</label>
          <input name="code" required defaultValue={existing?.code}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="CMP 174" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Credits</label>
          <input name="credits" type="number" min="1" max="6" defaultValue={existing?.credits ?? 3}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Subject name</label>
        <input name="name" required defaultValue={existing?.name}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Digital Systems" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Exam date</label>
        <input name="examDate" type="date" defaultValue={existing?.examDate?.slice(0, 10) ?? ""}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Syllabus</label>
        <textarea name="syllabus" rows={3} defaultValue={existing?.syllabus ?? ""}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          placeholder="Unit 1: …&#10;Unit 2: …" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={existing ? existing.color === c : c === "#8B5CF6"} className="sr-only" />
              <span className="block w-7 h-7 rounded-full border-2 border-transparent ring-2 ring-offset-1 ring-transparent has-[:checked]:ring-ink transition-all" style={{ backgroundColor: c }} />
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="lockOrder" defaultChecked={existing?.lockOrder ?? false}
          className="rounded border-border text-accent focus:ring-accent" />
        <span className="text-sm text-ink">Unlock chapters in order</span>
      </label>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg">{existing ? "Save" : "Add subject"}</button>
      </div>
    </form>
  );
}
