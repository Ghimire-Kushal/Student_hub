import { PrismaClient, UnitStatus, ResourceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Clean existing demo data
  await db.user.deleteMany({ where: { email: "demo@studytracker.dev" } });

  const password = await bcrypt.hash("demo1234", 12);

  const user = await db.user.create({
    data: {
      email: "demo@studytracker.dev",
      password,
      name: "Demo Student",
    },
  });

  const semester = await db.semester.create({
    data: {
      name: "Semester II",
      terminalDate: new Date("2025-11-28"),
      userId: user.id,
    },
  });

  const course = await db.course.create({
    data: {
      code: "CMP 174",
      name: "Digital Systems",
      credits: 3,
      examDate: new Date("2025-11-20"),
      syllabus:
        "Unit 1: Number Systems & Boolean Algebra\nUnit 2: Combinational Logic\nUnit 3: Sequential Logic",
      color: "#8B5CF6",
      lockOrder: true,
      semesterId: semester.id,
    },
  });

  const units: Array<{
    number: number;
    name: string;
    status: UnitStatus;
    topics: string[];
  }> = [
    {
      number: 1,
      name: "Number Systems & Boolean Algebra",
      status: "DONE",
      topics: [
        "Binary, octal, hexadecimal conversions",
        "BCD and Gray code",
        "Boolean laws and theorems",
        "De Morgan's theorem",
        "Sum of products (SOP) and product of sums (POS)",
      ],
    },
    {
      number: 2,
      name: "Combinational Logic",
      status: "ONGOING",
      topics: [
        "Karnaugh maps (2, 3, 4 variable)",
        "Half adder and full adder",
        "Multiplexers and demultiplexers",
        "Encoders and decoders",
      ],
    },
    {
      number: 3,
      name: "Sequential Logic",
      status: "NONE",
      topics: [
        "SR, D, JK, and T flip-flops",
        "Registers and shift registers",
        "Synchronous and asynchronous counters",
      ],
    },
  ];

  for (const u of units) {
    const unit = await db.unit.create({
      data: {
        number: u.number,
        name: u.name,
        status: u.status,
        courseId: course.id,
      },
    });

    await db.topic.createMany({
      data: u.topics.map((text) => ({ text, unitId: unit.id })),
    });

    if (u.status === "DONE") {
      await db.resource.create({
        data: {
          type: "NOTES" as ResourceType,
          title: "Unit 1 Class Notes",
          body: "Key points from lectures on number systems and Boolean algebra. Remember De Morgan's: complement of a product equals sum of complements.",
          unitId: unit.id,
        },
      });
    }

    if (u.status === "ONGOING") {
      await db.resource.create({
        data: {
          type: "PAST_QUESTIONS" as ResourceType,
          title: "2023 Mid-term Q3",
          body: "Simplify the expression F = AB'C + AB'C' + ABC using a K-map.",
          unitId: unit.id,
        },
      });
    }
  }

  console.log("✓ Seed complete");
  console.log("  Email:    demo@studytracker.dev");
  console.log("  Password: demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
