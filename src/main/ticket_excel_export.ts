import { app } from "electron";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { sanitizeSheetName } from "./services/export_security";

const execFileAsync = promisify(execFile);

type TicketExportTotals = {
  total: number;
  individuales: number;
  compartidos: number;
  basico: number;
  intermedio: number;
  complejo: number;
  extraordinario: number;
};

export function isTicketComplexityExportLayout(data: any[][]) {
  return Array.isArray(data) &&
    String(data?.[0]?.[0] ?? "").trim().toUpperCase() === "__REPORTE_TICKETS_COMPLEJIDADES__";
}

function makeUniqueSheetName(name: string, usedNames: Set<string>) {
  const baseName = sanitizeSheetName(name);
  let candidate = baseName;
  let sequence = 2;
  while (usedNames.has(candidate.toLocaleUpperCase())) {
    const suffix = ` (${sequence})`;
    candidate = `${baseName.slice(0, 31 - suffix.length).trimEnd()}${suffix}`;
    sequence += 1;
  }
  usedNames.add(candidate.toLocaleUpperCase());
  return candidate;
}

function normalizeComplexity(value: any) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function normalizeTecnicoLabel(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function buildRowTicketTotals(tickets: any[]) {
  return (tickets || []).reduce<TicketExportTotals>((result, ticket) => {
    const type = String(ticket?.tipo || "").trim().toUpperCase();
    const complexity = normalizeComplexity(ticket?.complejidad);
    result.total += 1;
    if (type === "INDIVIDUAL") result.individuales += 1;
    if (type === "COMPARTIDO") result.compartidos += 1;
    if (complexity.includes("BASICO")) result.basico += 1;
    else if (complexity.includes("INTERMEDIO")) result.intermedio += 1;
    else if (complexity.includes("COMPLEJO")) result.complejo += 1;
    else if (complexity.includes("EXTRAORDINARIO")) result.extraordinario += 1;
    return result;
  }, { total: 0, individuales: 0, compartidos: 0, basico: 0, intermedio: 0, complejo: 0, extraordinario: 0 });
}

function buildUniqueTicketTotals(tickets: any[]) {
  const uniqueMap = (tickets || []).reduce<Map<string, any>>((map, ticket) => {
    const ticketNumber = String(ticket?.numeroTicket || "").trim();
    const key = ticketNumber || JSON.stringify([
      ticket?.tipo || "",
      ticket?.tecnico || "",
      ticket?.unidad || "",
      ticket?.servicio || "",
      ticket?.solucion || "",
      ticket?.complejidad || ""
    ]);
    if (!map.has(key)) map.set(key, ticket);
    return map;
  }, new Map<string, any>());

  return buildRowTicketTotals(Array.from(uniqueMap.values()));
}

function buildInteractiveTicketPayload(data: any[][]) {
  const tickets: any[] = [];
  const tecnico = String(data?.[3]?.[5] ?? "Todos los técnicos");
  const totalsMode = normalizeTecnicoLabel(tecnico) === "TODOS LOS TECNICOS" ? "unique" : "rows";
  let inDetailSection = false;
  let skipNextHeaderRow = false;

  for (let index = 0; index < data.length; index += 1) {
    const row = Array.isArray(data[index]) ? data[index] : [];
    const label = String(row[0] ?? "").trim().toUpperCase();

    if (label === "INDIVIDUAL - COMPARTIDOS") {
      inDetailSection = true;
      skipNextHeaderRow = true;
      continue;
    }

    if (!inDetailSection) {
      continue;
    }

    if (skipNextHeaderRow) {
      skipNextHeaderRow = false;
      continue;
    }

    if (!label || label === "TOTAL" || label.startsWith("__")) continue;

    tickets.push({
      numeroTicket: row[0] ?? "",
      tecnico: row[1] ?? "",
      unidad: row[2] ?? "",
      servicio: row[3] ?? "",
      solucion: row[4] ?? "",
      complejidad: row[14] ?? row[row.length - 3] ?? "",
      tipo: row[15] ?? "",
      compartidoCon: row[16] ?? ""
    });
  }

  const totals = totalsMode === "rows"
    ? buildRowTicketTotals(tickets)
    : buildUniqueTicketTotals(tickets);

  return {
    periodo: String(data?.[2]?.[1] ?? ""),
    fecha: String(data?.[2]?.[5] ?? ""),
    hora: String(data?.[2]?.[8] ?? ""),
    generadoPor: String(data?.[3]?.[1] ?? ""),
    tecnico,
    totalsMode,
    tickets,
    totals
  };
}

function getAssetPath(filename: string) {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", filename)
    : path.join(process.cwd(), "assets", filename);
}

export async function exportInteractiveTicketWorkbook(filePath: string, data: any[][]) {
  const tempPath = path.join(tmpdir(), `soporte-tickets-${process.pid}-${Date.now()}.json`);
  try {
    await fs.writeFile(tempPath, JSON.stringify(buildInteractiveTicketPayload(data)), "utf8");
    await execFileAsync("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
      `& ([scriptblock]::Create((Get-Content -LiteralPath '${getAssetPath("export-tickets-interactive.ps1").replace(/'/g, "''")}' -Raw -Encoding UTF8))) -InputPath '${tempPath.replace(/'/g, "''")}' -OutputPath '${filePath.replace(/'/g, "''")}'`
    ], { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
  } catch (error: any) {
    const detail = String(error?.stderr || error?.message || "").trim();
    throw new Error(detail || "No se pudo crear el libro interactivo de tickets.");
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function exportInteractiveTicketWorkbookMulti(filePath: string, sheets: any[]) {
  const manifestPath = path.join(tmpdir(), `soporte-tickets-manifest-${process.pid}-${Date.now()}.json`);
  try {
    const usedSheetNames = new Set<string>();
    const manifest = sheets.map((sheet, index) => ({
      name: makeUniqueSheetName(sheet?.sheet || `Reporte ${index + 1}`, usedSheetNames),
      payload: buildInteractiveTicketPayload(sheet?.data || [])
    }));
    await fs.writeFile(manifestPath, JSON.stringify(manifest), "utf8");
    await execFileAsync("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
      `& ([scriptblock]::Create((Get-Content -LiteralPath '${getAssetPath("export-tickets-interactive-multi.ps1").replace(/'/g, "''")}' -Raw -Encoding UTF8))) -ManifestPath '${manifestPath.replace(/'/g, "''")}' -OutputPath '${filePath.replace(/'/g, "''")}'`
    ], { windowsHide: true, timeout: 240000, maxBuffer: 1024 * 1024 });
  } finally {
    await fs.rm(manifestPath, { force: true }).catch(() => undefined);
  }
}
