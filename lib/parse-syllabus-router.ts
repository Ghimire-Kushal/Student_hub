import { parseSyllabusFree } from "./parse-syllabus-free";
import type { ParsedSyllabus } from "./syllabus-import";

type ParserMode = "free" | "ai" | "auto";

function getMode(): ParserMode {
  const v = (process.env.SYLLABUS_PARSER ?? "auto").toLowerCase();
  if (v === "free" || v === "ai") return v;
  return "auto";
}

function hasUnits(result: ParsedSyllabus): boolean {
  return result.subjects.some((s) => s.units.length > 0);
}

export async function routeParseSyllabus(rawText: string): Promise<ParsedSyllabus> {
  const mode = getMode();

  if (mode === "ai") {
    const { parseSyllabus } = await import("./syllabus-import");
    return parseSyllabus(rawText);
  }

  // free or auto: try rule-based first
  const freeResult = parseSyllabusFree(rawText);

  if (mode === "free") {
    if (!hasUnits(freeResult)) {
      throw new Error(
        "Couldn't detect any units — make sure the syllabus uses the 'Unit N: Title' and '1.1 / 1.2' numbering format, or paste the cleaned text.",
      );
    }
    return freeResult;
  }

  // auto: use free result if it found units, otherwise AI fallback
  if (hasUnits(freeResult)) return freeResult;

  const { parseSyllabus } = await import("./syllabus-import");
  const aiResult = await parseSyllabus(rawText);

  if (!hasUnits(aiResult)) {
    throw new Error(
      "Couldn't detect any units — make sure the syllabus uses the 'Unit N: Title' and '1.1 / 1.2' numbering format, or paste the cleaned text.",
    );
  }
  return aiResult;
}
