
/**
 * Modal de consulta de equipo (solo lectura)
 */
function EquipoModal(row, onDone) {
  if (!row) {
    toast("No se encontró información del equipo.", "warn");
    return null;
  }

  const estado = row?.estado || "EN_TALLER";

  const idUnidadDisplay =
    catalogos?.unidades?.find((u) => u.idUnidad == row?.idUnidad)?.nombre || "—";
  const tecnicoDisplay =
    catalogos?.tecnicos?.find((t) => t.idUsuario == row?.idTecnicoAsignado)?.nombre || "—";
  const tipoEquipoDisplay =
    catalogos?.tiposEquipo?.find((te) => te.idTipoEquipo == row?.idTipoEquipo)?.nombre || "—";

const form = el("div", {}, [
    // SECCIÓN 1: INFORMACIÓN DEL TICKET (2x2 grid)
    el("div", { class: "ticket-section" }, [
      el("div", { class: "section-title" }, ["INFORMACIÓN DEL TICKET"]),
      el("div", { class: "ticket-grid" }, [
        el("div", { class: "info-item" }, [
          el("div", { class: "info-label" }, ["Ticket:"]),
          el("div", { class: "info-value" }, ["#" + (row?.idTicket || "—")])
        ]),
        el("div", { class: "info-item" }, [
          el("div", { class: "info-label" }, ["Nº Equipo:"]),
          el("div", { class: "info-value mono" }, [row?.numeroEquipo || "—"])
        ]),
        el("div", { class: "info-item" }, [
          el("div", { class: "info-label" }, ["Unidad:"]),
          el("div", { class: "info-value" }, [idUnidadDisplay])
        ]),
        el("div", { class: "info-item" }, [
          el("div", { class: "info-label" }, ["Técnico:"]),
          el("div", { class: "info-value" }, [tecnicoDisplay])
        ])
      ])
    ]),

    // SECCIÓN 2: EQUIPO
    el("div", { class: "equipo-section" }, [
      el("div", { class: "section-title" }, ["EQUIPO"]),
      el("div", { class: "info-item fullwidth" }, [
        el("div", { class: "info-label" }, ["Tipo de equipo"]),
        el("div", { class: "info-value" }, [tipoEquipoDisplay])
      ])
    ]),

    // SECCIÓN 3: HISTORIAL
    el("div", { class: "historial-section" }, [
      el("div", { class: "section-title" }, ["HISTORIAL"]),
      el("div", { class: "historial-grid" }, [
        el("div", { class: "historial-item" }, [
          el("div", { class: "historial-label" }, ["Ingreso"]),
          el("div", { class: "historial-value" }, [formatDate(row?.fechaRecibido)])
        ]),
        row?.fechaSalida ? el("div", { class: "historial-item" }, [
          el("div", { class: "historial-label" }, ["Salida"]),
          el("div", { class: "historial-value" }, [formatDate(row.fechaSalida)])
        ]) : null,
        row?.resultado && row.resultado !== "PENDIENTE" ? el("div", { class: "historial-item resultado-item" }, [
          el("div", { class: "historial-label" }, ["Resultado"]),
          el("div", { class: "historial-value badge " + (row.resultado === "CON_SOLUCION" ? "con-solucion" : "sin-solucion") }, [row.resultado])
        ]) : el("div", { class: "historial-item" }, [
          el("div", { class: "historial-label" }, ["Resultado"]),
          el("div", { class: "historial-value badge pendiente" }, ["PENDIENTE"])
        ])
      ])
    ])
  ]);

  const title = `Equipo ${row?.numeroEquipo || row?.idEquipoControl || "—"} (${row?.estado || "EN_TALLER"})`;

  let modal;
  modal = Modal(title, form, []); // Sin botón cerrar manual (usa automático del Modal)

  return modal;
}

/**
 * Selector de ticket para crear equipo - recibe tickets directamente
 */

function renderEquipos(host, prefillData) {
  if (!can("EQUIPOS_VIEW")) {
    host.innerHTML = '<div class="card" style="padding:40px;text-align:center"><i class="fas fa-lock" style="font-size:48px;color:var(--warn);margin-bottom:20px;"></i><h2 style="color:var(--text);">Sin acceso</h2><div class="small" style="color:var(--muted);">Requiere permiso EQUIPOS_VIEW</div></div>';
    return;
  }

  host.innerHTML = "";

  const info = el("div", { class: "small" }, [""]);
  let isLoading = false;

  const idUnidad = createSearchableSelect(
    getSelectOptions(catalogos?.unidades || [], "idUnidad", "nombre"),
    "(Unidad)",
    "",
    (val) => { idUnidad.value = val; }
  );

  const idTecnico = createSearchableSelect(
    getSelectOptions(catalogos?.tecnicos || [], "idUsuario", "nombre"),
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
  // Solo UI: tabla con estilo tipo "Excel" (solo en listado de Equipos)
  const tableScroll = el("div", { class: "table-scroll" }, []);
  const tableFooter = el("div", { class: "table-footer-host" }, []);
  const tableWrap = el("div", { class: "tableWrap module-table equipos-excel has-footer" }, [tableScroll, tableFooter]);

  // ✅ Root wrapper para que apliquen correctamente los estilos del módulo (CSS espera .module-equipos)
  const moduleRoot = el("div", { class: "module-equipos" }, []);

  const header = el("div", { class: "card module-standard-header" }, [
    el("div", { class: "titleRow" }, [
      el("div", {}, [
        el("div", { class: "h1" }, [el("i", { class: "fas fa-desktop" }), " Módulo Equipos"]),
        el("div", { class: "small" }, ["Control de ingreso y salida de equipos al taller"])
      ]),
      el("div", { class: "actions" }, [
        el("div", { class: "small muted", style: "padding:8px;" }, [
          el("i", { class: "fas fa-eye" }), " Solo búsqueda y historial"
        ])
      ])
    ]),

    el("div", { class: "module-filters" }, [
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]), idUnidad]),
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-user" }), " Técnico"]), idTecnico]),
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-calendar" }), " Desde"]), desde]),
        el("div", { class: "field" }, [el("label", {}, [el("i", { class: "fas fa-calendar" }), " Hasta"]), hasta]),
        el("div", { class: "actions actions-inline" }, [
          el("button", { class: "btn", onclick: () => { if (!isLoading) { page = 1; load(); } } }, [
            el("i", { class: "fas fa-search" }), " Buscar"
          ]),
          el("button", {
            class: "btn",
            onclick: () => {
              if (typeof idUnidad.clear === "function") idUnidad.clear();
              if (typeof idTecnico.clear === "function") idTecnico.clear();
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
        idUnidad: idUnidad.value === "" ? null : Number(idUnidad.value),
        idTecnico: idTecnico.value === "" ? null : Number(idTecnico.value),
        desde: desde.value ? dateToMysqlStartOfDay(desde.value) : null,
        hasta: hasta.value ? dateToMysqlEndOfDay(hasta.value) : null,
        page,
        pageSize
      };

      const res = await window.api.equipos_list(session, filtros);

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
        let estadoBadgeClass = "badge";
        if (r.estado === "EN_TALLER") estadoBadgeClass += " en-taller";
        else if (r.estado === "ENTREGADO") estadoBadgeClass += " entregado";
        else if (r.estado === "CANCELADO") estadoBadgeClass += " cancelado";

        let estadoBadgeNode;
        if (r.estado === "EN_TALLER") {
          estadoBadgeNode = el("span", {
            class: `${estadoBadgeClass} equipo-estado-icon-badge`,
            title: "EN_TALLER",
            "aria-label": "EN_TALLER"
          }, [el("i", { class: "fas fa-screwdriver-wrench", "aria-hidden": "true" })]);
        } else if (r.estado === "ENTREGADO") {
          estadoBadgeNode = el("span", {
            class: `${estadoBadgeClass} equipo-estado-icon-badge equipo-estado-delivered`,
            title: "ENTREGADO",
            "aria-label": "ENTREGADO"
          }, [
            el("i", { class: "fas fa-box estado-main-icon", "aria-hidden": "true" }),
            el("i", { class: "fas fa-check estado-accent-icon", "aria-hidden": "true" })
          ]);
        } else {
          estadoBadgeNode = el("span", { class: estadoBadgeClass }, [r.estado === "EN_TALLER" ? "EN_TALLER" : r.estado]);
        }

        let resultadoBadge;
        if (r.resultado === "CON_SOLUCION") {
          resultadoBadge = el("span", { class: "badge con-solucion" }, ["CON_SOLUCION"]);
        } else if (r.resultado === "SIN_SOLUCION") {
          resultadoBadge = el("span", { class: "badge sin-solucion" }, ["SIN_SOLUCION"]);
        } else {
          resultadoBadge = el("span", { class: "badge pendiente" }, ["PENDIENTE"]);
        }

        return el("tr", {
          style: "cursor:pointer;",
          title: "Ver detalle",
          onclick: () => EquipoModal(r, load)
        }, [
          el("td", { class: "mono" }, [r.idTicket ? "TK-" + r.idTicket : "—"]),
          el("td", {}, [r.numeroEquipo || "—"]),
          el("td", {}, [r.tipoEquipo || "—"]),
          el("td", {}, [r.unidad || "—"]),
          el("td", {}, [r.tecnicoAsignado || "—"]),
          el("td", {}, [estadoBadgeNode]),
          el("td", {}, [resultadoBadge]),
          el("td", { class: "mono" }, [formatDate(r.fechaRecibido)]),
          el("td", { class: "mono" }, [r.fechaSalida ? formatDate(r.fechaSalida) : "—"])
        ]);
      }));

      const tbl = el("table", {}, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", {}, compactIdHeader("fas fa-ticket-alt", "Ticket N°", "TK", true)),
            el("th", {}, compactIdHeader("fas fa-barcode", "N° Equipo", "EQ", true)),
            el("th", { title: "Tipo" }, [tableHeadLabel("fas fa-desktop", "Tipo")]),
            el("th", { title: "Unidad" }, [tableHeadLabel("fas fa-building", "Unidad")]),
            el("th", { title: "Técnico" }, [tableHeadLabel("fas fa-user", "Técnico")]),
            el("th", { title: "Estado" }, [tableHeadLabel("fas fa-flag", "Estado")]),
            el("th", { title: "Resultado" }, [tableHeadLabel("fas fa-clipboard-check", "Resultado")]),
            el("th", { title: "Ingreso" }, [tableHeadLabel("fas fa-calendar-plus", "Ingreso")]),
            el("th", { title: "Salida" }, [tableHeadLabel("fas fa-calendar-check", "Salida")])
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
      isLoading = false;
    }
  }

  load();

  if (prefillData && prefillData.idTicket) {
    // flujo pendiente: no autoabrir modal aquí
  }
}

function EnvioEquipoAssignTicketModal(row, onDone) {
  const body = el("div", { class: "envio-equipo-modal-body" }, [
    el("div", { class: "small" }, [
      `Asigna un ticket abierto para el equipo ${row?.numeroEquipo || "—"} (${row?.unidadNombre || "—"}).`
    ])
  ]);
  const modal = Modal("Asignar Ticket", body, [], {
    closeOnBackdrop: false,
    blockRouteChange: true
  });
  const btnCancelar = el("button", {
    class: "btn",
    type: "button",
    onclick: () => modal.close()
  }, [el("i", { class: "fas fa-times" }), " Cancelar"]);
  modal.rebuildActions([btnCancelar]);

  (async () => {
    const res = await window.api.envio_equipo_ticketsDisponibles(session, { idUnidad: row.idUnidad });
    if (!res?.ok) throw new Error(res?.message || "No se pudieron cargar los tickets.");
    const rows = Array.isArray(res.rows) ? res.rows : [];

    if (!rows.length) {
      body.appendChild(
        el("div", { class: "envio-equipo-empty" }, [
          el("i", { class: "fas fa-ticket-alt" }),
          " No hay tickets abiertos disponibles para esta sucursal."
        ])
      );
      return;
    }

    const ticketSelect = createSearchableSelect(
      rows.map((ticket) => ({ value: ticket.idTicket, label: formatEnvioTicketLabel(ticket) })),
      "(Seleccionar ticket)",
      "",
      null
    );

    body.appendChild(
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-ticket-alt" }), " Ticket disponible"]),
        ticketSelect
      ])
    );

    const btnGuardar = createActionButton({
      class: "btn primary",
      icon: "fas fa-link",
      text: "Asignar Ticket",
      onClick: async () => {
        const idTicket = Number(ticketSelect.value || 0);
        if (!idTicket) throw new Error("Debes seleccionar un ticket.");
        const save = await window.api.envio_equipo_assignTicket(session, {
          idEnvioEquipo: row.idEnvioEquipo,
          idTicket
        });
        if (!save?.ok) throw new Error(save?.message || "No se pudo asignar el ticket.");
        toast("Ticket asignado correctamente.", "ok");
        modal.close();
        onDone?.();
      }
    });

    modal.rebuildActions([btnCancelar, btnGuardar]);
  })().catch((err) => {
    body.appendChild(
      el("div", { class: "envio-equipo-empty" }, [
        el("i", { class: "fas fa-circle-exclamation" }),
        " ",
        getUserErrorMessage(err, "No se pudieron cargar los tickets.")
      ])
    );
  });
}

function openPrefilledTicketFromEnvio(row) {
  if (!can("TICKETS_CREATE")) {
    throw new Error("No tienes permiso para crear tickets.");
  }

  const resolvePrefillPuestoId = () => {
    const envioPuestoId = Number(row?.idPuestoSolicitante || 0);
    if (envioPuestoId > 0) return envioPuestoId;

    const directId = Number(row?.idPuestoPersonalSucursal || 0);
    if (directId > 0) return directId;

    const roleKey = String(row?.creadoPorRolNombre || "").trim().toUpperCase();
    const preferredPuestoName =
      roleKey === "GERENCIAL" ? "Gerente" :
      roleKey === "ANALISTA" ? "Analista" :
      roleKey === "TECNICO" ? "Personal IT" :
      roleKey === "SUPERVISOR" ? "Supervisor de Ventas" :
      "";

    if (!preferredPuestoName) return 0;

    const puesto = (catalogos?.puestos || []).find(
      (item) => String(item?.nombre || "").trim().toUpperCase() === preferredPuestoName.toUpperCase()
    );

    return Number(puesto?.idPuesto || 0);
  };

  const nombreSolicitante =
    String(row?.nombreSolicitanteEnvio || "").trim() ||
    String(row?.nombrePersonalSucursal || "").trim() ||
    String(row?.creadoPorNombre || "").trim() ||
    String(row?.tecnicoPersonalITNombre || "").trim() ||
    "";

  setPendingTicketPrefill({
    source: "envio_equipo",
    idEnvioEquipo: Number(row?.idEnvioEquipo || 0),
    idUnidad: Number(row?.idUnidad || 0),
    idTipoEquipo: Number(row?.idTipoEquipo || 0),
    numeroEquipo: row?.numeroEquipo || "",
    nombreSolicitante,
    idPuesto: resolvePrefillPuestoId()
  });

  AppShell("tickets");
}

function openExistingTicketById(idTicket) {
  const ticketId = Number(idTicket || 0);
  if (!ticketId) return;
  setPendingTicketOpenId(ticketId);
  AppShell("tickets");
}

function EnvioEquipoEstadoModal(row, onDone, options = {}) {
  const allowedStatesSource = Array.isArray(options?.onlyStates) && options.onlyStates.length
    ? options.onlyStates
    : getEnvioAllowedNextStates(row);
  const allowedStates = allowedStatesSource.filter(Boolean);

  if (!allowedStates.length) {
    toast("Este envío ya no tiene cambios de estado disponibles.", "warn");
    return;
  }

  const presetState = String(options?.presetState || "").trim().toUpperCase();
  const selectedState = allowedStates.includes(presetState) ? presetState : allowedStates[0];
  const lockState = !!options?.lockState;

  const nuevoEstado = createSearchableSelect(
    allowedStates.map((state) => ({ value: state, label: formatEnvioEstado(state) })),
    "(Seleccionar estado)",
    selectedState,
    null
  );
  if (lockState) {
    nuevoEstado.value = selectedState;
    const main = nuevoEstado.querySelector(".searchable-select-main");
    if (main) {
      const selectedOption = allowedStates.find((state) => state === selectedState);
      main.value = selectedOption ? formatEnvioEstado(selectedOption) : "";
      main.readOnly = true;
      main.disabled = true;
    }
  }
  const fechaEvento = el("input", { type: "datetime-local", value: nowLocalDtLocal() });
  const observaciones = el("textarea", { placeholder: "Observaciones (obligatorio si es Extraviado)" }, []);

  const body = el("div", { class: "envio-equipo-modal-body" }, [
    el("div", { class: "envio-equipo-modal-summary" }, [
      el("div", {}, [
        el("div", { class: "small" }, ["Equipo"]),
        el("strong", {}, [row?.numeroEquipo || "—"])
      ]),
      el("div", {}, [
        el("div", { class: "small" }, ["Estado actual"]),
        badgeEnvioEstado(row?.estadoActual)
      ])
    ]),
    el("div", { class: "field" }, [
      el("label", {}, [el("i", { class: "fas fa-flag" }), " Nuevo estado"]),
      nuevoEstado
    ]),
    el("div", { class: "field" }, [
      el("label", {}, [el("i", { class: "fas fa-calendar-day" }), " Fecha del evento"]),
      fechaEvento
    ]),
    el("div", { class: "field" }, [
      el("label", {}, [el("i", { class: "fas fa-comment-dots" }), " Observaciones"]),
      observaciones
    ])
  ]);

  const modal = Modal("Actualizar Estado", body, [], {
    closeOnBackdrop: false,
    blockRouteChange: true
  });

  const btnCancelar = el("button", {
    class: "btn",
    type: "button",
    onclick: () => modal.close()
  }, [el("i", { class: "fas fa-times" }), " Cancelar"]);

  const btnGuardar = createActionButton({
    class: "btn primary",
    icon: "fas fa-save",
    text: "Guardar Estado",
    onClick: async () => {
      const estado = String(nuevoEstado.value || "").trim().toUpperCase();
      if (!estado) throw new Error("Debes seleccionar un estado.");
      if (estado === "EXTRAVIADO" && !String(observaciones.value || "").trim()) {
        throw new Error("Debes escribir observaciones para EXTRAVIADO.");
      }

      const save = await window.api.envio_equipo_updateEstado(session, {
        idEnvioEquipo: row.idEnvioEquipo,
        nuevoEstado: estado,
        fechaEvento: dtLocalToMysql(fechaEvento.value),
        observacionesEstadoActual: String(observaciones.value || "").trim() || null
      });
      if (!save?.ok) throw new Error(save?.message || "No se pudo actualizar el estado.");
      toast("Estado actualizado correctamente.", "ok");
      modal.close();
      onDone?.();
    }
  });

  modal.rebuildActions([btnCancelar, btnGuardar]);
}

function renderEnvioEquipo(host) {
  host.innerHTML = "";
  host.classList.remove("report-module", "calif-module");
  host.classList.add("envio-equipo-module");

  if (!can("ENVIO_EQUIPO_VIEW")) {
    host.appendChild(el("div", { class: "card" }, [
      el("div", { class: "h1" }, [el("i", { class: "fas fa-lock" }), " Sin acceso"]),
      el("div", { class: "small" }, ["Requiere permiso ENVIO_EQUIPO_VIEW"])
    ]));
    return;
  }

  const canCreate = can("ENVIO_EQUIPO_CREATE");
  const canUpdate = can("ENVIO_EQUIPO_UPDATE");
  const isGerencialModule = hasRole("GERENCIAL");
  const canAccessCreateView = isGerencialModule && canCreate;
  const defaultRange = getMonthlyRange();
  function getUnitOptions() {
    return getEnvioUnidadOptions();
  }

  function getTypeOptions() {
    return getSelectOptions(catalogos?.tiposEquipo || [], "idTipoEquipo", "nombre");
  }

  function getPuestoOptions() {
    return getSelectOptions(catalogos?.puestos || [], "idPuesto", "nombre");
  }

  function getTecnicoOptions() {
    return getSelectOptions(catalogos?.tecnicos || [], "idUsuario", "nombre");
  }

  function getMotivoOptions() {
    const rows = Array.isArray(catalogos?.des_motivo_envio) ? catalogos.des_motivo_envio : [];
    return getSelectOptions(
      rows.filter((item) => Number(item?.activo ?? 1) === 1),
      "idMotivoEnvio",
      "nombre"
    );
  }

  function getMedioCatalog() {
    const rows = Array.isArray(catalogos?.des_medio_envio) ? catalogos.des_medio_envio : [];
    return rows
      .map((item) => ({
        idMedioEnvio: Number(item.idMedioEnvio || 0),
        clave: String(item.clave || "").trim().toUpperCase(),
        nombre: String(item.nombre || "").trim() || "—",
        orden: Number(item.orden || 0),
        activo: Number(item?.activo ?? 1)
      }))
      .filter((item) => item.idMedioEnvio && item.clave && item.activo === 1)
      .sort((a, b) => a.orden - b.orden || a.idMedioEnvio - b.idMedioEnvio);
  }

  function getStateOptions() {
    const rows = Array.isArray(catalogos?.des_estado_envio) ? catalogos.des_estado_envio : [];
    return [
      { value: "", label: "(Todos los estados)" },
      ...rows
        .map((item) => ({
          value: String(item.clave || "").trim().toUpperCase(),
          label: String(item.nombre || "").trim() || "—",
          orden: Number(item.orden || 0),
          activo: Number(item?.activo ?? 1)
        }))
        .filter((item) => item.value && item.activo === 1)
        .sort((a, b) => a.orden - b.orden || a.label.localeCompare(b.label))
        .map((item) => ({ value: item.value, label: item.label }))
    ];
  }

  function getEnvioTicketStatusLabel(row) {
    const estadoActualKey = String(row?.estadoActual || "").trim().toUpperCase();
    if (estadoActualKey === "ENVIADO") return "Pendiente recibir";
    if (estadoActualKey === "RECIBIDO") return "Pendiente TK";
    if (estadoActualKey === "EXTRAVIADO") return "No aplica";
    if (estadoActualKey === "EN_REVISION" || estadoActualKey === "REPARADO" || estadoActualKey === "ENTREGADO") {
      return "Sin ticket";
    }
    return "Sin ticket";
  }

  let requestedInitialTab = "";
  try {
    requestedInitialTab = sessionStorage.getItem("envioEquipoInitialTab") || "";
    sessionStorage.removeItem("envioEquipoInitialTab");
  } catch {}
  let currentTab = requestedInitialTab === "historial"
    ? "historial"
    : (canAccessCreateView ? "nuevo" : "historial");
  let currentPage = 1;
  let currentPageSize = 25;
  let isLoading = false;
  let opsCurrentPage = 1;
  let opsPageSize = 25;
  let opsSelectedId = null;
  let opsDetailDismissed = false;
  let opsDetailLargeText = false;

  const root = el("div", { class: `module-envio-equipo${isGerencialModule ? "" : " is-ops-center"}` }, []);
  const stage = el("div", { class: "envio-equipo-stage" }, []);
  const tabsBar = canAccessCreateView
    ? el("div", { class: "envio-equipo-tabs" }, [
        el("button", {
          class: "btn envio-equipo-tab active",
          type: "button",
          onclick: () => switchTab("nuevo")
        }, [el("i", { class: "fas fa-plus" }), " Nuevo Envío"]),
        el("button", {
          class: "btn envio-equipo-tab",
          type: "button",
          onclick: () => switchTab("historial")
        }, [el("i", { class: "fas fa-clock-rotate-left" }), " Historial"])
      ])
    : null;

  if (isGerencialModule) {
    root.appendChild(
      el("div", { class: "card envio-equipo-header-card module-standard-header" }, [
        el("div", { class: "titleRow" }, [
          el("div", {}, [
            el("div", { class: "h1" }, [el("i", { class: "fas fa-shipping-fast" }), " Módulo Envío de Equipo"]),
            el("div", { class: "small" }, ["Registra nuevos envíos y consulta su historial."])
          ]),
          el("div", { class: "envio-equipo-header-pill" }, [
            el("i", { class: canAccessCreateView ? "fas fa-plus-circle" : "fas fa-list-check" }),
            canAccessCreateView ? "Nuevo envío habilitado" : "Seguimiento operativo"
          ])
        ])
      ])
    );
  }
  if (tabsBar) root.appendChild(tabsBar);
  root.appendChild(stage);
  host.appendChild(root);

  function buildCreateView() {
    const unitOptions = getUnitOptions();
    const typeOptions = getTypeOptions();
    const puestoOptions = getPuestoOptions();
    const tecnicoOptions = getTecnicoOptions();
    const motivoOptions = getMotivoOptions();
    const medioCatalog = getMedioCatalog();
    const defaultUnitValue = String(unitOptions[0]?.value || "");
    const puestoCandidatesByRole = {
      GERENCIAL: ["Gerente", "Gerente Regional", "Gerente Aperturas"],
      ANALISTA: ["Analista", "Analista Elite"],
      TECNICO: ["Personal IT"],
      SUPERVISOR: ["Supervisor de Ventas", "Supervisor de caja"],
      ADMIN: ["Analista", "Programador Externo", "Gerente"]
    };

    const normalizeTextKey = (value) =>
      String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

    const getDefaultPuestoSolicitanteValue = () => {
      const roleKey = String(session?.rol || "").trim().toUpperCase();
      const candidates = puestoCandidatesByRole[roleKey] || [];
      const normalizedCandidates = candidates.map((item) => normalizeTextKey(item));
      const match = (catalogos?.puestos || []).find((item) =>
        normalizedCandidates.includes(normalizeTextKey(item?.nombre))
      );
      return String(match?.idPuesto || "");
    };

    const defaultPuestoSolicitanteValue = getDefaultPuestoSolicitanteValue();
    const numeroEquipo = el("input", { value: "Se generará automáticamente", readonly: true, disabled: true });
    const idUnidad = createSearchableSelect(unitOptions, "(Seleccionar unidad)", defaultUnitValue, null);
    const nombreSolicitanteEnvio = el("input", {
      value: "",
      placeholder: "Escribe el nombre del solicitante"
    });
    const idPuestoSolicitante = createSearchableSelect(
      puestoOptions,
      "(Seleccionar puesto)",
      defaultPuestoSolicitanteValue,
      null
    );
    const idTipoEquipo = createSearchableSelect(typeOptions, "(Seleccionar tipo de equipo)", "", null);
    const motivoEnvio = createSearchableSelect(motivoOptions, "(Seleccionar motivo)", "", null);
    const observaciones = el("textarea", { placeholder: "Observaciones" }, []);
    const fechaEnvio = el("input", { type: "datetime-local", value: nowLocalDtLocal() });
    const nombrePiloto = el("input", { placeholder: "Nombre del piloto" });
    const telefonoPiloto = el("input", { placeholder: "Teléfono" });
    const placaVehiculo = el("input", { placeholder: "Placa del vehículo" });
    const nombreSucursalManual = el("input", { placeholder: "Nombre de quien entrega" });
    const idPuestoSucursal = createSearchableSelect(puestoOptions, "(Seleccionar puesto)", "", null);
    const idTecnicoIT = createSearchableSelect(tecnicoOptions, "(Seleccionar técnico de IT)", "", null);
    const medioIconMap = {
      CAMION: "fas fa-truck",
      PERSONAL_SUCURSAL: "fas fa-store",
      PERSONAL_IT: "fas fa-user-gear"
    };
    const defaultMedioId = Number(medioCatalog[0]?.idMedioEnvio || 1);
    let medioEnvioId = defaultMedioId;

    function setSearchableSelectValue(select, value, options) {
      select.value = value ? String(value) : "";
      const main = select.querySelector(".searchable-select-main");
      if (!main) return;
      const selected = options.find((opt) => String(opt.value) === String(value || ""));
      main.value = selected ? selected.label : "";
    }

    function getCurrentMedio() {
      return medioCatalog.find((item) => Number(item.idMedioEnvio) === Number(medioEnvioId)) || medioCatalog[0];
    }

    function getCurrentMedioKey() {
      return String(getCurrentMedio()?.clave || "CAMION").trim().toUpperCase();
    }

    const truckCard = el("div", { class: "envio-equipo-truck-card envio-equipo-medium-detail" }, [
      el("div", { class: "envio-equipo-truck-title" }, [
        el("i", { class: "fas fa-truck" }),
        " Información del traslado"
      ]),
      el("div", { class: "envio-equipo-form-grid envio-equipo-form-grid-truck" }, [
        el("div", { class: "field" }, [
          el("label", {}, ["Nombre del piloto *"]),
          nombrePiloto
        ]),
        el("div", { class: "field" }, [
          el("label", {}, ["Teléfono *"]),
          telefonoPiloto
        ]),
        el("div", { class: "field" }, [
          el("label", {}, ["Placa del vehículo *"]),
          placaVehiculo
        ])
      ])
    ]);

    const sucursalCard = el("div", { class: "envio-equipo-truck-card envio-equipo-medium-detail hidden" }, [
      el("div", { class: "envio-equipo-truck-title" }, [
        el("i", { class: "fas fa-store" }),
        " Información del personal sucursal"
      ]),
      el("div", { class: "envio-equipo-form-grid envio-equipo-form-grid-truck" }, [
        el("div", { class: "field" }, [
          el("label", {}, ["Nombre *"]),
          nombreSucursalManual
        ]),
        el("div", { class: "field" }, [
          el("label", {}, ["Puesto *"]),
          idPuestoSucursal
        ])
      ])
    ]);

    const itCard = el("div", { class: "envio-equipo-truck-card envio-equipo-medium-detail hidden" }, [
      el("div", { class: "envio-equipo-truck-title" }, [
        el("i", { class: "fas fa-user-gear" }),
        " Información del personal IT"
      ]),
      el("div", { class: "envio-equipo-form-grid envio-equipo-form-grid-truck" }, [
        el("div", { class: "field" }, [
          el("label", {}, ["Técnico *"]),
          idTecnicoIT
        ])
      ])
    ]);

    function syncMedioPanels() {
      const medioKey = getCurrentMedioKey();
      truckCard.classList.toggle("hidden", medioKey !== "CAMION");
      sucursalCard.classList.toggle("hidden", medioKey !== "PERSONAL_SUCURSAL");
      itCard.classList.toggle("hidden", medioKey !== "PERSONAL_IT");
    }

    const medioGroup = el("div", { class: "envio-equipo-radio-group" }, medioCatalog.map((item) => el("label", { class: "envio-equipo-radio-card" }, [
      el("input", {
        type: "radio",
        name: "envio-medio",
        value: String(item.idMedioEnvio),
        checked: Number(item.idMedioEnvio) === Number(medioEnvioId),
        onchange: () => {
          medioEnvioId = Number(item.idMedioEnvio || defaultMedioId);
          syncMedioPanels();
        }
      }),
      el("span", { class: "envio-equipo-radio-ui" }, [
        el("i", { class: medioIconMap[item.clave] || "fas fa-circle" }),
        item.nombre
      ])
    ])));

    const card = el("div", { class: "card envio-equipo-create-card" }, [
      el("div", { class: "titleRow" }, [
        el("div", {}, [
          el("div", { class: "h1" }, [el("i", { class: "fas fa-box-open" }), " Nuevo Envío"]),
          el("div", { class: "small" }, ["El número de equipo se genera automáticamente al guardar."])
        ])
      ]),
      el("div", { class: "envio-equipo-layout" }, [
        el("div", { class: "envio-equipo-pane" }, [
          el("div", { class: "envio-equipo-pane-title" }, ["Información general"]),
          el("div", { class: "envio-equipo-form-grid" }, [
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-barcode" }), " N. de Equipo"]),
              numeroEquipo
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-building" }), " Sucursal *"]),
              idUnidad
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-user" }), " Solicitante *"]),
              nombreSolicitanteEnvio
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-briefcase" }), " Puesto *"]),
              idPuestoSolicitante
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-desktop" }), " Tipo de equipo *"]),
              idTipoEquipo
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-calendar-alt" }), " Fecha de envío *"]),
              fechaEnvio
            ]),
            el("div", { class: "field envio-equipo-form-grid-wide" }, [
              el("label", {}, [el("i", { class: "fas fa-paper-plane" }), " Motivo de envío *"]),
              motivoEnvio
            ]),
            el("div", { class: "field envio-equipo-form-grid-wide" }, [
              el("label", {}, [el("i", { class: "fas fa-comment-dots" }), "Detalle observaciones o daño"]),
              observaciones
            ])
          ])
        ]),
        el("div", { class: "envio-equipo-pane envio-equipo-pane-side" }, [
          el("div", { class: "envio-equipo-pane-title" }, ["Medio de envío"]),
          medioGroup,
          el("div", { class: "envio-equipo-medium-details" }, [
            truckCard,
            sucursalCard,
            itCard
          ])
        ])
      ])
    ]);

    const btnLimpiar = el("button", {
      class: "btn",
      type: "button",
      onclick: () => {
        idUnidad.value = defaultUnitValue;
        const unidadMain = idUnidad.querySelector(".searchable-select-main");
        if (unidadMain) {
          const selected = unitOptions.find((opt) => String(opt.value) === String(defaultUnitValue));
          unidadMain.value = selected ? selected.label : "";
        }
        idTipoEquipo.value = "";
        const tipoMain = idTipoEquipo.querySelector(".searchable-select-main");
        if (tipoMain) tipoMain.value = "";
        nombreSolicitanteEnvio.value = "";
        setSearchableSelectValue(idPuestoSolicitante, defaultPuestoSolicitanteValue, puestoOptions);
        setSearchableSelectValue(motivoEnvio, "", motivoOptions);
        observaciones.value = "";
        fechaEnvio.value = nowLocalDtLocal();
        medioEnvioId = defaultMedioId;
        medioGroup.querySelectorAll('input[type="radio"]').forEach((radio) => {
          radio.checked = Number(radio.value || 0) === Number(defaultMedioId);
        });
        nombrePiloto.value = "";
        telefonoPiloto.value = "";
        placaVehiculo.value = "";
        nombreSucursalManual.value = "";
        setSearchableSelectValue(idPuestoSucursal, "", puestoOptions);
        setSearchableSelectValue(idTecnicoIT, "", tecnicoOptions);
        syncMedioPanels();
      }
    }, [el("i", { class: "fas fa-broom" }), " Limpiar"]);

    const btnGuardar = createActionButton({
      class: "btn primary",
      icon: "fas fa-save",
      text: "Guardar Envío",
      onClick: async () => {
        const medioEnvio = getCurrentMedioKey();
        const save = await window.api.envio_equipo_create(session, {
          idUnidad: Number(idUnidad.value || 0),
          idTipoEquipo: Number(idTipoEquipo.value || 0),
          nombreSolicitanteEnvio: String(nombreSolicitanteEnvio.value || "").trim(),
          idPuestoSolicitante: Number(idPuestoSolicitante.value || 0),
          idMotivoEnvio: Number(motivoEnvio.value || 0),
          observaciones: String(observaciones.value || "").trim() || null,
          idMedioEnvio: Number(medioEnvioId || 0),
          fechaEnvio: dtLocalToMysql(fechaEnvio.value),
          nombrePiloto: medioEnvio === "CAMION" ? String(nombrePiloto.value || "").trim() : null,
          telefonoPiloto: medioEnvio === "CAMION" ? String(telefonoPiloto.value || "").trim() : null,
          placaVehiculo: medioEnvio === "CAMION" ? String(placaVehiculo.value || "").trim() : null,
          nombrePersonalSucursal:
            medioEnvio === "PERSONAL_SUCURSAL" ? String(nombreSucursalManual.value || "").trim() : null,
          idPuestoPersonalSucursal:
            medioEnvio === "PERSONAL_SUCURSAL" ? Number(idPuestoSucursal.value || 0) : null,
          idTecnicoPersonalIT:
            medioEnvio === "PERSONAL_IT" ? Number(idTecnicoIT.value || 0) : null
        });
        if (!save?.ok) throw new Error(save?.message || "No se pudo crear el envío.");
        toast(`Envío registrado como ${save.numeroEquipo}.`, "ok");
        switchTab("historial");
      }
    });

    syncMedioPanels();
    card.appendChild(el("div", { class: "envio-equipo-create-actions" }, [btnLimpiar, btnGuardar]));
    return card;
  }

  function buildOpsCenterView() {
    const unitOptions = getUnitOptions();
    const idUnidad = createSearchableSelect(unitOptions, "Todas las unidades", "", null);
    const desde = el("input", { type: "date", value: mysqlToDateValue(defaultRange.start) });
    const hasta = el("input", { type: "date", value: mysqlToDateValue(defaultRange.end) });
    const activeStatusHint = el("div", { class: "envio-equipo-ops-status-hint", hidden: true }, []);
    const summaryGrid = el("div", { class: "envio-equipo-ops-summary-grid" }, []);
    const tableScroll = el("div", { class: "table-scroll" }, []);
    const tableFooter = el("div", { class: "table-footer-host" }, []);
    const tableWrap = el("div", { class: "tableWrap envio-equipo-ops-table-wrap has-footer" }, [tableScroll, tableFooter]);
    const detailAside = el("aside", { class: "envio-equipo-ops-detail" }, []);
    let currentRows = [];
    let currentTotal = 0;
    let activeSummaryState = "";
    let inlineStatePickers = [];

    const shell = el("div", { class: "envio-equipo-ops-shell" }, [
      el("div", { class: "envio-equipo-ops-main" }, [
        el("div", { class: "card envio-equipo-ops-header module-standard-header" }, [
          el("div", { class: "titleRow" }, [
            el("div", {}, [
              el("div", { class: "h1" }, [
                el("i", { class: "fas fa-shipping-fast" }),
                "Módulo Envio de Equipos"
              ])
            ])
          ])
        ]),
        summaryGrid,
        activeStatusHint,
        el("div", { class: "card envio-equipo-ops-filter-card" }, [
          el("div", { class: "envio-equipo-ops-filters" }, [
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]),
              idUnidad
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-calendar-alt" }), " Desde"]),
              desde
            ]),
            el("div", { class: "field" }, [
              el("label", {}, [el("i", { class: "fas fa-calendar-check" }), " Hasta"]),
              hasta
            ]),
            el("div", { class: "actions envio-equipo-ops-filter-actions" }, [
              el("button", {
                class: "btn",
                type: "button",
                onclick: () => load(1)
              }, [el("i", { class: "fas fa-search" }), " Buscar"]),
              el("button", {
                class: "btn",
                type: "button",
                onclick: () => {
                  idUnidad.value = "";
                  const unidadMain = idUnidad.querySelector(".searchable-select-main");
                  if (unidadMain) unidadMain.value = "";
                  desde.value = mysqlToDateValue(defaultRange.start);
                  hasta.value = mysqlToDateValue(defaultRange.end);
                  activeSummaryState = "";
                  load(1);
                }
              }, [el("i", { class: "fas fa-broom" }), " Limpiar"])
            ])
          ])
        ]),
        el("div", { class: "card envio-equipo-ops-table-card" }, [
          tableWrap
        ])
      ]),
      detailAside
    ]);

    function getCurrentFilters({ includeState = true } = {}) {
      return {
        idUnidad: idUnidad.value ? Number(idUnidad.value) : null,
        desde: desde.value ? dateToMysqlStartOfDay(desde.value) : null,
        hasta: hasta.value ? dateToMysqlEndOfDay(hasta.value) : null,
        estadoActual: includeState && activeSummaryState ? activeSummaryState : null
      };
    }

    function getEnvioOpsStateMeta(estado) {
      const key = String(estado || "").trim().toUpperCase();
      return {
        key,
        icon:
          key === "REPARADO" ? "fas fa-circle-check" :
          key === "EXTRAVIADO" ? "fas fa-triangle-exclamation" :
          key === "EN_REVISION" ? "fas fa-screwdriver-wrench" :
          key === "RECIBIDO" ? "fas fa-inbox" :
          key === "ENTREGADO" ? "fas fa-box-open" :
          "fas fa-paper-plane",
        chipClass:
          key === "REPARADO" ? "is-success" :
          key === "EXTRAVIADO" ? "is-danger" :
          key === "EN_REVISION" ? "is-warning" :
          key === "RECIBIDO" ? "is-teal" :
          key === "ENTREGADO" ? "is-neutral" :
          "is-info",
        rowClass:
          key === "REPARADO" ? "tone-success" :
          key === "EXTRAVIADO" ? "tone-danger" :
          key === "EN_REVISION" ? "tone-warning" :
          key === "RECIBIDO" ? "tone-teal" :
          key === "ENTREGADO" ? "tone-neutral" :
          "tone-info"
      };
    }

    function formatEnvioOpsStateLabel(estado) {
      const key = String(estado || "").trim().toUpperCase();
      return ({
        ENVIADO: "ENVIADO",
        RECIBIDO: "RECIBIDO",
        EN_REVISION: "REVISANDO",
        REPARADO: "REPARADO",
        ENTREGADO: "ENTREGADO",
        EXTRAVIADO: "EXTRAVIADO"
      })[key] || "ESTADO";
    }

    function getEnvioOpsEquipmentIcon(typeName) {
      const key = String(typeName || "").trim().toUpperCase();
      if (key.includes("IMPRESORA")) return "fas fa-print";
      if (key.includes("CAMARA")) return "fas fa-video";
      if (key.includes("LAPTOP") || key.includes("NOTEBOOK")) return "fas fa-laptop";
      if (key.includes("CPU") || key.includes("OPTIPLEX") || key.includes("TORRE")) return "fas fa-computer";
      if (key.includes("MONITOR")) return "fas fa-tv";
      return "fas fa-microchip";
    }

    function buildSummaryCard({ key, icon, title, caption, value, tone }) {
      const isActive = activeSummaryState === key;
      return el("button", {
        class: `card envio-equipo-ops-summary-card ${tone}${isActive ? " is-active" : ""}`,
        type: "button",
        title: isActive ? `Quitar filtro ${title}` : `Filtrar por ${title}`,
        onclick: () => {
          activeSummaryState = isActive ? "" : key;
          opsDetailDismissed = false;
          load(1);
        }
      }, [
        el("div", { class: "envio-equipo-ops-summary-icon" }, [
          el("i", { class: icon })
        ]),
        el("div", { class: "envio-equipo-ops-summary-copy" }, [
          el("strong", {}, [String(value ?? 0)]),
          el("span", { class: "envio-equipo-ops-summary-title" }, [title]),
          el("span", { class: "envio-equipo-ops-summary-caption" }, [caption])
        ])
      ]);
    }

    function renderSummary(summary = {}) {
      const cards = [
        {
          key: "ENVIADO",
          icon: "fas fa-paper-plane",
          title: "Enviados",
          caption: "Pendientes de recibir",
          value: Number(summary.enviados || 0),
          tone: "tone-info"
        },
        {
          key: "RECIBIDO",
          icon: "fas fa-inbox",
          title: "Recibidos",
          caption: "Pendientes de revisar",
          value: Number(summary.recibidos || 0),
          tone: "tone-teal"
        },
        {
          key: "EN_REVISION",
          icon: "fas fa-screwdriver-wrench",
          title: "Revisando",
          caption: "En proceso técnico",
          value: Number(summary.revisando || 0),
          tone: "tone-warning"
        },
        {
          key: "REPARADO",
          icon: "fas fa-circle-check",
          title: "Reparados",
          caption: "Listos para entregar",
          value: Number(summary.reparados || 0),
          tone: "tone-success"
        },
        {
          key: "EXTRAVIADO",
          icon: "fas fa-triangle-exclamation",
          title: "Extraviados",
          caption: "Requiere atención",
          value: Number(summary.extraviados || 0),
          tone: "tone-danger"
        }
      ];

      summaryGrid.innerHTML = "";
      cards.forEach((card) => summaryGrid.appendChild(buildSummaryCard(card)));
      activeStatusHint.hidden = !activeSummaryState;
      activeStatusHint.innerHTML = "";
      if (activeSummaryState) {
        activeStatusHint.append(
          el("span", { class: "envio-equipo-ops-status-pill" }, [
            "Filtro activo: ",
            formatEnvioEstado(activeSummaryState)
          ]),
          el("button", {
            class: "btn envio-equipo-ops-status-clear",
            type: "button",
            onclick: () => {
              activeSummaryState = "";
              load(1);
            }
          }, [el("i", { class: "fas fa-times" }), " Ver todos"])
        );
      }
    }

    function buildDetailRows(items = [], options = {}) {
      const withIcons = !!options?.withIcons;
      const validItems = items.filter((item) => item && item.value !== null && item.value !== undefined && String(item.value).trim() !== "");
      if (!validItems.length) {
        return el("div", { class: "envio-equipo-ops-empty-inline" }, ["Sin información registrada."]);
      }

      return el("div", { class: `envio-equipo-ops-detail-rows${withIcons ? " has-icons" : ""}` }, validItems.map((item) =>
        el("div", { class: "envio-equipo-ops-detail-row" }, [
          el("div", { class: "envio-equipo-ops-detail-row-label" }, [
            withIcons && item.icon ? el("i", { class: item.icon }) : null,
            el("span", {}, [item.label])
          ].filter(Boolean)),
          el("strong", { class: "envio-equipo-ops-detail-row-value" }, [String(item.value)])
        ])
      ));
    }

    function getTrackingStateDate(row, estado) {
      const key = String(estado || "").trim().toUpperCase();

      switch (key) {
        case "ENVIADO":
          return row?.fechaEnvio || null;
        case "RECIBIDO":
          return row?.fechaRecepcion || null;
        case "EN_REVISION":
          return row?.fechaRevision || null;
        case "REPARADO":
          return row?.fechaReparacion || null;
        case "ENTREGADO":
          return row?.fechaEntrega || null;
        case "EXTRAVIADO":
          return row?.fechaExtravio || null;
        default:
          return null;
      }
    }

    function hasTrackingStepReached(row, key, currentKey, currentIndex, stepIndex) {
      if (currentKey === "EXTRAVIADO") {
        return key === "ENVIADO" && !!row?.fechaEnvio;
      }

      return currentIndex >= 0 && stepIndex <= currentIndex;
    }

    function buildTrackingStep(step, nextStepReached = false, isLast = false) {
      const tone =
        step.isCurrent ? "is-current" :
        step.isDanger ? "is-danger" :
        step.isReached ? "is-done" :
        "is-pending";
      const showDate = step.isReached && !!step.stateDate;

      return el("div", { class: `envio-equipo-ops-track-step ${tone}` }, [
        el("div", { class: "envio-equipo-ops-track-rail" }, [
          el("span", { class: "envio-equipo-ops-track-dot" }, [
            el("i", { class: step.isDanger ? "fas fa-triangle-exclamation" : (step.isReached ? "fas fa-check" : "fas fa-circle") })
          ]),
          !isLast ? el("span", { class: `envio-equipo-ops-track-line${nextStepReached ? " is-reached" : ""}` }) : null
        ]),
        el("div", { class: "envio-equipo-ops-track-copy" }, [
          el("strong", {}, [step.label]),
          el("span", { class: showDate ? "" : "is-empty" }, [showDate ? formatDateTime(step.stateDate) : ""])
        ])
      ]);
    }

    function buildTrackingList(row) {
      const currentKey = String(row?.estadoActual || "").trim().toUpperCase();
      const flow = [
        ["ENVIADO", "Enviado"],
        ["RECIBIDO", "Recibido"],
        ["EN_REVISION", "Revisando"],
        ["REPARADO", "Reparado"],
        ["ENTREGADO", "Entregado"]
      ];
      const currentIndex = flow.findIndex(([key]) => key === currentKey);
      const includeExtravio = currentKey === "EXTRAVIADO" || !!row?.fechaExtravio;
      const steps = flow.map(([key, label], idx) => ({
        key,
        label,
        stateDate: getTrackingStateDate(row, key),
        isReached: hasTrackingStepReached(row, key, currentKey, currentIndex, idx),
        isCurrent: currentKey !== "EXTRAVIADO" && currentKey === key,
        isDanger: false
      }));

      if (includeExtravio) {
        const extravioDate = getTrackingStateDate(row, "EXTRAVIADO");
        steps.push({
          key: "EXTRAVIADO",
          label: "Extraviado",
          stateDate: extravioDate,
          isReached: !!extravioDate,
          isCurrent: currentKey === "EXTRAVIADO",
          isDanger: currentKey === "EXTRAVIADO"
        });
      }

      const trackChildren = steps.map((step, idx) => {
        const nextStepReached = idx < steps.length - 1 ? !!steps[idx + 1]?.isReached : false;
        return buildTrackingStep(step, nextStepReached, idx >= steps.length - 1);
      });

      return el("div", { class: "envio-equipo-ops-track-list" }, trackChildren);
    }

    function buildDetailSection(title, icon, content, extraClass = "") {
      return el("div", { class: `envio-equipo-ops-detail-section ${extraClass}`.trim() }, [
        el("div", { class: "envio-equipo-ops-detail-section-head" }, [
          el("h3", {}, [title])
        ]),
        content
      ]);
    }

    function renderDetail(row) {
      const shouldShow = !!row && !opsDetailDismissed;
      shell.classList.toggle("has-detail", shouldShow);
      detailAside.classList.toggle("large-text", shouldShow && opsDetailLargeText);
      detailAside.hidden = !shouldShow;
      detailAside.innerHTML = "";
      if (!shouldShow) {
        return;
      }

      const stateMeta = getEnvioOpsStateMeta(row.estadoActual);
      const detailItems = [
        {
          label: "Solicitante",
          value: row.nombreSolicitanteEnvio || row.creadoPorNombre || "—"
        },
        {
          label: "Puesto solicitante",
          value: row.puestoSolicitanteNombre || row.puestoPersonalSucursalNombre || "—"
        },
        { label: "Unidad", value: row.unidadNombre || "—" },
        { label: "Fecha de envío", value: formatDateTime(row.fechaEnvio) },
        { label: "Motivo de envío", value: row.motivoEnvio || "—" },
        { label: "Daño / Observación", value: row.observaciones || "Sin observaciones registradas" }
      ];
      const shippingItems = [
        { label: "Envío", value: row.medioEnvioNombre || formatEnvioMedio(row.medioEnvio), icon: "fas fa-truck-fast" },
        { label: "Piloto", value: row.nombrePiloto || null, icon: "far fa-user" },
        { label: "Placa", value: row.placaVehiculo || null, icon: "far fa-address-card" },
        { label: "Teléfono", value: row.telefonoPiloto || null, icon: "fas fa-phone-alt" },
        { label: "Entrega", value: row.nombrePersonalSucursal || null, icon: "fas fa-user-check" },
        { label: "Puesto", value: row.puestoPersonalSucursalNombre || null, icon: "fas fa-briefcase" },
        { label: "Técnico IT", value: row.tecnicoPersonalITNombre || null, icon: "fas fa-user-gear" },
        { label: "Registrado por", value: row.creadoPorNombre || "—", icon: "fas fa-user-pen" }
      ];
      const currentStateDate = getEnvioStateDate(row);
      const heroIcon = getEnvioOpsEquipmentIcon(row.tipoEquipoNombre);
      const ticketNumber = row.ticketNumero || row.idTicketAsignado || null;

      detailAside.appendChild(
        el("div", { class: `card envio-equipo-ops-detail-card is-${stateMeta.chipClass}` }, [
          el("div", { class: "envio-equipo-ops-detail-head" }, [
            el("div", { class: "h1" }, ["Detalle del equipo"]),
            el("div", { class: "envio-equipo-ops-detail-actions" }, [
              el("button", {
                class: "btn envio-equipo-ops-text-size-btn",
                type: "button",
                title: opsDetailLargeText ? "Restaurar tamaño de texto" : "Aumentar tamaño de texto",
                "aria-label": opsDetailLargeText ? "Restaurar tamaño de texto" : "Aumentar tamaño de texto",
                onclick: (event) => {
                  opsDetailLargeText = !opsDetailLargeText;
                  detailAside.classList.toggle("large-text", opsDetailLargeText);
                  const button = event.currentTarget;
                  const title = opsDetailLargeText ? "Restaurar tamaño de texto" : "Aumentar tamaño de texto";
                  button.title = title;
                  button.setAttribute("aria-label", title);
                  button.textContent = opsDetailLargeText ? "A" : "A+";
                }
              }, [opsDetailLargeText ? "A" : "A+"]),
              el("button", {
                class: "btn envio-equipo-ops-close-btn",
                type: "button",
                title: "Cerrar panel",
                onclick: () => {
                  opsDetailLargeText = false;
                  opsDetailDismissed = true;
                  opsSelectedId = null;
                  renderDetail(null);
                  renderTable(currentRows, currentTotal);
                }
              }, [el("i", { class: "fas fa-times" })])
            ])
          ]),
          el("div", { class: `envio-equipo-ops-detail-hero is-${stateMeta.chipClass}` }, [
            el("div", { class: "envio-equipo-ops-detail-hero-icon" }, [
              el("i", { class: heroIcon })
            ]),
            el("div", { class: "envio-equipo-ops-detail-hero-main" }, [
              el("div", { class: "envio-equipo-ops-detail-hero-summary" }, [
                el("div", { class: "envio-equipo-ops-detail-meta-block" }, [
                  el("span", { class: "envio-equipo-ops-detail-meta-label" }, ["N. Equipo"]),
                  el("strong", { class: "envio-equipo-ops-detail-meta-value" }, [row.numeroEquipo || "Sin número"])
                ]),
                el("div", { class: "envio-equipo-ops-detail-meta-block" }, [
                  el("span", { class: "envio-equipo-ops-detail-meta-label" }, ["Ticket"]),
                  ticketNumber
                    ? el("button", {
                        class: "btn envio-equipo-ops-ticket-btn",
                        type: "button",
                        onclick: () => openExistingTicketById(ticketNumber)
                      }, [`TK-${ticketNumber}`])
                    : el("span", { class: "envio-equipo-ops-ticket-empty" }, ["Sin ticket"])
                ])
              ])
            ])
          ]),
          buildDetailSection("Información general", "fas fa-circle-info", buildDetailRows(detailItems)),
          buildDetailSection("Detalle del envío", "fas fa-truck-fast", buildDetailRows(shippingItems, { withIcons: true })),
          row.observacionesEstadoActual
            ? buildDetailSection("Observación del estado", "fas fa-comment-dots", [
                el("div", { class: "envio-equipo-ops-state-note" }, [row.observacionesEstadoActual])
              ], "is-note")
            : null,
          buildDetailSection("Seguimiento del estado", "fas fa-route", buildTrackingList(row)),
          buildDetailSection("Tiempo en estado actual", "far fa-clock", [
            el("div", { class: "envio-equipo-ops-time-summary" }, [
              el("div", { class: `envio-equipo-ops-time-pill ${stateMeta.chipClass}` }, [
                el("i", { class: "far fa-clock" }),
                " ",
                formatElapsedTimeSince(currentStateDate)
              ]),
              el("span", { class: "envio-equipo-ops-time-since" }, [
                "Desde ",
                formatDateTime(currentStateDate)
              ])
            ])
          ], "is-time")
        ].filter(Boolean))
      );
    }

    function createIconActionButton({ icon, title, className = "", onClick }) {
      const button = el("button", {
        class: `btn envio-equipo-ops-icon-btn ${className}`.trim(),
        type: "button",
        title,
        "aria-label": title
      }, [el("i", { class: icon })]);

      button.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (button.disabled) return;
        button.disabled = true;
        try {
          await onClick();
        } catch (err) {
          toast(err?.message || "Error", "err");
        } finally {
          button.disabled = false;
        }
      });

      return button;
    }

    function createStateBadgeControl(row, allowedStates = []) {
      const stateMeta = getEnvioOpsStateMeta(row?.estadoActual);
      const isInteractive = !!canUpdate && Array.isArray(allowedStates) && allowedStates.length > 0;
      const button = el("button", {
        class: `btn envio-equipo-ops-state-badge ${stateMeta.chipClass}${isInteractive ? " is-interactive" : ""}`,
        type: "button",
        title: isInteractive ? "Actualizar estado" : formatEnvioEstado(row?.estadoActual),
        "aria-expanded": "false"
      }, [
        el("span", { class: "envio-equipo-ops-state-badge-main" }, [
          el("span", { class: `envio-equipo-ops-state-dot ${stateMeta.chipClass}` }),
          el("span", { class: "envio-equipo-ops-state-badge-label" }, [formatEnvioOpsStateLabel(row?.estadoActual)])
        ]),
        isInteractive ? el("i", { class: "fas fa-chevron-down" }) : null
      ].filter(Boolean));

      let popover = null;
      let detachEvents = null;

      const closeMenu = () => {
        if (!popover) return;
        if (popover.parentNode) popover.parentNode.removeChild(popover);
        popover = null;
        if (typeof detachEvents === "function") detachEvents();
        detachEvents = null;
        button.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      };

      const cleanup = () => closeMenu();
      button._cleanup = cleanup;

      if (!isInteractive) {
        button.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        });
        return button;
      }

      const runStateChange = async (state) => {
        const normalizedState = String(state || "").trim().toUpperCase();
        if (!normalizedState) return;

        closeMenu();
        opsSelectedId = Number(row.idEnvioEquipo || 0) || null;
        opsDetailDismissed = false;

        if (normalizedState === "EXTRAVIADO") {
          await EnvioEquipoEstadoModal(row, () => load(opsCurrentPage), {
            presetState: "EXTRAVIADO",
            lockState: true,
            onlyStates: ["EXTRAVIADO"]
          });
          return;
        }

        button.disabled = true;
        try {
          const save = await window.api.envio_equipo_updateEstado(session, {
            idEnvioEquipo: row.idEnvioEquipo,
            nuevoEstado: normalizedState,
            fechaEvento: dtLocalToMysql(nowLocalDtLocal()),
            observacionesEstadoActual: null
          });
          if (!save?.ok) throw new Error(save?.message || "No se pudo actualizar el estado.");
          toast(`Estado actualizado a ${formatEnvioEstado(normalizedState)}.`, "ok");
          await load(opsCurrentPage);
        } catch (err) {
          toast(err?.message || "Error actualizando el estado.", "err");
          button.disabled = false;
        }
      };

      const positionMenu = () => {
        if (!popover) return;
        const rect = button.getBoundingClientRect();
        const width = popover.offsetWidth || 220;
        const left = Math.max(
          window.scrollX + 12,
          Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - width - 12)
        );
        popover.style.left = `${left}px`;
        popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
      };

      const openMenu = () => {
        inlineStatePickers.forEach((control) => {
          if (control !== button) {
            try {
              control?._cleanup?.();
            } catch (_) {}
          }
        });

        popover = el("div", { class: "envio-equipo-ops-state-popover" }, [
          el("div", { class: "envio-equipo-ops-state-popover-title" }, ["Actualizar estado"]),
          el("div", { class: "envio-equipo-ops-state-popover-list" }, allowedStates.map((state) => {
            const optionMeta = getEnvioOpsStateMeta(state);
            return el("button", {
              class: `btn envio-equipo-ops-state-option ${optionMeta.chipClass}`,
              type: "button",
              onclick: async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                await runStateChange(state);
              }
            }, [
              el("i", { class: optionMeta.icon }),
              el("span", {}, [formatEnvioOpsStateLabel(state)])
            ]);
          }))
        ]);

        document.body.appendChild(popover);
        positionMenu();
        button.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");

        const handleOutside = (ev) => {
          if (button.contains(ev.target) || popover?.contains(ev.target)) return;
          closeMenu();
        };
        const handleScroll = () => closeMenu();
        const handleResize = () => closeMenu();
        const handleKeydown = (ev) => {
          if (ev.key === "Escape") closeMenu();
        };

        document.addEventListener("click", handleOutside);
        window.addEventListener("scroll", handleScroll, false);
        window.addEventListener("resize", handleResize);
        document.addEventListener("keydown", handleKeydown);

        detachEvents = () => {
          document.removeEventListener("click", handleOutside);
          window.removeEventListener("scroll", handleScroll, false);
          window.removeEventListener("resize", handleResize);
          document.removeEventListener("keydown", handleKeydown);
        };
      };

      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (button.disabled) return;
        if (popover) {
          closeMenu();
          return;
        }
        openMenu();
      });

      return button;
    }

    function renderTable(rows, total) {
      inlineStatePickers.forEach((picker) => {
        try {
          picker?._cleanup?.();
        } catch (_) {}
      });
      inlineStatePickers = [];
      tableScroll.innerHTML = "";
      tableFooter.innerHTML = "";

      if (!rows.length) {
        tableScroll.appendChild(
          el("div", { class: "envio-equipo-ops-empty-state" }, [
            el("i", { class: "fas fa-box-open" }),
            el("strong", {}, [
              activeSummaryState
                ? `No hay equipos en ${formatEnvioEstado(activeSummaryState).toLowerCase()}`
                : "No hay envíos para mostrar"
            ]),
            el("span", {}, [
              activeSummaryState
                ? "Prueba otro rango, otra unidad o quita el filtro de la tarjeta."
                : "Ajusta el rango o la unidad para consultar otros movimientos."
            ])
          ])
        );
        return;
      }

      const tbody = el("tbody", {}, rows.map((row) => {
        const stateMeta = getEnvioOpsStateMeta(row.estadoActual);
        const selected = Number(row.idEnvioEquipo) === Number(opsSelectedId);
        const currentStateDate = getEnvioStateDate(row);
        const estadoActualKey = String(row?.estadoActual || "").trim().toUpperCase();
        const allowedNextStates = getEnvioAllowedNextStates(row);
        const ticketNumber = row.ticketNumero || row.idTicketAsignado || null;
        const canAssignTicket =
          canUpdate &&
          !row.idTicketAsignado &&
          estadoActualKey === "RECIBIDO" &&
          !isEnvioFinalState(row.estadoActual);
        const manualAllowedStates = allowedNextStates.filter((state) =>
          state === "RECIBIDO" || state === "ENTREGADO" || state === "EXTRAVIADO"
        );

        const detailButton = createIconActionButton({
          icon: "fas fa-eye",
          title: "Ver detalle",
          onClick: async () => {
            opsDetailDismissed = false;
            opsSelectedId = Number(row.idEnvioEquipo || 0) || null;
            renderDetail(row);
            renderTable(currentRows, currentTotal);
          }
        });

        const stateControl = createStateBadgeControl(row, manualAllowedStates);
        inlineStatePickers.push(stateControl);

        const tr = el("tr", {
          class: `envio-equipo-ops-row ${stateMeta.rowClass}${selected ? " is-selected" : ""}`
        }, [
          el("td", {}, [
            el("div", { class: "envio-equipo-ops-unit-cell" }, [
              el("span", { class: "envio-equipo-ops-unit-label" }, [row.unidadNombre || "—"])
            ])
          ]),
          el("td", { class: "mono" }, [formatDateTime(row.fechaEnvio)]),
          el("td", {}, [
            el("div", { class: "envio-equipo-ops-type-cell" }, [
              el("i", { class: getEnvioOpsEquipmentIcon(row.tipoEquipoNombre) }),
              el("div", { class: "envio-equipo-ops-type-copy" }, [
                el("strong", {}, [row.tipoEquipoNombre || "—"])
              ])
            ])
          ]),
          el("td", { class: "envio-equipo-ops-ticket-cell" }, [
            el("div", { class: "envio-equipo-ops-cell-center" }, [
              ticketNumber
                ? el("button", {
                    class: "btn envio-equipo-ops-ticket-tag",
                    type: "button",
                    onclick: (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      openExistingTicketById(ticketNumber);
                    }
                  }, [`TK-${ticketNumber}`])
                : canAssignTicket
                  ? el("button", {
                      class: "btn envio-equipo-ops-ticket-tag is-action",
                      type: "button",
                      onclick: async (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        opsSelectedId = Number(row.idEnvioEquipo || 0) || null;
                        if (can("TICKETS_CREATE")) {
                          openPrefilledTicketFromEnvio(row);
                          return;
                        }
                        await EnvioEquipoAssignTicketModal(row, () => load(opsCurrentPage));
                      }
                    }, [can("TICKETS_CREATE") ? "Crear TK" : "Asignar TK"])
                : el("span", { class: "envio-equipo-ops-ticket-tag is-empty" }, [getEnvioTicketStatusLabel(row)])
            ])
          ]),
          el("td", {}, [
            el("div", { class: `envio-equipo-ops-time-cell ${stateMeta.chipClass}` }, [
              el("i", { class: "far fa-clock" }),
              el("span", {}, [formatElapsedTimeSince(currentStateDate)])
            ])
          ]),
          el("td", { class: "envio-equipo-ops-state-cell" }, [
            el("div", { class: "envio-equipo-ops-cell-center envio-equipo-ops-state-field" }, [stateControl])
          ]),
          el("td", { class: "envio-equipo-ops-actions-cell" }, [
            el("div", { class: "envio-equipo-ops-actions" }, [detailButton])
          ])
        ]);

        tr.addEventListener("click", () => {
          opsDetailDismissed = false;
          opsSelectedId = Number(row.idEnvioEquipo || 0) || null;
          renderDetail(row);
          renderTable(currentRows, currentTotal);
        });

        return tr;
      }));

      const table = el("table", {}, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", {}, [tableHeadLabel("fas fa-building", "Unidad")]),
            el("th", {}, [tableHeadLabel("fas fa-calendar-alt", "Fecha de envío")]),
            el("th", {}, [tableHeadLabel("fas fa-desktop", "Tipo de equipo")]),
            el("th", {}, [tableHeadLabel("fas fa-ticket-alt", "TK")]),
            el("th", {}, [tableHeadLabel("far fa-clock", "Tiempo en estado")]),
            el("th", {}, [tableHeadLabel("fas fa-flag", "Estado")]),
            el("th", {}, [tableHeadLabel("fas fa-eye", "Detalle")])
          ])
        ]),
        tbody
      ]);

      tableScroll.innerHTML = "";
      tableFooter.innerHTML = "";
      tableScroll.appendChild(table);
      normalizeExcelTableHeaders(tableWrap);
      tableFooter.appendChild(createTableFooterBar({
        page: opsCurrentPage,
        pageSize: opsPageSize,
        total,
        onPageChange: (nextPage) => {
          if (isLoading || nextPage === opsCurrentPage) return;
          load(nextPage);
        },
        onPageSizeChange: (nextPageSize) => {
          if (isLoading || nextPageSize === opsPageSize) return;
          opsPageSize = nextPageSize;
          load(1);
        }
      }));
    }

    async function load(pageNum = opsCurrentPage) {
      if (isLoading) return;
      isLoading = true;
      opsCurrentPage = pageNum;
      tableScroll.innerHTML = "";
      tableFooter.innerHTML = "";
      tableScroll.appendChild(el("div", { class: "envio-equipo-ops-loading" }, ["Cargando seguimiento operativo..."]));

      try {
        const baseFilters = getCurrentFilters({ includeState: false });
        const rowFilters = getCurrentFilters({ includeState: true });
        const summaryRes = await window.api.envio_equipo_list(session, {
          ...baseFilters,
          page: 1,
          pageSize: 5
        });
        const res = await window.api.envio_equipo_list(session, {
          ...rowFilters,
          page: opsCurrentPage,
          pageSize: opsPageSize
        });

        if (!summaryRes?.ok) {
          throw new Error(summaryRes?.message || "No se pudo cargar el resumen del seguimiento.");
        }

        if (!res?.ok) {
          throw new Error(res?.message || "No se pudo cargar el seguimiento operativo.");
        }

        currentRows = Array.isArray(res.rows) ? res.rows : [];
        currentTotal = Number(res.total || 0);
        renderSummary(summaryRes.summary || {});

        const selectedRow = currentRows.find((row) => Number(row.idEnvioEquipo) === Number(opsSelectedId)) || null;

        if (!selectedRow) {
          opsSelectedId = null;
        } else if (!opsDetailDismissed) {
          opsSelectedId = Number(selectedRow.idEnvioEquipo || 0) || null;
        }

        renderTable(currentRows, currentTotal);
        renderDetail(opsDetailDismissed ? null : selectedRow);
      } catch (err) {
        tableScroll.innerHTML = "";
        tableFooter.innerHTML = "";
        tableScroll.appendChild(
          el("div", { class: "envio-equipo-ops-empty-state" }, [
            el("i", { class: "fas fa-circle-exclamation" }),
            el("strong", {}, ["No se pudo cargar el seguimiento"]),
            el("span", {}, [getUserErrorMessage(err, "Ocurrió un error consultando los envíos.")])
          ])
        );
        opsSelectedId = null;
        opsDetailDismissed = true;
        renderDetail(null);
      } finally {
        isLoading = false;
      }
    }

    renderSummary({});
    renderDetail(null);
    return { card: shell, load };
  }

  function buildHistoryView() {
    const unitOptions = getUnitOptions();
    const typeOptions = getTypeOptions();
    const stateOptions = getStateOptions();
    currentPage = 1;
    const isGerencialHistory = hasRole("GERENCIAL");
    const info = el("div", { class: "small" }, ["Cargando envíos..."]);
    const q = el("input", { placeholder: "Buscar..." });
    const idUnidad = createSearchableSelect(unitOptions, "(Todas las unidades)", "", null);
    const idTipoEquipo = createSearchableSelect(typeOptions, "(Todos los tipos)", "", null);
    const estadoActual = createSearchableSelect(stateOptions, "(Todos los estados)", "", null);
    const defaultDesde = mysqlToDateValue(defaultRange.start);
    const defaultHasta = mysqlToDateValue(defaultRange.end);
    const desde = el("input", { type: "date", value: defaultDesde });
    const hasta = el("input", { type: "date", value: defaultHasta });
    const tableScroll = el("div", { class: "table-scroll" }, []);
    const tableFooter = el("div", { class: "table-footer-host" }, []);
    const tableWrap = el("div", {
      class: `tableWrap envio-equipo-excel has-footer${isGerencialHistory ? " envio-equipo-gerencial-excel" : ""}`
    }, [tableScroll, tableFooter]);

    const card = el("div", { class: "card envio-equipo-history-card" }, [
      el("div", { class: "titleRow" }, [
        el("div", {}, [
          el("div", { class: "h1" }, [el("i", { class: "fas fa-clock-rotate-left" }), " Historial"]),
          info
        ])
      ]),
      el("div", { class: `module-filters envio-equipo-filters${isGerencialHistory ? " envio-equipo-filters-gerencial" : ""}` }, [
        ...(!isGerencialHistory ? [
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]),
            idUnidad
          ]),
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-desktop" }), " Tipo de equipo"]),
            idTipoEquipo
          ]),
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-flag" }), " Estado"]),
            estadoActual
          ])
        ] : []),
        el("div", { class: "field" }, [
          el("label", {}, [el("i", { class: "fas fa-calendar-alt" }), " Desde"]),
          desde
        ]),
        el("div", { class: "field" }, [
          el("label", {}, [el("i", { class: "fas fa-calendar-check" }), " Hasta"]),
          hasta
        ]),
        el("div", { class: "field envio-equipo-search-field" }, [
          el("label", {}, [el("i", { class: "fas fa-search" }), " Buscar"]),
          q
        ]),
        el("div", { class: "actions envio-equipo-filter-actions" }, [
          el("button", { class: "btn", type: "button", onclick: () => load(1) }, [
            el("i", { class: "fas fa-search" }), " Buscar"
          ]),
          el("button", {
            class: "btn",
            type: "button",
            onclick: () => {
              q.value = "";
              idUnidad.value = "";
              idTipoEquipo.value = "";
              estadoActual.value = "";
              [idUnidad, idTipoEquipo, estadoActual].forEach((select) => {
                const main = select.querySelector(".searchable-select-main");
                if (main) main.value = "";
              });
              desde.value = defaultDesde;
              hasta.value = defaultHasta;
              load(1);
            }
          }, [el("i", { class: "fas fa-broom" }), " Limpiar"])
        ])
      ]),
      tableWrap
    ]);

    async function load(pageNum = currentPage) {
      if (isLoading) return;
      isLoading = true;
      currentPage = pageNum;
      info.textContent = "Cargando envíos...";

      try {
        const res = await window.api.envio_equipo_list(session, {
          page: currentPage,
          pageSize: currentPageSize,
          q: String(q.value || "").trim() || null,
          idUnidad: idUnidad.value ? Number(idUnidad.value) : null,
          idTipoEquipo: idTipoEquipo.value ? Number(idTipoEquipo.value) : null,
          estadoActual: String(estadoActual.value || "").trim() || null,
          desde: desde.value ? dateToMysqlStartOfDay(desde.value) : null,
          hasta: hasta.value ? dateToMysqlEndOfDay(hasta.value) : null
        });

        if (!res?.ok) {
        info.textContent = toUserText(res?.message, "No se pudo cargar el historial.");
          tableWrap.innerHTML = "";
          return;
        }

        const rows = Array.isArray(res.rows) ? res.rows : [];
        const total = Number(res.total || 0);
        info.textContent = `Página ${currentPage} • Total: ${total}`;

        const tbody = el("tbody", {}, rows.map((row) => {
          if (isGerencialHistory) {
            return el("tr", {}, [
              el("td", { class: "mono" }, [row.numeroEquipo || "—"]),
              el("td", {}, [row.tipoEquipoNombre || "—"]),
              el("td", { class: "mono" }, [formatDate(row.fechaEnvio)]),
              el("td", { class: "envio-seguimiento-cell" }, [buildEnvioSeguimiento(row)])
            ]);
          }

          const actions = [];
          const estadoActualKey = String(row?.estadoActual || "").trim().toUpperCase();
          const allowedNextStates = getEnvioAllowedNextStates(row);
          if (canUpdate && !row.idTicketAsignado && estadoActualKey === "RECIBIDO" && !isEnvioFinalState(row.estadoActual)) {
            actions.push(createActionButton({
              class: "btn envio-equipo-action-btn",
              icon: "fas fa-link",
              text: "Asignar Ticket",
              onClick: async () => {
                if (can("TICKETS_CREATE")) {
                  openPrefilledTicketFromEnvio(row);
                  return;
                }
                await EnvioEquipoAssignTicketModal(row, () => load(currentPage));
              }
            }));
          }
          if (canUpdate && allowedNextStates.length) {
            actions.push(createActionButton({
              class: "btn envio-equipo-action-btn",
              icon: "fas fa-arrows-rotate",
              text: "Estado",
              onClick: async () => EnvioEquipoEstadoModal(row, () => load(currentPage))
            }));
          }

          return el("tr", {}, [
            el("td", { class: "mono" }, [row.numeroEquipo || "—"]),
            el("td", {}, [row.unidadNombre || "—"]),
            el("td", { class: "mono" }, [formatDate(row.fechaEnvio)]),
            el("td", {}, [row.tipoEquipoNombre || "—"]),
            el("td", {}, [row.motivoEnvio || "—"]),
            el("td", { class: "wrap" }, [row.observaciones || "—"]),
            el("td", {}, [formatEnvioMedio(row.medioEnvio)]),
            el("td", {}, [badgeEnvioEstado(row.estadoActual)]),
            el("td", {}, [row.idTicketAsignado ? `TK-${row.idTicketAsignado}` : getEnvioTicketStatusLabel(row)]),
            el("td", {}, [row.creadoPorNombre || "—"]),
            canUpdate ? el("td", { class: "envio-equipo-actions-cell" }, [
              el("div", { class: "row-actions envio-equipo-row-actions" }, actions.length ? actions : [el("span", { class: "small muted" }, ["—"])])
            ]) : null
          ].filter(Boolean));
        }));

        const headers = isGerencialHistory
          ? [
              el("th", {}, [tableHeadLabel("fas fa-cube", "N. Equipo")]),
              el("th", {}, [tableHeadLabel("fas fa-desktop", "Tipo de Equipo")]),
              el("th", {}, [tableHeadLabel("fas fa-calendar-alt", "Fecha de envío")]),
              el("th", { class: "envio-seguimiento-col" }, [tableHeadLabel("fas fa-route", "Seguimiento")])
            ]
          : [
              el("th", {}, compactIdHeader("fas fa-barcode", "N. Equipo", "EQ", true)),
              el("th", {}, [tableHeadLabel("fas fa-building", "Sucursal")]),
              el("th", {}, [tableHeadLabel("fas fa-calendar-alt", "Fecha Envío")]),
              el("th", {}, [tableHeadLabel("fas fa-desktop", "Tipo de Equipo")]),
              el("th", {}, [tableHeadLabel("fas fa-paper-plane", "Motivo de Envío")]),
              el("th", {}, [tableHeadLabel("fas fa-comment-dots", "Observaciones")]),
              el("th", {}, [tableHeadLabel("fas fa-truck", "Medio")]),
              el("th", {}, [tableHeadLabel("fas fa-flag", "Estado Actual")]),
              el("th", {}, compactIdHeader("fas fa-ticket-alt", "N. Ticket", "TK", true)),
              el("th", {}, [tableHeadLabel("fas fa-user", "Creado Por")])
            ];
        if (!isGerencialHistory && canUpdate) headers.push(el("th", { class: "envio-equipo-actions-col" }, [tableHeadLabel("fas fa-cog", "Acciones")]));

        const table = el("table", {}, [
          el("thead", {}, [el("tr", {}, headers)]),
          tbody
        ]);
        const pager = createTableFooterBar({
          page: currentPage,
          pageSize: currentPageSize,
          total,
          onPageChange: (nextPage) => {
            if (isLoading || nextPage === currentPage) return;
            load(nextPage);
          },
          onPageSizeChange: (nextPageSize) => {
            if (isLoading || nextPageSize === currentPageSize) return;
            currentPageSize = nextPageSize;
            load(1);
          }
        });

        tableScroll.innerHTML = "";
        tableFooter.innerHTML = "";
        tableScroll.appendChild(table);
        tableFooter.appendChild(pager);
        normalizeExcelTableHeaders(tableWrap);
      } finally {
        isLoading = false;
      }
    }

    return { card, load };
  }

  async function switchTab(tab) {
    currentTab = tab;
    refreshTabButtons();
    await renderCurrentTab();
  }

  function refreshTabButtons() {
    if (!tabsBar) return;
    Array.from(tabsBar.querySelectorAll(".envio-equipo-tab")).forEach((btn) => {
      const tabKey = String(btn.textContent || "").toLowerCase().includes("historial") ? "historial" : "nuevo";
      btn.classList.toggle("active", tabKey === currentTab);
    });
  }

  async function renderCurrentTab() {
    stage.innerHTML = "";
    stage.appendChild(el("div", { class: "card" }, [
      el("div", { class: "small" }, ["Cargando módulo..."])
    ]));

    try {
      if (typeof window.ensureCatalogosLoaded === "function") {
        await window.ensureCatalogosLoaded();
      }

      stage.innerHTML = "";
      if (!isGerencialModule) {
        const ops = buildOpsCenterView();
        stage.appendChild(ops.card);
        ops.load(opsCurrentPage);
        return;
      }
      if (currentTab === "nuevo" && canCreate) {
        stage.appendChild(buildCreateView());
        return;
      }
      const history = buildHistoryView();
      stage.appendChild(history.card);
      history.load(1);
    } catch (error) {
      stage.innerHTML = "";
      stage.appendChild(el("div", { class: "card" }, [
        el("div", { class: "h1" }, [el("i", { class: "fas fa-circle-exclamation" }), " Error cargando el módulo"]),
        el("div", { class: "small" }, [toUserText(error?.message || error, "No se pudieron cargar los catálogos.")])
      ]));

      if (isSessionErrorMessage(error?.message || error)) {
        session = null;
        if (typeof window.resetCatalogosState === "function") {
          window.resetCatalogosState();
        } else {
          catalogos = null;
        }
        mount(LoginView());
      }
    }
  }

  refreshTabButtons();
  void renderCurrentTab();
}
