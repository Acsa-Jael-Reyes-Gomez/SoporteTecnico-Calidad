import type { IpcMain } from "electron";
import { BrowserWindow, shell } from "electron";

function isValidUrl(url: string) {
  try {
    const u = new URL(String(url || "").trim());
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.host;
  } catch {
    return false;
  }
}

export function registerUtilsHandlers(ipcMain: IpcMain) {
  // Existing openExternal
  ipcMain.handle("utils:openExternal", async (_e, url: string) => {
    try {
      const safeUrl = String(url || "").trim();

      if (!safeUrl) throw new Error("URL vacía.");
      if (!isValidUrl(safeUrl)) throw new Error("URL inválida.");

      await shell.openExternal(safeUrl);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message || "No se pudo abrir el enlace." };
    }
  });

  // ✅ Window controls - frameless Electron

  ipcMain.handle("window:isMaximized", () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
    return win?.isMaximized() || false;
  });
}
