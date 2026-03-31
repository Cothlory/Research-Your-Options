// CORE LOGIC - avoid editing unless assigned

import { PrismaClient } from "@prisma/client";
import { semesterLabelFromDate } from "../src/lib/domain/snapshot";
import { renderNewsletterIssue } from "../src/lib/publication/newsletter";

const prisma = new PrismaClient();

async function main() {
  const semesterLabel = semesterLabelFromDate();

  const lab1 = await prisma.lab.upsert({
    where: {
      id: "seed-lab-1",
    },
    update: {},
    create: {
      id: "seed-lab-1",
      labName: "Computational Materials Lab",
      facultyName: "Dr. Elena Morris",
      facultyEmail: "emorris@virginia.edu",
      department: "Materials Science and Engineering",
      websiteUrl: "https://engineering.virginia.edu",
      currentStatus: "approved",
    },
  });

  const lab2 = await prisma.lab.upsert({
    where: {
      id: "seed-lab-2",
    },
    update: {},
    create: {
      id: "seed-lab-2",
      labName: "Human-Centered Robotics Group",
      facultyName: "Dr. Nikhil Patel",
      facultyEmail: "npatel@virginia.edu",
      department: "Computer Science",
      websiteUrl: "https://engineering.virginia.edu",
      currentStatus: "approved",
    },
  });

  await prisma.labSnapshot.createMany({
    data: [
      {
        labId: lab1.id,
        recruitingUndergrads: true,
        researchArea: "Battery materials simulation and data-driven discovery",
        optionalNotes: "Prior coding experience helpful but not required.",
        desiredSkills: "Python, NumPy, data analysis",
        websiteUrl: lab1.websiteUrl,
        summaryText:
          "This lab explores battery materials through simulation and computational modeling. New undergraduates can start with mentored data tasks.",
        sourceText: "Seeded source text",
        lastVerifiedAt: new Date("2026-03-01T00:00:00.000Z"),
        status: "approved",
        statusProvenance: "from_survey",
        summaryProvenance: "from_llm",
        isLatest: true,
        semesterLabel,
      },
      {
        labId: lab2.id,
        recruitingUndergrads: true,
        researchArea: "Assistive robotics, human-robot interaction",
        optionalNotes: "Open to first-year students.",
        desiredSkills: "Curiosity, teamwork",
        websiteUrl: lab2.websiteUrl,
        summaryText:
          "The group builds assistive robotics tools and studies how people interact with robots in real settings.",
        sourceText: "Seeded source text",
        lastVerifiedAt: new Date("2026-02-15T00:00:00.000Z"),
        status: "approved",
        statusProvenance: "from_survey",
        summaryProvenance: "from_llm",
        isLatest: true,
        semesterLabel,
      },
    ],
  });

  const issue = renderNewsletterIssue("Research Starters Hub Demo", semesterLabel, [
    {
      labName: lab1.labName,
      shortSummary:
        "Computational materials projects with approachable onboarding for undergraduate contributors.",
      department: lab1.department,
      recruitingUndergrads: true,
      websiteUrl: lab1.websiteUrl ?? undefined,
      updatedAt: "2026-03-01",
    },
    {
      labName: lab2.labName,
      shortSummary:
        "Human-centered robotics opportunities focused on assistive technology and interaction design.",
      department: lab2.department,
      recruitingUndergrads: true,
      websiteUrl: lab2.websiteUrl ?? undefined,
      updatedAt: "2026-02-15",
    },
  ]);

  await prisma.publicationIssue.create({
    data: {
      title: "Research Starters Hub Demo",
      semesterLabel,
      issueStatus: "exported",
      generatedHtml: issue.html,
      generatedMarkdown: issue.markdown,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
