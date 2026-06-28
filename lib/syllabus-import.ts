import Anthropic from "@anthropic-ai/sdk";

export interface ParsedTopic {
  text: string;
}

export interface ParsedUnit {
  number: number;
  name: string;
  topics: ParsedTopic[];
}

export interface ParsedSubject {
  code: string;
  name: string;
  units: ParsedUnit[];
}

export interface ParsedSyllabus {
  subjects: ParsedSubject[];
}

export async function extractPdfText(url: string): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export async function parseSyllabus(rawText: string): Promise<ParsedSyllabus> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a study-planner assistant. Parse the following syllabus text into a structured JSON object.

Rules:
- Output ONLY valid JSON, no markdown fences, no prose.
- Schema: { "subjects": [ { "code": string, "name": string, "units": [ { "number": number, "name": string, "topics": [ { "text": string } ] } ] } ] }
- "code" is the course code (e.g. "CS 101"). If absent, invent a short code like "SUB1".
- "number" starts at 1 for each subject's units.
- Collapse bullet-point topics under their unit. Keep topics concise (≤120 chars).
- If the syllabus has only one subject, put it in the subjects array anyway.

Syllabus:
${rawText.slice(0, 40000)}`;

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const msg = await stream.finalMessage();

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block");
  }

  let json = textBlock.text.trim();
  // Strip any accidental code fences
  json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  return JSON.parse(json) as ParsedSyllabus;
}

export async function importSyllabusIntoSemester(
  syllabus: ParsedSyllabus,
  semesterId: string,
  userId: string,
): Promise<void> {
  const { db } = await import("@/lib/db");

  // Verify the semester belongs to this user before writing anything
  const sem = await db.semester.findFirst({ where: { id: semesterId, userId } });
  if (!sem) throw new Error("Semester not found");

  for (const subject of syllabus.subjects) {
    const course = await db.course.create({
      data: {
        code: subject.code,
        name: subject.name,
        semesterId,
        credits: 3,
        lockOrder: false,
      },
    });

    for (const unit of subject.units) {
      const createdUnit = await db.unit.create({
        data: {
          number: unit.number,
          name: unit.name,
          courseId: course.id,
          status: "NONE",
        },
      });

      if (unit.topics.length > 0) {
        await db.topic.createMany({
          data: unit.topics.map((t) => ({ text: t.text, unitId: createdUnit.id })),
        });
      }
    }
  }
}
