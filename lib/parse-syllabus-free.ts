import type { ParsedSyllabus, ParsedSubject } from "./syllabus-import";

// Roman numeral to integer (I..XII sufficient for unit counts)
const ROMAN: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5,
  VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};
function romanToInt(s: string): number | null {
  const n = ROMAN[s.toUpperCase()];
  return n ?? null;
}

const COURSE_CODE_RE = /^[A-Z]{2,4}\s?\d{3}$/;
const NOISE_WORDS = [
  "full marks", "pass marks", "credit hrs", "credit hours", "total periods",
  "nature of", "program:", "level:", "year:", "exam scheme",
];

function cleanTitle(title: string): string {
  let t = title.trim();
  // Strip noise tokens from the end
  for (const noise of NOISE_WORDS) {
    const idx = t.toLowerCase().indexOf(noise);
    if (idx > 4) { t = t.slice(0, idx).trim().replace(/[,\s]+$/, ""); }
  }
  // Strip trailing digits/numbers that look like exam table columns
  t = t.replace(/\s+\d[\d\s]*$/, "").trim();
  return t;
}

function buildSyllabusText(units: ParsedSubject["units"]): string {
  return units
    .map((u) => {
      const header = `## Unit ${u.number}: ${u.name}`;
      const topics = u.topics.map((t) => `- ${t.text}`).join("\n");
      return topics ? `${header}\n${topics}` : header;
    })
    .join("\n\n");
}

export function parseSyllabusFree(text: string): ParsedSyllabus {
  const lines = text.split("\n");

  let semesterName: string | null = null;
  const subjects: ParsedSubject[] = [];

  // Transient state for current subject / unit being built
  let currentSubject: ParsedSubject | null = null;
  let pendingCode: string | null = null;
  let pendingTitle: string | null = null;
  let unitSeq = 0;

  function flushPending() {
    if (pendingCode || pendingTitle) {
      const name = (pendingTitle ?? pendingCode) ?? "Unknown";
      currentSubject = {
        code: pendingCode,
        name,
        credits: null,
        syllabus: "",
        units: [],
      };
      subjects.push(currentSubject);
      pendingCode = null;
      pendingTitle = null;
      unitSeq = 0;
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // ── Semester line ──────────────────────────────────────────────────────
    const semMatch = line.match(/\bSemester\s+([IVXLCDM]+|\d+)\b/i);
    if (semMatch && !semesterName) {
      semesterName = `Semester ${semMatch[1].toUpperCase()}`;
    }

    // ── Subject header: `# CODE — Title` ──────────────────────────────────
    const mdHeader = line.match(/^#+\s+([A-Z]{2,4}\s?\d{3})\s*[—–-]+\s*(.+)$/);
    if (mdHeader) {
      flushPending();
      currentSubject = {
        code: mdHeader[1].replace(/\s+/, " "),
        name: cleanTitle(mdHeader[2]),
        credits: null,
        syllabus: "",
        units: [],
      };
      subjects.push(currentSubject);
      unitSeq = 0;
      continue;
    }

    // ── `Course Code:` / `Course Title:` lines ─────────────────────────────
    const codeLabel = line.match(/^Course\s+Code\s*:\s*(.+)$/i);
    if (codeLabel) {
      const code = codeLabel[1].trim();
      if (COURSE_CODE_RE.test(code)) {
        flushPending();
        pendingCode = code;
        continue;
      }
    }
    const titleLabel = line.match(/^Course\s+Title\s*:\s*(.+)$/i);
    if (titleLabel) {
      pendingTitle = cleanTitle(titleLabel[1]);
      if (pendingCode) { flushPending(); }
      continue;
    }

    // ── Plain `CODE — Title` line ──────────────────────────────────────────
    const plainHeader = line.match(/^([A-Z]{2,4}\s?\d{3})\s*[—–-]+\s*(.+)$/);
    if (plainHeader) {
      flushPending();
      currentSubject = {
        code: plainHeader[1].replace(/\s+/, " "),
        name: cleanTitle(plainHeader[2]),
        credits: null,
        syllabus: "",
        units: [],
      };
      subjects.push(currentSubject);
      unitSeq = 0;
      continue;
    }

    // ── Credits ────────────────────────────────────────────────────────────
    const credMatch = line.match(/\bCredit(?:\s+Hrs?(?:ours?)?)?\s*:\s*(\d+(?:\.\d+)?)/i);
    if (credMatch && currentSubject) {
      currentSubject.credits = parseFloat(credMatch[1]);
      continue;
    }

    // ── Unit header ────────────────────────────────────────────────────────
    const unitMatch = line.match(
      /^Unit\s+([IVXLCDM]+|\d+)\s*[:.]\s*(.+?)(?:\s*\(?\s*\d+\s*(?:hrs?|hours?|LH)\s*\)?)?$/i,
    );
    if (unitMatch) {
      if (!currentSubject) { flushPending(); }
      if (!currentSubject) {
        currentSubject = { code: null, name: "Unknown", credits: null, syllabus: "", units: [] };
        subjects.push(currentSubject);
      }
      const rawNum = unitMatch[1].toUpperCase();
      const num = romanToInt(rawNum) ?? parseInt(rawNum, 10) || ++unitSeq;
      unitSeq = num;
      const unitName = unitMatch[2]
        .trim()
        .replace(/\s*\(?\s*\d+\s*(?:hrs?|hours?|LH)\s*\)?$/, "")
        .trim();
      currentSubject.units.push({ number: num, name: unitName, topics: [] });
      continue;
    }

    // ── Topic: lines like `1.1`, `5.10`, `3.2.1` ──────────────────────────
    const topicMatch = line.match(/^(\d+(?:\.\d+)+)\s+(.+)$/);
    if (topicMatch && currentSubject && currentSubject.units.length > 0) {
      const topicText = topicMatch[2].trim().slice(0, 140);
      currentSubject.units[currentSubject.units.length - 1].topics.push({ text: topicText });
      continue;
    }
  }

  // Flush any trailing pending code/title
  flushPending();

  // Build syllabus text for each subject
  for (const s of subjects) {
    s.syllabus = buildSyllabusText(s.units);
  }

  return { semester: { name: semesterName }, subjects };
}
