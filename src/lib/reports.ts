import { ExpenseStatus } from "@prisma/client";
import { db } from "@/src/lib/db";
import { decimalToNumber, percent, toFixedMoney } from "@/src/lib/money";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getDashboardMetrics(projectId: string) {
  const [project, budgets, expenses, funding] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId } }),
    db.budgetLine.findMany({ where: { projectId } }),
    db.expense.findMany({ where: { projectId, status: { not: "CANCELLED" } } }),
    db.fundingSource.findMany({ where: { projectId, status: { in: ["EXPECTED", "RECEIVED"] } } }),
  ]);

  const totalPlannedBudget = budgets.reduce((sum, b) => {
    const planned = decimalToNumber(b.plannedAmount);
    const contingency = planned * (decimalToNumber(b.contingencyPercent) / 100);
    return sum + planned + contingency;
  }, 0);

  const actualExpenses = expenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0);
  const paidExpenses = expenses
    .filter((e) => e.status === "PAID" || e.status === "PARTIALLY_PAID")
    .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

  const unpaidExpenses = expenses
    .filter((e) => e.status === "PLANNED" || e.status === "ORDERED" || e.status === "PARTIALLY_PAID")
    .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

  const remainingBudget = totalPlannedBudget - actualExpenses;
  const forecastedFinalCost = actualExpenses + Math.max(0, remainingBudget);

  const expectedFunding = funding.reduce((sum, f) => sum + decimalToNumber(f.amount), 0);
  const receivedFunding = funding
    .filter((f) => f.status === "RECEIVED")
    .reduce((sum, f) => sum + decimalToNumber(f.amount), 0);

  const availableCash = receivedFunding - paidExpenses;

  return {
    project,
    totalPlannedBudget: toFixedMoney(totalPlannedBudget),
    actualExpenses: toFixedMoney(actualExpenses),
    paidExpenses: toFixedMoney(paidExpenses),
    remainingBudget: toFixedMoney(remainingBudget),
    forecastedFinalCost: toFixedMoney(forecastedFinalCost),
    budgetUsage: totalPlannedBudget > 0 ? percent((actualExpenses / totalPlannedBudget) * 100) : 0,
    availableCash: toFixedMoney(availableCash),
    unpaidExpenses: toFixedMoney(unpaidExpenses),
    fundingGap: toFixedMoney(forecastedFinalCost - expectedFunding),
  };
}

export async function getPlannedVsActual(projectId: string) {
  const [budgetLines, expenses] = await Promise.all([
    db.budgetLine.findMany({
      where: { projectId },
      include: { category: true, room: true, phase: true },
      orderBy: { createdAt: "asc" },
    }),
    db.expense.findMany({
      where: { projectId, status: { not: "CANCELLED" } },
      include: { category: true },
    }),
  ]);

  return budgetLines.map((line) => {
    const planned = decimalToNumber(line.plannedAmount);
    const contingency = planned * (decimalToNumber(line.contingencyPercent) / 100);
    const plannedTotal = planned + contingency;

    const actual = expenses
      .filter((expense) => {
        if (expense.budgetLineId === line.id) {
          return true;
        }
        return (
          expense.categoryId === line.categoryId &&
          (!line.roomId || line.roomId === expense.roomId) &&
          (!line.phaseId || line.phaseId === expense.phaseId)
        );
      })
      .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

    const usage = plannedTotal > 0 ? (actual / plannedTotal) * 100 : 0;

    return {
      id: line.id,
      name: line.name,
      category: line.category.name,
      room: line.room?.name || "-",
      phase: line.phase?.name || "-",
      planned,
      contingency,
      plannedTotal,
      actual,
      difference: plannedTotal - actual,
      usage,
      status: usage > 100 ? "Over budget" : usage >= 80 ? "Near limit" : "Under budget",
    };
  });
}

export async function getCategorySpending(projectId: string) {
  const categories = await db.category.findMany({
    where: { workspace: { projects: { some: { id: projectId } } } },
  });

  const [budgets, expenses] = await Promise.all([
    db.budgetLine.findMany({ where: { projectId } }),
    db.expense.findMany({ where: { projectId, status: { not: "CANCELLED" } } }),
  ]);

  const totalExpenses = expenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

  return categories
    .map((category) => {
      const planned = budgets
        .filter((b) => b.categoryId === category.id)
        .reduce((sum, b) => sum + decimalToNumber(b.plannedAmount), 0);

      const spent = expenses
        .filter((e) => e.categoryId === category.id)
        .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

      if (planned === 0 && spent === 0) {
        return null;
      }

      return {
        id: category.id,
        category: category.name,
        planned,
        spent,
        difference: planned - spent,
        expenseCount: expenses.filter((e) => e.categoryId === category.id).length,
        percentage: totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.spent - a.spent);
}

export async function getVendorSpending(projectId: string) {
  const vendors = await db.vendor.findMany({
    where: { workspace: { projects: { some: { id: projectId } } } },
    orderBy: { name: "asc" },
  });

  const expenses = await db.expense.findMany({
    where: { projectId, status: { not: "CANCELLED" } },
    orderBy: { expenseDate: "asc" },
  });

  return vendors
    .map((vendor) => {
      const vendorExpenses = expenses.filter((e) => e.vendorId === vendor.id);
      if (vendorExpenses.length === 0) {
        return null;
      }

      const total = vendorExpenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0);
      const paid = vendorExpenses
        .filter((e) => e.status === "PAID")
        .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);
      const unpaid = vendorExpenses
        .filter((e) => e.status !== "PAID")
        .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

      return {
        id: vendor.id,
        vendor: vendor.name,
        total,
        paid,
        unpaid,
        count: vendorExpenses.length,
        average: total / vendorExpenses.length,
        lastExpenseDate: vendorExpenses[vendorExpenses.length - 1]?.expenseDate || null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.total - a.total);
}

export async function getMonthlyCashFlow(projectId: string) {
  const [funding, expenses] = await Promise.all([
    db.fundingSource.findMany({ where: { projectId, status: "RECEIVED" } }),
    db.expense.findMany({
      where: {
        projectId,
        status: { in: [ExpenseStatus.PAID, ExpenseStatus.PARTIALLY_PAID] },
      },
    }),
  ]);

  const keys = new Set<string>();
  funding.forEach((f) => {
    if (f.receivedDate) {
      keys.add(monthKey(f.receivedDate));
    }
  });
  expenses.forEach((e) => keys.add(monthKey(e.paymentDate ?? e.expenseDate)));

  const sortedMonths = [...keys].sort();

  let runningBalance = 0;
  return sortedMonths.map((month) => {
    const monthlyFunding = funding
      .filter((f) => f.receivedDate && monthKey(f.receivedDate) === month)
      .reduce((sum, f) => sum + decimalToNumber(f.amount), 0);

    const monthlyExpenses = expenses
      .filter((e) => monthKey(e.paymentDate ?? e.expenseDate) === month)
      .reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

    const net = monthlyFunding - monthlyExpenses;
    runningBalance += net;

    return {
      month,
      monthlyFunding,
      monthlyExpenses,
      net,
      runningBalance,
    };
  });
}

export async function getForecast(projectId: string) {
  const [budgets, expenses, funding] = await Promise.all([
    db.budgetLine.findMany({ where: { projectId } }),
    db.expense.findMany({ where: { projectId, status: { not: "CANCELLED" } } }),
    db.fundingSource.findMany({ where: { projectId, status: { in: ["EXPECTED", "RECEIVED"] } } }),
  ]);

  const actualExpenses = expenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0);

  const planned = budgets.reduce((sum, b) => {
    const base = decimalToNumber(b.plannedAmount);
    const contingency = base * (decimalToNumber(b.contingencyPercent) / 100);
    return sum + base + contingency;
  }, 0);

  const remainingPlannedBudget = Math.max(0, planned - actualExpenses);
  const forecastedFinalCost = actualExpenses + remainingPlannedBudget;

  const expectedFunding = funding.reduce((sum, f) => sum + decimalToNumber(f.amount), 0);

  return {
    actualExpenses,
    remainingPlannedBudget,
    forecastedFinalCost,
    totalPlannedBudget: planned,
    forecastedDifference: planned - forecastedFinalCost,
    fundingGap: forecastedFinalCost - expectedFunding,
  };
}
