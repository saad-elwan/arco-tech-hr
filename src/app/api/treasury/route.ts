import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, canAccessFinance } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!(await canAccessFinance(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // Get or initialize Treasury record (ID: 1)
  let treasury = await prisma.treasury.findUnique({ where: { id: 1 } });
  if (!treasury) {
    treasury = await prisma.treasury.create({
      data: { id: 1, balance: 100000, totalDeposits: 100000, totalWithdrawals: 0 }
    });
    await prisma.treasuryTransaction.create({
      data: {
        type: "deposit",
        amount: 100000,
        description: "رصيد افتتاحي للخزينة النقدية الرئيسية",
        performedBy: "مدير النظام"
      }
    });
  }

  const transactions = await prisma.treasuryTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    treasury,
    transactions,
  });
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!(await canAccessFinance(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json();
  const { type, amount: inputAmount, description } = body;

  const amount = parseFloat(inputAmount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "يرجى إدخال مبلغ صحيح أكبر من الصفر" }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json({ error: "وصف المعاملة والسبب مطلوب" }, { status: 400 });
  }

  let treasury = await prisma.treasury.findUnique({ where: { id: 1 } });
  if (!treasury) {
    treasury = await prisma.treasury.create({
      data: { id: 1, balance: 0, totalDeposits: 0, totalWithdrawals: 0 }
    });
  }

  if (type === "withdrawal" && treasury.balance < amount) {
    return NextResponse.json({ error: `رصيد الخزينة غير كافٍ. الرصيد الحالي: ${treasury.balance} ج.م` }, { status: 400 });
  }

  let newBalance = treasury.balance;
  let newTotalDeposits = treasury.totalDeposits;
  let newTotalWithdrawals = treasury.totalWithdrawals;

  if (type === "deposit") {
    newBalance += amount;
    newTotalDeposits += amount;
  } else {
    newBalance -= amount;
    newTotalWithdrawals += amount;
  }

  const updatedTreasury = await prisma.treasury.update({
    where: { id: 1 },
    data: {
      balance: newBalance,
      totalDeposits: newTotalDeposits,
      totalWithdrawals: newTotalWithdrawals,
    }
  });

  const transaction = await prisma.treasuryTransaction.create({
    data: {
      type: type === "deposit" ? "deposit" : "withdrawal",
      amount,
      description,
      performedBy: auth.name || "المشرف المالي",
    }
  });

  return NextResponse.json({
    success: true,
    treasury: updatedTreasury,
    transaction,
  });
}
