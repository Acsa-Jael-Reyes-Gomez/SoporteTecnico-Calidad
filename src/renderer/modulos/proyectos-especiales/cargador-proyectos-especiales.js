// Cargador del módulo dinámico de proyectos especiales.

(() => {
  if (typeof window.renderProyectosEspecialesImpl !== "undefined") {
    window.__proyectosEspecialesReadyPromise = Promise.resolve();
    return;
  }

  if (window.__proyectosEspecialesReadyPromise) return;

  const archivos = [
    "./modulos/proyectos-especiales/utilidades-documento.js",
    "./modulos/proyectos-especiales/modales-proyectos-especiales.js",
    "./modulos/proyectos-especiales/vista-proyectos-especiales.js"
  ];

  function cargarArchivo(src) {
    return new Promise((resolve, reject) => {
      const existente = document.querySelector(`script[data-proyectos-especiales-chunk="${src}"]`);
      if (existente) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.proyectosEspecialesChunk = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(script);
    });
  }

  window.__proyectosEspecialesReadyPromise = (async () => {
    await Promise.all(archivos.map((src) => cargarArchivo(src)));
  })();
})();
