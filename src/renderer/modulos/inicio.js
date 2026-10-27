/* =========================
   INIT
========================= */
let lastGlobalErrorMessage = "";

function reportGlobalUiError(error, fallback) {
  const message = getUserErrorMessage(error, fallback);
  if (!message || message === lastGlobalErrorMessage) return;
  lastGlobalErrorMessage = message;
  toast(message, "err");
}

function bootRenderer() {
  try {
    mount(LoginView());
  } catch (err) {
    const app = document.querySelector("#app");
    if (app) {
      app.innerHTML = "";
      app.appendChild(
        el("div", { class: "card", style: "max-width:680px; margin:40px auto; padding:24px;" }, [
          el("div", { class: "h1" }, ["Error al iniciar la interfaz"]),
          el("div", { class: "small", style: "margin-top:10px;" }, [
            getUserErrorMessage(err, "Ocurrió un error al iniciar la interfaz.")
          ])
        ])
      );
    }
    throw err;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootRenderer, { once: true });
} else {
  bootRenderer();
}

window.addEventListener("error", (event) => {
  reportGlobalUiError(event.error || event.message, "Ocurrió un error inesperado en la interfaz.");
});

window.addEventListener("unhandledrejection", (event) => {
  reportGlobalUiError(event.reason, "Ocurrió un error inesperado en la interfaz.");
});

// ✅ GERENCIAL Route Protection - Block manual URL navigation
const GERENCIAL_ALLOWED_HASHES = new Set(["", "#validar_rutas", "#envio_equipo"]);

window.addEventListener("hashchange", () => {
  if (session?.rol === "GERENCIAL" && !GERENCIAL_ALLOWED_HASHES.has(String(location.hash || ""))) {
    location.hash = "validar_rutas";
    toast("Rol GERENCIAL: acceso limitado a Validar Rutas y Envío de Equipo", "warn");
  }
});

window.addEventListener("popstate", () => {
  if (session?.rol === "GERENCIAL" && !GERENCIAL_ALLOWED_HASHES.has(String(location.hash || ""))) {
    history.pushState(null, null, "#validar_rutas");
    toast("Rol GERENCIAL: acceso limitado a Validar Rutas y Envío de Equipo", "warn");
  }
});

window.addEventListener('beforeunload', () => {
  cleanupAllDropdowns();
  clearPendingTimeouts();
});