function RutaModal(row, onDone) {
  const isEdit = !!row;
  let isClosed = isEdit ? isClosedByFechaCierre(row) : false;
  const isValidated = isEdit ? Number(row?.idEstadoValidacion || 0) !== 0 : false;
  const rutasTecnicosDisponibles = (catalogos?.tecnicos || []).filter(isRutaSelectableTecnico);

  // idUnidad - usando searchable select
  const idUnidad = createSearchableSelect(
    getSelectOptions(catalogos?.unidades || [], 'idUnidad', 'nombre'),
    "(Seleccionar unidad)",
    row?.idUnidad || "",
    (val) => { idUnidad.value = val; syncTipoRuta(); }
  );

  // Tipo Ruta se deriva automaticamente de la Unidad (unidad.idTipoRuta -> des_tipo_ruta.nombre)
  const tipoRuta = el("input", { type: "text", value: "", disabled: true }, []);
  function syncTipoRuta() {
    const unidadId = Number(idUnidad.value || 0);
    const unidad = (catalogos?.unidades || []).find((u) => Number(u.idUnidad) === unidadId);
    const idTipo = unidad ? Number(unidad.idTipoRuta || 0) : 0;
    const tr = (catalogos?.des_tipo_ruta || []).find((x) => Number(x.idTipoRuta) === idTipo);
    const label = tr?.nombre || row?.tipoTexto || row?.tipo || "";
    tipoRuta.value = label ? String(label) : "—";
  }
  syncTipoRuta();

  const fechaApertura = el("input", {
    type: "date",
    value: row?.fechaApertura ? mysqlToDateValue(row.fechaApertura) : nowLocalDateValue()
  });

  // Fecha cierre se asigna automaticamente al validar (rol GERENCIAL).
  // Importante: NO usar datetime-local porque abriría calendario. Solo mostrar lectura.
  const fechaCierre = el("input", {
    type: "text",
    value: row?.fechaCierre ? formatDate(row.fechaCierre) : "—",
    disabled: true
  });

  const observaciones = el("textarea", {}, []);
  observaciones.value = row?.observaciones || "";

  const buildEquiposValidadosBlock = () => {
    if (!isEdit || !isValidated) return null;

    const savedReviewValues = Object.fromEntries(
      (Array.isArray(row?.equiposRevisados) ? row.equiposRevisados : [])
        .map((item) => {
          const key = String(item?.key || item?.label || "").trim().toLowerCase();
          return [
            key,
            {
              valor: Math.max(0, Math.trunc(Number(item?.valor ?? item?.value ?? 0) || 0)),
              validado: !!item?.validado
            }
          ];
        })
        .filter(([key]) => !!key)
    );
    const reviewCatalog = Array.isArray(catalogos?.catalogo_equipo_revisado_ruta)
      ? catalogos.catalogo_equipo_revisado_ruta
      : [];
    const reviewItems = reviewCatalog.map((item) => {
      const key = String(item?.clave || item?.nombre || "").trim().toLowerCase();
      return {
        key,
        label: String(item?.nombre || "").trim() || "-",
        value: savedReviewValues[key]?.valor ?? 0,
        validado: savedReviewValues[key]?.validado ?? false
      };
    });

    if (!reviewItems.length) return null;

    return el("div", { class: "row ruta-review-summary-row", style: "margin-top:10px" }, [
      el("div", { class: "field", style: "flex:1" }, [
        el("label", {}, [el("i", { class: "fas fa-clipboard-check" }), " Equipos revisados por gerencia"]),
        el("div", { class: "ruta-review-summary" }, [
          el("div", { class: "ruta-review-summary-head" }, [
            el("div", { class: "ruta-review-summary-title" }, [
              el("i", { class: "fas fa-circle-check" }),
              el("span", {}, ["Validacion gerencial completada"])
            ]),
            el("div", { class: "ruta-review-summary-meta" }, [
              el("span", {}, [
                el("i", { class: "fas fa-user-check" }),
                ` ${row?.nombreValidador || "Gerencia"}`
              ]),
              el("span", {}, [
                el("i", { class: "fas fa-calendar-check" }),
                ` ${row?.fechaValidacion ? formatDate(row.fechaValidacion) : "-"}`
              ])
            ])
          ]),
          el("div", { class: "ruta-review-summary-grid" }, reviewItems.map((item) =>
            el("div", { class: "ruta-review-summary-item" }, [
              el("div", { class: "ruta-review-summary-name" }, [item.label]),
              el("div", { class: "ruta-review-summary-body" }, [
                el("div", { class: "ruta-review-summary-value" }, [String(item.value)]),
                el("div", { class: `ruta-review-summary-check${item.validado ? " ok" : ""}` }, [
                  el("i", { class: item.validado ? "fas fa-check" : "fas fa-minus" }),
                  el("span", {}, [item.validado ? "Validado" : "Pendiente"])
                ])
              ])
            ])
          ))
        ])
      ])
    ]);
  };

  const participantesGroup = el("div", { class: "checkboxGroup" }, [
    ...rutasTecnicosDisponibles.map((t) => {
      const isChecked = (row?.participantes || []).some((x) => x.idUsuario == t.idUsuario);
      return el("label", { class: "checkboxItem" }, [
        el("input", { type: "checkbox", value: t.idUsuario, checked: isChecked }),
        el("span", {}, [t.nombre])
      ]);
    })
  ]);

  function getSelectedParticipantes() {
    const checked = participantesGroup.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checked).map((cb) => Number(cb.value));
  }

  const formRows = [
    // Fila 1: Unidad + Tipo
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]), idUnidad]),
      el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-road" }), " Tipo Ruta"]), tipoRuta])
    ]),
    // Fila 2: Fecha apertura + Fecha cierre
    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-calendar-alt" }), " Fecha apertura"]), fechaApertura]),
      el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-calendar-check" }), " Fecha de cierre (auto)"]), fechaCierre])
    ]),
    // Fila 3: Participantes (ocupa todo el ancho)
    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field", style: "flex:1" }, [el("label", {}, [el("i", { class: "fas fa-users" }), " Participantes (siempre compartido)"]), participantesGroup])
    ]),
    // Fila 4: Observaciones (ocupa todo el ancho)
    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field", style: "flex:1" }, [el("label", {}, [el("i", { class: "fas fa-comment" }), " Observaciones (opcional)"]), observaciones])
    ])
  ];

  const equiposValidadosBlock = buildEquiposValidadosBlock();
  if (equiposValidadosBlock) formRows.push(equiposValidadosBlock);

  const form = el("div", {}, formRows);

  const titleText = () => {
    if (!isEdit) return "Nueva Ruta";
    return `Ruta #${row.idRuta} (${isClosed ? "CERRADO" : "ABIERTO"})`;
  };

  function applyFreeze() {
    // TÉCNICO siempre es solo lectura (aunque esté ABIERTO)
    const freezeTotal = isClosed || isValidated || isTecnico();
    setFormFrozen(form, freezeTotal, [participantesGroup]);
  }

  function renderActions() {
    const actions = [];

    // TÉCNICO: no puede realizar ninguna acción (solo ver)
    if (isTecnico()) {
      return actions;
    }

    // Validada: solo ver (no modificar / no reabrir / no borrar)
    if (isEdit && isValidated) {
      return actions;
    }

    if (!isEdit && can("RUTAS_CREATE")) {
      actions.push(
        createActionButton({
          class: "btn primary",
          icon: "fas fa-save",
          text: "Guardar",
          onClick: async () => {
            const parts = getSelectedParticipantes();
            if (!parts.length) throw new Error("Debe asignar participantes (mínimo 1).");

            const payload = {
              idUnidad: Number(idUnidad.value),
              participantes: parts,
              // UI solo fecha, BD guarda fecha + hora (auto)
              fechaApertura: dateToMysqlWithTime(fechaApertura.value),
              observaciones: observaciones.value.trim() || null
            };

            const res = await window.api.ruta_create(session, payload);
            if (!res || !res.ok) throw new Error(res?.message || "Error al crear ruta");
            modal.close();
            onDone();
          }
        })
      );
      return actions;
    }

    if (isEdit && isClosed) {
      if (can("RUTAS_REOPEN")) {
        actions.push(
          createActionButton({
            class: "btn ok",
            icon: "fas fa-lock-open",
            text: "Reabrir",
            onClick: async () => {
              const res = await window.api.ruta_reopen(session, Number(row.idRuta));
              if (!res || !res.ok) throw new Error(res?.message || "Error al reabrir la ruta.");

              row.fechaCierre = null;
              isClosed = false;

              modal.titleElement.textContent = titleText();
              applyFreeze();
              modal.rebuildActions(renderActions());
              onDone();
            }
          })
        );
      }

      if (can("RUTAS_DELETE")) {
        actions.push(
          createActionButton({
            class: "btn danger",
            icon: "fas fa-trash",
            text: "Borrar",
            onClick: async () => {
              const res = await window.api.ruta_delete(session, Number(row.idRuta));
              if (!res || !res.ok) throw new Error(res?.message || "Error al borrar ruta");
              modal.close();
              onDone();
            }
          })
        );
      }

      return actions;
    }

    if (isEdit && !isClosed && can("RUTAS_EDIT")) {
      actions.push(
        createActionButton({
          class: "btn primary",
          icon: "fas fa-edit",
          text: "Guardar Cambios",
          onClick: async () => {
            const parts = getSelectedParticipantes();
            if (!parts.length) throw new Error("Debe asignar participantes (mínimo 1).");

            const payload = {
              idRuta: Number(row.idRuta),
              idUnidad: Number(idUnidad.value),
              participantes: parts,
              // Mantener hora original aunque visualmente solo se edite la fecha
              fechaApertura: dateToMysqlKeepTime(fechaApertura.value, row?.fechaApertura),
              observaciones: observaciones.value.trim() || null
            };

            const res = await window.api.ruta_update(session, payload);
            if (!res || !res.ok) throw new Error(res?.message || "Error al actualizar ruta");
            modal.close();
            onDone();
          }
        })
      );
    }

    if (isEdit && can("RUTAS_DELETE")) {
      actions.push(
        createActionButton({
          class: "btn danger",
          icon: "fas fa-trash",
          text: "Borrar",
          onClick: async () => {
            const res = await window.api.ruta_delete(session, Number(row.idRuta));
            if (!res || !res.ok) throw new Error(res?.message || "Error al borrar ruta");
            modal.close();
            onDone();
          }
        })
      );
    }

    return actions;
  }

  const modal = Modal(titleText(), form, renderActions(), {
    closeOnBackdrop: false,
    blockRouteChange: true
  });
  applyFreeze();
  return modal;
}

function renderRutas(host) {
  host.innerHTML = "";

  const info = el("div", { class: "small" }, [""]);
  let isLoading = false;
  const q = el("input", { type: "hidden", value: "" });
  const rutasTecnicosDisponibles = (catalogos?.tecnicos || []).filter(isRutaSelectableTecnico);
  const idUnidad = createSearchableSelect(
    getSelectOptions(catalogos.unidades, 'idUnidad', 'nombre'),
    "(Unidad)",
    "",
    (val) => { idUnidad.value = val; }
  );
  const idTecnico = createSearchableSelect(
    getSelectOptions(rutasTecnicosDisponibles, 'idUsuario', 'nombre'),
    "(Técnico)",
    "",
    (val) => { idTecnico.value = val; }
  );
  const defaultRange = getMonthlyRange();
  const defaultDesde = mysqlToDateValue(defaultRange.start);
  const defaultHasta = mysqlToDateValue(defaultRange.end);
  const desde = el("input", { type: "date", value: defaultDesde });
  const hasta = el("input", { type: "date", value: defaultHasta });

  let page = 1;
  let pageSize = 25;

  // Solo UI: tabla con estilo tipo "Excel" (solo para Rutas)
  const tableScroll = el("div", { class: "table-scroll" }, []);
  const tableFooter = el("div", { class: "table-footer-host" }, []);
  const tableWrap = el("div", { class: "tableWrap rutas-excel has-footer" }, [tableScroll, tableFooter]);

  // Root wrapper para que apliquen correctamente los estilos del módulo (CSS espera .module-rutas)
  const moduleRoot = el("div", { class: "module-rutas" }, []);

  const header = el("div", { class: "card module-header-calif calif-header-card module-standard-header" }, [
    el("div", { class: "titleRow" }, [
      el("div", {}, [
        el("div", { class: "h1" }, [el("i", { class: "fas fa-route" }), " Módulo Rutas"]),
      ]),
      el("div", { class: "actions" }, [
        (!isTecnico() && can("RUTAS_CREATE"))
          ? el("button", { class: "btn primary", onclick: () => RutaModal(null, load) }, [el("i", { class: "fas fa-plus" }), " Nueva Ruta"])
          : el("span", { class: "small" }, ["Sin acceso a creación"])
      ])
    ]),
    el("div", { class: "module-filters" }, [
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]), idUnidad]),
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-user" }), " Técnico"]), idTecnico]),
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-calendar" }), " Desde"]), desde]),
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-calendar" }), " Hasta"]), hasta]),
        el("div", { class: "actions actions-inline" }, [
          el("button", { class: "btn", onclick: () => { if (!isLoading) { page = 1; load(); } } }, [el("i", { class: "fas fa-search" }), " Buscar"]),
          el("button", {
            class: "btn",
            onclick: () => {
              if (typeof idUnidad.clear === 'function') idUnidad.clear();
              if (typeof idTecnico.clear === 'function') idTecnico.clear();
              desde.value = defaultDesde;
              hasta.value = defaultHasta;
              page = 1;
              load();
            }
          }, [el("i", { class: "fas fa-broom" }), " Limpiar"])
        ])
      ]),
      el("div", { style: "margin-top:8px" }, [info])
    ])
  ]);

  moduleRoot.appendChild(header);
  moduleRoot.appendChild(tableWrap);
  host.appendChild(moduleRoot);

  async function load() {
    if (isLoading) return;
    isLoading = true;
    info.textContent = "Cargando...";

    try {
      const filtros = {
        q: q.value ? q.value.trim() : null,
        idUnidad: idUnidad.value === "" ? null : Number(idUnidad.value),
        idTecnico: idTecnico.value === "" ? null : Number(idTecnico.value),
        desde: desde.value ? dateToMysqlStartOfDay(desde.value) : null,
        hasta: hasta.value ? dateToMysqlEndOfDay(hasta.value) : null,
        page,
        pageSize
      };


      const res = await window.api.rutas_list(session, filtros);

      if (!res || !res.ok) {
        info.textContent = "Error: " + toUserText(res?.message, "Error desconocido.");
        if (isSessionErrorMessage(res?.message)) {
          session = null;
          if (typeof window.resetCatalogosState === "function") {
            window.resetCatalogosState();
          } else {
            catalogos = null;
          }
          mount(LoginView());
        }
        return;
      }

      const data = Array.isArray(res.data) ? res.data : [];
      const total = Number(res.total || 0);
      info.textContent = `Página ${res.page} • Total: ${total}`;

      const tbody = el("tbody", {}, data.map((r) => {
        const closed = isClosedByFechaCierre(r);
        const parts = (r.participantes || []).map((x) => x.nombre).join(", ");

        const openRuta = () => RutaModal(r, load);

        // Acciones: botón tipo "ojito" + lapicito (solo si puede editar)
        const btnView = el("button", {
          class: "calif-eye-btn",
          title: "Ver",
          onclick: openRuta
        }, [el("i", { class: "fas fa-eye" })]);

        const btnEdit = isTecnico()
          ? null
          : el("button", {
              class: "calif-eye-btn calif-edit-btn",
              title: "Editar",
              onclick: openRuta
            }, [el("i", { class: "fas fa-pen-to-square" })]);

        const actions = el("span", { class: "action-icons" }, btnEdit ? [btnView, btnEdit] : [btnView]);

        return el("tr", {}, [
          el("td", { class: "mono" }, [`TR-${String(r.idRuta)}`]),
          el("td", {}, [r.unidad || "—"]),
          el("td", {}, [rutaTipoRutaText(r.tipoTexto || r.tipo)]),
          el("td", { class: "wrap" }, [parts || "—"]),
          el("td", {}, [badgeOpen(closed)]),
          el("td", { class: "mono" }, [formatDate(r.fechaApertura)]),
          el("td", { class: "mono" }, [formatDate(r.fechaCierre)]),
          el("td", {}, [badgeTicketEstadoCalificacion(r)]),
          el("td", { class: "actions" }, [actions])
        ]);
      }));

      const tbl = el("table", {}, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", {}, compactIdHeader("fas fa-route", "N. Ruta", "TR", true)),
            el("th", { title: "Unidad" }, [tableHeadLabel("fas fa-building", "Unidad")]),
            el("th", { title: "Tipo Ruta" }, [tableHeadLabel("fas fa-road", "Tipo Ruta")]),
            el("th", { title: "Participantes" }, [tableHeadLabel("fas fa-users", "Participantes")]),
            el("th", { title: "Estado" }, [tableHeadLabel("fas fa-flag", "Estado")]),
            el("th", { title: "Apertura" }, [tableHeadLabel("fas fa-calendar-plus", "Apertura")]),
          el("th", { title: "Cierre" }, [tableHeadLabel("fas fa-calendar-check", "Cierre")]),
          el("th", { title: "Calificación" }, [tableHeadLabel("fas fa-star", "Calificación")]),
          el("th", { class: "actions", title: "Acciones" }, [tableHeadLabel("fas fa-cogs", "Acciones")])
        ])
      ]),
      tbody
      ]);

      const pager = createTableFooterBar({
        page,
        pageSize,
        total,
        onPageChange: (nextPage) => {
          if (isLoading || nextPage === page) return;
          page = nextPage;
          load();
        },
        onPageSizeChange: (nextPageSize) => {
          if (isLoading || nextPageSize === pageSize) return;
          pageSize = nextPageSize;
          page = 1;
          load();
        }
      });

      tableScroll.innerHTML = "";
      tableFooter.innerHTML = "";
      tableScroll.appendChild(tbl);
      tableFooter.appendChild(pager);
      normalizeExcelTableHeaders(tableWrap);
    } finally {
      // Siempre liberar el flag de carga
      isLoading = false;
    }
  }

  load();
}

/* =========================
   REPORTES UI (ADMIN) - 4 REPORTES
========================= */
function ensureProyectosScript() {
  if (typeof renderProyectosEspecialesImpl !== "undefined") {
    return Promise.resolve();
  }

  if (proyectosScriptPromise) return proyectosScriptPromise;

  const esperarDisponibilidad = async () => {
    if (window.__proyectosEspecialesReadyPromise) {
      await window.__proyectosEspecialesReadyPromise;
    }
    if (typeof renderProyectosEspecialesImpl === "undefined") {
      throw new Error("El módulo de proyectos especiales no quedó disponible.");
    }
  };

  proyectosScriptPromise = new Promise((resolve, reject) => {
    const finalizarCarga = () => {
      esperarDisponibilidad().then(resolve).catch(reject);
    };
    const fallarCarga = () => reject(new Error("No se pudo cargar el módulo de proyectos especiales."));
    const existing = document.querySelector(
      'script[data-module="proyectos-especiales"], script[data-app-chunk="./modulos/proyectos-especiales/cargador-proyectos-especiales.js"]'
    );
    if (existing) {
      if (window.__proyectosEspecialesReadyPromise) {
        finalizarCarga();
        return;
      }
      existing.addEventListener("load", finalizarCarga, { once: true });
      existing.addEventListener("error", fallarCarga, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "./modulos/proyectos-especiales/cargador-proyectos-especiales.js";
    script.dataset.module = "proyectos-especiales";
    script.onload = finalizarCarga;
    script.onerror = fallarCarga;
    document.head.appendChild(script);
  });

  return proyectosScriptPromise;
}

// Incluir funciones de Proyectos Especiales
function renderProyectosEspeciales(host) {
  // Vista limpiada completamente antes de montar Proyectos Especiales
  cleanupAllDropdowns();
  if (host) {
    host.innerHTML = "";
    // Limpiar modals residuales específicos
    const modals = document.querySelectorAll('.modalBack');
    modals.forEach((m) => {
      if (m.classList?.contains("is-minimized")) return;
      m.remove();
    });
  }
  const contentEl = el("div", { id: "proyectos-content" }, []);
  host.appendChild(contentEl);

  contentEl.innerHTML = '<div style="padding:40px;text-align:center"><i class="fas fa-cog fa-spin"></i> Cargando módulo...</div>';

  ensureProyectosScript()
    .then(() => {
      if (typeof renderProyectosEspecialesImpl !== "undefined") {
        renderProyectosEspecialesImpl(contentEl);
      } else {
        throw new Error("El módulo de proyectos especiales no quedó disponible.");
      }
    })
    .catch((err) => {
      contentEl.innerHTML = "";
      contentEl.appendChild(
        el("div", { class: "card", style: "padding:24px;text-align:center;color:var(--danger);" }, [
          el("i", { class: "fas fa-exclamation-triangle" }),
          " " + getUserErrorMessage(err, "No se pudo cargar el módulo de proyectos especiales.")
        ])
      );
    });
}

function renderValidarRutas(host) {
  if (!can("VALIDACION_VIEW")) {
    host.innerHTML = '<div class="card" style="padding:40px;text-align:center"><i class="fas fa-lock" style="font-size:48px;color:var(--warn);margin-bottom:20px;"></i><h2 style="color:var(--text);">Sin acceso</h2><div class="small" style="color:var(--muted);">Requiere permiso VALIDACION_VIEW</div></div>';
    return;
  }

  host.innerHTML = "";
  const moduleRoot = el("div", { class: "module-validacion-rutas" }, []);
  const info = el("div", { class: "small" }, ["Cargando rutas pendientes..."]);
  let isLoading = false;
  const pendingCount = el("strong", {}, ["0"]);
  const assignedUnits =
    Array.isArray(session?.unidades) && session.unidades.length
      ? session.unidades
      : [];
  const welcomeUnitsLabel = assignedUnits.length
    ? assignedUnits
        .map((u) => String(u?.nombre || "").trim())
        .filter(Boolean)
        .join(" · ")
    : "Sistema IT";

  const header = el("div", { class: "card module-header-validacion-rutas module-standard-header" }, [
    el("div", { class: "titleRow" }, [
      el("div", {}, [
        el("div", { class: "h1" }, [el("i", { class: "fas fa-route" }), " Validar Rutas"]),
      ]),
      el("div", { class: "validacion-rutas-pending" }, [
        el("i", { class: "fas fa-clock" }),
        el("span", {}, ["Pendientes"]),
        pendingCount
      ])
    ])
  ]);

  const welcomeBox = el("div", { class: "validacion-rutas-welcome" }, [
    el("div", { class: "validacion-rutas-welcome-icon" }, [
      el("i", { class: "fas fa-building" })
    ]),
    el("div", { class: "validacion-rutas-welcome-copy" }, [
      el("div", { class: "validacion-rutas-welcome-label" }, ["Bienvenido (a)"]),
      el("div", { class: "validacion-rutas-welcome-title" }, [
        `Validación Rutas ${welcomeUnitsLabel}`
      ]),
      el("div", { class: "small" }, ["Las rutas pendientes de tu unidad se muestran automáticamente."])
    ])
  ]);

  const summaryBar = el("div", { class: "validacion-rutas-summary" }, [
    el("i", { class: "fas fa-tasks" }),
    info
  ]);

  let validationPageSize = 25;
  const tableScroll = el("div", { class: "table-scroll" }, []);
  const tableFooter = el("div", { class: "table-footer-host" }, []);
  const tableWrap = el("div", { class: "tableWrap validacion-rutas-table has-footer" }, [tableScroll, tableFooter]);
  header.appendChild(welcomeBox);
  header.appendChild(summaryBar);
  moduleRoot.appendChild(header);
  moduleRoot.appendChild(tableWrap);
  host.appendChild(moduleRoot);

  async function load(pageNum = 1) {
    if (isLoading) return;
    isLoading = true;
    info.textContent = "Cargando rutas pendientes...";

    try {
      const filtros = {
        q: null,
        idEstadoValidacion: 0, // Solo pendientes
        idUnidad: null,
        desde: null,
        hasta: null
      };


      const res = await window.api.rutas_list(session, filtros);
      if (!res?.ok) {
        info.textContent = toUserText(res?.message, "No se pudieron cargar las rutas.");
        return;
      }

      const data = Array.isArray(res.data) ? res.data : [];
      pendingCount.textContent = String(data.length);
      info.textContent = `Encontradas ${data.length} rutas pendientes de validación`;

      tableScroll.innerHTML = "";
      tableFooter.innerHTML = "";
      if (!data.length) {
        tableScroll.appendChild(
          el("div", { class: "validacion-rutas-empty" }, [
            el("div", { class: "validacion-rutas-empty-icon" }, [
              el("i", { class: "fas fa-route" })
            ]),
            el("div", { class: "validacion-rutas-empty-copy" }, [
              el("div", { class: "validacion-rutas-empty-title" }, ["Sin rutas pendientes"]),
              el("div", { class: "small" }, ["No hay rutas por validar con los filtros actuales."])
            ])
          ])
        );
        tableFooter.appendChild(createTableFooterBar({
          page: 1,
          pageSize: validationPageSize,
          total: 0,
          onPageChange: load,
          onPageSizeChange: (nextSize) => {
            validationPageSize = nextSize;
            load(1);
          }
        }));
        return;
      }

      const totalPages = Math.max(1, Math.ceil(data.length / validationPageSize));
      const safePage = Math.min(Math.max(1, Number(pageNum || 1)), totalPages);
      const visibleRows = data.slice((safePage - 1) * validationPageSize, safePage * validationPageSize);

      const tbody = el("tbody", {}, visibleRows.map((r) => {
        const parts = (r.participantes || []).map((p) => p.nombre).join(", ");

        const actions = el("div", { class: "validacion-rutas-row-actions" }, [
          el(
            "button",
            {
              class: "btn primary validacion-rutas-cta",
              onclick: () => validarRutaModal(r)
            },
            [el("i", { class: "fas fa-check" }), " Validar"]
          )
        ]);

        return el("tr", {}, [
          el("td", {}, [el("span", { class: "validacion-ruta-id" }, [`TR-${r.idRuta}`])]),
          el("td", {}, [el("div", { class: "validacion-rutas-unit" }, [r.unidad || "—"])]),
          el("td", { class: "wrap" }, [el("div", { class: "validacion-rutas-people" }, [parts || "—"])]),
          el("td", {}, [el("span", { class: "validacion-rutas-date" }, [formatDate(r.fechaApertura)])]),
          el("td", {}, [actions])
        ]);
      }));

      const tbl = el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, compactIdHeader("fas fa-route", "N. Ruta", "TR", true)),
          el("th", {}, [el("i", { class: "fas fa-building" }), " Unidad"]),
          el("th", {}, [el("i", { class: "fas fa-users" }), " Participantes"]),
          el("th", {}, [el("i", { class: "fas fa-calendar-plus" }), " Fecha"]),
          el("th", {}, [el("i", { class: "fas fa-check-circle" }), " Acción"])
        ])),
        tbody
      ]);

      tableScroll.appendChild(tbl);
      tableFooter.appendChild(createTableFooterBar({
        page: safePage,
        pageSize: validationPageSize,
        total: data.length,
        onPageChange: load,
        onPageSizeChange: (nextSize) => {
          validationPageSize = nextSize;
          load(1);
        }
      }));
      normalizeExcelTableHeaders(tableWrap);
    } finally {
      isLoading = false;
    }
  }

  function validarRutaModal(rutaRow) {
    const idRuta = Number(rutaRow?.idRuta);
    const unidad = rutaRow?.unidad || "—";
    const participantesList = Array.isArray(rutaRow?.participantes) ? rutaRow.participantes : [];
    const participantes = participantesList.map((p) => p.nombre).join(", ") || "—";

    const fechaMysql = nowLocalMysql();

    // Campos manuales (requeridos según negocio)
    const nombreField = el("input", { placeholder: "Nombre completo" });
    const puestoField = createSearchableSelect(
      getSelectOptions(catalogos?.puestos || [], "nombre", "nombre"),
      "(Seleccionar puesto)",
      "",
      null
    );
    const obsField = el("textarea", { placeholder: "Observaciones (opcional)" }, []);
    const savedReviewValues = Object.fromEntries(
      (Array.isArray(rutaRow?.equiposRevisados) ? rutaRow.equiposRevisados : [])
        .map((item) => {
          const key = String(item?.key || item?.label || "").trim().toLowerCase();
          return [
            key,
            {
              valor: Math.max(0, Math.trunc(Number(item?.valor ?? item?.value ?? 0) || 0)),
              validado: !!item?.validado
            }
          ];
        })
        .filter(([key]) => !!key)
    );
    const previousReviewValues = Object.fromEntries(
      (Array.isArray(rutaRow?.equiposRevisadosAnterior) ? rutaRow.equiposRevisadosAnterior : [])
        .map((item) => {
          const key = String(item?.key || item?.label || "").trim().toLowerCase();
          return [
            key,
            {
              valor: Math.max(0, Math.trunc(Number(item?.valor ?? item?.value ?? 0) || 0)),
              validado: !!item?.validado
            }
          ];
        })
        .filter(([key]) => !!key)
    );
    const reviewIconByKey = {
      caja_ventas: "fas fa-box",
      cableado: "fas fa-wrench",
      camaras: "fas fa-video",
      servidor: "fas fa-server",
      switches_cenefa: "fas fa-network-wired",
      gerencia_etiquetadoras: "fas fa-tags",
      balanzas: "fas fa-balance-scale",
      laptop: "fas fa-laptop"
    };
    const reviewCatalog = Array.isArray(catalogos?.catalogo_equipo_revisado_ruta)
      ? catalogos.catalogo_equipo_revisado_ruta
      : [];
    const reviewItems = reviewCatalog.map((item) => ({
      key: String(item?.clave || item?.nombre || "").trim().toLowerCase(),
      icon: reviewIconByKey[String(item?.clave || "").trim().toLowerCase()] || "fas fa-boxes-stacked",
      label: String(item?.nombre || "").trim() || "—",
      ...item,
      previousValue: previousReviewValues[String(item?.clave || item?.nombre || "").trim().toLowerCase()]?.valor ?? 0,
      value: savedReviewValues[String(item?.clave || item?.nombre || "").trim().toLowerCase()]?.valor ?? 0,
      checked: savedReviewValues[String(item?.clave || item?.nombre || "").trim().toLowerCase()]?.validado ?? false
    }));
    const reviewControls = new Map();
    const reviewChecks = new Map();

    const buildReviewPayload = () => ({
      version: 1,
      items: reviewItems.map((item) => ({
        key: item.key,
        label: item.label,
        valor: Math.max(0, Math.trunc(Number(reviewControls.get(item.key)?.value || 0) || 0)),
        validado: !!reviewChecks.get(item.key)?.checked
      }))
    });

    const getUncheckedReviewLabels = () =>
      reviewItems
        .filter((item) => !reviewChecks.get(item.key)?.checked)
        .map((item) => item.label);

    const heroFacts = [
      {
        icon: "fas fa-layer-group",
        label: "Ruta asignada",
        content: el("div", { class: "validar-ruta-fact-stack" }, [
          el("div", { class: "validar-ruta-fact-subgroup" }, [
            el("div", { class: "validar-ruta-fact-head validar-ruta-fact-head-sub" }, [
              el("i", { class: "fas fa-building" }),
              el("span", {}, ["Unidad"])
            ]),
            el("div", { class: "validar-ruta-fact-value" }, [unidad])
          ]),
          el("div", { class: "validar-ruta-fact-subgroup" }, [
            el("div", { class: "validar-ruta-fact-head validar-ruta-fact-head-sub" }, [
              el("i", { class: "fas fa-calendar-alt" }),
              el("span", {}, ["Fecha"])
            ]),
            el("div", { class: "validar-ruta-fact-value mono" }, [formatDate(fechaMysql)])
          ])
        ])
      },
      {
        icon: "fas fa-users",
        label: "Técnicos asignados",
        content: el("div", { class: "validar-ruta-tech-chips" }, participantesList.length
          ? participantesList.map((p) =>
              el("span", { class: "validar-ruta-tech-pill" }, [
                el("i", { class: "fas fa-user" }),
                p.nombre
              ])
            )
          : [el("span", { class: "validar-ruta-tech-pill" }, [
              el("i", { class: "fas fa-user" }),
              "Sin técnicos"
            ])]
        )
      }
    ];

    const reviewList = el("div", { class: "validar-ruta-review-list" }, reviewItems.map((item) => {
      const control = el("input", {
        class: "validar-ruta-review-count",
        type: "number",
        min: "0",
        step: "1",
        inputmode: "numeric",
        value: String(item.value ?? 0),
        "aria-label": item.label
      });
      reviewControls.set(item.key, control);
      const validationCheck = el("input", {
        type: "checkbox",
        checked: !!item.checked,
        "aria-label": `Validación de ${item.label}`
      });
      reviewChecks.set(item.key, validationCheck);

      return el("div", { class: "validar-ruta-review-row" }, [
        el("div", { class: "validar-ruta-review-item" }, [
          el("div", { class: "validar-ruta-review-icon" }, [
            el("i", { class: item.icon })
          ]),
          el("div", { class: "validar-ruta-review-name" }, [item.label])
        ]),
        el("div", { class: "validar-ruta-review-control validar-ruta-review-control-previous" }, [
          el("span", { class: "validar-ruta-review-previous" }, [String(item.previousValue ?? 0)])
        ]),
        el("div", { class: "validar-ruta-review-control validar-ruta-review-control-input" }, [control]),
        el("label", { class: "validar-ruta-review-check" }, [
          validationCheck,
          el("span", { class: "validar-ruta-review-check-ui" }, [
            el("i", { class: "fas fa-check" })
          ])
        ])
      ]);
    }));

    const body = el("div", { class: "validar-ruta-view" }, [
      el("div", { class: "validar-ruta-hero validar-ruta-hero-revamped" }, [
        el("div", { class: "validar-ruta-hero-main" }, [
          el("div", { class: "validar-ruta-hero-badge" }, [
            el("i", { class: "fas fa-project-diagram" })
          ]),
          el("div", { class: "validar-ruta-hero-copy" }, [
            el("div", { class: "validar-ruta-heading" }, [`Ruta #${idRuta}`]),
            el("span", { class: "validar-ruta-status-pill" }, ["Pendiente de validación"])
          ])
        ]),
        el("div", { class: "validar-ruta-hero-facts" }, heroFacts.map((fact, index) =>
          el("div", {
            class: `validar-ruta-fact${index < heroFacts.length - 1 ? " validar-ruta-fact-divider" : ""}`
          }, [
            el("div", { class: "validar-ruta-fact-head" }, [
              el("i", { class: fact.icon }),
              el("span", {}, [fact.label])
            ]),
            fact.content
          ])
        ))
      ]),
      el("div", { class: "validar-ruta-layout validar-ruta-layout-revamped" }, [
        el("div", { class: "validar-ruta-form-pane" }, [
          el("div", { class: "validar-ruta-section-head" }, [
            el("div", { class: "validar-ruta-section-icon" }, [
              el("i", { class: "fas fa-user" })
            ]),
            el("div", { class: "validar-ruta-section-copy" }, [
              el("div", { class: "validar-ruta-section-title" }, ["Datos del responsable"]),
              el("div", { class: "small" }, ["Completa estos datos para validar la ruta."])
            ])
          ]),
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-user" }), " Nombre *"]),
            nombreField
          ]),
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-briefcase" }), " Puesto *"]),
            puestoField
          ]),
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-comment-dots" }), " Observaciones (opcional)"]),
            obsField
          ])
        ]),
        el("div", { class: "validar-ruta-side validar-ruta-review-pane" }, [
          el("div", { class: "validar-ruta-sidecard validar-ruta-review-card" }, [
            el("div", { class: "validar-ruta-section-head validar-ruta-section-head-compact" }, [
              el("div", { class: "validar-ruta-section-icon" }, [
                el("i", { class: "fas fa-clipboard-check" })
              ]),
              el("div", { class: "validar-ruta-section-copy" }, [
                el("div", { class: "validar-ruta-section-title" }, ["Equipos Revisados"]),
                el("div", { class: "small" }, ["Valida los equipos según la ruta."])
              ])
            ]),
            el("div", { class: "validar-ruta-review-head" }, [
              el("div", {}, ["Equipo"]),
              el("div", {}, ["Anterior"]),
              el("div", {}, ["Ingreso"]),
              el("div", {}, ["Validación"])
            ]),
            reviewList
          ])
        ])
      ]),
      el("div", { class: "validar-ruta-footer" }, [])
    ]);

    const modal = Modal("Validar Ruta", body, [], {
      closeOnBackdrop: false,
      blockRouteChange: true
    });
    modal.card.classList.add("validar-ruta-modal");

    const btnValidar = createActionButton({
      class: "btn ok",
      icon: "fas fa-check",
      text: "Validar Ruta",
      onClick: async () => {
        const nombre = String(nombreField.value || "").trim();
        const puesto = String(puestoField.value || "").trim();
        const observaciones = String(obsField.value || "").trim();

        if (!nombre) throw new Error("Nombre requerido.");
        if (!puesto) throw new Error("Puesto requerido.");
        const uncheckedReviews = getUncheckedReviewLabels();
        if (uncheckedReviews.length) {
          toast("Debes seleccionar todos los checks de validacion de equipos revisados.", "warn");
          throw new Error("Faltan checks de validacion: " + uncheckedReviews.join(", "));
        }

        const res = await window.api.rutas_validar(
          session,
          idRuta,
          nombre,
          puesto,
          observaciones || null,
          fechaMysql,
          buildReviewPayload()
        );
        if (res?.ok) {
          toast("Ruta validada correctamente.", "ok");
          modal.close();
          load();
          return;
        }
        throw new Error(res?.message || "Error al validar.");
      }
    });

    body.querySelector(".validar-ruta-footer")?.appendChild(btnValidar);
    modal.rebuildActions([]);
  }

  load();
}

function renderReportes(host) {
  const oldModule = document.querySelector('.report-module');
  if (oldModule) oldModule.classList.remove('report-module');

  host.classList.add('report-module');
  host.innerHTML = "";

  if (!can("REPORTS_VIEW")) {
    host.appendChild(el("div", { class: "card" }, [
      el("div", { class: "h1" }, [el("i", { class: "fas fa-chart-bar" }), " Reportes"]),
      el("div", { class: "small" }, ["No tienes permisos para ver reportes."])
    ]));
    return;
  }

  const info = el("div", { class: "small" }, [""]);
  const defaultRange = getMonthlyRange();

  const box = el("div", { class: "card module-standard-header" }, [
    el("div", { class: "titleRow" }, [
      el("div", {}, [
        el("div", { class: "h1" }, [
          el("i", { class: "fas fa-chart-bar" }),
          " Reportes (Admin)"
        ]),
        el("div", { class: "small" }, [
          `Rango por defecto: ${defaultRange.startStr} al ${defaultRange.endStr}`
        ])
      ]),
      el("div", { class: "actions" }, [
        can("REPORTS_EXPORT")
          ? el("span", { class: "pill" }, [
              el("i", { class: "fas fa-file-excel" }),
              " Export Excel habilitado"
            ])
          : el("span", { class: "pill" }, ["Export deshabilitado"])
      ])
    ]),
    el("div", { class: "report-status-line" }, [info])
  ]);

  const idTecnico = createSearchableSelect(
    [{ value: "", label: "(Todos los técnicos)" }, ...getSelectOptions(catalogos.tecnicos, "idUsuario", "nombre")],
    "(Todos los técnicos)",
    "",
    null
  );

  const desde = el("input", { type: "date" });
  const hasta = el("input", { type: "date" });

  const tipoTicketReporte = createSearchableSelect(
    [
      { value: "", label: "(Todos los tickets)" },
      { value: "INDIVIDUAL", label: "Individuales" },
      { value: "COMPARTIDO", label: "Compartidos" }
    ],
    "(Todos los tickets)",
    "",
    null
  );

  const tipoRutaReporte = createSearchableSelect(
    [
      { value: "", label: "(Todos los tipos)" },
      { value: "CERCANA", label: "Cercana" },
      { value: "INTERMEDIA", label: "Intermedia" },
      { value: "LEJANA", label: "Lejana" }
    ],
    "(Todos los tipos)",
    "",
    null
  );

  const pad = (n) => (n < 10 ? "0" + n : "" + n);

  desde.value = `${defaultRange.start.getFullYear()}-${pad(defaultRange.start.getMonth() + 1)}-${pad(defaultRange.start.getDate())}`;
  hasta.value = `${defaultRange.end.getFullYear()}-${pad(defaultRange.end.getMonth() + 1)}-${pad(defaultRange.end.getDate())}`;

  const getRangoFilename = () => {
    const desdeStr = desde.value
      ? desde.value
      : `${defaultRange.start.getFullYear()}-${pad(defaultRange.start.getMonth() + 1)}-${pad(defaultRange.start.getDate())}`;
    const hastaStr = hasta.value
      ? hasta.value
      : `${defaultRange.end.getFullYear()}-${pad(defaultRange.end.getMonth() + 1)}-${pad(defaultRange.end.getDate())}`;
    return `${desdeStr}_a_${hastaStr}`;
  };

  const getTecnicoReporteNombre = () => {
    const idTecnicoSeleccionado = Number(idTecnico?.value || 0);
    if (!idTecnicoSeleccionado) return "Todos_los_tecnicos";

    const tecnico = (catalogos?.tecnicos || []).find(
      (item) => Number(item?.idUsuario) === idTecnicoSeleccionado
    );
    const nombreBase = toUserText(tecnico?.nombre, "Tecnico");

    return String(nombreBase || "Tecnico")
      .trim()
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, "_");
  };

  const getTecnicoReporteDisplayName = () => {
    const idTecnicoSeleccionado = Number(idTecnico?.value || 0);
    if (!idTecnicoSeleccionado) return "Todos los técnicos";
    const tecnico = (catalogos?.tecnicos || []).find(
      (item) => Number(item?.idUsuario) === idTecnicoSeleccionado
    );
    return toUserText(tecnico?.nombre, "Técnico");
  };

  const getTipoTicketReporteMeta = () => {
    const value = String(tipoTicketReporte?.value || "").trim().toUpperCase();
    if (value === "INDIVIDUAL") {
      return { value, label: "Individuales", filenameLabel: "Individuales" };
    }
    if (value === "COMPARTIDO") {
      return { value, label: "Compartidos", filenameLabel: "Compartidos" };
    }
    return { value: "", label: "Todos", filenameLabel: "" };
  };

  const getTipoRutaReporteMeta = () => {
    const value = String(tipoRutaReporte?.value || "").trim().toUpperCase();
    if (value === "CERCANA") {
      return { value, label: "Cercana", filenameLabel: "Cercana" };
    }
    if (value === "INTERMEDIA") {
      return { value, label: "Intermedia", filenameLabel: "Intermedia" };
    }
    if (value === "LEJANA") {
      return { value, label: "Lejana", filenameLabel: "Lejana" };
    }
    return { value: "", label: "Todos", filenameLabel: "" };
  };

  const buildReporteTecnicoFilename = (prefix, extraLabels = []) => {
    const extras = (Array.isArray(extraLabels) ? extraLabels : [extraLabels])
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const baseParts = [prefix, getRangoFilename(), getTecnicoReporteNombre(), ...extras];
    return `${baseParts.join("_")}.xlsx`;
  };

  const getTipoTicketReporteTexto = () => {
    const meta = getTipoTicketReporteMeta();
    return meta.value ? `Filtro tipo: ${meta.label}` : "Filtro tipo: Todos";
  };

  const filterTicketRowsBySelectedType = (rows = []) => {
    const selectedType = getTipoTicketReporteMeta().value;
    if (!selectedType) return Array.isArray(rows) ? rows : [];

    return (Array.isArray(rows) ? rows : []).filter((row) => {
      const rowType = String(row?.tipo || "").trim().toUpperCase() === "COMPARTIDO"
        ? "COMPARTIDO"
        : "INDIVIDUAL";
      return rowType === selectedType;
    });
  };

  const out = el("div", { class: "report-results-host" }, []);
  const setupReportTableScroll = (scope) => {
    scope.querySelectorAll?.(".tableWrap").forEach((wrap) => {
      if (wrap.querySelector(":scope > .table-scroll")) return;

      const table = wrap.querySelector(":scope > table");
      if (!table) return;

      const tableScroll = el("div", { class: "table-scroll" }, []);
      table.replaceWith(tableScroll);
      tableScroll.appendChild(table);
      wrap.classList.add("report-table-scroll-shell");
    });
  };

  const mountReportCard = (card) => {
    out.innerHTML = "";
    setupReportTableScroll(card);
    out.appendChild(card);
    normalizeExcelTableHeaders(card);
  };

  const fetchRouteReportRows = async (filtros) => {
    try {
      return await window.api.reports_rutas(session, filtros) || [];
    } catch (err) {
      const message = toUserText(err?.message, "No se pudo generar el reporte de rutas.");
      info.textContent = `Error: ${message}`;
      toast(message, "err");
      return null;
    }
  };

  const fetchTicketReportRows = async (filtros) => {
    try {
      return await window.api.reports_tickets(session, filtros) || [];
    } catch (err) {
      const message = toUserText(err?.message, "No se pudo generar el reporte de tickets.");
      info.textContent = `Error: ${message}`;
      toast(message, "err");
      return null;
    }
  };

  const fetchProjectReportSummary = async (filtros) => {
    try {
      return await window.api.reports_proyectos_summary(session, filtros);
    } catch (err) {
      const message = toUserText(err?.message, "No se pudo generar el reporte de proyectos especiales.");
      info.textContent = `Error: ${message}`;
      toast(message, "err");
      return null;
    }
  };

  const normalizeReportValue = (value, fallback = "—") => {
    const text = toUserText(value, fallback).trim();
    return text || fallback;
  };

  const getTicketReportComplexityMeta = (value) => {
    const label = normalizeReportValue(value, "Sin clasificación");
    const key = label.toUpperCase();

    if (key.includes("BASICO")) return { code: "B", label: "Básico", className: "basico" };
    if (key.includes("INTERMEDIO")) return { code: "I", label: "Intermedio", className: "intermedio" };
    if (key.includes("COMPLEJO")) return { code: "C", label: "Complejo", className: "complejo" };
    if (key.includes("EXTRAORDINARIO")) return { code: "E", label: "Extraordinario", className: "extraordinario" };

    return { code: label, label, className: "neutral" };
  };

  const buildTicketReportComplexityBadge = (value) => {
    const meta = getTicketReportComplexityMeta(value);
    return meta.label;
  };

  const buildTicketUnifiedSystemRows = (individuales = [], compartidos = []) => ([
    ...individuales.map((row) => ({
      ...row,
      tipoLabel: "Individual",
      compartidoCon: "No aplica"
    })),
    ...compartidos.map((row) => ({
      ...row,
      tipoLabel: "Compartido"
    }))
  ]);

  const formatTicketExportDate = (date) => {
    const current = date instanceof Date ? date : new Date();
    return current.toLocaleDateString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatTicketExportTime = (date) => {
    const current = date instanceof Date ? date : new Date();
    return current.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatTicketHeaderRangeDate = (dateValue) => {
    const normalized = mysqlToDateValue(dateValue);
    const match = String(normalized || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "00-00-00";
    return `${match[3]}-${match[2]}-${match[1].slice(-2)}`;
  };

  const buildTicketExportHeaderTitle = (desdeValue, hastaValue) => {
    return `REPORTE DE TICKETS DEL ${formatTicketHeaderRangeDate(desdeValue)} AL ${formatTicketHeaderRangeDate(hastaValue)}`;
  };

  const getTicketExportComplexityKey = (value) => {
    const meta = getTicketReportComplexityMeta(value);
    const key = String(meta?.label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (key.includes("BASICO")) return "BASICO";
    if (key.includes("INTERMEDIO")) return "INTERMEDIO";
    if (key.includes("COMPLEJO")) return "COMPLEJO";
    if (key.includes("EXTRAORDINARIO")) return "EXTRAORDINARIO";
    return key || "SIN CLASIFICACION";
  };

  const getTicketExportComplexityLabel = (value) => {
    const key = getTicketExportComplexityKey(value);
    if (key === "BASICO") return "Básico";
    if (key === "INTERMEDIO") return "Intermedio";
    if (key === "COMPLEJO") return "Complejo";
    if (key === "EXTRAORDINARIO") return "Extraordinario";
    return normalizeReportValue(value, "Sin clasificación");
  };
  const formatTicketReportNumber = (value) => {
    const id = Math.max(0, Math.trunc(Number(value) || 0));
    return id ? `TK-${id}` : "—";
  };

  const buildTicketUniqueSummary = (rows = []) => {
    const uniqueTickets = Array.from(
      (rows || []).reduce((map, row) => {
        const idTicket = Number(row?.idTicket || 0) || 0;
        const key = idTicket > 0 ? String(idTicket) : JSON.stringify([
          row?.tipo || "",
          row?.tecnico || "",
          row?.unidad || "",
          row?.servicio || "",
          row?.solucion || "",
          row?.clasificacion || ""
        ]);
        if (!map.has(key)) map.set(key, row);
        return map;
      }, new Map()).values()
    );

    return uniqueTickets.reduce((totals, row) => {
      const tipo = String(row?.tipo || "").trim().toUpperCase() === "COMPARTIDO" ? "COMPARTIDO" : "INDIVIDUAL";
      const key = getTicketExportComplexityKey(row?.clasificacion);
      totals.totalTickets += 1;
      if (tipo === "INDIVIDUAL") totals.individuales += 1;
      if (tipo === "COMPARTIDO") totals.compartidos += 1;
      if (key.includes("BASICO")) totals.basico += 1;
      else if (key.includes("INTERMEDIO")) totals.intermedio += 1;
      else if (key.includes("COMPLEJO")) totals.complejo += 1;
      else if (key.includes("EXTRAORDINARIO")) totals.extraordinario += 1;
      return totals;
    }, { totalTickets: 0, individuales: 0, compartidos: 0, basico: 0, intermedio: 0, complejo: 0, extraordinario: 0 });
  };

  const buildTicketRowSummary = (rows = []) => {
    return (rows || []).reduce((totals, row) => {
      const tipo = String(row?.tipo || "").trim().toUpperCase() === "COMPARTIDO" ? "COMPARTIDO" : "INDIVIDUAL";
      const complejidad = getTicketExportComplexityKey(row?.clasificacion ?? row?.complejidad);
      totals.totalTickets += 1;
      if (tipo === "INDIVIDUAL") totals.individuales += 1;
      if (tipo === "COMPARTIDO") totals.compartidos += 1;
      if (complejidad.includes("BASICO")) totals.basico += 1;
      else if (complejidad.includes("INTERMEDIO")) totals.intermedio += 1;
      else if (complejidad.includes("COMPLEJO")) totals.complejo += 1;
      else if (complejidad.includes("EXTRAORDINARIO")) totals.extraordinario += 1;
      return totals;
    }, { totalTickets: 0, individuales: 0, compartidos: 0, basico: 0, intermedio: 0, complejo: 0, extraordinario: 0 });
  };

  const buildTicketDetailReportExportModelV2 = (rows = [], currentSession = null, exportHeaderTitle = "REPORTE DE TICKETS", exportMeta = {}) => {
    const normalizedRows = (rows || []).map((row) => {
      const complejidadLabel = getTicketExportComplexityLabel(row?.clasificacion);
      return {
        idTicket: Number(row?.idTicket || 0) || 0,
        numeroTicket: formatTicketReportNumber(row?.idTicket),
        tipo: String(row?.tipo || "").trim().toUpperCase() === "COMPARTIDO" ? "COMPARTIDO" : "INDIVIDUAL",
        tecnico: normalizeReportValue(row?.tecnico, "Sin técnico"),
        unidad: normalizeReportValue(row?.unidad),
        compartidoCon: normalizeReportValue(row?.compartidoCon),
        servicio: normalizeReportValue(row?.servicio),
        solucion: normalizeReportValue(row?.solucion),
        complejidad: complejidadLabel,
        complejidadLabel
      };
    });

    const totalsMode = String(exportMeta?.totalsMode || "unique").trim().toLowerCase() === "rows" ? "rows" : "unique";
    const summary = totalsMode === "rows"
      ? buildTicketRowSummary(rows)
      : buildTicketUniqueSummary(rows);
    const individuales = normalizedRows.filter((row) => row.tipo === "INDIVIDUAL");
    const compartidos = normalizedRows.filter((row) => row.tipo === "COMPARTIDO");
    const unifiedRows = buildTicketUnifiedSystemRows(individuales, compartidos);
    const generatedAt = new Date();
    const generatedBy = normalizeReportValue(currentSession?.nombre || currentSession?.rol, "Sistema");
    const titlePeriodMatch = String(exportHeaderTitle || "").match(/DEL\s+([^\s]+)\s+AL\s+([^\s]+)/i);
    const fallbackPeriod = titlePeriodMatch
      ? `${titlePeriodMatch[1].replace(/-/g, "/")} al ${titlePeriodMatch[2].replace(/-/g, "/")}`
      : "—";
    const reportPeriod = normalizeReportValue(exportMeta?.periodo, fallbackPeriod);
    const reportTechnician = normalizeReportValue(exportMeta?.tecnico, "Todos los técnicos");
    const padTicketRow = (row) => [...row, ...Array.from({ length: Math.max(0, 17 - row.length) }, () => "")];

    return {
      individuales,
      compartidos,
      totalRegistros: summary.totalTickets,
      summary,
      totalsMode,
      exportRows: [
        ["__REPORTE_TICKETS_COMPLEJIDADES__"],
        padTicketRow(["REPORTE DE TICKETS DE SOPORTE TÉCNICO"]),
        padTicketRow(["PERÍODO:", reportPeriod, "", "", "FECHA:", formatTicketExportDate(generatedAt), "", "HORA:", formatTicketExportTime(generatedAt)]),
        padTicketRow(["GENERADO POR:", generatedBy, "", "", "TÉCNICO:", reportTechnician]),
        [],
        padTicketRow(["TOTAL TICKETS", "", "TOTAL INDIVIDUALES", "", "TOTAL COMPARTIDOS", "", "TOTAL BÁSICO", "", "TOTAL INTERMEDIO", "", "TOTAL COMPLEJO", "", "TOTAL EXTRAORDINARIO"]),
        padTicketRow([summary.totalTickets, "", summary.individuales, "", summary.compartidos, "", summary.basico, "", summary.intermedio, "", summary.complejo, "", summary.extraordinario]),
        [],
        padTicketRow(["INDIVIDUAL - COMPARTIDOS"]),
        padTicketRow(["N. Ticket", "Técnico", "Unidad", "Servicio", "Solución", "", "", "", "", "", "", "", "", "", "Complejidad", "Tipo", "Compartido con"]),
        ...unifiedRows.map((row) => [
          row.numeroTicket || formatTicketReportNumber(row.idTicket),
          row.tecnico,
          row.unidad,
          row.servicio,
          row.solucion,
          "", "", "", "", "", "", "", "", "",
          row.complejidad,
          row.tipoLabel,
          row.compartidoCon
        ]),
        ["TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", summary.totalTickets]
      ]
    };
  };

  const buildTicketDetailSection = (title, columns, rows, renderRow, emptyText) => {
    const thead = el("thead", {}, [
      el("tr", {}, columns.map((column) => el("th", {}, [column])))
    ]);

    const tbody = el("tbody", {}, rows.length
      ? rows.map(renderRow)
      : [
          el("tr", { class: "report-ticket-detail-empty-row" }, [
            el("td", { colspan: String(columns.length), class: "report-ticket-detail-empty-cell" }, [emptyText])
          ])
        ]);

    const tfoot = el("tfoot", {}, [
      el("tr", { class: "report-ticket-detail-total-row" }, [
        el("td", { colspan: String(columns.length - 1) }, ["TOTAL"]),
        el("td", { class: "report-ticket-detail-total-value" }, [String(rows.length)])
      ])
    ]);

    return el("section", { class: "report-ticket-detail-section" }, [
      el("div", { class: "report-ticket-detail-section-title" }, [title]),
      el("div", { class: "tableWrap report-ticket-detail-wrap" }, [
        el("table", { class: "report-ticket-detail-table" }, [thead, tbody, tfoot])
      ])
    ]);
  };

  const getRouteExportHeaderTitle = (desdeValue, hastaValue) => {
    return `REPORTE DE RUTAS DEL ${formatTicketHeaderRangeDate(desdeValue)} AL ${formatTicketHeaderRangeDate(hastaValue)}`;
  };

  const getRouteTypeMeta = (value) => {
    const label = normalizeReportValue(value, "Sin tipo");
    const key = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    if (key.includes("CERCANA")) return { label: "CERCANA", className: "cercana" };
    if (key.includes("INTERMEDIA")) return { label: "INTERMEDIA", className: "intermedia" };
    if (key.includes("LEJANA")) return { label: "LEJANA", className: "lejana" };
    return { label, className: "neutral" };
  };

  const buildRouteTypeBadge = (value) => {
    const meta = getRouteTypeMeta(value);
    return meta.label;
  };

  const getRouteReviewColumns = () =>
    (Array.isArray(catalogos?.catalogo_equipo_revisado_ruta) ? catalogos.catalogo_equipo_revisado_ruta : [])
      .map((item) => ({
        key: String(item?.idCatalogoEquipoRevisadoR || "").trim(),
        label: String(item?.nombre || item?.clave || "").trim().toUpperCase()
      }))
      .filter((item) => item.key && item.label);

  const parseRouteReviewQuantities = (row) => {
    const values = {};
    String(row?.equiposRevisadosData || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const [rawKey, rawValue] = part.split("=");
        const key = String(rawKey || "").trim();
        if (!key) return;
        values[key] = Math.max(0, Math.trunc(Number(rawValue || 0) || 0));
      });
    return values;
  };

  const buildRouteIndividualReportModel = (
    rows = [],
    currentSession = null,
    exportHeaderTitle = "REPORTE DE RUTAS",
    exportMeta = {}
  ) => {
    const reviewColumns = getRouteReviewColumns();
    const normalizedRows = (rows || []).map((row) => ({
      unidad: normalizeReportValue(row?.unidad),
      participantes: normalizeReportValue(row?.participantes),
      tipo: getRouteTypeMeta(row?.tipo).label,
      reviewValues: parseRouteReviewQuantities(row)
    }));
    const generatedAt = new Date();
    const generatedBy = normalizeReportValue(currentSession?.nombre || currentSession?.rol, "Sistema");
    const titlePeriodMatch = String(exportHeaderTitle || "").match(/DEL\s+([^\s]+)\s+AL\s+([^\s]+)/i);
    const fallbackPeriod = titlePeriodMatch
      ? `${titlePeriodMatch[1].replace(/-/g, "/")} al ${titlePeriodMatch[2].replace(/-/g, "/")}`
      : "—";
    const reportTechnician = normalizeReportValue(exportMeta?.tecnico, "Todos los técnicos");
    const reportPeriod = normalizeReportValue(exportMeta?.periodo, fallbackPeriod);
    const routeTotals = normalizedRows.reduce((totals, row) => {
      const type = getRouteTypeMeta(row.tipo).className;
      if (type === "intermedia" || type === "lejana" || type === "cercana") totals[type] += 1;
      return totals;
    }, { intermedia: 0, lejana: 0, cercana: 0 });
    const headers = ["Unidad", "Participantes", "Tipo", ...reviewColumns.map((column) => column.label)];
    const totalColumns = Math.max(11, headers.length);
    const padRouteRow = (row) => [
      ...row,
      ...Array.from({ length: Math.max(0, totalColumns - row.length) }, () => "")
    ];

    return {
      rows: normalizedRows,
      reviewColumns,
      totalRegistros: normalizedRows.length,
      exportRows: [
        ["__REPORTE_RUTAS_INDIVIDUALES__"],
        padRouteRow(["REPORTE DE RUTAS DE SOPORTE TÉCNICO"]),
        padRouteRow(["PERÍODO:", reportPeriod, "", "", "FECHA:", formatTicketExportDate(generatedAt), "", "HORA:", formatTicketExportTime(generatedAt)]),
        padRouteRow(["GENERADO POR:", generatedBy, "", "", "TÉCNICO:", reportTechnician]),
        [],
        padRouteRow(["TOTAL RUTAS", "", "TOTAL INTERMEDIA", "", "TOTAL LEJANA", "", "TOTAL CERCANA"]),
        padRouteRow([normalizedRows.length, "", routeTotals.intermedia, "", routeTotals.lejana, "", routeTotals.cercana]),
        [],
        padRouteRow(headers),
        ...normalizedRows.map((row) => [
          row.unidad,
          row.participantes,
          row.tipo,
          ...reviewColumns.map((column) => row.reviewValues[column.key] ?? 0)
        ])
      ]
    };
  };

  const buildRouteGlobalWorkbookSheets = (
    globalRouteRows = [],
    rowsByTechnician = [],
    currentSession = null,
    exportHeaderTitle = "REPORTE DE RUTAS"
  ) => {
    const techNames = Array.from(
      new Set(
        (rowsByTechnician || [])
          .map((row) => normalizeReportValue(row?.tecnico, "Sin tecnico"))
          .filter(Boolean)
      )
    );

    return [
      {
        sheet: "Rutas Global",
        title: exportHeaderTitle,
        data: buildRouteIndividualReportModel(globalRouteRows, currentSession, exportHeaderTitle).exportRows
      },
      ...techNames.map((techName) => ({
        sheet: `Rutas - ${techName}`,
        title: exportHeaderTitle,
        data: buildRouteIndividualReportModel(
          (rowsByTechnician || [])
            .filter((row) => normalizeReportValue(row?.tecnico, "Sin tecnico") === techName)
            .map((row) => ({
              unidad: normalizeReportValue(row?.unidad),
              participantes: normalizeReportValue(row?.participantes),
              tipo: getRouteTypeMeta(row?.tipo).label,
              equiposRevisadosData: row?.equiposRevisadosData || ""
            })),
          currentSession,
          exportHeaderTitle,
          { tecnico: techName }
        ).exportRows
      }))
    ];
  };

  const buildRouteDetailSection = (title, columns, rows, renderRow, emptyText) => {
    const thead = el("thead", {}, [
      el("tr", {}, columns.map((column) => el("th", {}, [column])))
    ]);

    const tbody = el("tbody", {}, rows.length
      ? rows.map(renderRow)
      : [
          el("tr", { class: "report-route-detail-empty-row" }, [
            el("td", { colspan: String(columns.length), class: "report-route-detail-empty-cell" }, [emptyText])
          ])
        ]);

    const isRouteMatrix = String(columns?.[2] || "").trim().toUpperCase() === "TIPO" && columns.length > 3;
    const tfoot = el("tfoot", {}, [
      el("tr", { class: "report-route-detail-total-row" }, isRouteMatrix
        ? [
            el("td", { colspan: "2" }, ["TOTAL"]),
            el("td", { class: "report-route-detail-total-value" }, [String(rows.length)]),
            ...columns.slice(3).map(() => el("td", {}, [""]))
          ]
        : [
            el("td", { colspan: String(columns.length - 1) }, ["TOTAL"]),
            el("td", { class: "report-route-detail-total-value" }, [String(rows.length)])
          ])
    ]);

    return el("section", { class: "report-route-detail-section" }, [
      el("div", { class: "report-route-detail-section-title" }, [title]),
      el("div", { class: "tableWrap report-route-detail-wrap" }, [
        el("table", { class: "report-route-detail-table" }, [thead, tbody, tfoot])
      ])
    ]);
  };

  const getProjectExportHeaderTitle = (desdeValue, hastaValue) => {
    return `REPORTE DE PROYECTOS DEL ${formatTicketHeaderRangeDate(desdeValue)} AL ${formatTicketHeaderRangeDate(hastaValue)}`;
  };

  const buildProjectApprovedReportModel = (
    rows = [],
    currentSession = null,
    exportHeaderTitle = "REPORTE DE PROYECTOS",
    exportMeta = {}
  ) => {
    const normalizedRows = (rows || []).map((row) => ({
      titulo: normalizeReportValue(row?.titulo, "Sin titulo"),
      participantes: normalizeReportValue(row?.participantes),
      documento: normalizeReportValue(row?.urlDocumento)
    }));
    const generatedAt = new Date();
    const generatedBy = normalizeReportValue(currentSession?.nombre || currentSession?.rol, "Sistema");
    const titlePeriodMatch = String(exportHeaderTitle || "").match(/DEL\s+([^\s]+)\s+AL\s+([^\s]+)/i);
    const fallbackPeriod = titlePeriodMatch
      ? `${titlePeriodMatch[1].replace(/-/g, "/")} al ${titlePeriodMatch[2].replace(/-/g, "/")}`
      : "—";
    const reportPeriod = normalizeReportValue(exportMeta?.periodo, fallbackPeriod);
    const reportTechnician = normalizeReportValue(exportMeta?.tecnico, "Todos los técnicos");

    return {
      rows: normalizedRows,
      totalRegistros: normalizedRows.length,
      exportRows: [
        ["__REPORTE_PROYECTOS_APROBADOS__"],
        ["REPORTE DE PROYECTOS ESPECIALES"],
        ["PERÍODO:", reportPeriod, "", "FECHA / HORA:", `${formatTicketExportDate(generatedAt)} ${formatTicketExportTime(generatedAt)}`],
        ["GENERADO POR:", generatedBy, "", "TÉCNICO:", reportTechnician],
        [],
        ["TOTAL PROYECTOS APROBADOS"],
        [normalizedRows.length],
        [],
        ["PROYECTOS APROBADOS"],
        ["Título", "Participantes", "", "Documento", ""],
        ...normalizedRows.map((row) => [row.titulo, row.participantes, "", row.documento, ""]),
        ["TOTAL", "", "", "", normalizedRows.length]
      ]
    };
  };

  const buildProjectDetailSection = (title, rows, emptyText) => {
    const thead = el("thead", {}, [
        el("tr", {}, [
        el("th", {}, ["Título"]),
        el("th", {}, ["Participantes"]),
        el("th", {}, ["Documento"])
      ])
    ]);

    const tbody = el("tbody", {}, rows.length
      ? rows.map((row) => {
          const documento = normalizeReportValue(row?.documento);
          const hasDocument = documento !== "—" && documento !== "—";
          return el("tr", {}, [
            el("td", { title: row.titulo }, [row.titulo]),
            el("td", { class: "report-project-detail-text", title: row.participantes }, [row.participantes]),
            el("td", { class: "report-project-detail-center" }, [
              hasDocument
                ? el("a", {
                    href: "#",
                    class: "report-project-link",
                    title: documento,
                    onclick: async (ev) => {
                      ev.preventDefault();
                      try {
                        const resOpen = await window.api.open_external(documento);
                        if (!resOpen?.ok) throw new Error(resOpen?.message || "No se pudo abrir el documento");
                      } catch (err) {
                        toast(err?.message || "No se pudo abrir el documento", "err");
                      }
                    }
                  }, ["Abrir documento"])
                : "—"
            ])
          ]);
        })
      : [
          el("tr", { class: "report-project-detail-empty-row" }, [
            el("td", { colspan: "3", class: "report-project-detail-empty-cell" }, [emptyText])
          ])
        ]);

    const tfoot = el("tfoot", {}, [
      el("tr", { class: "report-project-detail-total-row" }, [
        el("td", { colspan: "2" }, ["TOTAL"]),
        el("td", { class: "report-project-detail-total-value" }, [String(rows.length)])
      ])
    ]);

    return el("section", { class: "report-project-detail-section" }, [
      el("div", { class: "report-project-detail-section-title" }, [title]),
      el("div", { class: "tableWrap report-project-detail-wrap" }, [
        el("table", { class: "report-project-detail-table" }, [thead, tbody, tfoot])
      ])
    ]);
  };

  let activeReportKey = "tickets";

  const setActiveReport = (reportKey) => {
    activeReportKey = reportKey;
    const reportButtons = [
      ["tickets", btnReporteTickets],
      ["rutas", btnGlobalRutas],
      ["proyectos", btnResumenProyectos]
    ];
    reportButtons.forEach(([key, button]) => {
      const isActive = key === activeReportKey;
      button?.classList?.toggle("report-action-active", isActive);
      button?.setAttribute?.("aria-pressed", isActive ? "true" : "false");
    });
    ticketTypeField?.classList?.toggle("report-context-filter-hidden", activeReportKey !== "tickets");
    routeTypeField?.classList?.toggle("report-context-filter-hidden", activeReportKey !== "rutas");
  };

  const btnReporteTickets = el("button", {
    class: "btn primary",
    onclick: async () => {
      setActiveReport("tickets");
      info.textContent = "Generando reporte de tickets...";

      const filtros = {
        desde: desde.value ? desde.value + " 00:00:00" : null,
        hasta: hasta.value ? hasta.value + " 23:59:59" : null,
        idTecnico: idTecnico.value === "" ? null : Number(idTecnico.value),
        tipoTicket: getTipoTicketReporteMeta().value || null
      };

      const reportRows = await fetchTicketReportRows(filtros);
      if (!reportRows) return;
      const rows = filterTicketRowsBySelectedType(reportRows);

      const desdeStr = desde.value ? formatDate(desde.value) : defaultRange.startStr;
      const hastaStr = hasta.value ? formatDate(hasta.value) : defaultRange.endStr;
      const titulo = `Reporte Tickets del ${desdeStr} al ${hastaStr}`;
      const exportHeaderTitle = buildTicketExportHeaderTitle(desde.value || defaultRange.startStr, hasta.value || defaultRange.endStr);
      const exportFilename = buildReporteTecnicoFilename(
        "Tickets",
        getTipoTicketReporteMeta().filenameLabel
      );
      const { individuales, compartidos, exportRows, totalRegistros, summary } = buildTicketDetailReportExportModelV2(
        rows,
        session,
        exportHeaderTitle,
        {
          periodo: `${formatTicketHeaderRangeDate(desde.value || defaultRange.startStr).replace(/-/g, "/")} al ${formatTicketHeaderRangeDate(hasta.value || defaultRange.endStr).replace(/-/g, "/")}`,
          tecnico: getTecnicoReporteDisplayName(),
          filtro: getTipoTicketReporteMeta().label,
          totalsMode: filtros.idTecnico ? "rows" : "unique"
        }
      );

      info.textContent = `${filtros.idTecnico ? "Tickets" : "Tickets únicos"}: ${summary.totalTickets} • Individuales: ${summary.individuales} • Compartidos: ${summary.compartidos} • ${getTipoTicketReporteTexto()}`;

      const card = el("div", { class: "card report-result-card" }, []);
      card.appendChild(
        el("div", { class: "titleRow" }, [
          el("div", {}, [
            el("div", { class: "h1" }, [
              el("i", { class: "fas fa-chart-bar" }),
              " " + titulo
            ]),
            el("div", { class: "small" }, [
              `${filtros.idTecnico ? "Tickets" : "Tickets únicos"}: ${summary.totalTickets} • Individuales: ${summary.individuales} • Compartidos: ${summary.compartidos}`
            ])
          ]),
          el("div", { class: "actions" }, [
            el("button", {
              class: "btn primary small",
              onclick: async () => {
                if (!totalRegistros) return toast("No hay datos para exportar.", "warn");
                return downloadExcel(
                  exportFilename,
                  exportRows,
                  titulo
                );
              }
            }, [el("i", { class: "fas fa-file-excel" }), " Exportar Excel"])
          ])
        ])
      );
      card.appendChild(el("hr"));

      if (!totalRegistros) {
        card.appendChild(el("div", { class: "report-empty-state" }, [
          el("i", { class: "fas fa-info-circle" }),
          " Sin resultados"
        ]));
      } else {
        const detailRows = buildTicketUnifiedSystemRows(individuales, compartidos);
        card.appendChild(el("div", { class: "report-ticket-detail-layout" }, [
          buildTicketDetailSection(
            "TICKETS",
            ["N. Ticket", "Tipo", "Tecnico", "Compartido con", "Unidad", "Servicio", "Solucion", "Complejidad"],
            detailRows,
            (row) => el("tr", {}, [
              el("td", { class: "report-ticket-detail-center", title: row.numeroTicket || formatTicketReportNumber(row.idTicket) }, [row.numeroTicket || formatTicketReportNumber(row.idTicket)]),
              el("td", { class: "report-ticket-detail-center", title: row.tipoLabel }, [row.tipoLabel]),
              el("td", { title: row.tecnico }, [row.tecnico]),
              el("td", { class: "report-ticket-detail-text", title: row.compartidoCon }, [row.compartidoCon]),
              el("td", { class: "report-ticket-detail-text", title: row.unidad }, [row.unidad]),
              el("td", { title: row.servicio }, [row.servicio]),
              el("td", { class: "report-ticket-detail-wrap", title: row.solucion }, [row.solucion]),
              el("td", { class: "report-ticket-detail-center" }, [buildTicketReportComplexityBadge(row.complejidadLabel)])
            ]),
            "Sin tickets en el rango seleccionado."
          )
        ]));
        mountReportCard(card);
      }

      mountReportCard(card);
    }
  }, [el("i", { class: "fas fa-ticket-alt" }), " Tickets"]);

  const btnGlobalRutas = el("button", {
    class: "btn primary",
    onclick: async () => {
      setActiveReport("rutas");
      const selectedTechnicianId = idTecnico.value === "" ? null : Number(idTecnico.value);
      const isGlobalReport = !selectedTechnicianId;
      info.textContent = isGlobalReport
        ? "Generando reporte global de rutas..."
        : "Generando reporte de rutas por técnico...";

      const filtrosGlobal = {
        desde: desde.value ? desde.value + " 00:00:00" : null,
        hasta: hasta.value ? hasta.value + " 23:59:59" : null,
        idTecnico: selectedTechnicianId,
        tipoRuta: String(tipoRutaReporte.value || "").trim().toUpperCase() || null,
        soloCalificados: true,
        desglosadoPorTecnico: true
      };

      const rowsPorTecnico = await fetchRouteReportRows(filtrosGlobal);
      if (!rowsPorTecnico) return;
      const normalizedRowsByTechnician = rowsPorTecnico;
      const normalizedGlobalRows = Array.from(
        new Map(
          normalizedRowsByTechnician.map((row) => [Number(row?.idRuta || 0), row])
        ).values()
      );

      const desdeStr = desde.value ? formatDate(desde.value) : defaultRange.startStr;
      const hastaStr = hasta.value ? formatDate(hasta.value) : defaultRange.endStr;
      const titulo = isGlobalReport
        ? `Global rutas calificadas del ${desdeStr} al ${hastaStr}`
        : `Rutas calificadas de ${getTecnicoReporteDisplayName()} del ${desdeStr} al ${hastaStr}`;
      const exportFilename = buildReporteTecnicoFilename(
        isGlobalReport ? "Rutas_Global" : "Rutas",
        getTipoRutaReporteMeta().filenameLabel
      );
      const exportHeaderTitle = getRouteExportHeaderTitle(
        desde.value || defaultRange.startStr,
        hasta.value || defaultRange.endStr
      );
      const routeReportModel = buildRouteIndividualReportModel(
        normalizedGlobalRows,
        session,
        exportHeaderTitle,
        {
          periodo: `${formatTicketHeaderRangeDate(desde.value || defaultRange.startStr).replace(/-/g, "/")} al ${formatTicketHeaderRangeDate(hasta.value || defaultRange.endStr).replace(/-/g, "/")}`,
          tecnico: getTecnicoReporteDisplayName()
        }
      );
      const { rows: globalRows, reviewColumns, exportRows, totalRegistros } = routeReportModel;
      const workbookSheets = isGlobalReport
        ? buildRouteGlobalWorkbookSheets(
            normalizedGlobalRows,
            normalizedRowsByTechnician,
            session,
            exportHeaderTitle
          )
        : null;
      const totalTecnicos = Array.from(
        new Set(
          normalizedRowsByTechnician.map((row) => normalizeReportValue(row?.tecnico, "Sin tecnico"))
        )
      ).length;

      info.textContent = isGlobalReport
        ? `Global rutas: ${totalRegistros} rutas calificadas de ${totalTecnicos} técnicos`
        : `${getTecnicoReporteDisplayName()}: ${totalRegistros} rutas calificadas`;

      const card = el("div", { class: "card report-result-card" }, []);
      card.appendChild(
        el("div", { class: "titleRow" }, [
          el("div", {}, [
            el("div", { class: "h1" }, [
              el("i", { class: "fas fa-layer-group" }),
              " " + titulo
            ]),
            el("div", { class: "small" }, [
              isGlobalReport
                ? `Técnicos: ${totalTecnicos} | Rutas calificadas: ${totalRegistros}`
                : `Técnico: ${getTecnicoReporteDisplayName()} | Rutas calificadas: ${totalRegistros}`
            ])
          ]),
          el("div", { class: "actions" }, [
            el("button", {
              class: "btn primary small",
              onclick: () => totalRegistros
                ? (isGlobalReport
                    ? downloadExcelMulti(exportFilename, workbookSheets)
                    : downloadExcel(exportFilename, exportRows, titulo))
                : toast("No hay datos para exportar.", "warn")
            }, [el("i", { class: "fas fa-file-excel" }), " Exportar Excel"])
          ])
        ])
      );
      card.appendChild(el("hr"));

      if (!totalRegistros) {
        card.appendChild(el("div", { class: "report-empty-state" }, [
          el("i", { class: "fas fa-info-circle" }),
          " Sin rutas calificadas en el rango seleccionado."
        ]));
      } else {
        card.appendChild(el("div", { class: "report-route-detail-layout" }, [
          buildRouteDetailSection(
            isGlobalReport ? "RUTAS GLOBALES" : `RUTAS DE ${getTecnicoReporteDisplayName().toUpperCase()}`,
            ["Unidad", "Participantes", "Tipo", ...reviewColumns.map((column) => column.label)],
            globalRows,
            (row) => el("tr", {}, [
              el("td", { title: row.unidad }, [row.unidad]),
              el("td", { class: "report-route-detail-text", title: row.participantes }, [row.participantes]),
              el("td", { class: "report-route-detail-center" }, [buildRouteTypeBadge(row.tipo)]),
              ...reviewColumns.map((column) =>
                el("td", { class: "report-route-detail-center" }, [String(row.reviewValues[column.key] ?? 0)])
              )
            ]),
            "Sin rutas calificadas en el rango seleccionado."
          )
        ]));
      }

      mountReportCard(card);
    }
  }, [el("i", { class: "fas fa-route" }), " Rutas"]);

  const btnResumenProyectos = el("button", {
    class: "btn primary",
    onclick: async () => {
      setActiveReport("proyectos");
      info.textContent = "Generando resumen mensual proyectos...";

      const filtros = {
        desde: desde.value ? desde.value + " 00:00:00" : null,
        hasta: hasta.value ? hasta.value + " 23:59:59" : null,
        idTecnico: idTecnico.value === "" ? null : Number(idTecnico.value)
      };

      const result = await fetchProjectReportSummary(filtros);
      if (!result) return;

      const desdeStr = desde.value ? formatDate(desde.value) : defaultRange.startStr;
      const hastaStr = hasta.value ? formatDate(hasta.value) : defaultRange.endStr;
      const titulo = `Resumen mensual proyectos aprobados del ${desdeStr} al ${hastaStr}`;
      const exportFilename = buildReporteTecnicoFilename("Proyectos_Especiales", "Aprobados");

      if (!result || !result.ok) {
        info.textContent = "Error: " + toUserText(result?.message, "Error desconocido.");
        return;
      }

      const rows = result.data || [];
      info.textContent = `Resumen: ${rows.length} proyectos aprobados`;
      const exportHeaderTitle = getProjectExportHeaderTitle(
        desde.value || defaultRange.startStr,
        hasta.value || defaultRange.endStr
      );
      const { rows: detailRows, exportRows, totalRegistros } = buildProjectApprovedReportModel(
        rows,
        session,
        exportHeaderTitle,
        {
          periodo: `${formatTicketHeaderRangeDate(desde.value || defaultRange.startStr).replace(/-/g, "/")} al ${formatTicketHeaderRangeDate(hasta.value || defaultRange.endStr).replace(/-/g, "/")}`,
          tecnico: getTecnicoReporteDisplayName()
        }
      );

      const card = el("div", { class: "card report-result-card" }, []);
      card.appendChild(
        el("div", { class: "titleRow" }, [
          el("div", {}, [
            el("div", { class: "h1" }, [
              el("i", { class: "fas fa-chart-bar" }),
              " " + titulo
            ]),
            el("div", { class: "small" }, [
              `Proyectos aprobados: ${totalRegistros}`
            ])
          ]),
          el("div", { class: "actions" }, [
            el("button", {
              class: "btn primary small",
              onclick: () => totalRegistros
                ? downloadExcel(exportFilename, exportRows, titulo)
                : toast("No hay datos para exportar.", "warn")
            }, [el("i", { class: "fas fa-file-excel" }), " Exportar Excel"])
          ])
        ])
      );
      card.appendChild(el("hr"));

      if (!totalRegistros) {
        card.appendChild(el("div", { class: "report-empty-state" }, [
          el("i", { class: "fas fa-info-circle" }),
          " Sin resultados"
        ]));
      } else {
        card.appendChild(el("div", { class: "report-project-detail-layout" }, [
          buildProjectDetailSection(
            "PROYECTOS APROBADOS",
            detailRows,
            "Sin proyectos aprobados en el rango seleccionado."
          )
        ]));
        mountReportCard(card);
      }

      mountReportCard(card);
    }
  }, [el("i", { class: "fas fa-project-diagram" }), " Proyectos Especiales"]);

  const btnBuscarReportes = el("button", {
    class: "btn",
    onclick: () => {
      const activeButton = {
        tickets: btnReporteTickets,
        rutas: btnGlobalRutas,
        proyectos: btnResumenProyectos
      }[activeReportKey];
      activeButton?.click();
    }
  }, [el("i", { class: "fas fa-search" }), " Buscar"]);

  const btnLimpiarReportes = el("button", {
    class: "btn",
    onclick: () => {
      desde.value = "";
      hasta.value = "";
      idTecnico.clear?.();
      tipoTicketReporte.clear?.();
      tipoRutaReporte.clear?.();
      info.textContent = "Filtros limpiados.";
      out.innerHTML = "";
    }
  }, [el("i", { class: "fas fa-broom" }), " Limpiar"]);

  const ticketTypeField = el("div", { class: "field report-context-filter" }, [
    el("label", {}, [el("i", { class: "fas fa-users" }), " Tipo ticket"]),
    tipoTicketReporte
  ]);
  const routeTypeField = el("div", { class: "field report-context-filter" }, [
    el("label", {}, [el("i", { class: "fas fa-route" }), " Tipo ruta"]),
    tipoRutaReporte
  ]);

  const filtersCard = el("div", { class: "card report-filters-card" }, [
    el("div", { class: "h1" }, [el("i", { class: "fas fa-filter" }), " Filtros"]),
    el("div", { class: "small report-filter-copy" }, [
      "Personalice el rango de fechas y/o técnico para los reportes."
    ]),
    el("div", { class: "row report-filter-row" }, [
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-calendar" }), " Desde"]),
        desde
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-calendar" }), " Hasta"]),
        hasta
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-user" }), " Técnico"]),
        idTecnico
      ]),
      ticketTypeField,
      routeTypeField,
      el("div", { class: "actions actions-inline report-filter-search-actions" }, [
        btnBuscarReportes,
        btnLimpiarReportes
      ])
    ]),
    el("div", { class: "actions report-actions-bar" }, [
      btnReporteTickets,
      btnGlobalRutas,
      btnResumenProyectos
    ])
  ]);

  setActiveReport(activeReportKey);

  host.appendChild(box);
  host.appendChild(filtersCard);
  host.appendChild(out);
}


