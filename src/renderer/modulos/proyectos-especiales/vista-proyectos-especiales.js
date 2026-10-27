(function() {
  const modulo = window.moduloProyectosEspeciales = window.moduloProyectosEspeciales || {};

  window.renderProyectosEspecialesImpl = function(host) {
    cleanupAllDropdowns();

    host.innerHTML = "";

    const contentEl = el("div", {
      id: "proyectos-especiales-content",
      class: "module-proyectos-especiales"
    }, []);

    host.appendChild(contentEl);

    const info = el("div", { class: "small" }, [""]);
    let isLoading = false;

    const q = el("input", { placeholder: "Buscar: título, descripción o creador..." });

    const estadoOpciones = [
      { value: "", label: "(Todos)" },
      { value: "PENDIENTE", label: "PENDIENTE" },
      { value: "APROBADO", label: "APROBADO" }
    ];

    const estadoRevision = createSearchableSelect(
      estadoOpciones,
      "(Estado)",
      "",
      (val) => { estadoRevision.value = val; }
    );

    const idUnidad = createSearchableSelect(
      getSelectOptions(catalogos?.unidades || [], "idUnidad", "nombre"),
      "(Unidad)",
      "",
      (val) => { idUnidad.value = val; }
    );

    const tecnicosDisponibles = Array.isArray(catalogos?.tecnicos) && catalogos.tecnicos.length
      ? catalogos.tecnicos
      : Array.isArray(catalogos?.usuarios) && catalogos.usuarios.length
        ? catalogos.usuarios
            .filter((u) => String(u?.rol || "").toUpperCase() === "TECNICO")
            .sort((a, b) => String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es"))
        : [];

    const idTecnico = createSearchableSelect(
      getSelectOptions(tecnicosDisponibles, "idUsuario", "nombre"),
      "(Técnico)",
      "",
      (val) => { idTecnico.value = val; }
    );

    const defaultRange = getMonthlyRange();
    const defaultDesde = mysqlToDateValue(defaultRange.start);
    const defaultHasta = mysqlToDateValue(defaultRange.end);
    const fechaDesde = el("input", {
      type: "date",
      value: defaultDesde,
      placeholder: "Desde",
      style: "min-width:140px;"
    });

    const fechaHasta = el("input", {
      type: "date",
      value: defaultHasta,
      placeholder: "Hasta",
      style: "min-width:140px;"
    });

    let page = 1;
    let pageSize = 25;
    const tableScroll = el("div", { class: "table-scroll" }, []);
    const tableFooter = el("div", { class: "table-footer-host" }, []);
    const tableWrap = el("div", { class: "tableWrap module-table proyectos-excel has-footer" }, [tableScroll, tableFooter]);

    const btnNuevo = can("PROYECTOS_ESPECIALES_CREATE")
      ? el("button", { class: "btn primary", type: "button" }, [
          el("i", { class: "fas fa-plus" }),
          " Nuevo Proyecto"
        ])
      : el("span", { class: "small" }, ["Sin permiso para crear"]);

    if (btnNuevo.tagName === "BUTTON") {
      btnNuevo.addEventListener("click", () => modulo.ProyectosEspecialesModal(null, load));
    }

    const headerActions = el("div", { class: "actions" }, [btnNuevo]);

    const btnBuscar = el("button", { class: "btn", type: "button" }, [
      el("i", { class: "fas fa-search" }),
      " Buscar"
    ]);

    const btnLimpiar = el("button", { class: "btn", type: "button" }, [
      el("i", { class: "fas fa-broom" }),
      " Limpiar"
    ]);

    btnBuscar.addEventListener("click", () => {
      if (!isLoading) {
        page = 1;
        load();
      }
    });

    btnLimpiar.addEventListener("click", () => {
      fechaDesde.value = defaultDesde;
      fechaHasta.value = defaultHasta;
      if (typeof idUnidad.clear === "function") idUnidad.clear();
      if (typeof idTecnico.clear === "function") idTecnico.clear();
      page = 1;
      load();
    });

    const header = el("div", { class: "card module-standard-header" }, [
      el("div", { class: "titleRow module-header-proyectos" }, [
        el("div", { class: "module-title-block" }, [
          el("div", { class: "h1" }, [
            el("i", { class: "fas fa-project-diagram" }),
            el("span", {}, ["Módulo Proyectos Especiales"])
          ]),
          el("div", { class: "small" }, [
            "Gestión de Proyectos Especiales"
          ])
        ]),
        headerActions
      ]),

      el("div", { class: "module-filters" }, [
        el("div", { class: "row" }, [
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]),
            idUnidad
          ]),
          el("div", { class: "field" }, [
            el("label", {}, [el("i", { class: "fas fa-user" }), " Técnico"]),
            idTecnico
          ]),
          el("div", { class: "field mini" }, [
            el("label", {}, [el("i", { class: "fas fa-calendar" }), " Desde"]),
            fechaDesde
          ]),
          el("div", { class: "field mini" }, [
            el("label", {}, [el("i", { class: "fas fa-calendar" }), " Hasta"]),
            fechaHasta
          ]),
          el("div", { class: "actions actions-inline" }, [
            btnBuscar,
            btnLimpiar
          ])
        ]),

        el("div", { style: "margin-top:8px" }, [info])
      ])
    ]);

    contentEl.appendChild(header);
    contentEl.appendChild(tableWrap);

    function badgeByEstado(estado) {
      const v = String(estado || "").toUpperCase();

      if (v === "APROBADO") {
        return el("span", { class: "badge proyecto-badge-aprobado" }, [
          el("i", { class: "fas fa-check" }),
          " APROBADO"
        ]);
      }

      return el("span", { class: "badge proyecto-badge-pendiente" }, [
        el("i", { class: "fas fa-clock" }),
        " PENDIENTE"
      ]);
    }

    async function load() {
      if (isLoading) return;
      isLoading = true;

      const hasRenderedTable = !!tableScroll.querySelector("table");
      if (!hasRenderedTable) {
        tableScroll.innerHTML = '<div style="padding:40px;text-align:center"><i class="fas fa-cog fa-spin"></i> Cargando proyectos...</div>';
        tableFooter.innerHTML = "";
        info.textContent = "Consultando...";
      } else {
        info.textContent = "Actualizando...";
      }

      try {
        const filtros = {
          q: q.value ? q.value.trim() : null,
          estadoRevision: estadoRevision.value || null,
          idUnidad: idUnidad.value === "" ? null : Number(idUnidad.value),
          idTecnico: idTecnico.value === "" ? null : Number(idTecnico.value),
          desde: fechaDesde.value || null,
          hasta: fechaHasta.value || null,
          page,
          pageSize
        };

        const res = await window.api.proyectos_especiales_list(session, filtros);

        if (!res?.ok) {
          throw new Error(res?.message || "Error cargando proyectos especiales");
        }

        const data = Array.isArray(res.data) ? res.data : [];
        const total = Number(res.total || 0);
        page = Number(res.page || page || 1);
        pageSize = Number(res.pageSize || pageSize || 25);
        info.textContent = `Página ${res.page || 1} • Total: ${res.total || 0}`;

        const tbody = el("tbody", {}, data.map((r) => {
          const participantesTxt = Array.isArray(r.participantes) && r.participantes.length
            ? r.participantes.map((p) => p.nombre).join(", ")
            : "—";

          return el("tr", {}, [
            el("td", { class: "mono" }, [
              r.idProyectoEspecial ? `PE-${String(r.idProyectoEspecial)}` : "—"
            ]),
            el("td", {}, [r.titulo || "—"]),
            el("td", {}, [r.unidadNombre || "—"]),
            el("td", { class: "wrap" }, [participantesTxt]),
            el("td", {}, [
              r.urlDocumento
                ? el("button", {
                    class: "calif-eye-btn proyecto-doc-btn",
                    type: "button",
                    title: "Ver documento"
                  }, [el("i", { class: "fas fa-eye" })])
                : "—"
            ]),
            el("td", {}, [badgeByEstado(r.estadoRevision)]),
            el("td", {}, [r.adminRevisorNombre || "—"]),
            el("td", { class: "mono" }, [formatDate(r.fechaRevision)]),
            el("td", { class: "mono" }, [formatDate(r.fechaRegistro)])
          ]);
        }));

        Array.from(tbody.querySelectorAll("tr")).forEach((tr, idx) => {
          const row = data[idx];
          const docCell = tr.children[4];
          const btnDoc = docCell?.querySelector?.("button");

          if (row?.documentoBloqueado && docCell) {
            docCell.innerHTML = "";
            docCell.appendChild(modulo.renderDocumentoProyectoControl(row, { compact: true }));
            return;
          }

          if (btnDoc && row?.urlDocumento) {
            btnDoc.addEventListener("click", async () => {
              await modulo.abrirDocumentoExterno(row.urlDocumento);
            });
          }
        });

        const table = el("table", {}, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", {}, compactIdHeader("fas fa-project-diagram", "N. Proyecto", "PE", true)),
              el("th", {}, [el("i", { class: "fas fa-heading" }), " Título"]),
              el("th", {}, [el("i", { class: "fas fa-building" }), " Unidad"]),
              el("th", {}, [el("i", { class: "fas fa-users" }), " Participantes"]),
              el("th", {}, [el("i", { class: "fas fa-file-alt" }), " Documento"]),
              el("th", {}, [el("i", { class: "fas fa-flag" }), " Estado"]),
              el("th", {}, [el("i", { class: "fas fa-user-check" }), " Aprobado por"]),
              el("th", {}, [el("i", { class: "fas fa-calendar-check" }), " Fecha aprobación"]),
              el("th", {}, [el("i", { class: "fas fa-calendar-plus" }), " Fecha registro"])
            ])
          ]),
          data.length
            ? tbody
            : el("tbody", {}, [
                el("tr", {}, [
                  el("td", {
                    colspan: 9,
                    style: "text-align:center; padding:40px; color:var(--muted);"
                  }, [
                    el("i", { class: "fas fa-inbox" }),
                    " No hay proyectos especiales"
                  ])
                ])
              ])
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
        tableScroll.appendChild(table);
        tableFooter.appendChild(pager);
        normalizeExcelTableHeaders(tableWrap);
      } catch (err) {
        const msg = getUserErrorMessage(err, "Error desconocido.");
        info.textContent = "Error: " + msg;
        toast(msg, "err");

        if (!hasRenderedTable) {
          tableScroll.innerHTML = "";
          tableFooter.innerHTML = "";
          tableScroll.appendChild(
            el("div", { style: "padding:40px;text-align:center;color:var(--danger);" }, [
              el("i", { class: "fas fa-exclamation-triangle" }),
              " Error cargando: " + msg
            ])
          );
        }
      } finally {
        isLoading = false;
      }
    }

    void q;
    void estadoRevision;

    contentEl.addEventListener("app:refresh-route", (event) => {
      event.preventDefault();
      load();
    });

    load();
  };
})();
