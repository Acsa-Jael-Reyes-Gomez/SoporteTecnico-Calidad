(function() {
  const modulo = window.moduloProyectosEspeciales = window.moduloProyectosEspeciales || {};

  function ProyectosEspecialesApproveModal(row, onDone) {
    let modal = null;

    const content = el("div", {}, [
      el("div", { class: "row" }, [
        el("div", { class: "field fullwidth" }, [
          el("label", {}, ["Proyecto"]),
          el("div", { class: "small" }, [`#${row.idProyectoEspecial} - ${row.titulo || "Sin título"}`])
        ])
      ]),
      el("div", { class: "row" }, [
        el("div", { class: "field fullwidth" }, [
          el("label", {}, ["Acción"]),
          el("div", { class: "small" }, ["Al aprobar, el proyecto quedará bloqueado y solo podrá visualizarse."])
        ])
      ])
    ]);

    const actions = [
      createActionButton({
        class: "btn primary",
        text: "Aprobar",
        onClick: async () => {
          try {
            const res = await window.api.proyectos_especiales_approve(
              session,
              Number(row.idProyectoEspecial)
            );

            if (!res?.ok) throw new Error(res?.message || "Error aprobando proyecto");

            toast("Proyecto aprobado correctamente", "ok");
            modal?.close?.();
            onDone?.();
          } catch (err) {
            toast(err?.message || "Error aprobando proyecto", "err");
          }
        }
      }),
      createActionButton({
        class: "btn",
        text: "Cancelar",
        onClick: () => modal?.close?.()
      })
    ];

    modal = Modal(`Aprobar Proyecto #${row.idProyectoEspecial}`, content, actions, {
      closeOnBackdrop: false,
      blockRouteChange: true
    });
    return modal;
  }

  function ProyectosEspecialesModal(row, onDone) {
    const isEdit = !!row;
    const isLocked = row?.estadoRevision === "APROBADO";

    const usuariosDisponibles = Array.isArray(catalogos?.tecnicos) && catalogos.tecnicos.length
      ? catalogos.tecnicos
      : Array.isArray(catalogos?.usuarios) && catalogos.usuarios.length
        ? catalogos.usuarios
            .filter((u) => String(u?.rol || "").toUpperCase() === "TECNICO")
            .sort((a, b) => String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es"))
        : [];

    const state = {
      titulo: row?.titulo || "",
      descripcion: row?.descripcion || "",
      idUnidad: row?.idUnidad || "",
      urlDocumento: row?.urlDocumento || "",
      participantes: Array.isArray(row?.participantes)
        ? row.participantes
            .map((p) => Number(p.idUsuario))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [],
      isValid: false
    };

    function getUserId(u) {
      const n = Number(u?.idUsuario ?? u?.idTecnico ?? u?.id ?? 0);
      return Number.isFinite(n) ? n : 0;
    }

    function getUserName(u) {
      return (
        u?.nombre ||
        u?.nombreCompleto ||
        u?.usuario ||
        u?.username ||
        `Usuario #${getUserId(u)}`
      );
    }

    const tituloIn = el("input", {
      value: state.titulo,
      class: "field-required"
    });
    tituloIn.disabled = isTecnico() || !!isEdit;

    const descripcionIn = el("textarea", {}, []);
    descripcionIn.value = state.descripcion || "";
    descripcionIn.disabled = isTecnico() || !!isEdit;

    const urlDocumentoIn = el("input", {
      type: "url",
      value: state.urlDocumento,
      placeholder: "https://link-del-documento.pdf",
      class: "field-required"
    });
    urlDocumentoIn.disabled = !!isEdit;

    const idUnidad = createSearchableSelect(
      getSelectOptions(catalogos?.unidades || [], "idUnidad", "nombre"),
      "Seleccionar unidad *",
      state.idUnidad ? String(state.idUnidad) : "",
      (v) => {
        state.idUnidad = v;
        validateForm();
      }
    );

    if (idUnidad && typeof idUnidad === "object" && "disabled" in idUnidad) {
      idUnidad.disabled = !!isEdit;
    }

    const participantsContainer = el("div", { class: "participants-section" }, []);
    const participantsCheckGroup = el("div", {
      class: "checkboxGroup scrollable participants-check-group",
      style: "max-height:180px; overflow:auto; padding:10px; border:1px solid var(--border); border-radius:10px; margin-top:8px; display:flex; flex-wrap:wrap; gap:10px;"
    }, []);

    const participantsCount = el("div", {
      class: "participants-count invalid",
      style: "margin-top:8px;"
    }, ["0 seleccionados"]);

    function renderParticipantsList() {
      participantsCheckGroup.innerHTML = "";

      const participantesMostrados = isLocked
        ? usuariosDisponibles.filter((u) => state.participantes.includes(getUserId(u)))
        : usuariosDisponibles;

      if (!participantesMostrados.length) {
        participantsCheckGroup.appendChild(
          el("div", { class: "small", style: "padding:10px; color:var(--muted);" }, [
            "No hay usuarios disponibles para mostrar"
          ])
        );
        return;
      }

      participantesMostrados.forEach((u) => {
        const userId = getUserId(u);
        if (!userId) return;

        const checkbox = el("input", {
          type: "checkbox",
          value: String(userId)
        });

        checkbox.checked = state.participantes.includes(userId);
        checkbox.disabled = isLocked;

        if (!isLocked) {
          checkbox.addEventListener("change", () => {
            const id = Number(checkbox.value);
            if (checkbox.checked) {
              if (!state.participantes.includes(id)) {
                state.participantes.push(id);
              }
            } else {
              state.participantes = state.participantes.filter((p) => p !== id);
            }
            participantsCount.textContent = `${state.participantes.length} seleccionados`;
            participantsCount.className = `participants-count ${state.participantes.length > 0 ? "valid" : "invalid"}`;
            validateForm();
          });
        }

        const label = el("label", {
          class: "checkboxItem",
          style: `display:flex; align-items:center; gap:8px; padding:10px 12px; border:1px solid var(--border); border-radius:10px; cursor:${isLocked ? "default" : "pointer"};`
        }, [
          checkbox,
          el("span", {}, [getUserName(u)])
        ]);

        participantsCheckGroup.appendChild(label);
      });
    }

    const participantsLabel = el("label", { class: "field-required" }, ["Participantes (mínimo 1) *"]);

    const participantsInner = el("div", {
      class: "participants-inner fullwidth",
      style: "overflow:visible;"
    }, [
      participantsCheckGroup,
      participantsCount
    ]);

    participantsContainer.appendChild(participantsLabel);
    participantsContainer.appendChild(participantsInner);

    const docButton = modulo.renderDocumentoProyectoControl(row);
    const docActions = docButton
      ? el("div", { class: "actions", style: "margin-top:10px;" }, [docButton])
      : null;

    if (docButton && !row?.documentoBloqueado && row?.urlDocumento) {
      docButton.addEventListener("click", async () => {
        await modulo.abrirDocumentoExterno(row.urlDocumento);
      });
    }

    const reviewInfo = isEdit
      ? el("div", { class: "row" }, [
          el("div", { class: "field" }, [
            el("label", {}, ["Estado"]),
            el("div", {}, [row?.estadoRevision || "PENDIENTE"])
          ]),
          el("div", { class: "field" }, [
            el("label", {}, ["Revisado por"]),
            el("div", {}, [row?.adminRevisorNombre || "—"])
          ]),
          el("div", { class: "field" }, [
            el("label", {}, ["Fecha revisión"]),
            el("div", {}, [formatDate(row?.fechaRevision)])
          ])
        ])
      : null;

    const formChildren = [
      el("div", { class: "row uniform-row" }, [
        el("div", { class: "field field-uniform" }, [
          el("label", { class: "field-required" }, ["Título *"]),
          tituloIn
        ])
      ]),

      el("div", { class: "row uniform-row" }, [
        el("div", { class: "field fullwidth field-uniform" }, [
          el("label", { class: "field-required" }, ["Unidad *"]),
          idUnidad
        ])
      ]),

      el("div", { class: "row uniform-row" }, [
        el("div", { class: "field fullwidth field-uniform" }, [
          el("label", {}, ["Descripción"]),
          descripcionIn
        ])
      ]),

      el("div", { class: "row uniform-row" }, [
        el("div", { class: "field fullwidth field-uniform" }, [
          el("label", { class: "field-required" }, ["Link del documento *"]),
          urlDocumentoIn,
          docActions || el("div")
        ])
      ]),

      el("div", { class: "row uniform-row" }, [
        el("div", { class: "field fullwidth field-uniform" }, [participantsContainer])
      ])
    ];

    if (reviewInfo) formChildren.push(reviewInfo);

    const form = el("div", {}, formChildren);

    function validateForm() {
      const tituloOk = !!tituloIn.value.trim();
      const unidadOk = !!state.idUnidad;
      const urlOk = !!urlDocumentoIn.value.trim() && modulo.esURLValida(urlDocumentoIn.value.trim());
      const participantsOk = Array.isArray(state.participantes) && state.participantes.length > 0;

      state.isValid = tituloOk && unidadOk && participantsOk && urlOk;

      tituloIn.classList.toggle("invalid", !tituloOk);
      urlDocumentoIn.classList.toggle("invalid", !urlOk);
      participantsCount.className = `participants-count ${participantsOk ? "valid" : "invalid"}`;

      return state.isValid;
    }

    tituloIn.addEventListener("input", () => {
      state.titulo = tituloIn.value;
      validateForm();
    });

    descripcionIn.addEventListener("input", () => {
      state.descripcion = descripcionIn.value;
    });

    urlDocumentoIn.addEventListener("input", () => {
      state.urlDocumento = urlDocumentoIn.value;
      validateForm();
    });

    const title = isEdit
      ? `Detalle Proyecto #${row.idProyectoEspecial}`
      : "Nuevo Proyecto Especial";

    let modal = null;

    function renderActions() {
      const actions = [];

      if (!isEdit && (session.rol === "ADMIN" || session.rol === "SUPERVISOR") && can("PROYECTOS_ESPECIALES_CREATE")) {
        actions.push(
          createActionButton({
            class: "btn primary",
            text: "Crear",
            onClick: async () => {
              try {
                if (!validateForm()) {
                  throw new Error("Completa todos los campos requeridos");
                }

                const payload = {
                  titulo: tituloIn.value.trim(),
                  descripcion: descripcionIn.value.trim() || null,
                  idUnidad: Number(state.idUnidad),
                  participantes: state.participantes,
                  urlDocumento: urlDocumentoIn.value.trim()
                };

                const res = await window.api.proyectos_especiales_create(session, payload);

                if (!res?.ok) throw new Error(res?.message || "Error al crear proyecto especial");

                toast("Proyecto especial creado correctamente", "ok");
                modal?.close?.();
                onDone?.();
              } catch (err) {
                toast(String(err?.message || "Error al crear proyecto especial"), "err");
              }
            }
          })
        );
      }

      return actions;
    }

    renderParticipantsList();
    participantsCount.textContent = `${state.participantes.length} seleccionados`;
    participantsCount.className = `participants-count ${state.participantes.length > 0 ? "valid" : "invalid"}`;
    validateForm();

    modal = Modal(title, form, renderActions(), {
      closeOnBackdrop: false,
      blockRouteChange: true
    });
    return modal;
  }

  modulo.ProyectosEspecialesApproveModal = ProyectosEspecialesApproveModal;
  modulo.ProyectosEspecialesModal = ProyectosEspecialesModal;
})();
