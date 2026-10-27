import { dialog } from "electron";
import { sanitizeExportFilename, sanitizeSpreadsheetData } from "./export_security";
import { exportInteractiveTicketWorkbook, exportInteractiveTicketWorkbookMulti } from "../ticket_excel_export";

export type ReportSheet = { sheet: string; columns?: any[]; stickyRowsCount?: number; data: any[] };

async function writePortableWorkbook(filePath: string, sheets: ReportSheet[]) {
  const { default: writeExcelFile } = await import("write-excel-file/node");
  const safeSheets = sanitizeSpreadsheetData(sheets) as ReportSheet[];
  if (safeSheets.length === 1) {
    const config = safeSheets[0];
    await writeExcelFile(config.data, {
      sheet: config.sheet,
      columns: config.columns,
      stickyRowsCount: config.stickyRowsCount
    }).toFile(filePath);
    return;
  }
  const workbookWriter: any = writeExcelFile;
  await workbookWriter(safeSheets).toFile(filePath);
}

async function chooseExportPath(filename: string, title: string) {
  const result = await dialog.showSaveDialog({
    title,
    defaultPath: sanitizeExportFilename(filename),
    filters: [{ name: "Excel", extensions: ["xlsx"] }]
  });
  return result.canceled || !result.filePath ? null : result.filePath;
}

export async function exportReport(
  filename: string,
  portableSheet: ReportSheet,
  interactiveData?: any[][]
) {
  const filePath = await chooseExportPath(filename, "Guardar reporte Excel");
  if (!filePath) return { ok: false, canceled: true };
  if (interactiveData && process.platform === "win32") {
    try {
      await exportInteractiveTicketWorkbook(filePath, sanitizeSpreadsheetData(interactiveData));
      return { ok: true, filePath };
    } catch {
      // Si Excel/COM no está disponible, conservar la exportación con el escritor portable.
    }
  }
  await writePortableWorkbook(filePath, [portableSheet]);
  return { ok: true, filePath };
}

export async function exportReportWorkbook(
  filename: string,
  portableSheets: ReportSheet[],
  interactiveSheets?: any[]
) {
  const filePath = await chooseExportPath(filename, "Guardar reporte global Excel");
  if (!filePath) return { ok: false, canceled: true };
  if (interactiveSheets && process.platform === "win32") {
    try {
      await exportInteractiveTicketWorkbookMulti(filePath, sanitizeSpreadsheetData(interactiveSheets));
      return { ok: true, filePath };
    } catch {
      // Fallback multiplataforma y sin dependencia de Microsoft Excel.
    }
  }
  await writePortableWorkbook(filePath, portableSheets);
  return { ok: true, filePath };
}
