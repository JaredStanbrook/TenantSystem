import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib";

type InvoicePdfPayment = {
  userDisplayName?: string | null;
  userEmail?: string | null;
  userId: string;
  amountOwed: number;
  amountPaid: number;
  status: string;
};

type InvoicePdfData = {
  invoiceId: number;
  propertyLabel: string;
  propertyAddress: string;
  invoiceType: string;
  invoiceStatus: string;
  totalAmount: number;
  dueDate: Date | null;
  issuedDate: Date | null;
  createdAt: Date | null;
  description?: string | null;
  payments: InvoicePdfPayment[];
};

// Color palette for professional invoice
const COLORS = {
  primary: rgb(0.2, 0.3, 0.5), // Dark blue
  secondary: rgb(0.4, 0.5, 0.65), // Medium blue
  text: rgb(0.15, 0.15, 0.15), // Almost black
  textLight: rgb(0.4, 0.4, 0.4), // Gray
  success: rgb(0.13, 0.55, 0.13), // Green
  warning: rgb(0.8, 0.52, 0.25), // Orange
  danger: rgb(0.8, 0.2, 0.2), // Red
  border: rgb(0.85, 0.85, 0.85), // Light gray
  background: rgb(0.96, 0.96, 0.96), // Very light gray
};

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (value: Date | null | undefined) =>
  value ? value.toISOString().split("T")[0] : "-";

// Status color mapping
const getStatusColor = (status: string): RGB => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("paid") || statusLower.includes("complete"))
    return COLORS.success;
  if (statusLower.includes("partial") || statusLower.includes("pending"))
    return COLORS.warning;
  if (statusLower.includes("overdue") || statusLower.includes("unpaid"))
    return COLORS.danger;
  return COLORS.textLight;
};

export const buildInvoicePdf = async (
  data: InvoicePdfData,
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595, 842]; // A4
  let page = pdfDoc.addPage(pageSize);
  let y = pageSize[1] - 50;

  const marginX = 50;
  const contentWidth = pageSize[0] - marginX * 2;
  const lineHeight = 10;

  // Helper: Draw text
  const drawText = (
    text: string,
    options?: {
      size?: number;
      bold?: boolean;
      color?: RGB;
      x?: number;
      align?: "left" | "right" | "center";
    },
  ) => {
    const size = options?.size ?? 11;
    const color = options?.color ?? COLORS.text;
    const usedFont = options?.bold ? fontBold : font;
    let xPos = options?.x ?? marginX;

    // Handle alignment
    if (options?.align === "right") {
      const textWidth = usedFont.widthOfTextAtSize(text, size);
      xPos = marginX + contentWidth - textWidth;
    } else if (options?.align === "center") {
      const textWidth = usedFont.widthOfTextAtSize(text, size);
      xPos = marginX + (contentWidth - textWidth) / 2;
    }

    page.drawText(text, { x: xPos, y, size, font: usedFont, color });
  };

  const drawTextRight = (
    text: string,
    xRight: number,
    options?: { size?: number; bold?: boolean; color?: RGB },
  ) => {
    const size = options?.size ?? 11;
    const color = options?.color ?? COLORS.text;
    const usedFont = options?.bold ? fontBold : font;
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: xRight - textWidth,
      y,
      size,
      font: usedFont,
      color,
    });
  };

  // Helper: Draw horizontal line
  const drawLine = (thickness = 1, color = COLORS.border, yOffset = 0) => {
    page.drawLine({
      start: { x: marginX, y: y + yOffset },
      end: { x: marginX + contentWidth, y: y + yOffset },
      thickness,
      color,
    });
  };

  // Helper: Ensure space on page
  const ensureSpace = (needed: number) => {
    if (y - needed < 50) {
      page = pdfDoc.addPage(pageSize);
      y = pageSize[1] - 50;
      return true; // New page created
    }
    return false;
  };

  // Helper: Draw section header
  const drawSectionHeader = (title: string) => {
    ensureSpace(30);
    y -= 10;
    drawText(title, { bold: true, size: 12, color: COLORS.primary });
    y -= 20;
  };

  // =========================
  // HEADER SECTION
  // =========================
  drawText("INVOICE", {
    size: 28,
    bold: true,
    color: COLORS.primary,
    align: "left",
  });
  y -= 15;
  drawText("Tenant Management System", {
    size: 11,
    color: COLORS.primary,
  });
  y -= 50;

  // =========================
  // INVOICE INFO SECTION
  // =========================
  ensureSpace(100);

  // Two-column layout for invoice details
  const rightColX = marginX + contentWidth / 2 + 20;
  const savedY = y;

  // Left column
  drawText(`Invoice #${data.invoiceId}`, {
    size: 16,
    bold: true,
    color: COLORS.primary,
  });
  y -= 20;

  drawText("Status:", { bold: true, size: 9, color: COLORS.textLight });
  y -= 14;
  drawText(data.invoiceStatus.toUpperCase(), {
    bold: true,
    size: 10,
    color: getStatusColor(data.invoiceStatus),
  });
  y -= 20;

  drawText("Invoice Type:", { bold: true, size: 9, color: COLORS.textLight });
  y -= 14;
  drawText(data.invoiceType, { size: 10 });
  y -= 6;

  // Right column
  y = savedY;
  drawText("Property Details", {
    x: rightColX,
    bold: true,
    size: 10,
    color: COLORS.primary,
  });
  y -= 18;
  drawText(data.propertyLabel, { x: rightColX, bold: true, size: 11 });
  y -= 14;
  drawText(data.propertyAddress, {
    x: rightColX,
    size: 9,
    color: COLORS.textLight,
  });
  y -= 24;

  // Dates section (right column)
  const dateY = y;
  drawText("Issued:", {
    x: rightColX,
    size: 9,
    bold: true,
    color: COLORS.textLight,
  });
  drawText(formatDate(data.issuedDate), { x: rightColX + 60, size: 9 });
  y -= 14;

  drawText("Due Date:", {
    x: rightColX,
    size: 9,
    bold: true,
    color: COLORS.textLight,
  });
  drawText(formatDate(data.dueDate), {
    x: rightColX + 60,
    size: 9,
    color:
      data.dueDate && new Date(data.dueDate) < new Date()
        ? COLORS.danger
        : COLORS.text,
  });
  y -= 14;

  drawText("Created:", {
    x: rightColX,
    size: 9,
    bold: true,
    color: COLORS.textLight,
  });
  drawText(formatDate(data.createdAt), { x: rightColX + 60, size: 9 });

  y = Math.min(y, dateY - 42);
  y -= 20;

  // Divider
  drawLine(1.5, COLORS.primary);
  y -= 20;

  // =========================
  // AMOUNT DUE SECTION
  // =========================
  ensureSpace(60);

  drawText("TOTAL AMOUNT DUE", {
    size: 11,
    bold: true,
    color: COLORS.primary,
  });
  y -= 5;
  const totalText = formatMoney(data.totalAmount);
  drawTextRight(totalText, marginX + contentWidth, {
    size: 22,
    bold: true,
    color: COLORS.primary,
  });
  y -= 20;

  // Calculate total paid
  const totalPaid = data.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalOwed = data.payments.reduce((sum, p) => sum + p.amountOwed, 0);
  const remainingBalance = totalOwed - totalPaid;

  drawText("Total Paid:", { size: 9, color: COLORS.textLight });
  drawTextRight(formatMoney(totalPaid), marginX + contentWidth, {
    size: 10,
    color: COLORS.success,
  });
  y -= 14;

  if (remainingBalance > 0) {
    drawText("Remaining Balance:", { size: 9, color: COLORS.textLight });
    drawTextRight(formatMoney(remainingBalance), marginX + contentWidth, {
      size: 10,
      bold: true,
      color: COLORS.danger,
    });
    y -= 14;
  }

  y -= 10;

  // =========================
  // DESCRIPTION SECTION
  // =========================
  if (data.description && data.description.trim()) {
    drawSectionHeader("Description");
    const descriptionLines = data.description.split("\n");
    for (const line of descriptionLines) {
      ensureSpace(lineHeight);
      drawText(line.trim(), { size: 10, color: COLORS.text });
      y -= lineHeight;
    }
    y -= 10;
  }

  // =========================
  // PAYMENTS SECTION
  // =========================
  drawSectionHeader("Payment Details");

  if (data.payments.length === 0) {
    ensureSpace(30);
    drawText("No payments recorded.", {
      size: 10,
      color: COLORS.textLight,
      align: "center",
    });
    y -= 30;
  } else {
    ensureSpace(50);

    // Table header with background
    y += 6;
    const headerY = y;

    const colTenant = marginX + 10;
    const colOwedRight = marginX + contentWidth - 210;
    const colPaidRight = marginX + contentWidth - 110;
    const colStatus = marginX + contentWidth - 70;

    page.drawText("Tenant", {
      x: colTenant,
      y: headerY,
      size: 10,
      font: fontBold,
      color: COLORS.primary,
    });
    drawTextRight("Amount Owed", colOwedRight, {
      size: 10,
      bold: true,
      color: COLORS.primary,
    });
    drawTextRight("Paid", colPaidRight, {
      size: 10,
      bold: true,
      color: COLORS.primary,
    });
    page.drawText("Status", {
      x: colStatus,
      y: headerY,
      size: 10,
      font: fontBold,
      color: COLORS.primary,
    });

    y -= 10;
    drawLine(1.5, COLORS.primary);
    y -= 20;

    // Table rows
    data.payments.forEach((payment, index) => {
      ensureSpace(lineHeight * 2);

      const tenantLabel =
        payment.userDisplayName || payment.userEmail || payment.userId;

      // Truncate long tenant names
      const maxTenantWidth = contentWidth - 290;
      let displayName = tenantLabel;
      const nameWidth = font.widthOfTextAtSize(displayName, 10);
      if (nameWidth > maxTenantWidth) {
        while (
          font.widthOfTextAtSize(displayName + "...", 10) > maxTenantWidth &&
          displayName.length > 0
        ) {
          displayName = displayName.slice(0, -1);
        }
        displayName += "...";
      }

      page.drawText(displayName, {
        x: colTenant,
        y,
        size: 10,
        font,
        color: COLORS.text,
      });

      drawTextRight(formatMoney(payment.amountOwed), colOwedRight, {
        size: 10,
        color: COLORS.text,
      });

      drawTextRight(formatMoney(payment.amountPaid), colPaidRight, {
        size: 10,
        color: payment.amountPaid > 0 ? COLORS.success : COLORS.textLight,
      });

      page.drawText(payment.status, {
        x: colStatus,
        y,
        size: 9,
        font,
        color: getStatusColor(payment.status),
      });

      y -= lineHeight;

      // Subtle divider between rows
      if (index < data.payments.length - 1) {
        page.drawLine({
          start: { x: marginX, y: y + 4 },
          end: { x: marginX + contentWidth, y: y + 4 },
          thickness: 0.5,
          color: rgb(0.92, 0.92, 0.92),
        });
        y -= 8;
      }
    });
  }

  // =========================
  // FOOTER
  // =========================
  y -= 30;
  ensureSpace(40);
  drawLine(0.5, COLORS.border);
  y -= 12;
  drawText("Thank you for your prompt payment", {
    size: 9,
    color: COLORS.textLight,
    align: "center",
  });
  y -= 12;
  drawText(`Generated on ${new Date().toLocaleDateString()}`, {
    size: 8,
    color: rgb(0.6, 0.6, 0.6),
    align: "center",
  });

  return pdfDoc.save();
};
