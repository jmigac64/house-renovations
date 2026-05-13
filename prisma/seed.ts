import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { DEFAULT_CATEGORIES } from "@/src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const hasUsers = await prisma.user.count();
  if (hasUsers > 0) {
    console.log("Seed skipped: data already exists.");
    return;
  }

  const owner = await prisma.user.create({
    data: {
      name: "Owner Demo",
      email: "owner@example.com",
      passwordHash: await hash("ChangeMe123!", 12),
      memberships: {
        create: {
          role: "OWNER",
          workspace: {
            create: {
              name: "Family House Renewal",
              defaultCurrency: "EUR",
              locale: "hr-HR",
              categories: {
                create: DEFAULT_CATEGORIES.map((name) => ({ name })),
              },
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  const workspaceId = owner.memberships[0].workspaceId;
  const categories = await prisma.category.findMany({ where: { workspaceId } });

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: "Family House Renewal 2026",
      status: "ACTIVE",
      currency: "EUR",
      address: "Example Street 42",
      rooms: {
        create: [
          { name: "Kitchen", sortOrder: 1 },
          { name: "Bathroom", sortOrder: 2 },
          { name: "Living room", sortOrder: 3 },
          { name: "Exterior", sortOrder: 4 },
        ],
      },
      phases: {
        create: [
          { name: "Demolition", sortOrder: 1 },
          { name: "Plumbing", sortOrder: 2 },
          { name: "Electrical", sortOrder: 3 },
          { name: "Flooring", sortOrder: 4 },
          { name: "Painting", sortOrder: 5 },
        ],
      },
    },
    include: { rooms: true, phases: true },
  });

  const vendors = await Promise.all([
    prisma.vendor.create({ data: { workspaceId, name: "M&M Plumbing", type: "CONTRACTOR", contactPerson: "Mario" } }),
    prisma.vendor.create({ data: { workspaceId, name: "Electro Plus", type: "SUPPLIER", contactPerson: "Ana" } }),
  ]);

  const laborCategory = categories.find((category) => category.name === "Labor") ?? categories[0];
  const electricalCategory = categories.find((category) => category.name === "Electrical") ?? categories[1];

  const budgetLine = await prisma.budgetLine.create({
    data: {
      projectId: project.id,
      name: "Kitchen plumbing work",
      categoryId: laborCategory.id,
      roomId: project.rooms.find((room) => room.name === "Kitchen")?.id,
      phaseId: project.phases.find((phase) => phase.name === "Plumbing")?.id,
      vendorId: vendors[0].id,
      plannedAmount: 2200,
      contingencyPercent: 10,
    },
  });

  await prisma.budgetLine.create({
    data: {
      projectId: project.id,
      name: "Electrical rewiring",
      categoryId: electricalCategory.id,
      roomId: project.rooms.find((room) => room.name === "Living room")?.id,
      phaseId: project.phases.find((phase) => phase.name === "Electrical")?.id,
      vendorId: vendors[1].id,
      plannedAmount: 1800,
      contingencyPercent: 15,
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        projectId: project.id,
        categoryId: laborCategory.id,
        roomId: project.rooms.find((room) => room.name === "Kitchen")?.id,
        phaseId: project.phases.find((phase) => phase.name === "Plumbing")?.id,
        vendorId: vendors[0].id,
        budgetLineId: budgetLine.id,
        createdById: owner.id,
        title: "Kitchen pipe replacement",
        amount: 1250,
        currency: "EUR",
        expenseDate: new Date("2026-01-15"),
        status: "PAID",
        paymentMethod: "BANK_TRANSFER",
      },
      {
        projectId: project.id,
        categoryId: electricalCategory.id,
        roomId: project.rooms.find((room) => room.name === "Living room")?.id,
        phaseId: project.phases.find((phase) => phase.name === "Electrical")?.id,
        vendorId: vendors[1].id,
        createdById: owner.id,
        title: "Wiring material",
        amount: 820,
        currency: "EUR",
        expenseDate: new Date("2026-02-01"),
        status: "ORDERED",
      },
    ],
  });

  await prisma.fundingSource.createMany({
    data: [
      {
        projectId: project.id,
        sourceName: "Savings",
        type: "SAVINGS",
        amount: 9000,
        status: "RECEIVED",
        receivedDate: new Date("2026-01-01"),
      },
      {
        projectId: project.id,
        sourceName: "Bank Loan",
        type: "LOAN",
        amount: 12000,
        status: "EXPECTED",
      },
    ],
  });

  console.log("Seed completed.");
  console.log("Demo owner: owner@example.com / ChangeMe123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
