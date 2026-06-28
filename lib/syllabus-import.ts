import Anthropic from "@anthropic-ai/sdk";

export interface ParsedUnit {
  number: number;
  name: string;
  topics: string[];
}

export interface ParsedSubject {
  code: string | null;
  name: string;
  credits: number | null;
  syllabus: string;
  units: ParsedUnit[];
}

export interface ParsedSyllabus {
  semester: { name: string | null };
  subjects: ParsedSubject[];
}

export async function parseSyllabus(rawText: string): Promise<ParsedSyllabus> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a study-planner assistant. Parse the following syllabus text into a structured JSON object.

Rules:
- Output ONLY valid JSON, no markdown fences, no prose.
- Schema:
{
  "semester": { "name": string | null },
  "subjects": [
    {
      "code": string | null,
      "name": string,
      "credits": number | null,
      "syllabus": string,
      "units": [
        { "number": number, "name": string, "topics": [{ "text": string }] }
      ]
    }
  ]
}
- "semester.name": extract the semester/program name from the document header (e.g. "Semester IV", "Fourth Semester", "BCSIT Semester II"). Return null if not found.
- "code": the course code (e.g. "CS 101"). Return null if absent — do NOT invent codes.
- "credits": the credit hours if explicitly stated, else null.
- "syllabus": a clean Markdown string of that subject's course contents — its units with their sub-topics as a nested list. This will be stored on the course record. Example format:
  "## Unit 1: Introduction\\n- Topic A\\n- Topic B\\n\\n## Unit 2: Logic Gates\\n- NAND, NOR\\n- Boolean simplification"
- "units": structured list for database import. "number" starts at 1.
- "topics": keep each topic concise (≤120 chars). Ignore marks/weightage/objectives.
- If the syllabus has only one subject, put it in the subjects array anyway.
- Handle one-subject or multi-subject syllabi equally well.

Syllabus text:
${rawText.slice(0, 50000)}`;

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const msg = await stream.finalMessage();

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block. The model may have refused the request.");
  }

  let json = textBlock.text.trim();
  json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const raw = JSON.parse(json) as ParsedSyllabus;
    // Normalize topics: AI returns [{text:"..."}], we want string[]
    for (const s of raw.subjects) {
      for (const u of s.units) {
        u.topics = (u.topics as unknown[]).map((t) =>
          typeof t === "string" ? t : (t as { text: string }).text
        );
      }
    }
    return raw;
  } catch {
    throw new Error(`Claude returned invalid JSON. Raw output: ${json.slice(0, 200)}`);
  }
}

export interface ImportOptions {
  semesterId?: string;
  newSemesterName?: string;
  userId: string;
}

export async function importSyllabusIntoSemester(
  syllabus: ParsedSyllabus,
  options: ImportOptions,
): Promise<{ semesterId: string }> {
  const { db } = await import("@/lib/db");
  const { userId, semesterId: existingId, newSemesterName } = options;

  let semesterId: string;

  if (existingId) {
    const sem = await db.semester.findFirst({ where: { id: existingId, userId } });
    if (!sem) throw new Error("Semester not found or access denied.");
    semesterId = sem.id;
  } else if (newSemesterName?.trim()) {
    const sem = await db.semester.create({
      data: { name: newSemesterName.trim(), userId },
    });
    semesterId = sem.id;
  } else {
    throw new Error("Must provide either semesterId or newSemesterName.");
  }

  // Fetch existing course codes in this semester for duplicate checking
  const existingCourses = await db.course.findMany({
    where: { semesterId },
    select: { code: true, id: true },
  });
  const existingCodes = new Set(existingCourses.map((c) => c.code.toLowerCase()));

  for (const subject of syllabus.subjects) {
    const code = subject.code ?? subject.name.slice(0, 8).toUpperCase().replace(/\s+/g, "");

    // Duplicate-safe: skip if code already exists in target semester
    if (existingCodes.has(code.toLowerCase())) continue;

    if (subject.units.length === 0) {
      console.warn(`[syllabus-import] "${subject.name}" has 0 units.`);
    }

    const course = await db.course.create({
      data: {
        code,
        name: subject.name,
        credits: subject.credits ?? 0,
        syllabus: subject.syllabus || null,
        lockOrder: true,
        semesterId,
        units: {
          create: subject.units.map((u) => ({
            number: u.number,
            name: u.name,
            status: "NONE" as const,
            topics: {
              create: u.topics.map((t) => ({ text: t, done: false })),
            },
          })),
        },
      },
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/course/${course.id}`);
  }

  return { semesterId };
}
