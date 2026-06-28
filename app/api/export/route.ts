import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      semesters: {
        orderBy: { createdAt: "asc" },
        include: {
          courses: {
            orderBy: { createdAt: "asc" },
            include: {
              units: {
                orderBy: { number: "asc" },
                include: {
                  topics: { orderBy: { createdAt: "asc" }, select: { id: true, text: true, done: true, createdAt: true } },
                  resources: {
                    orderBy: { createdAt: "asc" },
                    select: {
                      id: true, type: true, title: true, body: true,
                      imageUrl: true, fileUrl: true, fileName: true,
                      tags: true, createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      studySessions: {
        orderBy: { createdAt: "asc" },
        select: { id: true, minutes: true, courseId: true, createdAt: true },
      },
    },
  });

  const json = JSON.stringify({ exportedAt: new Date().toISOString(), data: user }, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="studyhub-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
