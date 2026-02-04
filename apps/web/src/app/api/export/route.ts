import { ExportRequestSchema } from "@acme/api";
import { getDb, schema } from "@acme/db";
import { ensureSubscription } from "@/lib/ai";
import { requireUser } from "@/lib/session";
import { and, eq, gte, lte } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";

function getMonthRange(month: string) {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    startString: start.toISOString().slice(0, 10),
    endString: end.toISOString().slice(0, 10)
  };
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscription = await ensureSubscription(user.id);
  if (subscription.status !== "active" && subscription.status !== "trial") {
    return new Response("Upgrade to Pro to export data.", { status: 402 });
  }

  const body = await request.json();
  const { month, format } = ExportRequestSchema.parse(body);
  const range = getMonthRange(month);
  if (!range) {
    return new Response("Invalid month", { status: 400 });
  }

  const db = getDb();
  const items = await db.query.transaction.findMany({
    where: and(
      eq(schema.transaction.userId, user.id),
      gte(schema.transaction.date, range.startString),
      lte(schema.transaction.date, range.endString)
    ),
    orderBy: (transaction, { desc }) => [desc(transaction.date)]
  });

  const headers = [
    "date",
    "type",
    "amount",
    "currency",
    "category",
    "subcategory",
    "paymentMode",
    "notes"
  ];
  const rows = items.map((item) => [
    item.date,
    item.type,
    item.amount,
    item.currency,
    item.category ?? "",
    item.subcategory ?? "",
    item.paymentMode,
    item.notes ?? ""
  ]);

  if (format === "xlsx") {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="transactions-${month}.xlsx"`
      }
    });
  }

  if (format === "pdf") {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    let y = page.getHeight() - 40;

    page.drawText(`Transactions for ${month}`, {
      x: 40,
      y,
      size: 16,
      font
    });
    y -= 24;

    for (const row of rows) {
      const line = row.map((value) => String(value ?? "")).join(" | ");
      page.drawText(line.slice(0, 120), { x: 40, y, size: 12, font });
      y -= 18;
      if (y < 40) {
        y = page.getHeight() - 40;
        pdf.addPage();
      }
    }

    const pdfBytes = await pdf.save();
    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transactions-${month}.pdf"`
      }
    });
  }

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions-${month}.csv"`
    }
  });
}
