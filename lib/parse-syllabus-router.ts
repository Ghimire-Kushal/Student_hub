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

  const freeResult = parseSyllabusFree(rawText);

  if (mode === "free") {
    if (!hasUnits(freeResult)) {
      throw new Error(
        "Couldn't detect any units — make sure the syllabus uses 'Unit N: Title' headings and '1.1 / 1.2' topic lines.",
      );
    }
    return freeResult;
  }

  // auto: free first, AI fallback
  if (hasUnits(freeResult)) return freeResult;

  const { parseSyllabus } = await import("./syllabus-import");
  const aiResult = await parseSyllabus(rawText);

  if (!hasUnits(aiResult)) {
    throw new Error(
      "Couldn't detect any units — make sure the syllabus uses 'Unit N: Title' headings and '1.1 / 1.2' topic lines.",
    );
  }
  return aiResult;
}
