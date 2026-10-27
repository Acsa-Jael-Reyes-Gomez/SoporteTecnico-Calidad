function renderCalificacion(host) {
  host.innerHTML = "";
  cleanupAllDropdowns();
  host.classList.add("calif-module");

  // ✅ Validar permisos obligatorios
  if (!can("CALIFICACION_VIEW")) {
    host.innerHTML = '<div class="card" style="padding:40px;text-align:center"><i class="fas fa-lock" style="font-size:48px;color:var(--warn);margin-bottom:20px;"></i><h2 style="color:var(--text);">Sin acceso</h2><div class="small" style="color:var(--muted);">Requiere permiso CALIFICACION_VIEW</div></div>';
    return;
  }

  const info = el("div", { class: "small" }, ["Cargando pendientes..."]);
  let isLoadingTickets = false, isLoadingRutas = false, isLoadingProyectos = false;
  let currentTab = "tickets";
  const pendingCounts = { tickets: null, rutas: null, proyectos: null };
  const paginationState = {
    tickets: { page: 1, pageSize: 25, total: 0 },
    rutas: { page: 1, pageSize: 25, total: 0 },
    proyectos: { page: 1, pageSize: 25, total: 0 }
  };
  let btnCalificarTodos = null;

  const reloadAllTabs = () => {
    loadTab("tickets", { silent: currentTab !== "tickets" });
    loadTab("rutas", { silent: currentTab !== "rutas" });
    loadTab("proyectos", { silent: currentTab !== "proyectos" });
  };

  const resetAllTabPages = () => {
    Object.values(paginationState).forEach((state) => {
      state.page = 1;
    });
    reloadAllTabs();
  };

  // Switch tab
  const switchTab = (tabName) => {
    currentTab = tabName;
    document.querySelectorAll(".calif-tab").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".calif-tab-content").forEach(content => content.classList.remove("active"));
    const tabBtnEl = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtnEl) tabBtnEl.classList.add("active");
    const contentEl = document.querySelector(`.calif-tab-content[data-tab="${tabName}"]`);
    if (contentEl) {
      contentEl.classList.add("active");
      requestAnimationFrame(() => normalizeExcelTableHeaders(contentEl));
    }

    // "Calificar todos" solo aplica a Tickets y Rutas (no Proyectos)
    if (btnCalificarTodos) {
      btnCalificarTodos.style.display = tabName === "proyectos" ? "none" : "";
    }
    loadTab(tabName);
  };

  // Header
  const header = el("div", { class: "card module-standard-header" }, [
    el("div", { class: "titleRow" }, [
      el("div", {}, [
        el("div", { class: "h1" }, [el("i", { class: "fas fa-star" }), " Módulo Calificación"]),
        el("div", { class: "small" }, ["Tickets, Rutas y Proyectos"])
      ])
    ])
  ]);

  // Tabs
  const tabTicketsBtn = el("button", { 
    class: "calif-tab active", 
    "data-tab": "tickets",
    onclick: () => switchTab("tickets")
  }, [
    el("i", { class: "fas fa-ticket-alt" }), 
    el("span", { class: "tab-count" }, [" Tickets (0)"])
  ]);
  const tabRutasBtn = el("button", { 
    class: "calif-tab", 
    "data-tab": "rutas", 
    onclick: () => switchTab("rutas")
  }, [
    el("i", { class: "fas fa-route" }), 
    el("span", { class: "tab-count" }, [" Rutas (0)"])
  ]);
  const tabProyectosBtn = el("button", {
    class: "calif-tab",
    "data-tab": "proyectos",
    onclick: () => switchTab("proyectos"),
  }, [
    el("i", { class: "fas fa-project-diagram" }),
    el("span", { class: "tab-count" }, [" Proyectos (0)"])
  ]);
  const tabs = el("div", { class: "calif-tabs calif-tabs-compact" }, [tabTicketsBtn, tabRutasBtn, tabProyectosBtn]);

  // Filtros comunes
  const q = el("input", { type: "hidden", value: "" });

  const unidadFilter = createSearchableSelect(
    getSelectOptions(catalogos?.unidades || [], "idUnidad", "nombre"),
    "Todas las unidades",
    "",
    () => resetAllTabPages()
  );
  const tecnicoFilter = createSearchableSelect(
    catalogos?.tecnicos?.map(t => ({value: t.idUsuario, label: t.nombre})) || [],
    "Todos los técnicos",
    "",
    () => resetAllTabPages()
  );
  const defaultRange = getMonthlyRange();
  const defaultDesde = mysqlToDateValue(defaultRange.start);
  const defaultHasta = mysqlToDateValue(defaultRange.end);
  const desdeFilter = el("input", { type: "date", value: defaultDesde, onchange: () => resetAllTabPages() });
  const hastaFilter = el("input", { type: "date", value: defaultHasta, onchange: () => resetAllTabPages() });
  const btnLimpiar = el(
    "button",
    { class: "btn calif-btn-limpiar", onclick: () => clearFilters(), title: "Limpiar filtros" },
    [el("i", { class: "fas fa-broom" }), " Limpiar"]
  );
  btnCalificarTodos = el(
    "button",
    { class: "btn ok calif-btn-calificar-todos", onclick: () => calificarTodos() },
    [el("i", { class: "fas fa-check-double" }), " Calificar todos"]
  );

  const filterActions = el("div", { class: "calif-filter-actions" }, [
    btnLimpiar,
    btnCalificarTodos
  ].filter(Boolean));

  const filters = el("div", { class: "calif-filters calif-filters-compact row" }, [
    el("div", { class: "field" }, [el("label", {}, ["Unidad"]), unidadFilter]),
    el("div", { class: "field" }, [el("label", {}, ["Técnico"]), tecnicoFilter]),
    el("div", { class: "field mini" }, [el("label", {}, ["Desde"]), desdeFilter]),
    el("div", { class: "field mini" }, [el("label", {}, ["Hasta"]), hastaFilter]),
    filterActions
  ]);

  function clearFilters() {
    unidadFilter.clear?.();
    tecnicoFilter.clear?.();
    desdeFilter.value = defaultDesde;
    hastaFilter.value = defaultHasta;
    resetAllTabPages();
  }

  async function calificarTodos() {
    if (currentTab === "proyectos") {
      toast("Calificar todos no aplica para Proyectos.", "warn");
      return;
    }
    const isTickets = currentTab === "tickets";
    const endpoint = isTickets ? "tickets:calificarAll" : "rutas:calificarAll";
    const label = isTickets ? "tickets" : "rutas";

    const confirmed = await confirmModal(
      "Calificar todos",
      `¿Deseas calificar TODOS los ${label} pendientes con los filtros actuales?`,
      "info"
    );
    if (!confirmed) return;

    try {
      const filtros = {
        q: q.value ? q.value.trim() : null,
        idEstadoCalificacion: 0,
        ...(isTickets ? {} : { idEstadoValidacion: 1 }),
        idUnidad: unidadFilter.value === "" ? null : Number(unidadFilter.value),
        idTecnico: tecnicoFilter.value === "" ? null : Number(tecnicoFilter.value),
        desde: desdeFilter.value ? dateToMysqlStartOfDay(desdeFilter.value) : null,
        hasta: hastaFilter.value ? dateToMysqlEndOfDay(hastaFilter.value) : null
      };

      const apiFn = window.api[endpoint];
      if (typeof apiFn !== "function") throw new Error(`Falta API: ${endpoint}`);

      const res = await apiFn(session, filtros);
      if (!res?.ok) throw new Error(res?.message || "Error calificando todos.");

      const n = Number(res?.affectedRows || 0);
      toast(`✅ ${n} ${label} calificados`, "ok");
      reloadAllTabs();
    } catch (err) {
      toast(err, "err");
    }
  }

  // Tab Tickets
  const ticketsContent = el("div", { class: "calif-tab-content calif-tab-content-compact active", "data-tab": "tickets" }, [
    el("div", { class: "tableWrap module-table tickets-excel" }, [
      el("table", { class: "calif-table" }, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, compactIdHeader("fas fa-ticket-alt", "N. Ticket", "TK", true)),
          el("th", { title: "Solicitante" }, [tableHeadLabel("fas fa-user", "Solicitante")]),
          el("th", { title: "Puesto" }, [tableHeadLabel("fas fa-briefcase", "Puesto")]),
          el("th", { title: "Unidad" }, [tableHeadLabel("fas fa-building", "Unidad")]),
          el("th", { title: "Servicio" }, [tableHeadLabel("fas fa-cog", "Servicio")]),
          el("th", { title: "Solución" }, [tableHeadLabel("fas fa-file-alt", "Solución")]),
          el("th", { title: "Complejidad" }, [tableHeadLabel("fas fa-layer-group", "Complejidad")]),
          el("th", { title: "Fecha apertura" }, [tableHeadLabel("fas fa-calendar-plus", "Fecha apertura", "Fecha")]),
          el("th", { title: "Calificar" }, [tableHeadLabel("fas fa-check", "Calificar", "Calif.")])
        ])),
        el("tbody", { id: "ticketsTableBody" }, [])
      ])
    ])
  ]);

  // Tab Rutas  
  const rutasContent = el("div", { class: "calif-tab-content calif-tab-content-compact", "data-tab": "rutas" }, [
    el("div", { class: "tableWrap module-table rutas-excel" }, [
      el("table", { class: "calif-table" }, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, compactIdHeader("fas fa-route", "N. Ruta", "TR", true)),
          el("th", { title: "Fecha Validación" }, [tableHeadLabel("fas fa-calendar-check", "Fecha Validación", "F. Validación")]),
          el("th", { title: "Nombre Validador" }, [tableHeadLabel("fas fa-user-check", "Nombre Validador", "Validador")]),
          el("th", { title: "Puesto Validador" }, [tableHeadLabel("fas fa-briefcase", "Puesto Validador", "Puesto")]),
          el("th", { title: "Unidad" }, [tableHeadLabel("fas fa-building", "Unidad")]),
          el("th", { title: "Clasificación" }, [tableHeadLabel("fas fa-tag", "Clasificación")]),
          el("th", { title: "Técnicos" }, [tableHeadLabel("fas fa-users", "Técnicos")]),
          el("th", { title: "Observación" }, [tableHeadLabel("fas fa-eye", "Observación", "Obs.")]),
          el("th", { title: "Calificar" }, [tableHeadLabel("fas fa-check", "Calificar", "Calif.")])
        ])),
        el("tbody", { id: "rutasTableBody" }, [])
      ])
    ])
  ]);

  // Tab Proyectos Especiales (Aprobación)
  const proyectosContent = el("div", { class: "calif-tab-content calif-tab-content-compact", "data-tab": "proyectos" }, [
    el("div", { class: "tableWrap module-table proyectos-excel" }, [
      el("table", { class: "calif-table" }, [
        el("thead", {}, el("tr", {}, [
          el("th", { title: "Título" }, [tableHeadLabel("fas fa-heading", "Título")]),
          el("th", { title: "Unidad" }, [tableHeadLabel("fas fa-building", "Unidad")]),
          el("th", { title: "Descripción" }, [tableHeadLabel("fas fa-align-left", "Descripción")]),
          el("th", { title: "Link Documento" }, [tableHeadLabel("fas fa-link", "Link Documento", "Documento")]),
          el("th", { title: "Participantes" }, [tableHeadLabel("fas fa-users", "Participantes")]),
          el("th", { title: "Aprobar" }, [tableHeadLabel("fas fa-check", "Aprobar")])
        ])),
        el("tbody", { id: "proyectosTableBody" }, [])
      ])
    ])
  ]);

  // Info loading
  const infoEl = el("div", { class: "calif-info-line", style: "text-align:center; color:var(--muted);" }, ["Cargando pendientes de calificación..."]);

  function setupCalifTableShell(tabContent) {
    const tableWrap = tabContent?.querySelector?.(".tableWrap");
    const table = tableWrap?.querySelector?.("table");
    if (!tableWrap || !table || tableWrap.querySelector(".table-scroll")) return;

    const tableScroll = el("div", { class: "table-scroll" }, []);
    const tableFooter = el("div", { class: "table-footer-host" }, []);
    tableWrap.classList.add("has-footer");
    table.replaceWith(tableScroll);
    tableScroll.appendChild(table);
    tableWrap.appendChild(tableFooter);
  }

  [ticketsContent, rutasContent, proyectosContent].forEach(setupCalifTableShell);

  // Montaje
  host.appendChild(header);
  host.appendChild(tabs);
  host.appendChild(filters);
  host.appendChild(ticketsContent);
  host.appendChild(rutasContent);
  host.appendChild(proyectosContent);
  host.appendChild(infoEl);
  normalizeExcelTableHeaders(host);

  // =========================
  // Complejidad (tickets)
  // =========================
  function normalizeComplexityKey(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .toUpperCase();
  }

  function getComplexityPreset(key) {
    if (key.includes("BASICO")) return { letter: "B", cls: "basico" };
    if (key.includes("INTERMEDIO")) return { letter: "I", cls: "intermedio" };
    if (key.includes("COMPLEJO")) return { letter: "C", cls: "complejo" };
    if (key.includes("EXTRAORDINARIO")) return { letter: "E", cls: "extraordinario" };
    return null;
  }

  function getComplexityCatalog() {
    const rows = Array.isArray(catalogos?.des_clasificaciones) ? catalogos.des_clasificaciones : [];
    const order = ["BASICO", "INTERMEDIO", "COMPLEJO", "EXTRAORDINARIO"];
    const items = rows
      .map((row) => {
        const id = Number(row?.idClasificacion || 0);
        const name = String(row?.nombre || "").trim();
        const key = normalizeComplexityKey(name);
        const preset = getComplexityPreset(key);
        if (!id || !preset) return null;
        return { id, key, name: name || key, letter: preset.letter, cls: preset.cls };
      })
      .filter(Boolean);

    items.sort((a, b) => {
      const left = order.indexOf(a.key);
      const right = order.indexOf(b.key);
      return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
    });

    return items;
  }

  function getComplexityMeta(idClasificacion, fallbackName) {
    const id = Number(idClasificacion || 0);
    const meta = getComplexityCatalog().find((item) => item.id === id) || null;
    if (meta) return meta;

    const fallback = String(fallbackName || "").trim();
    const fallbackKey = normalizeComplexityKey(fallback);
    const preset = getComplexityPreset(fallbackKey);
    if (preset) {
      return { id, key: fallbackKey, name: fallback || fallbackKey, letter: preset.letter, cls: preset.cls };
    }

    return { id, key: "", name: fallback || "—", letter: "—", cls: "basico" };
  }

  let complexityFloatingMenu = null;

  function closeComplexityFloatingMenu() {
    if (!complexityFloatingMenu) return;
    const { menu, onDocumentPointerDown, onWindowChange } = complexityFloatingMenu;
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    window.removeEventListener("resize", onWindowChange, true);
    window.removeEventListener("scroll", onWindowChange, true);
    menu.remove();
    complexityFloatingMenu = null;
  }

  function positionComplexityFloatingMenu(anchor, menu) {
    const rect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gap = 6;
    const topBelow = rect.bottom + gap;
    const topAbove = rect.top - menuRect.height - gap;
    const top = topBelow + menuRect.height <= window.innerHeight - 8
      ? topBelow
      : Math.max(8, topAbove);
    const left = Math.min(
      Math.max(8, rect.left + (rect.width / 2) - (menuRect.width / 2)),
      Math.max(8, window.innerWidth - menuRect.width - 8)
    );
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  function openComplexityFloatingMenu(anchor, row, rowId, tabName, canCalif) {
    closeComplexityFloatingMenu();
    if (!canCalif) return;

    const options = getComplexityCatalog().filter((c) => Number(row.idClasificacion) !== c.id);
    if (!options.length) return;

    const menu = el("div", { class: "calif-ticket-complexity-menu", role: "menu" }, options.map((c) =>
      el("button", {
        type: "button",
        class: `complexity-chip calif-ticket-complexity-menu-option ${c.cls}`,
        title: c.name,
        role: "menuitem",
        onclick: async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          try {
            closeComplexityFloatingMenu();
            const apiFn = window.api["tickets:setClasificacion"];
            if (typeof apiFn !== "function") {
              throw new Error("Falta API: tickets:setClasificacion");
            }
            const resSet = await apiFn(session, rowId, c.id);
            if (resSet?.ok) {
              toast(`Complejidad actualizada a ${c.name}`, "ok");
              loadTab(tabName);
            } else {
              throw new Error(resSet?.message || "Error actualizando complejidad");
            }
          } catch (e) {
            toast(e?.message || "Error actualizando complejidad", "err");
          }
        }
      }, [c.letter])
    ));

    document.body.appendChild(menu);
    positionComplexityFloatingMenu(anchor, menu);
    requestAnimationFrame(() => menu.classList.add("show"));

    const onDocumentPointerDown = (event) => {
      if (menu.contains(event.target) || anchor.contains(event.target)) return;
      closeComplexityFloatingMenu();
    };
    const onWindowChange = () => closeComplexityFloatingMenu();
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    window.addEventListener("resize", onWindowChange, true);
    window.addEventListener("scroll", onWindowChange, true);
    complexityFloatingMenu = { menu, onDocumentPointerDown, onWindowChange };
  }

  // Carga dinámica por tab
  async function loadTab(tabName, options = {}) {
    closeComplexityFloatingMenu();
    const silent = !!options.silent;
    const isTickets = tabName === "tickets";
    const isRutas = tabName === "rutas";
    const isProyectos = tabName === "proyectos";

    let endpoint = null;
    let tbodyId;

    if (isTickets) {
      endpoint = "tickets:list";
      tbodyId = "ticketsTableBody";
    } else if (isRutas) {
      endpoint = "rutas:list";
      tbodyId = "rutasTableBody";
    } else if (isProyectos) {
      tbodyId = "proyectosTableBody";
    } else {
      return;
    }
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);

    if (isTickets) {
      if (isLoadingTickets) return;
      isLoadingTickets = true;
    } else if (isRutas) {
      if (isLoadingRutas) return;
      isLoadingRutas = true;
    } else {
      if (isLoadingProyectos) return;
      isLoadingProyectos = true;
    }

    if (!silent) {
      infoEl.textContent = `Cargando ${tabName.toUpperCase()} pendientes...`;
    }

    try {
      let data = [];
      const pageState = paginationState[tabName] || { page: 1, pageSize: 25, total: 0 };
      let responsePage = pageState.page;
      let responsePageSize = pageState.pageSize;
      let responseTotal = 0;

      if (isProyectos) {
        // Proyectos especiales: el backend espera fechas "YYYY-MM-DD" (agrega 00:00:00/23:59:59 internamente)
        const filtrosPE = {
          q: q.value ? q.value.trim() : null,
          estadoRevision: "PENDIENTE",
          idUnidad: unidadFilter.value === "" ? null : Number(unidadFilter.value),
          desde: desdeFilter.value || null,
          hasta: hastaFilter.value || null,
          orden: "ASC",
          page: pageState.page,
          pageSize: pageState.pageSize
        };

        const resPe = await window.api.proyectos_especiales_list(session, filtrosPE);
        if (!resPe?.ok) throw new Error(resPe?.message || "Error cargando proyectos");
        data = Array.isArray(resPe.data) ? resPe.data : [];
        responsePage = Number(resPe.page || pageState.page || 1);
        responsePageSize = Number(resPe.pageSize || pageState.pageSize || 25);
        responseTotal = Number(resPe.total || 0);
      } else {
        const filtros = {
          q: q.value ? q.value.trim() : null,
          idEstadoCalificacion: 0, // ✅ Solo pendientes
          ...(isTickets ? {} : { idEstadoValidacion: 1 }),
          idUnidad: unidadFilter.value === "" ? null : Number(unidadFilter.value),
          idTecnico: tecnicoFilter.value === "" ? null : Number(tecnicoFilter.value),
          desde: desdeFilter.value ? dateToMysqlStartOfDay(desdeFilter.value) : null,
          hasta: hastaFilter.value ? dateToMysqlEndOfDay(hastaFilter.value) : null,
          orden: "ASC",
          page: pageState.page,
          pageSize: pageState.pageSize
        };

        const res = await window.api[endpoint](session, filtros);
        if (!res?.ok) throw new Error(res?.message || "Error cargando");
        data = Array.isArray(res.data) ? res.data : [];
        responsePage = Number(res.page || pageState.page || 1);
        responsePageSize = Number(res.pageSize || pageState.pageSize || 25);
        responseTotal = Number(res.total || 0);
      }

      pageState.page = responsePage;
      pageState.pageSize = responsePageSize;
      pageState.total = responseTotal;
       
      // Actualizar contador tab
      pendingCounts[tabName] = responseTotal;
      if (tabBtn) {
        const countSpan = tabBtn.querySelector('.tab-count');
        if (countSpan) countSpan.textContent = ` ${tabName.toUpperCase()} (${responseTotal})`;
      }

      // Render tabla
      const tbody = document.getElementById(tbodyId);
      tbody.innerHTML = "";
      data.forEach((row) => {
        if (isProyectos) {
          const idProyecto = Number(row.idProyectoEspecial);
          const titulo = row.titulo || "—";
          const unidad = row.unidadNombre || "—";
          const descripcion = row.descripcion ? String(row.descripcion) : "—";
          const participantesTxt = Array.isArray(row.participantes) && row.participantes.length
            ? row.participantes.map((p) => p.nombre).join(", ")
            : "—";

          const btnDoc = row.urlDocumento
            ? el("button", {
                class: "calif-eye-btn calif-doc-btn",
                type: "button",
                title: "Abrir documento",
                onclick: async () => {
                  try {
                    const safeUrl = String(row.urlDocumento || "").trim();
                    if (!safeUrl) {
                      toast("No hay documento disponible", "err");
                      return;
                    }
                    const resOpen = await window.api.open_external(safeUrl);
                    if (!resOpen?.ok) throw new Error(resOpen?.message || "No se pudo abrir el documento");
                  } catch (e) {
                    toast(e?.message || "No se pudo abrir el documento", "err");
                  }
                }
              }, [el("i", { class: "fas fa-eye" })])
            : el("span", { class: "small", style: "color:var(--muted);" }, ["—"]);

          const canApprove = session?.rol === "ADMIN" && can("PROYECTOS_ESPECIALES_REVIEW");
          const btnApprove = el("button", {
            class: "calif-approve-btn calif-approve-action",
            type: "button",
            disabled: !canApprove,
            title: canApprove ? "Aprobar proyecto" : "Sin permiso PROYECTOS_ESPECIALES_REVIEW"
          }, [el("i", { class: "fas fa-circle-check" })]);

          btnApprove.addEventListener("click", async () => {
            if (!canApprove) return;
            try {
              btnApprove.disabled = true;
              const resAp = await window.api.proyectos_especiales_approve(session, idProyecto);
              if (!resAp?.ok) throw new Error(resAp?.message || "Error aprobando proyecto");
              toast("✅ Proyecto aprobado", "ok");
              reloadAllTabs();
            } catch (e) {
              toast(e?.message || "Error aprobando proyecto", "err");
              btnApprove.disabled = false;
            }
          });

          const tr = el("tr", {}, [
            el("td", { class: "wrap" }, [String(titulo)]),
            el("td", {}, [String(unidad)]),
            el("td", { class: "wrap small", title: descripcion }, [descripcion]),
            el("td", {}, [btnDoc]),
            el("td", { class: "wrap small" }, [participantesTxt]),
            el("td", {}, [btnApprove])
          ]);
          tbody.appendChild(tr);
          return;
        }

        const rowId = row.idTicket || row.idRuta;

        if (isTickets) {
          const canCalif = can("CALIFICACION_TICKETS");
          const califBlockReason = getTicketCalificacionBlockReason(row);
          const meta = getComplexityMeta(row.idClasificacion, row.clasificacion);
          const solutionText = String(row.solucion || "").trim() || "Sin solución registrada.";
          // Complejidad (display compacto + edición bajo demanda)
          const complexityCurrent = el("div", { class: "calif-ticket-complexity-summary" }, [
            el("div", { class: "calif-ticket-complexity-current" }, [
              el("div", { class: `complexity-chip calif-ticket-complexity-current-chip ${meta.cls}`, title: meta.name }, [meta.letter])
            ]),
            el("button", {
              type: "button",
              class: "calif-ticket-complexity-edit",
              title: canCalif ? "Cambiar complejidad" : "Sin permiso CALIFICACION_TICKETS",
              disabled: !canCalif,
              onclick: (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (!canCalif) return;
                openComplexityFloatingMenu(ev.currentTarget, row, rowId, tabName, canCalif);
              }
            }, [el("i", { class: "fas fa-pen" })])
          ]);

          const complexityCell = el("div", { class: "calif-ticket-complexity-cell" }, [complexityCurrent]);

          const solutionCell = el("div", {
            class: `calif-ticket-solution-text${row.solucion ? "" : " is-empty"}`,
            title: solutionText
          }, [solutionText]);

          // Calificar (checkbox)
          const chk = el("input", {
            type: "checkbox",
            class: `calif-checkbox${califBlockReason ? " is-blocked" : ""}`,
            disabled: !canCalif,
            title: !canCalif
              ? "Sin permiso CALIFICACION_TICKETS"
              : (califBlockReason || "Marcar como calificado")
          });
          chk.addEventListener("change", async () => {
            if (!chk.checked) return;
            if (califBlockReason) {
              chk.checked = false;
              toast(califBlockReason, "warn");
              return;
            }
            try {
              const resCalif = await window.api["tickets:calificar"](session, rowId);
              if (resCalif?.ok) {
                toast(`✅ Ticket ${rowId} calificado`, "ok");
                reloadAllTabs();
              } else {
                chk.checked = false;
                toast(resCalif?.message || "Error calificando", "err");
              }
            } catch (err) {
              chk.checked = false;
              toast(err, "err");
            }
          });

          const tr = el("tr", {}, [
            el("td", { class: "mono bold" }, [`TK-${rowId}`]),
            el("td", {}, [row.nombreSolicitante || "—"]),
            el("td", {}, [row.puestoSolicitante || "—"]),
            el("td", {}, [row.unidad || "—"]),
            el("td", {}, [row.servicio || "—"]),
            el("td", { class: "wrap calif-ticket-solution-cell" }, [solutionCell]),
            el("td", { class: "calif-ticket-complexity-td" }, [complexityCell]),
            el("td", { class: "mono" }, [formatDate(row.fechaApertura)]),
            el("td", {}, [chk])
          ]);

          tbody.appendChild(tr);
          return;
        }

        // Rutas: solo VALIDADO + pendiente de calificacion (idEstadoValidacion=1, idEstadoCalificacion=0)
        const tecnicos = (row.participantes || []).map((t) => t.nombre).join(", ");

        const clasificacionText = row.tipoTexto || row.tipo || "—";
        const clasificacionKey = String(clasificacionText || "").toUpperCase();
        const clasificacionCls =
          clasificacionKey.includes("CERCANA") ? "cercana" :
          clasificacionKey.includes("INTERMEDIA") ? "intermedia" :
          clasificacionKey.includes("LEJANA") ? "lejana" :
          "neutral";

        const clasificacionPill = el(
          "span",
          { class: `ruta-clasif-pill ${clasificacionCls}` },
          [clasificacionText]
        );

        const btnObs = el("button", {
          type: "button",
          class: "calif-eye-btn",
          title: "Ver observaciones",
          onclick: () => {
            openReadOnlyDetailModal({
              title: `Observaciones Ruta #${rowId}`,
              kind: "Observaciones",
              contextItems: [
                `Ruta #${rowId}`,
                row.unidad || "Unidad no disponible",
                row.tipoTexto || row.tipo || "Clasificación no disponible"
              ],
              content: row.observaciones || "",
              emptyText: "Sin observaciones registradas."
            });
          }
        }, [el("i", { class: "fas fa-eye" })]);

        const canCalif = can("CALIFICACION_RUTAS");
        const chk = el("input", {
          type: "checkbox",
          class: "calif-checkbox",
          disabled: !canCalif,
          title: canCalif ? "Marcar como calificada" : "Sin permiso CALIFICACION_RUTAS"
        });
        chk.addEventListener("change", async () => {
          if (!chk.checked) return;
          try {
            const resCalif = await window.api["rutas:calificar"](session, rowId);
            if (resCalif?.ok) {
              toast(`✅ Ruta ${rowId} calificada`, "ok");
              reloadAllTabs();
            } else {
              chk.checked = false;
              toast(resCalif?.message || "Error calificando", "err");
            }
          } catch (err) {
            chk.checked = false;
            toast(err, "err");
          }
        });

        const tr = el("tr", {}, [
          el("td", { class: "mono bold" }, [`TR-${rowId}`]),
          el("td", { class: "mono" }, [formatDate(row.fechaValidacion)]),
          el("td", {}, [row.nombreValidador || "—"]),
          el("td", {}, [row.puestoValidador || "—"]),
          el("td", {}, [row.unidad || "—"]),
          el("td", {}, [clasificacionPill]),
          el("td", { class: "wrap small" }, [tecnicos || "—"]),
          el("td", {}, [btnObs]),
          el("td", {}, [chk])
        ]);
        tbody.appendChild(tr);
      });

      const tableWrap = tbody.closest(".tableWrap");
      const tableFooter = tableWrap?.querySelector?.(".table-footer-host");
      if (tableFooter) {
        tableFooter.innerHTML = "";
        tableFooter.appendChild(createTableFooterBar({
          page: pageState.page,
          pageSize: pageState.pageSize,
          total: pageState.total,
          onPageChange: (nextPage) => {
            if (
              nextPage === pageState.page ||
              (isTickets && isLoadingTickets) ||
              (isRutas && isLoadingRutas) ||
              (isProyectos && isLoadingProyectos)
            ) return;
            pageState.page = nextPage;
            loadTab(tabName);
          },
          onPageSizeChange: (nextPageSize) => {
            if (
              nextPageSize === pageState.pageSize ||
              (isTickets && isLoadingTickets) ||
              (isRutas && isLoadingRutas) ||
              (isProyectos && isLoadingProyectos)
            ) return;
            pageState.pageSize = nextPageSize;
            pageState.page = 1;
            loadTab(tabName);
          }
        }));
      }
      normalizeExcelTableHeaders(tableWrap || tbody.closest(".calif-tab-content") || host);

      if (!silent) {
        infoEl.textContent = isProyectos
          ? `${responseTotal} proyectos pendientes de aprobación`
          : `${responseTotal} registros pendientes de calificación`;
      }
    } catch (err) {
      pendingCounts[tabName] = null;
      if (!silent) {
        infoEl.textContent = "Error: " + getUserErrorMessage(err, "Error desconocido.");
      }
    } finally {
      if (isTickets) {
        isLoadingTickets = false;
      } else if (isRutas) {
        isLoadingRutas = false;
      } else if (isProyectos) {
        isLoadingProyectos = false;
      }
    }
  }

  // Carga inicial Tickets
  reloadAllTabs();
}


function renderDashboard(host) {
  host.innerHTML = "";

  const info = el("div", { class: "dashboardInfo small" }, ["Cargando datos del dashboard..."]);
  const dashboardWrap = el("div", { class: "dashboardWrap" }, []);
  const refs = {};

  function ref(name, node) {
    refs[name] = node;
    return node;
  }

  function numberValue(value) {
    return Number(value || 0);
  }

  function initials(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return "??";
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function loadLevel(percent) {
    if (percent >= 90) return "over";
    if (percent >= 70) return "high";
    if (percent >= 50) return "medium";
    return "low";
  }

  function makeMetricCard(type, icon, label, refName) {
    return el("div", { class: "dashboardMetricCard " + type }, [
      el("div", { class: "dashboardMetricIcon" }, [el("i", { class: icon })]),
      el("div", { class: "dashboardMetricContent" }, [
        el("div", { class: "dashboardMetricTitle" }, [label]),
        ref(refName, el("div", { class: "dashboardMetricValue" }, ["0"]))
      ])
    ]);
  }

  const metricCards = el("div", { class: "dashboardMetricGrid" }, [
    makeMetricCard("tickets", "fas fa-ticket-alt", "Tickets abiertos", "ticketsAbiertos"),
    makeMetricCard("pending", "fas fa-clock", "Pendientes de calificar", "ticketsPendientesCalificar"),
    makeMetricCard("closed", "fas fa-check", "Rutas cerradas", "rutasPendientesCalificar"),
    makeMetricCard("tools", "fas fa-tools", "Equipos en taller", "equiposTaller"),
    makeMetricCard("routes", "fas fa-map-marker-alt", "Rutas abiertas", "rutasAbiertas"),
    makeMetricCard("projects", "far fa-folder", "Proyectos pendientes", "proyectosPendientes")
  ]);

  const searchInput = ref("search", el("input", {
    type: "text",
    class: "dashboardSearch",
    placeholder: "Buscar técnico..."
  }));

  const techTableBody = ref("techTableBody", el("tbody", {}, []));
  const followTableBody = ref("followTableBody", el("tbody", {}, []));

  const workloadSection = el("section", { class: "dashboardPanel dashboardPanelWorkload" }, [
    el("div", { class: "dashboardPanelHead" }, [
      el("div", {}, [
        el("h3", { class: "dashboardPanelTitle" }, ["Carga de trabajo por técnico"]),
        el("p", { class: "dashboardPanelSub" }, ["Volumen activo según tickets, rutas y equipos en taller"])
      ]),
      searchInput
    ]),
    el("div", { class: "dashboardTableWrap" }, [
      el("table", { class: "dashboardTechTable" }, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", {}, ["Técnico"]),
            el("th", {}, ["Tickets"]),
            el("th", {}, ["Rutas abiertas"]),
            el("th", {}, ["Equipos en taller"]),
            el("th", {}, ["Carga"])
          ])
        ]),
        techTableBody
      ])
    ]),
    el("div", { class: "dashboardLegend" }, [
      el("span", { class: "legendItem low" }, ["Baja (0-49%)"]),
      el("span", { class: "legendItem medium" }, ["Media (50-69%)"]),
      el("span", { class: "legendItem high" }, ["Alta (70-89%)"]),
      el("span", { class: "legendItem over" }, ["Sobrecargado (90%+)"])
    ])
  ]);

  const followSection = el("section", { class: "dashboardPanel dashboardPanelFollow" }, [
    el("div", { class: "dashboardPanelHead" }, [
      el("div", {}, [
        el("h3", { class: "dashboardPanelTitle" }, ["Tickets que requieren atención"]),
        el("p", { class: "dashboardPanelSub" }, ["Tickets abiertos con más de 7 días"])
      ]),
      ref("followTotal", el("button", {
        type: "button",
        class: "dashboardLinkText"
      }, ["Ver todos (0)"]))
    ]),
    el("div", { class: "dashboardTableWrap" }, [
      el("table", { class: "dashboardFollowTable" }, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", {}, ["Ticket"]),
            el("th", {}, ["Técnico"]),
            el("th", {}, ["Días"]),
            el("th", {}, ["Prioridad"])
          ])
        ]),
        followTableBody
      ])
    ])
  ]);

  const chartsRow = el("div", { class: "dashboardChartsGrid" }, [
    el("section", { class: "dashboardPanel dashboardChartCard" }, [
      el("h3", { class: "dashboardPanelTitle" }, ["Tickets por estado"]),
      el("div", { class: "dashboardDonutLayout" }, [
        ref("ticketDonut", el("div", { class: "dashboardDonut" }, [
          el("span", {}, ["Total"]),
          ref("ticketTotal", el("strong", {}, ["0"]))
        ])),
        ref("ticketLegend", el("div", { class: "dashboardChartLegend" }, []))
      ])
    ]),
    el("section", { class: "dashboardPanel dashboardChartCard" }, [
      el("h3", { class: "dashboardPanelTitle" }, ["Tareas por tipo"]),
      el("div", { class: "dashboardDonutLayout" }, [
        ref("taskDonut", el("div", { class: "dashboardDonut" }, [
          el("span", {}, ["Total"]),
          ref("taskTotal", el("strong", {}, ["0"]))
        ])),
        ref("taskLegend", el("div", { class: "dashboardChartLegend taskTypesLegend" }, []))
      ])
    ]),
    el("section", { class: "dashboardPanel dashboardDistribution" }, [
      el("h3", { class: "dashboardPanelTitle" }, ["Distribución de carga"]),
      el("div", { class: "dashboardDistributionStats" }, [
        el("div", {}, [ref("distOver", el("strong", {}, ["0"])), el("span", {}, ["Sobrecargados"])]),
        el("div", {}, [ref("distHigh", el("strong", {}, ["0"])), el("span", {}, ["Alta carga"])]),
        el("div", {}, [ref("distMedium", el("strong", {}, ["0"])), el("span", {}, ["Media carga"])]),
        el("div", {}, [ref("distLow", el("strong", {}, ["0"])), el("span", {}, ["Baja carga"])])
      ]),
      ref("distributionBar", el("div", { class: "dashboardDistributionBar" }, [])),
      ref("activeTechs", el("div", { class: "dashboardDistributionTotal" }, ["0 técnicos activos"]))
    ])
  ]);

  const alertsRow = el("section", { class: "dashboardPanel dashboardAlerts" }, [
    el("h3", { class: "dashboardPanelTitle" }, ["Alertas importantes"]),
    el("div", { class: "dashboardAlertGrid" }, [
      ref("alertTickets", el("div", { class: "dashboardAlert danger" }, [])),
      ref("alertUnassigned", el("div", { class: "dashboardAlert warn" }, [])),
      ref("alertEquipos", el("div", { class: "dashboardAlert orange" }, [])),
      ref("alertProyectos", el("div", { class: "dashboardAlert info" }, []))
    ])
  ]);

  dashboardWrap.appendChild(metricCards);
  dashboardWrap.appendChild(el("div", { class: "dashboardMainGrid" }, [workloadSection, followSection]));
  dashboardWrap.appendChild(chartsRow);
  dashboardWrap.appendChild(alertsRow);
  host.appendChild(dashboardWrap);
  host.appendChild(info);

  function setLegend(container, items, total) {
    container.innerHTML = "";
    items.forEach(item => {
      const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
      container.appendChild(el("div", { class: "dashboardLegendRow " + item.type }, [
        el("span", {}, [item.label]),
        el("strong", {}, [item.value + " (" + percent + "%)"])
      ]));
    });
  }

  function setAlert(container, icon, title, subtitle) {
    container.innerHTML = "";
    container.appendChild(el("i", { class: icon }));
    container.appendChild(el("div", {}, [
      el("strong", {}, [title]),
      el("span", {}, [subtitle])
    ]));
  }

  async function loadDashboard() {
    try {
      info.textContent = "Cargando datos...";
      const result = await window.api.dashboard_operacion_mensual(session);

      if (!result || !result.ok) {
        const message = getUserErrorMessage(result?.message, "No se pudo cargar el panel.");
        info.textContent = "Error: " + message;
        toast(message, "err");
        return;
      }

      const data = result.data || {};
      const resumen = data.resumen || {};
      const tecnicos = Array.isArray(data.tecnicos) ? data.tecnicos : [];
      const ticketsSeguimiento = Array.isArray(data.ticketsSeguimiento) ? data.ticketsSeguimiento : [];

      const ticketOpen = numberValue(resumen.ticketsAbiertos);
      const ticketPending = numberValue(resumen.ticketsPendientesCalificar);
      const rutasOpen = numberValue(resumen.rutasAbiertas);
      const rutasPending = numberValue(resumen.rutasPendientesCalificar);
      const equiposTaller = numberValue(resumen.equiposTaller);
      const equiposPrioridad = numberValue(resumen.equiposPrioridad);
      const proyectosPendientes = numberValue(resumen.proyectosPendientes);

      refs.ticketsAbiertos.textContent = String(ticketOpen);
      refs.ticketsPendientesCalificar.textContent = String(ticketPending);
      refs.rutasPendientesCalificar.textContent = String(rutasPending);
      refs.equiposTaller.textContent = String(equiposTaller);
      refs.rutasAbiertas.textContent = String(rutasOpen);
      refs.proyectosPendientes.textContent = String(proyectosPendientes);

      const cargas = tecnicos.map(tec => ({
        ...tec,
        ticketsAbiertos: numberValue(tec.ticketsAbiertos),
        rutasAbiertas: numberValue(tec.rutasAbiertas),
        equiposTaller: numberValue(tec.equiposTaller),
        atrasados: numberValue(tec.atrasados)
      })).map(tec => ({
        ...tec,
        cargaTotal: tec.ticketsAbiertos + tec.rutasAbiertas + tec.equiposTaller
      }));

      const maxCarga = Math.max(15, ...cargas.map(tec => tec.cargaTotal));
      const sortedTecnicos = cargas
        .filter(tec => tec.cargaTotal > 0 || tec.atrasados > 0)
        .sort((a, b) => (b.atrasados - a.atrasados) || (b.cargaTotal - a.cargaTotal) || String(a.nombre || "").localeCompare(String(b.nombre || "")));

      function renderTechRows(list) {
        refs.techTableBody.innerHTML = "";
        if (!list.length) {
          refs.techTableBody.appendChild(el("tr", {}, [
            el("td", { colspan: "5", class: "dashboardEmpty" }, ["No hay técnicos con carga activa"])
          ]));
          return;
        }

        list.forEach(tec => {
          const percent = Math.min(100, Math.round((tec.cargaTotal / maxCarga) * 100));
          const level = loadLevel(percent);
          refs.techTableBody.appendChild(el("tr", {}, [
            el("td", {}, [
              el("div", { class: "tech-cell-wrap" }, [
                el("div", { class: "tech-avatar" }, [initials(tec.nombre)]),
                el("div", { class: "tech-info" }, [
                  el("div", { class: "tech-name" }, [tec.nombre || "Sin nombre"])
                ])
              ])
            ]),
            el("td", {}, [el("span", { class: "load-number-small" }, [String(tec.ticketsAbiertos)])]),
            el("td", {}, [el("span", { class: "load-number-small" }, [String(tec.rutasAbiertas)])]),
            el("td", {}, [el("span", { class: "load-number-small" }, [String(tec.equiposTaller)])]),
            el("td", { class: "load-cell" }, [
              el("div", { class: "load-bar-wrap" }, [
                el("div", { class: "load-bar" }, [
                  el("div", { class: "load-fill " + level, style: "width:" + percent + "%" })
                ]),
                el("span", { class: "load-percent " + level }, [percent + "%"])
              ])
            ])
          ]));
        });
      }

      renderTechRows(sortedTecnicos);
      refs.search.addEventListener("input", () => {
        const query = refs.search.value.toLowerCase().trim();
        renderTechRows(query ? sortedTecnicos.filter(tec => String(tec.nombre || "").toLowerCase().includes(query)) : sortedTecnicos);
      });

      let showAllTickets = false;

      function renderFollowRows() {
        refs.followTableBody.innerHTML = "";
        if (!ticketsSeguimiento.length) {
          refs.followTableBody.appendChild(el("tr", {}, [
            el("td", { colspan: "4", class: "dashboardEmpty" }, ["Sin tickets pendientes de seguimiento"])
          ]));
          refs.followTotal.hidden = true;
          return;
        }

        const visibleTickets = showAllTickets ? ticketsSeguimiento : ticketsSeguimiento.slice(0, 10);
        visibleTickets.forEach(item => {
          const dias = numberValue(item.dias);
          refs.followTableBody.appendChild(el("tr", {}, [
            el("td", {}, [el("strong", { class: "dashboardTicketCode" }, ["#" + item.idTicket])]),
            el("td", {}, [item.tecnico || "—"]),
            el("td", {}, [el("span", { class: "dashboardDaysBadge" }, ["+" + dias + " días"])]),
            el("td", {}, [el("span", { class: "dashboardPriorityBadge active" }, ["Alta"])])
          ]));
        });

        refs.followTotal.hidden = ticketsSeguimiento.length <= 10;
        refs.followTotal.textContent = showAllTickets
          ? "Ver menos"
          : "Ver todos (" + ticketsSeguimiento.length + ")";
      }

      renderFollowRows();
      refs.followTotal.addEventListener("click", () => {
        showAllTickets = !showAllTickets;
        renderFollowRows();
      });

      const ticketTotal = ticketOpen + ticketPending + rutasPending;
      refs.ticketTotal.textContent = String(ticketTotal);
      refs.ticketDonut.style.setProperty("--a", ticketTotal ? ((ticketOpen / ticketTotal) * 100) + "%" : "0%");
      refs.ticketDonut.style.setProperty("--b", ticketTotal ? (((ticketOpen + ticketPending) / ticketTotal) * 100) + "%" : "0%");
      setLegend(refs.ticketLegend, [
        { type: "tickets", label: "Abiertos", value: ticketOpen },
        { type: "pending", label: "Pend. calificar", value: ticketPending },
        { type: "closed", label: "Cerrados/rutas", value: rutasPending }
      ], ticketTotal);

      const taskTotal = ticketOpen + rutasOpen + equiposTaller;
      refs.taskTotal.textContent = String(taskTotal);
      refs.taskDonut.style.setProperty("--a", taskTotal ? ((ticketOpen / taskTotal) * 100) + "%" : "0%");
      refs.taskDonut.style.setProperty("--b", taskTotal ? (((ticketOpen + rutasOpen) / taskTotal) * 100) + "%" : "0%");
      refs.taskDonut.classList.add("taskTypes");
      setLegend(refs.taskLegend, [
        { type: "tickets", label: "Tickets", value: ticketOpen },
        { type: "routes", label: "Rutas", value: rutasOpen },
        { type: "tools", label: "Taller", value: equiposTaller }
      ], taskTotal);

      const dist = { over: 0, high: 0, medium: 0, low: 0 };
      sortedTecnicos.forEach(tec => {
        const percent = Math.min(100, Math.round((tec.cargaTotal / maxCarga) * 100));
        dist[loadLevel(percent)] += 1;
      });

      refs.distOver.textContent = String(dist.over);
      refs.distHigh.textContent = String(dist.high);
      refs.distMedium.textContent = String(dist.medium);
      refs.distLow.textContent = String(dist.low);
      refs.activeTechs.textContent = sortedTecnicos.length + " técnicos activos";
      refs.distributionBar.innerHTML = "";
      ["over", "high", "medium", "low"].forEach(level => {
        refs.distributionBar.appendChild(el("span", {
          class: level,
          style: "flex-grow:" + Math.max(dist[level], 0.15)
        }));
      });

      setAlert(refs.alertTickets, "fas fa-exclamation-triangle", ticketsSeguimiento.length + " tickets con más de 7 días", "Requieren atención inmediata");
      setAlert(refs.alertUnassigned, "fas fa-clock", ticketPending + " pendientes de calificación", "Pendientes de cierre administrativo");
      setAlert(refs.alertEquipos, "fas fa-tools", equiposPrioridad + " equipos en taller > 7 días", "En revisión y reparación");
      setAlert(refs.alertProyectos, "fas fa-info-circle", proyectosPendientes + " proyectos pendientes", "Aprobar o rechazar");

      info.textContent = "Dashboard cargado • Período: " + (data.corte?.rango || "Todo el historial") +
        " • Técnicos: " + tecnicos.length +
        " • Prioridades: " + (data.totalPrioridades || ticketsSeguimiento.length);
    } catch (err) {
      const message = getUserErrorMessage(err, "No se pudo cargar el panel.");
      info.textContent = message;
      toast(message, "err");
    }
  }

  loadDashboard();
}
