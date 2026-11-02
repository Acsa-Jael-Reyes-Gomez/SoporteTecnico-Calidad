import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { BCRYPT_FULL_RE } from "../password_service";

export type PasswordClassification =
  | "bcrypt_valid"
  | "plaintext_valid"
  | "password_empty"
  | "bcrypt_invalid"
  | "unexpected_data";

export interface ProblemRecord {
  idUsuario: number;
  usuario: string;
  classification: PasswordClassification;
}

export interface PasswordMigrationResult {
  migrated: number;
  problems: ProblemRecord[];
  backupPath?: string;
  unchanged: number;
}

export interface PasswordMigrationOptions {
  backupFactory?: (databasePath: string) => string;
}

function hasUnexpectedCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0 && code <= 0x1f) ||
      (code >= 0x7f && code <= 0x9f) ||
      code === 0xfffd
    ) {
      return true;
    }
  }
  return false;
}

export function classifyPassword(value: unknown): PasswordClassification {
  if (value === null || value === undefined) return "password_empty";
  if (typeof value !== "string" && typeof value !== "number") return "unexpected_data";

  const stored = String(value);
  if (!stored.trim()) return "password_empty";

  if (/^\$2[aby]\$/.test(stored) || /^\$2/.test(stored)) {
    return BCRYPT_FULL_RE.test(stored) ? "bcrypt_valid" : "bcrypt_invalid";
  }

  if (hasUnexpectedCharacters(stored) || stored.length > 80) {
    return "unexpected_data";
  }

  return "plaintext_valid";
}

function integrityCheck(db: DatabaseSync): void {
  const rows = db.prepare("PRAGMA integrity_check").all() as Array<Record<string, unknown>>;
  const firstValue = rows.length ? Object.values(rows[0])[0] : null;
  if (rows.length !== 1 || String(firstValue).toLowerCase() !== "ok") {
    throw new Error("La base SQLite no pasó la comprobación de integridad.");
  }
}

function countUsers(db: DatabaseSync): number {
  const row = db.prepare(
    "SELECT count(*) AS total FROM sqlite_master WHERE type = 'table' AND name = 'usuario'"
  ).get() as { total: number } | undefined;
  if (!row || Number(row.total) !== 1) {
    throw new Error("No se encontró la tabla usuario necesaria para la migración.");
  }
  const count = db.prepare("SELECT count(*) AS total FROM usuario").get() as { total: number };
  return Number(count.total);
}

type UserSnapshot = Array<Record<string, string | number | null>>;

function snapshotUsers(db: DatabaseSync): UserSnapshot {
  const table = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='usuario'"
  ).get();
  if (!table) throw new Error("No se encontró la tabla usuario necesaria para validar el respaldo.");

  const columns = db.prepare("PRAGMA table_info('usuario')").all() as Array<{
    name: string;
  }>;
  const relevantColumns = ["idUsuario", "usuario", "nombre", "idRol", "activo"].filter(
    (name) => columns.some((column) => column.name === name)
  );
  if (!relevantColumns.includes("idUsuario") || !relevantColumns.includes("usuario")) {
    throw new Error("La tabla usuario no contiene los campos mínimos necesarios para validar el respaldo.");
  }

  const quotedColumns = relevantColumns.map((name) => `"${name}"`).join(", ");
  return (db.prepare(`SELECT ${quotedColumns} FROM usuario ORDER BY "idUsuario"`).all() as Array<
    Record<string, string | number | null>
  >).map((row) => ({ ...row }));
}

export function validateUserSnapshots(
  original: UserSnapshot,
  backup: UserSnapshot
): void {
  if (original.length !== backup.length) {
    throw new Error(
      `El respaldo contiene ${backup.length} usuarios, pero la base original contiene ${original.length}.`
    );
  }

  if (JSON.stringify(original) !== JSON.stringify(backup)) {
    throw new Error(
      "La identidad o los datos relevantes de los usuarios difieren entre la base original y el respaldo."
    );
  }
}

function currentWindowsUserSid(): string | null {
  if (process.platform !== "win32") return null;
  try {
    const result = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "[Security.Principal.WindowsIdentity]::GetCurrent().User.Value"
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim();
    return /^S-/i.test(result) ? result : null;
  } catch {
    return null;
  }
}

export interface WindowsAclAccessRule {
  Sid: string;
  Identity: string;
  IsInherited: boolean;
  AccessControlType: string;
  Rights: string;
}

export interface WindowsAclSnapshot {
  IsInheritanceEnabled: boolean;
  Access: WindowsAclAccessRule[];
}

export function verifyWindowsBackupAcl(
  acl: WindowsAclSnapshot,
  currentSid: string
): void {
  const requiredSids = new Set([currentSid, "S-1-5-18", "S-1-5-32-544"]);
  if (!currentSid) throw new Error("No se pudo identificar la identidad actual de Windows.");
  if (acl.IsInheritanceEnabled) {
    throw new Error("La herencia de permisos no fue deshabilitada.");
  }

  const access = Array.isArray(acl.Access)
    ? acl.Access
    : acl.Access
      ? [acl.Access as unknown as WindowsAclAccessRule]
      : [];
  if (!access.length) throw new Error("La ACL aplicada no contiene reglas explícitas.");

  for (const rule of access) {
    if (rule.IsInherited) {
      throw new Error("La ACL todavía contiene permisos heredados.");
    }
    if (!requiredSids.has(rule.Sid)) {
      throw new Error(`La ACL contiene una identidad no autorizada: ${rule.Identity || rule.Sid}`);
    }
    if (rule.AccessControlType !== "Allow") {
      throw new Error(`La ACL contiene una denegación inesperada para ${rule.Identity || rule.Sid}.`);
    }
    if (!/FullControl/i.test(rule.Rights)) {
      throw new Error(`La identidad ${rule.Identity || rule.Sid} no tiene control total.`);
    }
  }

  for (const sid of requiredSids) {
    const validRule = access.find(
      (rule) =>
        rule.Sid === sid &&
        !rule.IsInherited &&
        rule.AccessControlType === "Allow" &&
        /FullControl/i.test(rule.Rights)
    );
    if (!validRule) {
      throw new Error(
        `Falta una regla ACL válida para ${sid}. SIDs observados: ${
          access.map((rule) => rule.Sid || "SIN-SID").join(", ")
        }.`
      );
    }
  }
}

function readWindowsAcl(target: string): WindowsAclSnapshot {
  const escapedTarget = target.replace(/'/g, "''");
  const script = `
$ErrorActionPreference = 'Stop'
$securityModule = Join-Path (Join-Path (Join-Path $PSHOME 'Modules') 'Microsoft.PowerShell.Security') 'Microsoft.PowerShell.Security.psd1'
Import-Module -Name $securityModule -ErrorAction Stop
$acl = Get-Acl -LiteralPath '${escapedTarget}'
$access = @()
foreach ($rule in $acl.Access) {
  try { $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value }
  catch { $sid = '' }
  $access += [PSCustomObject]@{
    Sid = $sid
    Identity = $rule.IdentityReference.Value
    IsInherited = [bool]$rule.IsInherited
    AccessControlType = $rule.AccessControlType.ToString()
    Rights = $rule.FileSystemRights.ToString()
  }
}
[PSCustomObject]@{
  IsInheritanceEnabled = [bool]($acl.AreAccessRulesProtected -eq $false)
  Access = $access
} | ConvertTo-Json -Compress -Depth 4
`;
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
  if (!output) throw new Error("No se pudo obtener la ACL efectiva de Windows.");
  return JSON.parse(output) as WindowsAclSnapshot;
}

function applyWindowsBackupAcl(target: string, directory: boolean): void {
  if (process.platform !== "win32") return;
  const sid = currentWindowsUserSid();
  if (!sid) throw new Error("No se pudo identificar la identidad actual para proteger el respaldo.");

  const grants = [
    `*${sid}:${directory ? "(OI)(CI)F" : "F"}`,
    `*S-1-5-18:${directory ? "(OI)(CI)F" : "F"}`,
    `*S-1-5-32-544:${directory ? "(OI)(CI)F" : "F"}`
  ];
  try {
    execFileSync(
      "icacls.exe",
      [target, "/inheritance:r"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    for (const grant of grants) {
      execFileSync(
        "icacls.exe",
        [target, "/grant", grant],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      );
    }
    verifyWindowsBackupAcl(readWindowsAcl(target), sid);
  } catch (error) {
    throw new Error(
      `No se pudieron establecer permisos explícitos para el respaldo: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function uniqueBackupPath(databasePath: string): string {
  const backupDirectory = path.join(path.dirname(databasePath), "backups");
  fs.mkdirSync(backupDirectory, { recursive: true });
  try {
    if (process.platform === "win32") {
      applyWindowsBackupAcl(backupDirectory, true);
    } else {
      fs.chmodSync(backupDirectory, 0o700);
    }
  } catch (error) {
    throw new Error(
      `No se pudieron proteger los permisos de la carpeta de respaldos: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${path.basename(databasePath, path.extname(databasePath))}-${stamp}`;
  let sequence = 0;
  while (true) {
    const candidate = path.join(
      backupDirectory,
      `${baseName}${sequence === 0 ? "" : `-${sequence}`}.backup.db`
    );
    if (!fs.existsSync(candidate)) return candidate;
    sequence++;
  }
}

export function createPasswordMigrationBackup(
  databasePath: string,
  db: DatabaseSync
): string {
  if (!databasePath || !fs.existsSync(databasePath)) {
    throw new Error("La base SQLite original no existe o no puede abrirse.");
  }

  try {
    integrityCheck(db);
  } catch (error) {
    throw new Error(
      `No se creó el respaldo porque la base original no es válida: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const originalUserCount = countUsers(db);
  const originalUsers = snapshotUsers(db);
  const backupPath = uniqueBackupPath(databasePath);
  try {
    db.exec("PRAGMA busy_timeout=10000;");
    db.prepare("VACUUM INTO ?").run(backupPath);
    if (process.platform === "win32") {
      applyWindowsBackupAcl(backupPath, false);
    } else {
      fs.chmodSync(backupPath, 0o600);
    }
  } catch (error) {
    if (fs.existsSync(backupPath)) fs.rmSync(backupPath, { force: true });
    throw new Error(
      `No se pudo crear el respaldo SQLite. La migración fue cancelada: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let backupDb: DatabaseSync | null = null;
  try {
    backupDb = new DatabaseSync(backupPath, { readOnly: true });
    integrityCheck(backupDb);
    const backupUserCount = countUsers(backupDb);
    if (backupUserCount !== originalUserCount) {
      throw new Error(
        `El respaldo contiene ${backupUserCount} usuarios, pero la base original contiene ${originalUserCount}.`
      );
    }
    validateUserSnapshots(originalUsers, snapshotUsers(backupDb));
  } catch (error) {
    if (backupDb) backupDb.close();
    fs.rmSync(backupPath, { force: true });
    throw new Error(
      `No se pudo validar el respaldo. La migración fue cancelada: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    backupDb?.close();
  }

  return backupPath;
}

function writeProblemReport(databasePath: string, problems: ProblemRecord[]): string {
  const reportDirectory = path.join(path.dirname(databasePath), "backups");
  fs.mkdirSync(reportDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDirectory, `password-migration-${stamp}.json`);
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        notice: "Las credenciales y hashes no se incluyen en este informe.",
        problems
      },
      null,
      2
    ),
    { encoding: "utf8", mode: 0o600 }
  );
  return reportPath;
}

export function migratePlaintextPasswords(
  db: DatabaseSync,
  databasePath: string,
  options: PasswordMigrationOptions = {}
): PasswordMigrationResult {
  const table = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'usuario'"
  ).get();
  if (!table) return { migrated: 0, problems: [], unchanged: 0 };

  const rows = db.prepare("SELECT idUsuario, usuario, pass FROM usuario").all() as Array<{
    idUsuario: number;
    usuario: string;
    pass: unknown;
  }>;
  const problems: ProblemRecord[] = [];
  const validPlaintext: Array<{ idUsuario: number; password: string }> = [];

  for (const row of rows) {
    const classification = classifyPassword(row.pass);
    if (classification === "plaintext_valid") {
      validPlaintext.push({ idUsuario: Number(row.idUsuario), password: String(row.pass) });
    }
    if (
      classification === "password_empty" ||
      classification === "bcrypt_invalid" ||
      classification === "unexpected_data"
    ) {
      problems.push({
        idUsuario: Number(row.idUsuario),
        usuario: String(row.usuario || ""),
        classification
      });
    }
  }

  let backupPath: string | undefined;
  if (validPlaintext.length) {
    backupPath = options.backupFactory
      ? options.backupFactory(databasePath)
      : createPasswordMigrationBackup(databasePath, db);
  }

  if (problems.length) writeProblemReport(databasePath, problems);

  if (!validPlaintext.length) {
    return { migrated: 0, problems, unchanged: rows.length };
  }

  const update = db.prepare("UPDATE usuario SET pass = ? WHERE idUsuario = ?");
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of validPlaintext) {
      update.run(bcrypt.hashSync(item.password, 10), item.idUsuario);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    migrated: validPlaintext.length,
    problems,
    backupPath,
    unchanged: rows.length - validPlaintext.length
  };
}
