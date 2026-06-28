export type ParsedUnit = { number: number; name: string; topics: string[] };
export type ParsedSubject = { code: string | null; name: string; credits: number | null; syllabus: string; units: ParsedUnit[] };
export type ParsedSyllabus = { semester: { name: string | null }; subjects: ParsedSubject[] };

const R: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const roman = (s: string) => { let n = 0; s = s.toUpperCase(); for (let i = 0; i < s.length; i++) { const c = R[s[i]]; if (!c) return NaN; const nx = R[s[i + 1]]; n += nx && c < nx ? -c : c; } return n || NaN; };
const clean = (t: string) => t.replace(/\s+(Full marks|Pass marks|Credit Hrs|Total periods|Nature of|Program:|Level:|Year:).*$/i, "").trim();

export function parseSyllabusFree(text: string): ParsedSyllabus {
  const lines = text.split(/\r?\n/);
  const subjects: ParsedSubject[] = [];
  // eslint-disable-next-line prefer-const
  let cur: { code: string | null; name: string; credits: number | null; syllabus: string; units: ParsedUnit[] } | null = null, unit: ParsedUnit | null = null, sem: string | null = null, pc: string | null = null, pt: string | null = null;
  const unitRe = /^Unit\s+([IVXLCDM]+|\d+)\s*[:.\-]\s*(.+?)\s*(?:\((\d+)\s*(?:hrs?|hours?|lh|periods?)?\))?\s*$/i;
  const topicRe = /^(\d+(?:\.\d+){1,3})\.?\s+(.+)$/;
  const mdRe = /^#{1,6}\s*([A-Z]{2,4}\s?\d{3})\s*[—\-:]\s*(.+?)\s*$/;
  const codeRe = /^Course\s*Code\s*[:\-]\s*([A-Z]{2,4}\s?\d{3})/i;
  const titleRe = /^Course\s*Title\s*[:\-]\s*(.+)$/i;
  const ctRe = /^([A-Z]{2,4}\s?\d{3})\s*[—\-:]\s*(.+)$/;
  const credRe = /Credit(?:\s*Hours?|\s*Hrs?|s)?\s*[:\-]?\s*(\d+)/i;
  const start = (code: string | null, name: string) => { cur = { code: code ? code.replace(/\s+/, " ").trim() : null, name: clean(name || ""), credits: null, syllabus: "", units: [] }; subjects.push(cur); unit = null; };
  for (const raw of lines) {
    const line = raw.trim(); if (!line) continue;
    if (!sem) { const m = line.match(/Semester\b[^\dIVXLC]*([IVXLC]+|\d+)/i); if (m) sem = `Semester ${m[1]}`; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(mdRe))) { start(m[1], m[2]); continue; }
    if ((m = line.match(codeRe))) { pc = m[1]; if (pt) { start(pc, pt); pc = pt = null; } continue; }
    if ((m = line.match(titleRe))) { pt = m[1]; if (pc) { start(pc, pt); pc = pt = null; } continue; }
    if (!cur && (m = line.match(ctRe))) { start(m[1], m[2]); continue; }
    if (cur) { const c = line.match(credRe); if (c && (cur as ParsedSubject).credits == null) (cur as ParsedSubject).credits = parseInt(c[1], 10); }
    if ((m = line.match(unitRe))) { if (!cur) start(null, "Untitled"); const t = m[1]; let n = /^\d+$/.test(t) ? parseInt(t, 10) : roman(t); if (isNaN(n)) n = cur!.units.length + 1; unit = { number: n, name: m[2].trim(), topics: [] }; cur!.units.push(unit); continue; }
    if (unit && (m = line.match(topicRe))) { unit.topics.push(m[2].trim()); continue; }
  }
  for (const s of subjects) { s.units = s.units.map((u, i) => ({ number: u.number || i + 1, name: u.name, topics: u.topics })); s.syllabus = s.units.map(u => `Unit ${u.number}: ${u.name}\n` + u.topics.map(t => `  - ${t}`).join("\n")).join("\n\n"); }
  return { semester: { name: sem }, subjects: subjects.filter(s => s.name || s.units.length) };
}
