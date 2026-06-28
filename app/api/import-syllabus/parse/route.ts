import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { parseSyllabusFree } from "@/lib/parse-syllabus-free";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let text: string;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const rawText = form.get("text");

      if (file && typeof file !== "string") {
        const buf = await file.arrayBuffer();
        const { getDocumentProxy, extractText } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(buf));
        const { text: extracted } = await extractText(pdf, { mergePages: true });
        text = extracted;
      } else if (rawText && typeof rawText === "string") {
        text = rawText;
      } else {
        return NextResponse.json({ error: "Provide a PDF file or text field." }, { status: 400 });
      }
    } else {
      const body = await req.json() as { text?: string };
      text = body.text ?? "";
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Empty text." }, { status: 400 });
    }

    const parsed = parseSyllabusFree(text);
    const hasUnits = parsed.subjects.some((s) => s.units.length > 0);

    if (!hasUnits) {
      return NextResponse.json(
        { error: "No units detected — make sure the syllabus uses 'Unit N: Title' headings and '1.1 / 1.2' topic lines." },
        { status: 400 },
      );
    }

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parse failed" },
      { status: 500 },
    );
  }
}
