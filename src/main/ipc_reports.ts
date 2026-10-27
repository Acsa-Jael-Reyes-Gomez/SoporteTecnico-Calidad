// src/main/ipc_reports.ts
import type { IpcMain } from "electron";
import { withConn } from "./db/db";
import { requirePerm, requireTrustedSession } from "./session_store";
import { isTicketComplexityExportLayout } from "./ticket_excel_export";
import { exportReport, exportReportWorkbook } from "./services/report_export_service";
import { validateReportFilters } from "./services/report_query_service";
import { sanitizeSheetName } from "./services/export_security";

// rango mensual 26–25 (incluye horas)
function monthlyRange(baseISO: string) {
  const d = new Date(baseISO || new Date().toISOString());
  const y = d.getFullYear();
  const m = d.getMonth();

  const start = d.getDate() >= 26 ? new Date(y, m, 26, 0, 0, 0) : new Date(y, m - 1, 26, 0, 0, 0);
  const end = d.getDate() >= 26 ? new Date(y, m + 1, 25, 23, 59, 59) : new Date(y, m, 25, 23, 59, 59);

  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const toMysql = (x: Date) =>
    `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(
      x.getMinutes()
    )}:${pad(x.getSeconds())}`;

  return { start: toMysql(start), end: toMysql(end) };
}

function normalizeEstado(v: any): "ABIERTO" | "CERRADO" | null {
  const s = (v ?? "").toString().trim().toUpperCase();
  if (s === "ABIERTO" || s === "CERRADO") return s as any;
  return null;
}

function normalizeReportLabel(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getTicketComplexityCode(value: any) {
  const text = normalizeReportLabel(value);
  if (text.includes("BASICO")) return "B";
  if (text.includes("INTERMEDIO")) return "I";
  if (text.includes("COMPLEJO")) return "C";
  if (text.includes("EXTRAORDINARIO")) return "E";
  return String(value || "—").trim() || "—";
}

function getTicketComplexityLabel(value: any) {
  const code = getTicketComplexityCode(value);
  if (code === "B") return "Básico";
  if (code === "I") return "Intermedio";
  if (code === "C") return "Complejo";
  if (code === "E") return "Extraordinario";
  return String(value || "—").trim() || "—";
}

function getTicketComplexityExcelColors(value: any) {
  const code = getTicketComplexityCode(value);

  if (code === "B") {
    return { backgroundColor: "#cfeecd", textColor: "#56a531" };
  }
  if (code === "I") {
    return { backgroundColor: "#ffe699", textColor: "#d97706" };
  }
  if (code === "C") {
    return { backgroundColor: "#ffc7ce", textColor: "#d70000" };
  }
  if (code === "E") {
    return { backgroundColor: "#f2ceef", textColor: "#c837c7" };
  }

  return { backgroundColor: "#eef2f7", textColor: "#334155" };
}

function getRouteTypeLabel(value: any) {
  const text = normalizeReportLabel(value);
  if (text.includes("CERCANA")) return "CERCANA";
  if (text.includes("INTERMEDIA")) return "INTERMEDIA";
  if (text.includes("LEJANA")) return "LEJANA";
  return String(value || "—").trim() || "—";
}

function getRouteTypeExcelColors(value: any) {
  const text = normalizeReportLabel(value);

  if (text.includes("CERCANA")) {
    return { backgroundColor: "#cfeecd", textColor: "#2f8f2f" };
  }
  if (text.includes("INTERMEDIA")) {
    return { backgroundColor: "#ffe699", textColor: "#d97706" };
  }
  if (text.includes("LEJANA")) {
    return { backgroundColor: "#f4b7c3", textColor: "#d70000" };
  }

  return { backgroundColor: "#eef2f7", textColor: "#334155" };
}

function getRouteReportLayoutMode(data: any[][]) {
  const marker = String(data?.[0]?.[0] ?? "").trim().toUpperCase();
  if (marker === "__REPORTE_RUTAS_INDIVIDUALES__") return "individual";
  if (marker === "__REPORTE_RUTAS_GLOBALES__") return "global";
  return "";
}

function isModernTicketComplexityMatrix(data: any[][]) {
  const firstContentRow = (data || []).find((row, index) =>
    index > 0 &&
    Array.isArray(row) &&
    String(row?.[0] ?? "").trim() !== ""
  );
  return String(firstContentRow?.[0] ?? "").trim().toUpperCase() === "REPORTE DE TICKETS DE SOPORTE TÉCNICO";
}

function hasUnifiedTicketComplexityLayout(data: any[][]) {
  return Array.isArray(data) &&
    data.some((row) => String(row?.[0] ?? "").trim().toUpperCase() === "INDIVIDUAL - COMPARTIDOS");
}

function getTicketComplexityLayoutSection(data: any[][], rowIndex: number) {
  for (let index = rowIndex; index >= 0; index -= 1) {
    const label = String(data[index]?.[0] ?? "").trim().toUpperCase();
    if (label === "INDIVIDUAL - COMPARTIDOS") {
      return "UNIFIED";
    }
  }
  return "";
}

function clampExcelWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildTicketComplexityLayoutColumns(data: any[][], reportTitle: string) {
  if (isModernTicketComplexityMatrix(data) && hasUnifiedTicketComplexityLayout(data)) {
    return [
      { width: 14 }, { width: 22 }, { width: 24 }, { width: 26 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 18 }, { width: 16 }, { width: 22 }
    ];
  }

  let currentSection = "";
  let techMax = "Técnico".length;
  let secondColumnMax = "Compartido con".length;
  let serviceMax = "Servicio".length;
  let sharedUnitMax = "Unidad".length;
  let solutionMax = "Solución".length;
  let complexityMax = "Complejidad".length;

  for (const row of data) {
    const rowLabel = String(row?.[0] ?? "").trim().toUpperCase();
    if (rowLabel === "INDIVIDUAL" || rowLabel === "COMPARTIDO") {
      currentSection = rowLabel;
      continue;
    }
    if (!currentSection || rowLabel === "TOTAL") {
      continue;
    }

    if (currentSection === "INDIVIDUAL") {
      techMax = Math.max(techMax, String(row?.[0] ?? "").trim().length);
      secondColumnMax = Math.max(secondColumnMax, String(row?.[1] ?? "").trim().length);
      serviceMax = Math.max(serviceMax, String(row?.[2] ?? "").trim().length);
      solutionMax = Math.max(solutionMax, String(row?.[3] ?? "").trim().length);
      complexityMax = Math.max(complexityMax, String(row?.[6] ?? "").trim().length);
      continue;
    }

    techMax = Math.max(techMax, String(row?.[0] ?? "").trim().length);
    secondColumnMax = Math.max(secondColumnMax, String(row?.[1] ?? "").trim().length);
    serviceMax = Math.max(serviceMax, String(row?.[2] ?? "").trim().length);
    sharedUnitMax = Math.max(sharedUnitMax, String(row?.[3] ?? "").trim().length);
    solutionMax = Math.max(solutionMax, String(row?.[4] ?? "").trim().length);
    complexityMax = Math.max(complexityMax, String(row?.[6] ?? "").trim().length);
  }

  const col0 = clampExcelWidth(techMax + 2, 14, 24);
  const col1 = clampExcelWidth(secondColumnMax + 2, 16, 34);
  const col2 = clampExcelWidth(serviceMax + 2, 16, 32);
  const titleTarget = clampExcelWidth(Math.ceil(reportTitle.length * 0.35), 28, 50);
  const solutionTarget = clampExcelWidth(Math.ceil(solutionMax * 0.55) + 8, 34, 82);
  const col3 = clampExcelWidth(Math.max(sharedUnitMax + 2, 14), 14, 26);
  const descGroupTarget = Math.max(solutionTarget, titleTarget - col2);
  const remainingForDescription = Math.max(descGroupTarget - col3, 24);
  const col4 = clampExcelWidth(Math.ceil(remainingForDescription / 2), 14, 34);
  const col5 = clampExcelWidth(Math.floor(remainingForDescription / 2), 14, 34);
  const col6 = clampExcelWidth(complexityMax + 2, 16, 22);

  return [col0, col1, col2, col3, col4, col5, col6].map((width) => ({ width }));
}

function buildUnifiedTicketComplexityLayoutColumns(data: any[][]) {
  return buildTicketComplexityLayoutColumns(data, "");
}

function estimateExcelWrappedLineCount(text: any, maxCharsPerLine: number) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) return 1;

  const lineLimit = Math.max(12, maxCharsPerLine);
  let totalLines = 0;

  for (const paragraph of normalized.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      totalLines += 1;
      continue;
    }

    let currentLength = 0;
    for (const word of words) {
      const wordLength = Math.max(1, word.length);
      if (!currentLength) {
        currentLength = wordLength;
      } else if (currentLength + 1 + wordLength <= lineLimit) {
        currentLength += 1 + wordLength;
      } else {
        totalLines += 1;
        currentLength = wordLength;
      }

      while (currentLength > lineLimit) {
        totalLines += 1;
        currentLength -= lineLimit;
      }
    }

    totalLines += currentLength > 0 ? 1 : 0;
  }

  return Math.max(1, totalLines);
}

function getTicketComplexityRowHeight(text: any, mergedWidthChars: number) {
  const maxCharsPerLine = Math.max(18, Math.floor(mergedWidthChars * 1.08));
  const lines = estimateExcelWrappedLineCount(text, maxCharsPerLine);
  return clampExcelWidth(18 + (lines - 1) * 16, 22, 140);
}

function buildRouteLayoutColumns(data: any[][], mode: string, _reportTitle: string) {
  if (mode === "individual") {
    let unitMax = "Unidad".length;
    let participantsMax = "Participantes".length;
    for (const row of data.slice(8)) {
      unitMax = Math.max(unitMax, String(row?.[0] ?? "").trim().length);
      participantsMax = Math.max(participantsMax, String(row?.[1] ?? "").trim().length);
    }
    const total = Math.max(11, Math.max(...data.map((row) => row.length)));
    return [
      { width: clampExcelWidth(unitMax + 3, 24, 34) },
      { width: clampExcelWidth(Math.ceil(participantsMax * 0.8) + 7, 25, 38) },
      { width: 14 },
      ...Array.from({ length: total - 3 }, () => ({ width: 12 }))
    ];
  }

  let firstMax = mode === "global" ? "Tecnico".length : "Unidad".length;
  let participantsMax = mode === "global" ? "Compartido con".length : "Participantes".length;
  let typeMax = "Tipo".length;

  for (const row of data) {
    const rowLabel = String(row?.[0] ?? "").trim().toUpperCase();
    if (!rowLabel || rowLabel === "TOTAL" || rowLabel.includes("RUTAS ")) continue;
    if (mode === "individual" && rowLabel === "UNIDAD") continue;
    if (mode === "global" && rowLabel === "TECNICO") continue;
    if (/^(SOPORTE TECNICO|DETALLE POR TECNICO)/i.test(String(row?.[0] ?? ""))) continue;

    firstMax = Math.max(firstMax, String(row?.[0] ?? "").trim().length);
    participantsMax = Math.max(participantsMax, String(row?.[1] ?? "").trim().length);
    typeMax = Math.max(typeMax, String(row?.[2] ?? "").trim().length);
  }

  const col0 = clampExcelWidth(firstMax + 4, 22, 40);
  const col1 = clampExcelWidth(Math.ceil(participantsMax * 0.72) + 10, 34, 64);
  const col2 = clampExcelWidth(typeMax + 4, 16, 22);
  const reviewColumns = Math.max(0, Math.max(...data.map((row) => row.length)) - 3);
  return [
    { width: col0 },
    { width: col1 },
    { width: col2 },
    ...Array.from({ length: reviewColumns }, () => ({ width: 13 }))
  ];
}

function getRouteLayoutRowHeight(text: any, mergedWidthChars: number) {
  const maxCharsPerLine = Math.max(14, Math.floor(mergedWidthChars * 0.94));
  const lines = estimateExcelWrappedLineCount(text, maxCharsPerLine);
  return clampExcelWidth(22 + (lines - 1) * 18, 24, 180);
}

function isProjectApprovedExportLayout(data: any[][]) {
  return (
    Array.isArray(data) &&
    String(data?.[0]?.[0] ?? "").trim().toUpperCase() === "__REPORTE_PROYECTOS_APROBADOS__"
  );
}

function buildProjectLayoutColumns(data: any[][], reportTitle: string) {
  let titleMax = "Titulo".length;
  let participantsMax = "Participantes".length;
  let documentMax = "Documento".length;
  const reportTitleMax = String(reportTitle || "").trim().length;

  for (const row of data) {
    const rowLabel = String(row?.[0] ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

    if (!rowLabel || rowLabel === "TOTAL" || rowLabel.includes("PROYECTOS ")) continue;
    if (rowLabel === "TITULO") continue;
    if (/^(SOPORTE TECNICO|DETALLE POR TITULO)/i.test(String(row?.[0] ?? ""))) continue;

    titleMax = Math.max(titleMax, String(row?.[0] ?? "").trim().length);
    participantsMax = Math.max(participantsMax, String(row?.[1] ?? "").trim().length);
    documentMax = Math.max(documentMax, String(row?.[3] ?? "").trim().length);
  }

  const titleSpanTarget = clampExcelWidth(Math.ceil(reportTitleMax * 0.96) + 8, 42, 74);
  const participantGroup = clampExcelWidth(
    Math.max(Math.ceil(participantsMax * 0.66) + 10, titleSpanTarget),
    42,
    78
  );
  const documentGroup = clampExcelWidth(Math.ceil(documentMax * 0.46) + 14, 34, 72);
  const col0 = clampExcelWidth(titleMax + 5, 24, 42);
  const col1 = clampExcelWidth(Math.ceil(participantGroup * 0.54), 22, 42);
  const col2 = clampExcelWidth(Math.floor(participantGroup * 0.46), 20, 36);
  const col3 = clampExcelWidth(Math.ceil(documentGroup * 0.54), 18, 36);
  const col4 = clampExcelWidth(Math.floor(documentGroup * 0.46), 16, 32);

  return [col0, col1, col2, col3, col4].map((width) => ({ width }));
}

function getProjectLayoutRowHeight(
  titleText: any,
  participantsText: any,
  documentText: any,
  titleWidthChars: number,
  participantsWidthChars: number,
  documentWidthChars: number
) {
  const titleLines = estimateExcelWrappedLineCount(titleText, Math.max(14, Math.floor(titleWidthChars * 0.95)));
  const participantsLines = estimateExcelWrappedLineCount(participantsText, Math.max(14, Math.floor(participantsWidthChars * 0.94)));
  const documentLines = estimateExcelWrappedLineCount(documentText, Math.max(14, Math.floor(documentWidthChars * 0.92)));
  const lines = Math.max(titleLines, participantsLines, documentLines);
  return clampExcelWidth(22 + (lines - 1) * 18, 24, 190);
}

function deriveReportSheetName(title: string, data: any[]) {
  const aoaData = Array.isArray(data) ? data as any[][] : [];
  const reportTitle = String(title || "").trim();

  if (isTicketComplexityExportLayout(aoaData) || /tickets?/i.test(reportTitle)) {
    return "Tickets";
  }
  if (getRouteReportLayoutMode(aoaData) || /rutas?/i.test(reportTitle)) {
    return "Rutas";
  }
  if (isProjectApprovedExportLayout(aoaData) || /proyectos?/i.test(reportTitle)) {
    return "Proyectos";
  }
  return "Reporte";
}

function buildExcelSheetConfig(data: any[], title: string, sheetName: string) {
  if (!data?.length) {
    throw new Error("No hay datos para exportar.");
  }

  let aoaData: any[][];
  const firstItem = data[0];
  const isArrayOfObjects = firstItem && typeof firstItem === "object" && !Array.isArray(firstItem);

  if (isArrayOfObjects) {
    const headers = Object.keys(firstItem);
    aoaData = [headers];

    for (const row of data) {
      aoaData.push(
        headers.map((header) => {
          const value = row[header];
          return value === null || value === undefined ? "" : value;
        })
      );
    }
  } else {
    aoaData = data;
  }

  const reportTitle = String(title || "Reporte");
  const isTicketComplexityLayout =
    !isArrayOfObjects &&
    isTicketComplexityExportLayout(aoaData);
  const routeReportLayoutMode =
    !isArrayOfObjects
      ? getRouteReportLayoutMode(aoaData)
      : "";
  const isRouteReportLayout = !!routeReportLayoutMode;
  const isProjectReportLayout =
    !isArrayOfObjects &&
    isProjectApprovedExportLayout(aoaData);

  if (isTicketComplexityLayout) {
    aoaData = aoaData.slice(1);
  }
  if (isRouteReportLayout) {
    aoaData = aoaData.slice(1);
  }
  if (isProjectReportLayout) {
    aoaData = aoaData.slice(1);
  }

  const isTicketSummaryMatrix =
    !isArrayOfObjects &&
    !isTicketComplexityLayout &&
    !isRouteReportLayout &&
    !isProjectReportLayout &&
    /Resumen tickets calificados/i.test(reportTitle) &&
    Array.isArray(aoaData) &&
    aoaData.length >= 3;
  const isRouteSummaryMatrix =
    !isArrayOfObjects &&
    !isTicketComplexityLayout &&
    !isRouteReportLayout &&
    !isProjectReportLayout &&
    /Resumen rutas calificadas/i.test(reportTitle) &&
    Array.isArray(aoaData) &&
    aoaData.length >= 2;
  const isProjectSummaryMatrix =
    !isArrayOfObjects &&
    !isTicketComplexityLayout &&
    !isRouteReportLayout &&
    !isProjectReportLayout &&
    /Resumen mensual proyectos aprobados/i.test(reportTitle) &&
    Array.isArray(aoaData) &&
    aoaData.length >= 1;
  const isTicketDetailMatrix =
    !isArrayOfObjects &&
    !isTicketComplexityLayout &&
    !isRouteReportLayout &&
    !isProjectReportLayout &&
    Array.isArray(aoaData) &&
    aoaData.some((row) => String(row?.[0] ?? "").trim().toUpperCase() === "INDIVIDUAL") &&
    aoaData.some((row) => String(row?.[0] ?? "").trim().toUpperCase() === "COMPARTIDO");
  const totalColumns = Math.max(1, aoaData.reduce((max, row) => Math.max(max, row.length), 0));
  const ticketComplexityColumns = isTicketComplexityLayout
    ? buildUnifiedTicketComplexityLayoutColumns(aoaData)
    : null;
  const routeLayoutColumns = isRouteReportLayout
    ? buildRouteLayoutColumns(aoaData, routeReportLayoutMode, reportTitle)
    : null;
  const projectLayoutColumns = isProjectReportLayout
    ? buildProjectLayoutColumns(aoaData, reportTitle)
    : null;
  const shouldAddTitleRow = !isTicketComplexityLayout && !isRouteReportLayout && !isProjectReportLayout;
  const titleRow = shouldAddTitleRow
    ? [
        {
          value: reportTitle,
          fontWeight: "bold" as const,
          fontSize: isTicketDetailMatrix ? 18 : 16,
          align: "center" as const,
          backgroundColor: isTicketDetailMatrix ? "#0f6d74" : "#e5f1f3",
          textColor: isTicketDetailMatrix ? "#ffffff" : "#0f1f35",
          span: totalColumns
        },
        ...Array.from({ length: Math.max(0, totalColumns - 1) }, () => null)
      ]
    : [];

  const bodyRows = aoaData.map((row, rowIndex) =>
    Array.from({ length: totalColumns }, (_, columnIndex) => {
      const value = row[columnIndex] ?? "";
      const rowLabel = String(row?.[0] ?? "").trim().toUpperCase();
      const prevRowLabel = String(aoaData[rowIndex - 1]?.[0] ?? "").trim().toUpperCase();
      const ticketComplexitySection: string = isTicketComplexityLayout
        ? getTicketComplexityLayoutSection(aoaData, rowIndex)
        : "";
      const isRouteReportSectionRow =
        isRouteReportLayout && /^RUTAS /i.test(String(row?.[0] ?? "").trim());
      const isRouteReportHeaderRow =
        isRouteReportLayout &&
        (
          (routeReportLayoutMode === "individual" && String(row?.[0] ?? "").trim().toUpperCase() === "UNIDAD") ||
          (routeReportLayoutMode === "global" && String(row?.[0] ?? "").trim().toUpperCase() === "TECNICO")
        );
      const isRouteReportTotalRow =
        isRouteReportLayout && rowLabel === "TOTAL";
      const isRouteReportSpacerRow =
        isRouteReportLayout &&
        row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
      const normalizedProjectRowLabel = String(row?.[0] ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
      const isProjectReportSectionRow =
        isProjectReportLayout && /^PROYECTOS /i.test(String(row?.[0] ?? "").trim());
      const isProjectReportHeaderRow =
        isProjectReportLayout && normalizedProjectRowLabel === "TITULO";
      const isProjectReportTotalRow =
        isProjectReportLayout && rowLabel === "TOTAL";
      const isProjectReportSpacerRow =
        isProjectReportLayout &&
        row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
      const isTicketDetailSectionRow =
        isTicketDetailMatrix && (rowLabel === "INDIVIDUAL" || rowLabel === "COMPARTIDO");
      const isTicketDetailHeaderRow =
        isTicketDetailMatrix && (prevRowLabel === "INDIVIDUAL" || prevRowLabel === "COMPARTIDO");
      const isTicketDetailTotalRow = isTicketDetailMatrix && rowLabel === "TOTAL";
      const isTicketDetailSpacerRow =
        isTicketDetailMatrix &&
        row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");

      if (isTicketComplexityLayout) {
        const baseBorder = "#b9d7da";
        const headerBorder = "#1b7f86";
        const isModernTicketLayout = String(aoaData?.[0]?.[0] ?? "").trim().toUpperCase() === "REPORTE DE TICKETS DE SOPORTE TÉCNICO";
        const metaLabelColumnIndex = totalColumns - 2;
        const detailDescriptionText =
          ticketComplexitySection === "INDIVIDUAL"
            ? String(row?.[3] ?? "")
            : ticketComplexitySection === "COMPARTIDO"
              ? String(row?.[4] ?? "")
              : "";
        const detailDescriptionWidth =
          ticketComplexitySection === "INDIVIDUAL"
            ? (isModernTicketLayout
                ? (ticketComplexityColumns || []).slice(3, 13).reduce((sum, column) => sum + Number(column?.width || 0), 0)
                : Number(ticketComplexityColumns?.[3]?.width || 0) + Number(ticketComplexityColumns?.[4]?.width || 0) + Number(ticketComplexityColumns?.[5]?.width || 0))
            : ticketComplexitySection === "COMPARTIDO"
              ? (isModernTicketLayout
                  ? (ticketComplexityColumns || []).slice(4, 13).reduce((sum, column) => sum + Number(column?.width || 0), 0)
                  : Number(ticketComplexityColumns?.[4]?.width || 0) + Number(ticketComplexityColumns?.[5]?.width || 0))
              : 0;
        const detailRowHeight =
          ticketComplexitySection
            ? getTicketComplexityRowHeight(detailDescriptionText, detailDescriptionWidth)
            : undefined;

        const usesModernTicketLayout = isModernTicketComplexityMatrix(aoaData);
        const usesUnifiedTicketLayout = hasUnifiedTicketComplexityLayout(aoaData);

        if (usesModernTicketLayout && usesUnifiedTicketLayout) {
          const navy = "#082f67";
          const gridBorder = "#c9cdd3";
          const summaryColors: Record<number, { backgroundColor: string; textColor: string }> = {
            0: { backgroundColor: navy, textColor: "#ffffff" },
            2: { backgroundColor: "#087f8c", textColor: "#ffffff" },
            4: { backgroundColor: "#ed7d31", textColor: "#ffffff" },
            6: { backgroundColor: "#65ad38", textColor: "#ffffff" },
            8: { backgroundColor: "#ffc400", textColor: "#000000" },
            10: { backgroundColor: "#e00000", textColor: "#ffffff" },
            12: { backgroundColor: "#b344b5", textColor: "#ffffff" }
          };
          const isUnifiedSectionRow = rowLabel === "INDIVIDUAL - COMPARTIDOS";
          const isUnifiedHeaderRow = prevRowLabel === "INDIVIDUAL - COMPARTIDOS";
          const isUnifiedTotalRow = rowLabel === "TOTAL";
          const isUnifiedSpacerRow =
            row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
          const complexityColumnIndex = totalColumns - 3;
          const mergedSolutionSpan = 10;
          const unifiedDetailRowHeight =
            ticketComplexitySection === "UNIFIED"
              ? getTicketComplexityRowHeight(
                  String(row?.[4] ?? ""),
                  (ticketComplexityColumns || []).slice(4, 14).reduce((sum, column) => sum + Number(column?.width || 0), 0)
                )
              : detailRowHeight;

          if (rowIndex === 1) {
            if (columnIndex > 0) return null;
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 20,
              align: "center" as const,
              alignVertical: "center" as const,
              backgroundColor: navy,
              textColor: "#ffffff",
              span: totalColumns,
              height: 34
            };
          }

          if (rowIndex === 2) {
            if (columnIndex === 0 || columnIndex === 4 || columnIndex === 7) {
              return {
                value: String(value),
                fontWeight: "bold" as const,
                fontSize: 11,
                align: "left" as const,
                alignVertical: "center" as const,
                backgroundColor: "#ffffff",
                borderColor: gridBorder,
                borderStyle: "thin" as const,
                height: 28
              };
            }
            const span = columnIndex === 1 ? 3 : columnIndex === 5 ? 2 : columnIndex === 8 ? 9 : 0;
            if (span) {
              return {
                value: String(value),
                fontSize: 11,
                align: "left" as const,
                alignVertical: "center" as const,
                backgroundColor: "#ffffff",
                borderColor: gridBorder,
                borderStyle: "thin" as const,
                span,
                height: 28
              };
            }
            return null;
          }

          if (rowIndex === 3) {
            if (columnIndex === 0 || columnIndex === 4) {
              return {
                value: String(value),
                fontWeight: "bold" as const,
                fontSize: 11,
                align: "left" as const,
                alignVertical: "center" as const,
                backgroundColor: "#ffffff",
                borderColor: gridBorder,
                borderStyle: "thin" as const,
                height: 28
              };
            }
            const span = columnIndex === 1 ? 3 : columnIndex === 5 ? 12 : 0;
            if (span) {
              return {
                value: String(value),
                fontSize: 11,
                align: "left" as const,
                alignVertical: "center" as const,
                backgroundColor: "#ffffff",
                borderColor: gridBorder,
                borderStyle: "thin" as const,
                span,
                height: 28
              };
            }
            return null;
          }

          if (rowIndex === 4 || rowIndex === 7) {
            if (columnIndex > 0) return null;
            return { value: "", backgroundColor: "#ffffff", span: totalColumns, height: 12 };
          }

          if (rowIndex === 5 || rowIndex === 6) {
            if (columnIndex % 2 === 1) return null;
            const colors = summaryColors[columnIndex];
            if (!colors) return null;
            return {
              value: typeof value === "number" ? value : String(value),
              fontWeight: "bold" as const,
              fontSize: rowIndex === 5 ? 11 : 20,
              align: "center" as const,
              alignVertical: "center" as const,
              backgroundColor: rowIndex === 5 ? colors.backgroundColor : "#ffffff",
              textColor: rowIndex === 5 ? colors.textColor : "#000000",
              borderColor: gridBorder,
              borderStyle: "thin" as const,
              span: 2,
              height: rowIndex === 5 ? 28 : 46
            };
          }

          if (isUnifiedSectionRow) {
            if (columnIndex > 0) return null;
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 14,
              align: "center" as const,
              backgroundColor: navy,
              textColor: "#ffffff",
              topBorderColor: headerBorder,
              topBorderStyle: "thin" as const,
              bottomBorderColor: headerBorder,
              bottomBorderStyle: "thin" as const,
              span: totalColumns,
              height: 20
            };
          }

          if (isUnifiedHeaderRow) {
            if (columnIndex === 4) {
              return {
                value: String(value),
                fontWeight: "bold" as const,
                fontSize: 11,
                align: "center" as const,
                backgroundColor: navy,
                textColor: "#ffffff",
                borderColor: "#e5f1f3",
                borderStyle: "thin" as const,
                span: mergedSolutionSpan
              };
            }
            if (columnIndex >= 5 && columnIndex < 4 + mergedSolutionSpan) return null;
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 11,
              align: "center" as const,
              backgroundColor: navy,
              textColor: "#ffffff",
              borderColor: "#e5f1f3",
              borderStyle: "thin" as const
            };
          }

          if (isUnifiedTotalRow) {
            if (columnIndex === 0) {
              return {
                value: "TOTAL",
                fontWeight: "bold" as const,
                fontSize: 12,
                align: "center" as const,
                backgroundColor: "#edf7f8",
                textColor: "#0f5a62",
                borderColor: baseBorder,
                borderStyle: "thin" as const,
                span: totalColumns - 1
              };
            }
            if (columnIndex < totalColumns - 1) return null;
            return {
              value: typeof value === "number" ? value : Number(value) || String(value),
              fontWeight: "bold" as const,
              fontSize: 14,
              align: "center" as const,
              backgroundColor: headerBorder,
              textColor: "#ffffff",
              borderColor: headerBorder,
              borderStyle: "thin" as const
            };
          }

          if (isUnifiedSpacerRow) {
            return { value: "", backgroundColor: "#ffffff", height: 12 };
          }

          if (columnIndex === complexityColumnIndex) {
            const colors = getTicketComplexityExcelColors(value);
            return {
              value: String(getTicketComplexityLabel(value)),
              fontWeight: "bold" as const,
              fontSize: 12,
              align: "left" as const,
              alignVertical: "center" as const,
              wrap: true,
              backgroundColor: colors.backgroundColor,
              textColor: colors.textColor,
              borderColor: baseBorder,
              borderStyle: "thin" as const,
              height: unifiedDetailRowHeight
            };
          }

          if (columnIndex === 4) {
            return {
              value: String(value),
              fontSize: 11,
              align: "left" as const,
              alignVertical: "top" as const,
              wrap: true,
              backgroundColor: "#ffffff",
              textColor: "#0f172a",
              borderColor: baseBorder,
              borderStyle: "thin" as const,
              span: mergedSolutionSpan,
              height: unifiedDetailRowHeight
            };
          }
          if (columnIndex >= 5 && columnIndex < 4 + mergedSolutionSpan) return null;

          return {
            value: String(value),
            fontSize: 11,
            align: "left" as const,
            alignVertical: "top" as const,
            wrap: true,
            backgroundColor: "#ffffff",
            textColor: "#0f172a",
            borderColor: baseBorder,
            borderStyle: "thin" as const,
            height: unifiedDetailRowHeight
          };
        }

      }

      if (isRouteReportLayout) {
        const baseBorder = "#b9d7da";
        const headerBorder = "#1b7f86";
        const metaLabelColumnIndex = 3;
        const routeTypeColumnIndex = 2;
        const mergedText = String(row?.[1] ?? "");
        const mergedWidth = Number(routeLayoutColumns?.[1]?.width || 0);
        const detailRowHeight =
          !isRouteReportHeaderRow && !isRouteReportSectionRow && !isRouteReportTotalRow && !isRouteReportSpacerRow
            ? getRouteLayoutRowHeight(mergedText, mergedWidth)
            : undefined;

        if (routeReportLayoutMode === "individual") {
          const navy = "#082f67";
          const gridBorder = "#c9cdd3";
          const summaryStarts: Record<number, { backgroundColor: string; textColor: string }> = {
            0: { backgroundColor: navy, textColor: "#ffffff" },
            2: { backgroundColor: "#ffc400", textColor: "#000000" },
            4: { backgroundColor: "#e00000", textColor: "#ffffff" },
            6: { backgroundColor: "#5ba424", textColor: "#ffffff" }
          };

          if (rowIndex === 0) {
            if (columnIndex > 0) return null;
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 20,
              align: "center" as const,
              alignVertical: "center" as const,
              backgroundColor: navy,
              textColor: "#ffffff",
              span: totalColumns,
              height: 34
            };
          }

          if (rowIndex === 1) {
            if (columnIndex === 0 || columnIndex === 4 || columnIndex === 7) {
              return {
                value: String(value), fontWeight: "bold" as const, fontSize: 11,
                align: "left" as const, alignVertical: "center" as const,
                backgroundColor: "#ffffff", textColor: "#111111",
                borderColor: gridBorder, borderStyle: "thin" as const, height: 28
              };
            }
            if (columnIndex === 1) {
              return {
                value: String(value), fontSize: 11, align: "left" as const,
                alignVertical: "center" as const, backgroundColor: "#ffffff",
                borderColor: gridBorder, borderStyle: "thin" as const, span: 3, height: 28
              };
            }
            if (columnIndex === 5) {
              return {
                value: String(value), fontSize: 11, align: "left" as const,
                alignVertical: "center" as const, backgroundColor: "#ffffff",
                borderColor: gridBorder, borderStyle: "thin" as const, span: 2, height: 28
              };
            }
            if (columnIndex === 8) {
              return {
                value: String(value), fontSize: 11, align: "left" as const,
                alignVertical: "center" as const, backgroundColor: "#ffffff",
                borderColor: gridBorder, borderStyle: "thin" as const,
                span: Math.max(1, totalColumns - 8), height: 28
              };
            }
            return null;
          }

          if (rowIndex === 2) {
            if (columnIndex === 0 || columnIndex === 4) {
              return {
                value: String(value), fontWeight: "bold" as const, fontSize: 11,
                align: "left" as const, alignVertical: "center" as const,
                backgroundColor: "#ffffff", textColor: "#111111",
                borderColor: gridBorder, borderStyle: "thin" as const, height: 28
              };
            }
            if (columnIndex === 1) {
              return {
                value: String(value), fontSize: 11, align: "left" as const,
                alignVertical: "center" as const, backgroundColor: "#ffffff",
                borderColor: gridBorder, borderStyle: "thin" as const, span: 3, height: 28
              };
            }
            if (columnIndex === 5) {
              return {
                value: String(value), fontSize: 11, align: "left" as const,
                alignVertical: "center" as const, backgroundColor: "#ffffff",
                borderColor: gridBorder, borderStyle: "thin" as const,
                span: Math.max(1, totalColumns - 5), height: 28
              };
            }
            return null;
          }

          if (rowIndex === 3 || rowIndex === 6) {
            if (columnIndex > 0) return null;
            return { value: "", backgroundColor: "#ffffff", span: totalColumns, height: 12 };
          }

          if (rowIndex === 4 || rowIndex === 5) {
            if (columnIndex === 1 || columnIndex === 3 || columnIndex === 5 || columnIndex === 7) return null;
            if (columnIndex > 7) return { value: "", backgroundColor: "#ffffff" };
            const colors = summaryStarts[columnIndex];
            if (!colors) return null;
            return {
              value: typeof value === "number" ? value : String(value),
              fontWeight: "bold" as const,
              fontSize: rowIndex === 4 ? 12 : 21,
              align: "center" as const,
              alignVertical: "center" as const,
              backgroundColor: rowIndex === 4 ? colors.backgroundColor : "#ffffff",
              textColor: rowIndex === 4 ? colors.textColor : "#000000",
              borderColor: gridBorder,
              borderStyle: "thin" as const,
              span: 2,
              height: rowIndex === 4 ? 25 : 48
            };
          }

          if (rowIndex === 7) {
            return {
              value: String(value), fontWeight: "bold" as const, fontSize: 10,
              align: "center" as const, alignVertical: "center" as const, wrap: true,
              backgroundColor: navy, textColor: "#ffffff",
              borderColor: gridBorder, borderStyle: "thin" as const, height: 34
            };
          }

          if (columnIndex === routeTypeColumnIndex) {
            const type = normalizeReportLabel(value);
            const backgroundColor = type.includes("INTERMEDIA") ? "#ffc400"
              : type.includes("LEJANA") ? "#e00000"
                : type.includes("CERCANA") ? "#a9c65a" : "#eef2f7";
            return {
              value: String(getRouteTypeLabel(value)), fontSize: 11,
              align: "center" as const, alignVertical: "center" as const,
              backgroundColor,
              textColor: type.includes("LEJANA") ? "#ffffff" : "#000000",
              borderColor: gridBorder, borderStyle: "thin" as const, height: detailRowHeight
            };
          }

          return {
            value: typeof value === "number" ? value : String(value),
            fontSize: 10, align: columnIndex >= 3 ? "center" as const : "left" as const,
            alignVertical: "center" as const, wrap: true, backgroundColor: "#ffffff",
            textColor: "#111111", borderColor: gridBorder,
            borderStyle: "thin" as const, height: detailRowHeight
          };
        }

        if (rowIndex === 0) {
          if (columnIndex === 0) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 15,
              align: "center" as const,
              alignVertical: "center" as const,
              wrap: true,
              backgroundColor: "#ffffff",
              textColor: "#1b7f86",
              borderColor: headerBorder,
              borderStyle: "thin" as const,
              rowSpan: 2,
              height: 28
            };
          }
          if (columnIndex === 1) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 18,
              align: "center" as const,
              alignVertical: "center" as const,
              wrap: true,
              backgroundColor: headerBorder,
              textColor: "#ffffff",
              borderColor: headerBorder,
              borderStyle: "thin" as const,
              span: 2,
              height: 34
            };
          }
          if (columnIndex === 2) return null;
          return {
            value: String(value),
            fontWeight: columnIndex === metaLabelColumnIndex ? "bold" as const : undefined,
            fontSize: 11,
            align: columnIndex === metaLabelColumnIndex ? "right" as const : "center" as const,
            backgroundColor: "#ffffff",
            textColor: "#0f172a",
            borderColor: headerBorder,
            borderStyle: "thin" as const
          };
        }

        if (rowIndex === 1) {
          if (columnIndex === 0) return null;
          if (columnIndex === 1) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 11,
              align: "center" as const,
              alignVertical: "center" as const,
              wrap: true,
              backgroundColor: headerBorder,
              textColor: "#ffffff",
              borderColor: headerBorder,
              borderStyle: "thin" as const,
              span: 2,
              height: 26
            };
          }
          if (columnIndex === 2) return null;
          return {
            value: String(value),
            fontWeight: columnIndex === metaLabelColumnIndex ? "bold" as const : undefined,
            fontSize: 11,
            align: columnIndex === metaLabelColumnIndex ? "right" as const : "center" as const,
            backgroundColor: "#ffffff",
            textColor: "#0f172a",
            borderColor: headerBorder,
            borderStyle: "thin" as const
          };
        }

        if (rowIndex === 2) {
          if (columnIndex === 0) {
            return {
              value: "",
              backgroundColor: "#ffffff",
              borderColor: headerBorder,
              borderStyle: "thin" as const,
              span: metaLabelColumnIndex
            };
          }
          if (columnIndex < metaLabelColumnIndex) return null;
          return {
            value: String(value),
            fontWeight: columnIndex === metaLabelColumnIndex ? "bold" as const : undefined,
            fontSize: 11,
            align: columnIndex === metaLabelColumnIndex ? "right" as const : "center" as const,
            backgroundColor: "#ffffff",
            textColor: "#0f172a",
            borderColor: headerBorder,
            borderStyle: "thin" as const
          };
        }

        if (isRouteReportSpacerRow) {
          if (columnIndex >= 1) return null;
          return {
            value: "",
            backgroundColor: "#ffffff",
            span: totalColumns,
            height: 8
          };
        }

        if (isRouteReportSectionRow) {
          if (columnIndex >= 1) return null;
          return {
            value: String(value),
            fontWeight: "bold" as const,
            fontSize: 14,
            align: "center" as const,
            backgroundColor: "#e5f4d4",
            textColor: "#1b7f86",
            topBorderColor: headerBorder,
            topBorderStyle: "thin" as const,
            bottomBorderColor: headerBorder,
            bottomBorderStyle: "thin" as const,
            span: totalColumns,
            height: 20
          };
        }

        if (isRouteReportHeaderRow) {
          return {
            value: String(value),
            fontWeight: "bold" as const,
            fontSize: 11,
            align: "center" as const,
            backgroundColor: headerBorder,
            textColor: "#ffffff",
            borderColor: "#e5f1f3",
            borderStyle: "thin" as const
          };
        }

        if (isRouteReportTotalRow) {
          if (columnIndex === 0) {
            return {
              value: "TOTAL",
              fontWeight: "bold" as const,
              fontSize: 12,
              align: "center" as const,
              backgroundColor: "#edf7f8",
              textColor: "#0f5a62",
              borderColor: baseBorder,
              borderStyle: "thin" as const,
              span: 2
            };
          }
          if (columnIndex === 1) return null;
          if (columnIndex > routeTypeColumnIndex) {
            return {
              value: "",
              backgroundColor: "#edf7f8",
              borderColor: baseBorder,
              borderStyle: "thin" as const
            };
          }
          return {
            value: typeof value === "number" ? value : Number(value) || String(value),
            fontWeight: "bold" as const,
            fontSize: 14,
            align: "center" as const,
            backgroundColor: headerBorder,
            textColor: "#ffffff",
            borderColor: headerBorder,
            borderStyle: "thin" as const
          };
        }

        if (columnIndex === routeTypeColumnIndex) {
          const colors = getRouteTypeExcelColors(value);
          return {
            value: String(getRouteTypeLabel(value)),
            fontWeight: "bold" as const,
            fontSize: 12,
            align: "center" as const,
            alignVertical: "center" as const,
            wrap: true,
            backgroundColor: colors.backgroundColor,
            textColor: colors.textColor,
            borderColor: baseBorder,
            borderStyle: "thin" as const,
            height: detailRowHeight
          };
        }

        return {
          value: typeof value === "number" ? value : String(value),
          fontSize: 11,
          align: columnIndex >= 3 ? "center" as const : "left" as const,
          alignVertical: columnIndex >= 3 ? "center" as const : "top" as const,
          wrap: true,
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          borderColor: baseBorder,
          borderStyle: "thin" as const,
          height: detailRowHeight
        };
      }

      if (isProjectReportLayout) {
        const baseBorder = "#b9d7da";
        const headerBorder = "#1b7f86";
        const participantsWidth =
          Number(projectLayoutColumns?.[1]?.width || 0) + Number(projectLayoutColumns?.[2]?.width || 0);
        const documentWidth =
          Number(projectLayoutColumns?.[3]?.width || 0) + Number(projectLayoutColumns?.[4]?.width || 0);
        const detailRowHeight =
          !isProjectReportHeaderRow && !isProjectReportSectionRow && !isProjectReportTotalRow && !isProjectReportSpacerRow
            ? getProjectLayoutRowHeight(
                row?.[0] ?? "",
                row?.[1] ?? "",
                row?.[3] ?? "",
                Number(projectLayoutColumns?.[0]?.width || 0),
                participantsWidth,
                documentWidth
              )
            : undefined;

        if (rowIndex === 0) {
          if (columnIndex > 0) return null;
          return {
            value: String(value),
            fontWeight: "bold" as const,
            fontSize: 20,
            align: "center" as const,
            alignVertical: "center" as const,
            backgroundColor: "#082f67",
            textColor: "#ffffff",
            span: totalColumns,
            height: 34
          };
        }

        if (rowIndex === 1) {
          if (columnIndex === 0 || columnIndex === 3) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 11,
              align: "left" as const,
              alignVertical: "center" as const,
              backgroundColor: "#ffffff",
              textColor: "#111111",
              borderColor: "#c9cdd3",
              borderStyle: "thin" as const,
              height: 28
            };
          }
          if (columnIndex === 1) {
            return {
              value: String(value),
              fontSize: 11,
              align: "left" as const,
              alignVertical: "center" as const,
              backgroundColor: "#ffffff",
              borderColor: "#c9cdd3",
              borderStyle: "thin" as const,
              span: 2,
              height: 28
            };
          }
          if (columnIndex === 2) return null;
          if (columnIndex === 4) {
            return {
              value: String(value),
              fontSize: 11,
              align: "left" as const,
              alignVertical: "center" as const,
              backgroundColor: "#ffffff",
              borderColor: "#c9cdd3",
              borderStyle: "thin" as const,
              height: 28
            };
          }
          return null;
        }

        if (rowIndex === 2) {
          if (columnIndex === 0 || columnIndex === 3) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 11,
              align: "left" as const,
              alignVertical: "center" as const,
              backgroundColor: "#ffffff",
              textColor: "#111111",
              borderColor: "#c9cdd3",
              borderStyle: "thin" as const,
              height: 28
            };
          }
          if (columnIndex === 1) {
            return {
              value: String(value),
              fontSize: 11,
              align: "left" as const,
              alignVertical: "center" as const,
              backgroundColor: "#ffffff",
              borderColor: "#c9cdd3",
              borderStyle: "thin" as const,
              span: 2,
              height: 28
            };
          }
          if (columnIndex === 2) return null;
          if (columnIndex === 4) {
            return {
              value: String(value),
              fontSize: 11,
              align: "left" as const,
              alignVertical: "center" as const,
              backgroundColor: "#ffffff",
              borderColor: "#c9cdd3",
              borderStyle: "thin" as const,
              height: 28
            };
          }
          return null;
        }

        if (isProjectReportSpacerRow) {
          if (columnIndex >= 1) return null;
          return {
            value: "",
            backgroundColor: "#ffffff",
            span: totalColumns,
            height: 8
          };
        }

        if (rowIndex === 4) {
          if (columnIndex > 0) return null;
          return {
            value: String(value),
            fontWeight: "bold" as const,
            fontSize: 12,
            align: "center" as const,
            alignVertical: "center" as const,
            backgroundColor: "#087f8c",
            textColor: "#ffffff",
            borderColor: "#c9cdd3",
            borderStyle: "thin" as const,
            span: totalColumns,
            height: 28
          };
        }

        if (rowIndex === 5) {
          if (columnIndex > 0) return null;
          return {
            value: typeof value === "number" ? value : Number(value) || String(value),
            fontWeight: "bold" as const,
            fontSize: 20,
            align: "center" as const,
            alignVertical: "center" as const,
            backgroundColor: "#ffffff",
            textColor: "#000000",
            borderColor: "#c9cdd3",
            borderStyle: "thin" as const,
            span: totalColumns,
            height: 46
          };
        }

        if (isProjectReportSectionRow) {
          if (columnIndex >= 1) return null;
          return {
            value: String(value),
            fontWeight: "bold" as const,
            fontSize: 14,
            align: "center" as const,
            backgroundColor: "#082f67",
            textColor: "#ffffff",
            topBorderColor: headerBorder,
            topBorderStyle: "thin" as const,
            bottomBorderColor: headerBorder,
            bottomBorderStyle: "thin" as const,
            span: totalColumns,
            height: 20
          };
        }

        if (isProjectReportHeaderRow) {
          if (columnIndex === 1) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 11,
              align: "center" as const,
              backgroundColor: "#082f67",
              textColor: "#ffffff",
              borderColor: "#e5f1f3",
              borderStyle: "thin" as const,
              span: 2
            };
          }
          if (columnIndex === 2) return null;
          if (columnIndex === 3) {
            return {
              value: String(value),
              fontWeight: "bold" as const,
              fontSize: 11,
              align: "center" as const,
              backgroundColor: "#082f67",
              textColor: "#ffffff",
              borderColor: "#e5f1f3",
              borderStyle: "thin" as const,
              span: 2
            };
          }
          if (columnIndex === 4) return null;

          return {
            value: String(value),
            fontWeight: "bold" as const,
            fontSize: 11,
            align: "center" as const,
            backgroundColor: "#082f67",
            textColor: "#ffffff",
            borderColor: "#e5f1f3",
            borderStyle: "thin" as const
          };
        }

        if (isProjectReportTotalRow) {
          if (columnIndex === 0) {
            return {
              value: "TOTAL",
              fontWeight: "bold" as const,
              fontSize: 12,
              align: "center" as const,
              backgroundColor: "#edf7f8",
              textColor: "#0f5a62",
              borderColor: baseBorder,
              borderStyle: "thin" as const,
              span: totalColumns - 1
            };
          }
          if (columnIndex < totalColumns - 1) return null;
          return {
            value: typeof value === "number" ? value : Number(value) || String(value),
            fontWeight: "bold" as const,
            fontSize: 14,
            align: "center" as const,
            backgroundColor: headerBorder,
            textColor: "#ffffff",
            borderColor: headerBorder,
            borderStyle: "thin" as const
          };
        }

        if (columnIndex === 1) {
          return {
            value: String(value),
            fontSize: 11,
            align: "left" as const,
            alignVertical: "top" as const,
            wrap: true,
            backgroundColor: "#ffffff",
            textColor: "#0f172a",
            borderColor: baseBorder,
            borderStyle: "thin" as const,
            span: 2,
            height: detailRowHeight
          };
        }
        if (columnIndex === 2) return null;

        if (columnIndex === 3) {
          return {
            value: String(value),
            fontSize: 11,
            align: "left" as const,
            alignVertical: "top" as const,
            wrap: true,
            backgroundColor: "#ffffff",
            textColor: String(value).trim() ? "#2d6ba3" : "#0f172a",
            borderColor: baseBorder,
            borderStyle: "thin" as const,
            span: 2,
            height: detailRowHeight
          };
        }
        if (columnIndex === 4) return null;

        return {
          value: String(value),
          fontSize: 11,
          align: "left" as const,
          alignVertical: "top" as const,
          wrap: true,
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          borderColor: baseBorder,
          borderStyle: "thin" as const,
          height: detailRowHeight
        };
      }

      if (isTicketDetailSectionRow) {
        if (columnIndex >= 1) return null;
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor: "#0f6d74",
          textColor: "#ffffff",
          fontSize: 13,
          span: totalColumns
        };
      }

      if (isTicketDetailSpacerRow) {
        if (columnIndex >= 1) return null;
        return {
          value: "",
          backgroundColor: "#ffffff",
          span: totalColumns
        };
      }

      if (isTicketDetailHeaderRow) {
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor: "#d7ecee",
          textColor: "#0f5a62",
          fontSize: 12
        };
      }

      if (isTicketDetailTotalRow) {
        if (columnIndex < totalColumns - 1) {
          if (columnIndex === 0) {
            return {
              value: "TOTAL",
              fontWeight: "bold" as const,
              align: "center" as const,
              backgroundColor: "#edf7f8",
              textColor: "#0f5a62",
              fontSize: 12,
              span: totalColumns - 1
            };
          }
          return null;
        }

        return {
          value: typeof value === "number" ? value : Number(value) || String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor: "#0f6d74",
          textColor: "#ffffff",
          fontSize: 14
        };
      }

      if (isTicketDetailMatrix) {
        const complexityColumnIndex = Math.max(0, row.length - 1);
        if (columnIndex === complexityColumnIndex) {
          const colors = getTicketComplexityExcelColors(value);
          return {
            value: String(getTicketComplexityCode(value)),
            fontWeight: "bold" as const,
            align: "center" as const,
            backgroundColor: colors.backgroundColor,
            textColor: colors.textColor,
            fontSize: 13
          };
        }

        return {
          value: String(value),
          align: columnIndex === 3 ? "left" as const : "center" as const,
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          fontSize: 11
        };
      }

      if (isTicketSummaryMatrix && rowIndex === 0) {
        if (columnIndex >= 1 && columnIndex <= 3) return null;
        if (columnIndex >= 5 && columnIndex <= 8) return null;
        const bg = columnIndex === 0 ? "#1f7b80" : "#f1dc99";
        const textColor = columnIndex === 4 ? "#2e2515" : "#000000";
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor: bg,
          textColor,
          fontSize: 13,
          span: columnIndex === 0 ? 4 : 5
        };
      }

      if (isTicketSummaryMatrix && rowIndex === 1) {
        const bg =
          columnIndex === 0 ? "#d3eef0" :
          columnIndex >= 1 && columnIndex <= 2 ? "#d3eef0" :
          columnIndex === 3 ? "#0f858c" :
          columnIndex >= 4 && columnIndex <= 8 ? "#f8ecc6" :
          "#ffffff";
        const textColor =
          columnIndex === 3 ? "#ffffff" :
          columnIndex >= 0 && columnIndex <= 2 ? "#0f5a62" :
          columnIndex >= 4 && columnIndex <= 8 ? "#77500f" :
          "#1f2937";
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor: bg,
          textColor,
          fontSize: 12
        };
      }

      if (isTicketSummaryMatrix && rowIndex === aoaData.length - 1) {
        return {
          value: typeof value === "number" ? value : String(value),
          fontWeight: "bold" as const,
          align: columnIndex === 0 ? "left" as const : "center" as const,
          backgroundColor: "#d0d0d3",
          textColor: "#121826",
          fontSize: columnIndex === 8 ? 14 : 12
        };
      }

      if (isTicketSummaryMatrix) {
        const backgroundColor =
          columnIndex >= 1 && columnIndex <= 2 ? "#e9f3f3" :
          columnIndex === 3 ? "#0f858c" :
          columnIndex >= 4 && columnIndex <= 7 ? "#fff8e8" :
          columnIndex === 8 ? "#f6e2a0" :
          "#ffffff";
        const textColor =
          columnIndex === 3 ? "#ffffff" :
          columnIndex >= 4 && columnIndex <= 7 ? "#2f2413" :
          columnIndex === 8 ? "#5e3b00" :
          "#0f172a";
        const fontSize = columnIndex === 3 ? 20 : columnIndex === 8 ? 16 : 12;
        return {
          value: typeof value === "number" ? value : String(value),
          fontWeight: "bold" as const,
          align: columnIndex === 0 ? "left" as const : "center" as const,
          backgroundColor,
          textColor,
          fontSize
        };
      }

      if (isRouteSummaryMatrix && rowIndex === 0) {
        const backgroundColor =
          columnIndex === 4 ? "#1f8d93" :
          columnIndex >= 1 && columnIndex <= 3 ? "#d8ecec" :
          "#d3eef0";
        const textColor = columnIndex === 4 ? "#ffffff" : "#0f5a62";
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor,
          textColor,
          fontSize: 12
        };
      }

      if (isRouteSummaryMatrix && rowIndex === aoaData.length - 1) {
        return {
          value: typeof value === "number" ? value : String(value),
          fontWeight: "bold" as const,
          align: columnIndex === 0 ? "left" as const : "center" as const,
          backgroundColor: "#d0d0d3",
          textColor: "#121826",
          fontSize: 12
        };
      }

      if (isRouteSummaryMatrix) {
        const backgroundColor =
          columnIndex === 4 ? "#1f8d93" :
          columnIndex >= 1 && columnIndex <= 3 ? "#eef6f6" :
          "#ffffff";
        const textColor = columnIndex === 4 ? "#ffffff" : "#0f172a";
        const fontSize = columnIndex === 4 ? 20 : 12;
        return {
          value: typeof value === "number" ? value : String(value),
          fontWeight: "bold" as const,
          align: columnIndex === 0 ? "left" as const : "center" as const,
          backgroundColor,
          textColor,
          fontSize
        };
      }

      if (isProjectSummaryMatrix && rowIndex === 0) {
        const backgroundColor =
          columnIndex === 1 ? "#1f8d93" : "#d9f0f1";
        const textColor =
          columnIndex === 1 ? "#ffffff" : "#0f5a62";
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor,
          textColor,
          fontSize: 12
        };
      }

      if (isProjectSummaryMatrix) {
        const backgroundColor =
          columnIndex === 1 ? "#1f8d93" : "#ffffff";
        const textColor =
          columnIndex === 1 ? "#ffffff" :
          columnIndex === 2 ? "#2d6ba3" :
          "#0f172a";
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: columnIndex === 0 ? "left" as const : "center" as const,
          backgroundColor,
          textColor,
          fontSize: columnIndex === 1 ? 12 : 11
        };
      }

      if (rowIndex === 0) {
        return {
          value: String(value),
          fontWeight: "bold" as const,
          align: "center" as const,
          backgroundColor: "#0f2c3a",
          textColor: "#ffffff"
        };
      }

      if (value instanceof Date) {
        return { value, type: Date, format: "dd/mm/yyyy hh:mm" };
      }

      if (typeof value === "number") {
        return { value, type: Number };
      }

      if (typeof value === "boolean") {
        return { value, type: Boolean };
      }

      return String(value);
    })
  );

  const columns = Array.from({ length: totalColumns }, (_, columnIndex) => {
    if (isProjectReportLayout) {
      return projectLayoutColumns?.[columnIndex] ?? { width: 16 };
    }
    if (isRouteReportLayout) {
      return routeLayoutColumns?.[columnIndex] ?? { width: 16 };
    }
    if (isTicketComplexityLayout) {
      return ticketComplexityColumns?.[columnIndex] ?? { width: 16 };
    }
    if (isTicketDetailMatrix) {
      const widths = [22, 24, 24, 58, 14];
      return { width: widths[columnIndex] ?? 18 };
    }
    if (isTicketSummaryMatrix) {
      const widths = [20, 14, 14, 16, 11, 13, 11, 15, 10];
      return { width: widths[columnIndex] ?? 12 };
    }
    if (isRouteSummaryMatrix) {
      const widths = [20, 13, 13, 13, 16];
      return { width: widths[columnIndex] ?? 12 };
    }
    if (isProjectSummaryMatrix) {
      const widths = [22, 52, 62];
      return { width: widths[columnIndex] ?? 18 };
    }
    const columnValues = [reportTitle, ...aoaData.map((row) => String(row[columnIndex] ?? ""))];
    const maxLen = columnValues.reduce((max, value) => Math.max(max, value.length), 0);
    return { width: Math.min(Math.max(maxLen + 2, 12), 50) };
  });

  return {
    sheet: sanitizeSheetName(sheetName || reportTitle),
    data: shouldAddTitleRow ? [titleRow, ...bodyRows] : bodyRows,
    columns,
    stickyRowsCount: isProjectReportLayout ? 5 : isRouteReportLayout ? 5 : isTicketComplexityLayout ? 5 : isTicketSummaryMatrix ? 3 : isRouteSummaryMatrix ? 2 : isProjectSummaryMatrix ? 2 : isTicketDetailMatrix ? 2 : 2
  };
}

export function registerReportsHandlers(ipcMain: IpcMain) {
// ==========================
// DASHBOARD OPERACIÓN MENSUAL - NUEVO HANDLER
// ==========================
ipcMain.handle("dashboard:operacion_mensual", async (event, session: any) => {
    try {
      session = requireTrustedSession(event);
      if (!session?.idUsuario) throw new Error("Sesión inválida");
      const data = await withConn(async (conn) => {
        // 1. TICKETS ABIERTOS (fechaCierre IS NULL)
        const [summaryRows]: any = await conn.execute(
          `SELECT
             (SELECT COUNT(*) FROM ticket WHERE fechaCierre IS NULL) AS ticketsAbiertos,
             (SELECT COUNT(*) FROM ticket WHERE fechaCierre IS NOT NULL AND idEstadoCalificacion = 0) AS ticketsPendientesCalificar,
             (SELECT COUNT(*) FROM ruta WHERE fechaCierre IS NULL) AS rutasAbiertas,
             (SELECT COUNT(*) FROM ruta WHERE fechaCierre IS NOT NULL AND idEstadoCalificacion = 0) AS rutasPendientesCalificar,
             (SELECT COUNT(*) FROM ticket_equipo WHERE estado = 'EN_TALLER') AS equiposTaller,
             (SELECT COUNT(*) FROM ticket_equipo WHERE estado = 'EN_TALLER' AND DATEDIFF(NOW(), fechaRecibido) > 7) AS equiposPrioridad,
             (SELECT COUNT(*) FROM ruta WHERE fechaCierre IS NULL AND DATEDIFF(NOW(), fechaApertura) > 7) AS rutasPrioridad,
             (SELECT COUNT(*) FROM proyecto_especial WHERE estadoRevision = 'PENDIENTE') AS proyectosPendientes,
             (SELECT COUNT(*) FROM proyecto_especial WHERE estadoRevision = 'APROBADO') AS proyectosAprobados`
        );
        const summary = summaryRows?.[0] || {};

        // 2. TICKETS PENDIENTES CALIFICAR (cerrados y pendientes)
        // 3. RUTAS ABIERTAS
        // 4. RUTAS PENDIENTES CALIFICAR (cerradas y pendientes)
        // 5. EQUIPOS EN TALLER
        // 6. PROYECTOS PENDIENTES
        // 7. PROYECTOS APROBADOS (usa fechaRevision primero, luego fallback fechaRegistro)
        // 8. TÉCNICOS CON CARGA + ATRASADOS (>7 días abiertos en rango)
        const [tecnicos]: any = await conn.execute(
          `SELECT 
            u.nombre,
            COALESCE(tickets.total, 0) AS ticketsAbiertos,
            COALESCE(equipos.total, 0) AS equiposTaller,
            COALESCE(rutas.total, 0) AS rutasAbiertas,
            COALESCE(atrasados.total, 0) AS atrasados
          FROM usuario u
          LEFT JOIN (
            SELECT tt.idTecnico, COUNT(DISTINCT tt.idTicket) AS total
            FROM ticket_tecnico tt
            JOIN ticket t ON t.idTicket = tt.idTicket 
              AND t.fechaCierre IS NULL
            GROUP BY tt.idTecnico
          ) tickets ON tickets.idTecnico = u.idUsuario
          LEFT JOIN (
            SELECT te.idTecnicoAsignado AS idTecnico, COUNT(*) AS total
            FROM ticket_equipo te
            WHERE te.estado = 'EN_TALLER'
            GROUP BY te.idTecnicoAsignado
          ) equipos ON equipos.idTecnico = u.idUsuario
          LEFT JOIN (
            SELECT rp.idTecnico, COUNT(DISTINCT rp.idRuta) AS total
            FROM ruta_participante rp
            JOIN ruta r ON r.idRuta = rp.idRuta 
              AND r.fechaCierre IS NULL
            GROUP BY rp.idTecnico
          ) rutas ON rutas.idTecnico = u.idUsuario
          LEFT JOIN (
            SELECT atrasos.idTecnico, SUM(atrasos.total) AS total
            FROM (
              SELECT tt.idTecnico, COUNT(DISTINCT tt.idTicket) AS total
              FROM ticket_tecnico tt
              JOIN ticket t ON t.idTicket = tt.idTicket
              WHERE t.fechaCierre IS NULL
                AND DATEDIFF(NOW(), t.fechaApertura) > 7
              GROUP BY tt.idTecnico

              UNION ALL

              SELECT te.idTecnicoAsignado AS idTecnico, COUNT(*) AS total
              FROM ticket_equipo te
              WHERE te.estado = 'EN_TALLER'
                AND DATEDIFF(NOW(), te.fechaRecibido) > 7
              GROUP BY te.idTecnicoAsignado

              UNION ALL

              SELECT rp.idTecnico, COUNT(DISTINCT rp.idRuta) AS total
              FROM ruta_participante rp
              JOIN ruta r ON r.idRuta = rp.idRuta
              WHERE r.fechaCierre IS NULL
                AND DATEDIFF(NOW(), r.fechaApertura) > 7
              GROUP BY rp.idTecnico
            ) atrasos
            GROUP BY atrasos.idTecnico
          ) atrasados ON atrasados.idTecnico = u.idUsuario
          WHERE u.idRol = (SELECT idRol FROM rol WHERE nombre = 'TECNICO')
          ORDER BY (COALESCE(tickets.total,0) + COALESCE(equipos.total,0) + COALESCE(rutas.total,0)) DESC`,
        );

// 9. TICKETS A DAR SEGUIMIENTO (>7 días abiertos en período) + TOTAL
        const [ticketsSeguimiento]: any = await conn.execute(
          `SELECT 
            t.idTicket, 
            t.nombreSolicitante, 
            GROUP_CONCAT(DISTINCT u.nombre ORDER BY u.nombre SEPARATOR ', ') AS tecnico, 
            DATEDIFF(NOW(), t.fechaApertura) AS dias,
            un.nombre AS unidad,
            t.fechaApertura
          FROM ticket t
          JOIN ticket_tecnico tt ON tt.idTicket = t.idTicket
          JOIN usuario u ON u.idUsuario = tt.idTecnico
          JOIN unidad un ON un.idUnidad = t.idUnidad
          WHERE t.fechaCierre IS NULL 
            AND DATEDIFF(NOW(), t.fechaApertura) > 7
          GROUP BY t.idTicket, t.nombreSolicitante, un.nombre, t.fechaApertura
          ORDER BY dias DESC
          LIMIT 50`
        );

        const totalPrioridades =
          Number(ticketsSeguimiento.length || 0) +
          Number(summary.equiposPrioridad || 0) +
          Number(summary.rutasPrioridad || 0);

        // Corte info
        return {
          // Info período
          corte: {
            mes: "Histórico",
            rango: "Todo el historial",
            descripcion: "Resumen acumulado de Tickets, Rutas, Taller y Proyectos"
          },
          // Resumen cards (exacto formato esperado por frontend)
          resumen: {
            ticketsAbiertos: Number(summary.ticketsAbiertos || 0),
            ticketsPendientesCalificar: Number(summary.ticketsPendientesCalificar || 0),
            rutasAbiertas: Number(summary.rutasAbiertas || 0),
            rutasPendientesCalificar: Number(summary.rutasPendientesCalificar || 0),
            equiposTaller: Number(summary.equiposTaller || 0),
            equiposPrioridad: Number(summary.equiposPrioridad || 0),
            proyectosPendientes: Number(summary.proyectosPendientes || 0),
            proyectosAprobados: Number(summary.proyectosAprobados || 0)
          },
          // Técnicos para tabla
          tecnicos,
          // ✅ Tickets seguimiento para tabla específica
          ticketsSeguimiento,
          totalPrioridades
        };
      });

      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Error dashboard histórico" };
    }
  });
  // ==========================
  // BUILD (combina tickets y rutas en un reporte)
  // ==========================
  ipcMain.handle("reports:build", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      validateReportFilters(filtros);

      // Obtener tickets y rutas directamente desde BD
      const ticketsResult = await withConn(async (conn) => {
        const q = filtros?.q ? String(filtros.q).trim() : null;
        const estado = normalizeEstado(filtros?.estado);
        const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
        const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

        let desde = filtros?.desde ? String(filtros.desde) : null;
        let hasta = filtros?.hasta ? String(filtros.hasta) : null;

        if (!desde || !hasta) {
          const r = monthlyRange(new Date().toISOString());
          desde = desde || r.start;
          hasta = hasta || r.end;
        }

        const where: string[] = [];
        const params: any[] = [];

        if (desde) { where.push(`t.fechaApertura >= ?`); params.push(desde); }
        if (hasta) { where.push(`t.fechaApertura <= ?`); params.push(hasta); }
        if (estado === "ABIERTO") where.push(`t.fechaCierre IS NULL`);
        if (estado === "CERRADO") where.push(`t.fechaCierre IS NOT NULL`);
        if (idUnidad) { where.push(`t.idUnidad = ?`); params.push(idUnidad); }
        if (idTecnico) {
          where.push(`EXISTS (SELECT 1 FROM ticket_tecnico tt2 WHERE tt2.idTicket = t.idTicket AND tt2.idTecnico = ?)`);
          params.push(idTecnico);
        }
        if (q) {
          if (/^\d+$/.test(q)) { where.push(`t.idTicket = ?`); params.push(Number(q)); }
          else { where.push(`(t.nombreSolicitante LIKE ? OR t.solucion LIKE ? OR un.nombre LIKE ? OR se.nombre LIKE ?)`); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [res]: any = await conn.execute(
          `SELECT t.idTicket, t.nombreSolicitante, un.nombre AS unidad, se.nombre AS servicio,
              t.enLugar, t.fechaApertura, t.fechaCierre, t.solucion,
              dc.nombre AS clasificacion,
              COALESCE(ec.nombre, 'PENDIENTE') AS estadoCalificacion,
              COALESCE(GROUP_CONCAT(DISTINCT u.nombre ORDER BY u.nombre SEPARATOR ', '), '') AS tecnicos,
              CASE WHEN COUNT(DISTINCT tt.idTecnico) > 1 THEN 'Compartido' WHEN COUNT(DISTINCT tt.idTecnico) = 1 THEN 'Individual' ELSE 'Sin técnico' END AS tipo
           FROM ticket t
           JOIN unidad un ON un.idUnidad = t.idUnidad
           JOIN servicio se ON se.idServicio = t.idServicio
           LEFT JOIN des_clasificacion dc ON dc.idClasificacion = t.idClasificacion
           LEFT JOIN des_estado_calificacion ec ON ec.idEstadoCalificacion = t.idEstadoCalificacion
           LEFT JOIN ticket_tecnico tt ON tt.idTicket = t.idTicket
           LEFT JOIN usuario u ON u.idUsuario = tt.idTecnico
           ${whereSQL}
           GROUP BY t.idTicket, t.nombreSolicitante, un.nombre, se.nombre, t.enLugar, t.fechaApertura, t.fechaCierre, t.solucion, dc.nombre, ec.nombre
           ORDER BY t.idTicket ASC`,
          params
        );
        return res || [];
      });

      const rutasResult = await withConn(async (conn) => {
        const q = filtros?.q ? String(filtros.q).trim() : null;
        const estado = normalizeEstado(filtros?.estado);
        const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
        const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;

        let desde = filtros?.desde ? String(filtros.desde) : null;
        let hasta = filtros?.hasta ? String(filtros.hasta) : null;

        if (!desde || !hasta) {
          const r = monthlyRange(new Date().toISOString());
          desde = desde || r.start;
          hasta = hasta || r.end;
        }

        const where: string[] = [];
        const params: any[] = [];

        if (desde) { where.push(`r.fechaApertura >= ?`); params.push(desde); }
        if (hasta) { where.push(`r.fechaApertura <= ?`); params.push(hasta); }
        if (estado === "ABIERTO") where.push(`r.fechaCierre IS NULL`);
        if (estado === "CERRADO") where.push(`r.fechaCierre IS NOT NULL`);
        if (idUnidad) { where.push(`r.idUnidad = ?`); params.push(idUnidad); }
        if (idTecnico) {
          where.push(`EXISTS (SELECT 1 FROM ruta_participante rp2 WHERE rp2.idRuta = r.idRuta AND rp2.idTecnico = ?)`);
          params.push(idTecnico);
        }
        if (q) {
          if (/^\d+$/.test(q)) { where.push(`r.idRuta = ?`); params.push(Number(q)); }
          else { where.push(`(r.tipo LIKE ? OR r.observaciones LIKE ? OR un.nombre LIKE ?)`); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [res]: any = await conn.execute(
          `SELECT r.idRuta, un.nombre AS unidad, r.tipo, r.fechaApertura, r.fechaCierre, r.observaciones,
              COALESCE(GROUP_CONCAT(DISTINCT u.nombre ORDER BY u.nombre SEPARATOR ', '), '') AS participantes
           FROM ruta r
           JOIN unidad un ON un.idUnidad = r.idUnidad
           LEFT JOIN ruta_participante rp ON rp.idRuta = r.idRuta
           LEFT JOIN usuario u ON u.idUsuario = rp.idTecnico
           ${whereSQL}
           GROUP BY r.idRuta, un.nombre, r.tipo, r.fechaApertura, r.fechaCierre, r.observaciones
           ORDER BY r.idRuta ASC`,
          params
        );
        return res || [];
      });

      return { ok: true, tickets: ticketsResult, rutas: rutasResult };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error generando reporte." };
    }
  });
  // ==========================
  // MONTHLY totals 26-25
  // ==========================
  ipcMain.handle("reports:monthly", async (event, session: any, baseDateISO: string) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      const rango = monthlyRange(baseDateISO);

      const data = await withConn(async (conn) => {
        const [t]: any = await conn.execute(
          `SELECT COUNT(*) AS totalTickets
             FROM ticket
            WHERE fechaApertura BETWEEN ? AND ?`,
          [rango.start, rango.end]
        );
        const [r]: any = await conn.execute(
          `SELECT COUNT(*) AS totalRutas
             FROM ruta
            WHERE fechaApertura BETWEEN ? AND ?`,
          [rango.start, rango.end]
        );

        return {
          rango,
          totalTickets: Number(t?.[0]?.totalTickets || 0),
          totalRutas: Number(r?.[0]?.totalRutas || 0)
        };
      });

      return { ok: true, ...data };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error reporte mensual." };
    }
  });

  // ==========================
  // REPORT tickets (array)
  // - SIN open
  // - Estado por fechaCierre
  // - Incluye solución y técnicos, agrupados de forma segura en JavaScript
  // - Orden ASC
  // - Default rango 26-25 si no viene desde/hasta
  // ==========================
  ipcMain.handle("reports:tickets", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      validateReportFilters(filtros);

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const estado = normalizeEstado(filtros?.estado);
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;
      const tipoTicket = String(filtros?.tipoTicket || "").trim().toUpperCase();

      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;

      // default mensual 26-25 si no mandan rango
      if (!desde || !hasta) {
        const r = monthlyRange(new Date().toISOString());
        desde = desde || r.start;
        hasta = hasta || r.end;
      }

      const rows = await withConn(async (conn) => {
        const where: string[] = [
          `t.fechaCierre IS NOT NULL`,
          `t.idEstadoCalificacion = 1`
        ];
        const params: any[] = [];

        // rango principal
        if (desde) {
          where.push(`t.fechaApertura >= ?`);
          params.push(desde);
        }
        if (hasta) {
          where.push(`t.fechaApertura <= ?`);
          params.push(hasta);
        }

        // estado basado en fechaCierre
        if (estado === "ABIERTO") where.push(`t.fechaCierre IS NULL`);
        if (estado === "CERRADO") where.push(`t.fechaCierre IS NOT NULL`);

        if (idUnidad) {
          where.push(`t.idUnidad = ?`);
          params.push(idUnidad);
        }

        // filtro por técnico
        if (idTecnico) {
          where.push(
            `EXISTS (
               SELECT 1
                 FROM ticket_tecnico ttf
                WHERE ttf.idTicket = t.idTicket
                  AND ttf.idTecnico = ?
             )`
          );
          params.push(idTecnico);
        }

        // búsqueda
        if (q) {
          if (/^\d+$/.test(q)) {
            where.push(`t.idTicket = ?`);
            params.push(Number(q));
          } else {
            // La búsqueda se aplica sobre columnas base para conservar índices simples.
            where.push(
              `(t.nombreSolicitante LIKE ? OR t.solucion LIKE ? OR un.nombre LIKE ? OR se.nombre LIKE ?)`
            );
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
          }
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [res]: any = await conn.execute(
          `SELECT
              t.idTicket,
              t.nombreSolicitante,
              un.nombre AS unidad,
              se.nombre AS servicio,
              t.enLugar,
              t.fechaApertura,
              t.fechaCierre,
              t.solucion,
              dc.nombre AS clasificacion,
              COALESCE(ec.nombre, 'PENDIENTE') AS estadoCalificacion,
              tt.idTecnico,
              COALESCE(u.nombre, 'Sin técnico') AS tecnico
           FROM ticket t
           JOIN unidad un ON un.idUnidad = t.idUnidad
           JOIN servicio se ON se.idServicio = t.idServicio
           LEFT JOIN des_clasificacion dc ON dc.idClasificacion = t.idClasificacion
           LEFT JOIN des_estado_calificacion ec ON ec.idEstadoCalificacion = t.idEstadoCalificacion
           LEFT JOIN ticket_tecnico tt ON tt.idTicket = t.idTicket
           LEFT JOIN usuario u ON u.idUsuario = tt.idTecnico
           ${whereSQL}
           ORDER BY COALESCE(u.nombre, 'Sin técnico') ASC, t.idTicket ASC`,
          params
        );

        const sourceRows = res || [];
        const techniciansByTicket = new Map<number, Array<{ id: number; nombre: string }>>();

        for (const row of sourceRows) {
          const ticketId = Number(row?.idTicket || 0);
          const technicianId = Number(row?.idTecnico || 0);
          if (!ticketId || !technicianId) continue;
          const technicians = techniciansByTicket.get(ticketId) || [];
          if (!technicians.some((item) => item.id === technicianId)) {
            technicians.push({ id: technicianId, nombre: String(row?.tecnico || "Sin técnico") });
            techniciansByTicket.set(ticketId, technicians);
          }
        }

        return sourceRows
          .map((row: any) => {
            const ticketId = Number(row?.idTicket || 0);
            const technicianId = Number(row?.idTecnico || 0);
            const technicians = techniciansByTicket.get(ticketId) || [];
            const isShared = technicians.length > 1;
            return {
              ...row,
              tipo: isShared ? "Compartido" : "Individual",
              compartidoCon: isShared
                ? technicians
                    .filter((item) => item.id !== technicianId)
                    .map((item) => item.nombre)
                    .sort((left, right) => left.localeCompare(right, "es"))
                    .join(", ") || "—"
                : "—"
            };
          })
          .filter((row: any) => !idTecnico || Number(row?.idTecnico || 0) === idTecnico)
          .filter((row: any) => {
            if (tipoTicket === "INDIVIDUAL") return row.tipo === "Individual";
            if (tipoTicket === "COMPARTIDO") return row.tipo === "Compartido";
            return true;
          });
      });

      return rows;
    } catch (err: any) {
      throw new Error(err?.message || "No se pudo generar el reporte de tickets.");
    }
  });

  // ==========================
  // REPORT rutas (array)
  // - SIN open
  // - Estado por fechaCierre
  // - Incluye observaciones, participantes y equipos, agrupados de forma segura en JavaScript
  // - Orden ASC
  // - Default rango 26-25 si no viene desde/hasta
  // ==========================
  ipcMain.handle("reports:rutas", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      validateReportFilters(filtros);

      const q = filtros?.q ? String(filtros.q).trim() : null;
      const estado = normalizeEstado(filtros?.estado);
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;
      const tipoRuta = ["CERCANA", "INTERMEDIA", "LEJANA"].includes(
        String(filtros?.tipoRuta || "").trim().toUpperCase()
      )
        ? String(filtros.tipoRuta).trim().toUpperCase()
        : null;
      const desglosadoPorTecnico = Number(filtros?.desglosadoPorTecnico || 0) === 1 || filtros?.desglosadoPorTecnico === true;

      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;

      // default mensual 26-25 si no mandan rango
      if (!desde || !hasta) {
        const r = monthlyRange(new Date().toISOString());
        desde = desde || r.start;
        hasta = hasta || r.end;
      }

      const rows = await withConn(async (conn) => {
        const where: string[] = [
          `r.fechaCierre IS NOT NULL`,
          `r.idEstadoValidacion = 1`,
          `r.idEstadoCalificacion = 1`
        ];
        const params: any[] = [];

        // rango principal
        if (desde) {
          where.push(`r.fechaApertura >= ?`);
          params.push(desde);
        }
        if (hasta) {
          where.push(`r.fechaApertura <= ?`);
          params.push(hasta);
        }

        // estado basado en fechaCierre
        if (estado === "ABIERTO") where.push(`r.fechaCierre IS NULL`);
        if (estado === "CERRADO") where.push(`r.fechaCierre IS NOT NULL`);
        if (tipoRuta) {
          where.push(`UPPER(r.tipo) = ?`);
          params.push(tipoRuta);
        }

        if (idUnidad) {
          where.push(`r.idUnidad = ?`);
          params.push(idUnidad);
        }

        // filtro por participante
        if (idTecnico) {
          where.push(
            `EXISTS (
               SELECT 1
                 FROM ruta_participante rp2
                WHERE rp2.idRuta = r.idRuta
                  AND rp2.idTecnico = ?
             )`
          );
          params.push(idTecnico);
        }

        // búsqueda
        if (q) {
          if (/^\d+$/.test(q)) {
            where.push(`r.idRuta = ?`);
            params.push(Number(q));
          } else {
            where.push(`(r.tipo LIKE ? OR r.observaciones LIKE ? OR un.nombre LIKE ?)`);
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
          }
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [res]: any = await conn.execute(
          `SELECT
              r.idRuta,
              un.nombre AS unidad,
              UPPER(COALESCE(r.tipo, '—')) AS tipo,
              r.fechaApertura,
              r.fechaCierre,
              r.observaciones,
              r.nombreValidador,
              r.idEstadoCalificacion,
              COALESCE(ec.nombre, 'PENDIENTE') AS estadoCalificacion,
              rp.idTecnico,
              COALESCE(u.nombre, 'Sin técnico') AS tecnico,
              err.idCatalogoEquipoRevisadoR,
              err.cantidad AS equipoCantidad,
              err.validado AS equipoValidado,
              cer.nombre AS equipoNombre,
              cer.orden AS equipoOrden
           FROM ruta r
           JOIN unidad un ON un.idUnidad = r.idUnidad
           LEFT JOIN des_estado_calificacion ec ON ec.idEstadoCalificacion = r.idEstadoCalificacion
           LEFT JOIN ruta_participante rp ON rp.idRuta = r.idRuta
           LEFT JOIN usuario u ON u.idUsuario = rp.idTecnico
           LEFT JOIN equipos_revisados_rutas err ON err.idRuta = r.idRuta
           LEFT JOIN catalogoequiporevisador cer
             ON cer.idCatalogoEquipoRevisadoR = err.idCatalogoEquipoRevisadoR
           ${whereSQL}
           ORDER BY r.idRuta ASC, COALESCE(u.nombre, 'Sin técnico') ASC, cer.orden ASC, cer.nombre ASC`,
          params
        );

        const routes = new Map<number, any>();
        for (const row of res || []) {
          const routeId = Number(row?.idRuta || 0);
          if (!routeId) continue;
          let route = routes.get(routeId);
          if (!route) {
            route = {
              idRuta: routeId,
              unidad: row.unidad,
              tipo: row.tipo,
              fechaApertura: row.fechaApertura,
              fechaCierre: row.fechaCierre,
              observaciones: row.observaciones,
              nombreValidador: row.nombreValidador,
              idEstadoCalificacion: row.idEstadoCalificacion,
              estadoCalificacion: row.estadoCalificacion,
              technicians: new Map<number, string>(),
              reviews: new Map<number, any>()
            };
            routes.set(routeId, route);
          }

          const technicianId = Number(row?.idTecnico || 0);
          if (technicianId) route.technicians.set(technicianId, String(row?.tecnico || "Sin técnico"));

          const reviewId = Number(row?.idCatalogoEquipoRevisadoR || 0);
          if (reviewId) {
            route.reviews.set(reviewId, {
              id: reviewId,
              nombre: String(row?.equipoNombre || "Equipo"),
              cantidad: Math.max(0, Number(row?.equipoCantidad || 0)),
              validado: Number(row?.equipoValidado || 0) === 1,
              orden: Number(row?.equipoOrden || 0)
            });
          }
        }

        const buildCommonRoute = (route: any) => {
          const technicians = Array.from(route.technicians.entries()) as Array<[number, string]>;
          const reviews = (Array.from(route.reviews.values()) as any[])
            .sort((left, right) => left.orden - right.orden || left.nombre.localeCompare(right.nombre, "es"));
          return {
            idRuta: route.idRuta,
            unidad: route.unidad,
            tipo: route.tipo,
            fechaApertura: route.fechaApertura,
            fechaCierre: route.fechaCierre,
            observaciones: route.observaciones,
            nombreValidador: route.nombreValidador,
            idEstadoCalificacion: route.idEstadoCalificacion,
            estadoCalificacion: route.estadoCalificacion,
            participantes: technicians.map(([, name]) => name).sort((a, b) => a.localeCompare(b, "es")).join(", "),
            equiposRevisados: reviews
              .map((item) => `${item.nombre}: ${item.cantidad} (${item.validado ? "validado" : "pendiente"})`)
              .join("; "),
            equiposRevisadosData: reviews.map((item) => `${item.id}=${item.cantidad}`).join(";")
          };
        };

        if (!desglosadoPorTecnico) {
          return Array.from(routes.values()).map(buildCommonRoute);
        }

        return Array.from(routes.values()).flatMap((route: any) => {
          const common = buildCommonRoute(route);
          const technicians = Array.from(route.technicians.entries()) as Array<[number, string]>;
          const selected = idTecnico
            ? technicians.filter(([technicianId]) => technicianId === idTecnico)
            : technicians;
          const rowsByTechnician = selected.length ? selected : (idTecnico ? [] : [[0, "Sin técnico"]] as Array<[number, string]>);
          return rowsByTechnician.map(([technicianId, technician]) => ({
            ...common,
            idTecnico: technicianId || null,
            tecnico: technician,
            compartidoCon: technicians
              .filter(([otherId]) => otherId !== technicianId)
              .map(([, name]) => name)
              .sort((a, b) => a.localeCompare(b, "es"))
              .join(", ") || "—"
          }));
        });
      });

      return rows;
    } catch (err: any) {
      throw new Error(err?.message || "No se pudo generar el reporte de rutas.");
    }
  });

  // ==========================
  // RESUMEN MENSUAL TICKETS por técnico
  // Columnas: Tecnico, Basico, Intermedio, Complejo, Extraordinario, Total
  // Evita duplicación de tickets compartidos usando DISTINCT
  // ==========================
  ipcMain.handle("reports:tickets_summary", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      validateReportFilters(filtros);

      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;

      // default mensual 26-25 si no mandan rango
      if (!desde || !hasta) {
        const r = monthlyRange(new Date().toISOString());
        desde = desde || r.start;
        hasta = hasta || r.end;
      }

      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;
      const tipoTicket = String(filtros?.tipoTicket || "").trim().toUpperCase();

      const rows = await withConn(async (conn) => {
        let where = `t.fechaApertura >= ?
          AND t.fechaApertura <= ?
          AND t.fechaCierre IS NOT NULL
          AND t.idEstadoCalificacion = 1`;
        const params: any[] = [desde, hasta];

        if (idTecnico) {
          where += ` AND tt.idTecnico = ?`;
          params.push(idTecnico);
        }

        if (idUnidad) {
          where += ` AND t.idUnidad = ?`;
          params.push(idUnidad);
        }

        if (tipoTicket === "INDIVIDUAL") {
          where += ` AND tc.totalTecnicos <= 1`;
        }

        if (tipoTicket === "COMPARTIDO") {
          where += ` AND tc.totalTecnicos > 1`;
        }

        const [res]: any = await conn.execute(
          `SELECT 
              u.nombre AS tecnico,
              COUNT(*) AS totalCalificados,
              SUM(CASE WHEN tc.totalTecnicos = 1 THEN 1 ELSE 0 END) AS individuales,
              SUM(CASE WHEN tc.totalTecnicos > 1 THEN 1 ELSE 0 END) AS compartidos,
              SUM(CASE WHEN dc.nombre = 'BASICO' THEN 1 ELSE 0 END) AS basico,
              SUM(CASE WHEN dc.nombre = 'INTERMEDIO' THEN 1 ELSE 0 END) AS intermedio,
              SUM(CASE WHEN dc.nombre = 'COMPLEJO' THEN 1 ELSE 0 END) AS complejo,
              SUM(CASE WHEN dc.nombre = 'EXTRAORDINARIO' THEN 1 ELSE 0 END) AS extraordinario
           FROM ticket t
           JOIN ticket_tecnico tt ON tt.idTicket = t.idTicket
           JOIN usuario u ON u.idUsuario = tt.idTecnico
           JOIN (
             SELECT idTicket, COUNT(DISTINCT idTecnico) AS totalTecnicos
             FROM ticket_tecnico
             GROUP BY idTicket
           ) tc ON tc.idTicket = t.idTicket
           LEFT JOIN des_clasificacion dc ON dc.idClasificacion = t.idClasificacion
           WHERE ${where}
           GROUP BY u.nombre
           ORDER BY u.nombre ASC`,
          params
        );

        return res || [];
      });

      // Formatear fechas para respuesta
      const formatDateMysql = (mysqlStr: string) => {
        if (!mysqlStr) return "";
        const match = mysqlStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        return mysqlStr;
      };

      return { ok: true, desde: formatDateMysql(desde), hasta: formatDateMysql(hasta), data: rows };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error en resumen tickets." };
    }
  });

  // ==========================
  // RESUMEN MENSUAL RUTAS por técnico
  // Columnas: Tecnico, Cercana, Intermedia, Lejana, Total
  // ==========================
  ipcMain.handle("reports:rutas_summary", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      validateReportFilters(filtros);

      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;

      // default mensual 26-25 si no mandan rango
      if (!desde || !hasta) {
        const r = monthlyRange(new Date().toISOString());
        desde = desde || r.start;
        hasta = hasta || r.end;
      }

      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;

      const rows = await withConn(async (conn) => {
        let where = `r.fechaApertura >= ?
          AND r.fechaApertura <= ?
          AND r.fechaCierre IS NOT NULL
          AND r.idEstadoValidacion = 1
          AND r.idEstadoCalificacion = 1`;
        const params: any[] = [desde, hasta];

        if (idTecnico) {
          where += ` AND rp.idTecnico = ?`;
          params.push(idTecnico);
        }

        if (idUnidad) {
          where += ` AND r.idUnidad = ?`;
          params.push(idUnidad);
        }

        const [res]: any = await conn.execute(
          `SELECT 
              u.nombre AS tecnico,
              SUM(CASE WHEN r.tipo = 'CERCANA' THEN 1 ELSE 0 END) AS cercana,
              SUM(CASE WHEN r.tipo = 'INTERMEDIA' THEN 1 ELSE 0 END) AS intermedia,
              SUM(CASE WHEN r.tipo = 'LEJANA' THEN 1 ELSE 0 END) AS lejana,
              COUNT(*) AS total
           FROM ruta r
           JOIN ruta_participante rp ON rp.idRuta = r.idRuta
           JOIN usuario u ON u.idUsuario = rp.idTecnico
           WHERE ${where}
           GROUP BY u.nombre
           ORDER BY u.nombre ASC`,
          params
        );

        return res || [];
      });

      return { ok: true, desde, hasta, data: rows };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error en resumen rutas." };
    }
  });

  // ==========================
  // RESUMEN MENSUAL PROYECTOS APROBADOS
  // Columnas: Titulo, Participantes, Link de Documento
  // ==========================
  ipcMain.handle("reports:proyectos_summary", async (event, session: any, filtros: any) => {
    try {
      session = requireTrustedSession(event);
      requirePerm(session, "REPORTS_VIEW");
      validateReportFilters(filtros);

      let desde = filtros?.desde ? String(filtros.desde) : null;
      let hasta = filtros?.hasta ? String(filtros.hasta) : null;

      if (!desde || !hasta) {
        const r = monthlyRange(new Date().toISOString());
        desde = desde || r.start;
        hasta = hasta || r.end;
      }

      const idTecnico = filtros?.idTecnico ? Number(filtros.idTecnico) : null;
      const idUnidad = filtros?.idUnidad ? Number(filtros.idUnidad) : null;

      const rows = await withConn(async (conn) => {
        let where = `pe.activo = 1
          AND UPPER(TRIM(pe.estadoRevision)) = 'APROBADO'
          AND COALESCE(pe.fechaRevision, pe.fechaRegistro) >= ?
          AND COALESCE(pe.fechaRevision, pe.fechaRegistro) <= ?`;
        const params: any[] = [desde, hasta];

        if (idTecnico) {
          where += ` AND EXISTS (SELECT 1 FROM proyecto_especial_participante pep2 WHERE pep2.idProyectoEspecial = pe.idProyectoEspecial AND pep2.idUsuario = ?)`;
          params.push(idTecnico);
        }

        if (idUnidad) {
          where += ` AND pe.idUnidad = ?`;
          params.push(idUnidad);
        }

        const [res]: any = await conn.execute(
           `SELECT
               pe.idProyectoEspecial,
               pe.titulo,
               pep.idUsuario AS idParticipante,
               COALESCE(u.nombre, '') AS participante,
               COALESCE(pe.urlDocumento, '') AS urlDocumento
           FROM proyecto_especial pe
           LEFT JOIN proyecto_especial_participante pep ON pep.idProyectoEspecial = pe.idProyectoEspecial
           LEFT JOIN usuario u ON u.idUsuario = pep.idUsuario
           WHERE ${where}
            ORDER BY pe.idProyectoEspecial ASC, u.nombre ASC`,
          params
        );

        const projects = new Map<number, any>();
        for (const row of res || []) {
          const projectId = Number(row?.idProyectoEspecial || 0);
          if (!projectId) continue;
          let project = projects.get(projectId);
          if (!project) {
            project = {
              idProyectoEspecial: projectId,
              titulo: row.titulo,
              urlDocumento: row.urlDocumento,
              participants: new Map<number, string>()
            };
            projects.set(projectId, project);
          }
          const participantId = Number(row?.idParticipante || 0);
          if (participantId) project.participants.set(participantId, String(row?.participante || ""));
        }

        return Array.from(projects.values()).map((project: any) => ({
          idProyectoEspecial: project.idProyectoEspecial,
          titulo: project.titulo,
          urlDocumento: project.urlDocumento,
          participantes: (Array.from(project.participants.values()) as string[])
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right, "es"))
            .join(", ")
        }));
      });

      return { ok: true, desde, hasta, data: rows };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Error en resumen proyectos." };
    }
  });



// ==========================
// EXPORT EXCEL (.xlsx local, sin CDN)
// Renderer envía datos y título, main crea el archivo
// Soporta tanto array de objetos como array de arrays
// ==========================
ipcMain.handle("reports:export_excel", async (event, session: any, filename: string, data: any[], title: string) => {
  try {
    session = requireTrustedSession(event);
    requirePerm(session, "REPORTS_VIEW");
    const isInteractiveTicketExport = isTicketComplexityExportLayout(data as any[][]);
    const finalFilename = isInteractiveTicketExport
      ? String(filename || "Reporte_Tickets.xlsx").replace(/\.xlsm$/i, ".xlsx")
      : filename;

    const defaultSheetName = deriveReportSheetName(title, data);
    const sheetConfig = isInteractiveTicketExport ? null : buildExcelSheetConfig(data, title, defaultSheetName);

    const portableConfig = sheetConfig || buildExcelSheetConfig(data, title, defaultSheetName);
    return await exportReport(finalFilename, portableConfig, isInteractiveTicketExport ? data as any[][] : undefined);
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Error exportando Excel." };
  }
});

ipcMain.handle("reports:export_excel_multi", async (event, session: any, filename: string, sheets: any[]) => {
  try {
    session = requireTrustedSession(event);
    requirePerm(session, "REPORTS_VIEW");

    if (!Array.isArray(sheets) || !sheets.length) {
      return { ok: false, message: "No hay hojas para exportar." };
    }

    const isTicketWorkbook = sheets.every((sheet) => isTicketComplexityExportLayout(sheet?.data || []));
    const workbookSheets = sheets.map((sheet, index) => {
      const config = buildExcelSheetConfig(sheet?.data || [], sheet?.title || `Reporte ${index + 1}`, sheet?.sheet || `Hoja ${index + 1}`);
      return {
        sheet: config.sheet,
        columns: config.columns,
        stickyRowsCount: config.stickyRowsCount,
        data: config.data
      };
    });

    return await exportReportWorkbook(filename, workbookSheets, isTicketWorkbook ? sheets : undefined);
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Error exportando Excel global." };
  }
});
}
