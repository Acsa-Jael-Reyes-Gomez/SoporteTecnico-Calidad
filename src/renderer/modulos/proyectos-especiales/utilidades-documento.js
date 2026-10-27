(function() {
  const modulo = window.moduloProyectosEspeciales = window.moduloProyectosEspeciales || {};

  function esURLValida(url) {
    try {
      const u = new URL(String(url || "").trim());
      return !!u.protocol && !!u.host;
    } catch {
      return false;
    }
  }

  async function abrirDocumentoExterno(url) {
    try {
      const safeUrl = String(url || "").trim();

      if (!safeUrl) {
        toast("No hay documento disponible", "err");
        return;
      }

      if (!esURLValida(safeUrl)) {
        toast("El enlace del documento no es válido", "err");
        return;
      }

      const res = await window.api.open_external(safeUrl);
      if (!res?.ok) {
        throw new Error(res?.message || "No se pudo abrir el documento");
      }
    } catch (err) {
      toast(err?.message || "No se pudo abrir el documento", "err");
    }
  }

  function renderDocumentoProyectoControl(row, { compact = false } = {}) {
    const tieneDocumento = !!row?.tieneDocumento || !!row?.urlDocumento;
    const documentoBloqueado = !!row?.documentoBloqueado;

    if (!tieneDocumento) {
      return compact
        ? el("span", { class: "small", style: "color:var(--muted);" }, ["—"])
        : null;
    }

    if (documentoBloqueado) {
      return el("button", {
        class: `${compact ? "calif-eye-btn" : "btn small"} proyecto-doc-btn proyecto-doc-locked`,
        type: "button",
        title: "Documento bloqueado para técnico",
        disabled: true
      }, [el("i", { class: "fas fa-lock" }), compact ? "" : " Bloqueado"]);
    }

    return el("button", {
      class: `${compact ? "calif-eye-btn" : "btn small primary"} proyecto-doc-btn`,
      type: "button",
      title: "Ver documento"
    }, [el("i", { class: "fas fa-eye" }), compact ? "" : " Ver documento"]);
  }

  modulo.esURLValida = esURLValida;
  modulo.abrirDocumentoExterno = abrirDocumentoExterno;
  modulo.renderDocumentoProyectoControl = renderDocumentoProyectoControl;
})();
