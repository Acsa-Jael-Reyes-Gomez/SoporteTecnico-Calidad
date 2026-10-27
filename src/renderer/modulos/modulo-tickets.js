function TicketModal(row, onDone, prefill = null) {
  const isEdit = !!row;
  let isClosed = isEdit ? isClosedByFechaCierre(row) : false;
  const envioPrefill = !isEdit && prefill?.source === "envio_equipo" ? prefill : null;

  const nombreSolicitante = el("input", { value: row?.nombreSolicitante || "" });

  const idPuesto = createSearchableSelect(
    getSelectOptions(catalogos?.puestos || [], "idPuesto", "nombre"),
    "(Seleccionar puesto)",
    row?.idPuesto || "",
    (val) => { idPuesto.value = val; }
  );

  const idUnidad = createSearchableSelect(
    getSelectOptions(catalogos?.unidades || [], "idUnidad", "nombre"),
    "(Seleccionar unidad)",
    row?.idUnidad || "",
    (val) => { idUnidad.value = val; }
  );

  function lockTextField(input, title = "Este dato proviene del envío y no se puede modificar.") {
    if (!input) return;
    input.readOnly = true;
    input.setAttribute("aria-readonly", "true");
    input.title = title;
  }

  function lockSearchableField(select, title = "Este dato proviene del envío y no se puede modificar.") {
    if (!select) return;
    select.classList.add("is-locked");
    select.style.pointerEvents = "none";
    select.setAttribute("aria-disabled", "true");
    select.title = title;
    const main = select.input || select.querySelector(".searchable-select-main");
    if (main) {
      main.readOnly = true;
      main.disabled = true;
      main.title = title;
    }
  }

  const idServicio = createSearchableSelect(
    getSelectOptions(catalogos?.servicios || [], "idServicio", "nombre"),
    "(Seleccionar servicio)",
    row?.idServicio || "",
    (val) => { 
      idServicio.value = val; 
      updateClasificacionDisplay();
    }
  );

  const enLugar = el("input", { type: "checkbox", checked: !!row?.enLugar });
  const extraordinarioChk = el("input", { 
    type: "checkbox", 
    id: "casoExtraordinario", 
    checked: !!row?.casoExtraordinario,
    onchange: () => updateClasificacionDisplay()
  });

  // Valores originales (para mostrar la complejidad REAL guardada si no cambian servicio/extraordinario)
  const originalIdServicio = isEdit ? Number(row?.idServicio || 0) : 0;
  const originalExtra = isEdit ? !!row?.casoExtraordinario : false;
  const originalIdClasificacion = isEdit ? Number(row?.idClasificacion || 0) : 0;

  const fechaApertura = el("input", {
    type: "date",
    // Visualmente solo fecha, pero al guardar se conserva/inyecta la hora en BD
    value: row?.fechaApertura ? mysqlToDateValue(row.fechaApertura) : nowLocalDateValue()
  });

  const fechaCierre = el("input", {
    type: "date",
    value: row?.fechaCierre ? mysqlToDateValue(row.fechaCierre) : ""
  });

  const solucion = el("textarea", {}, []);
  solucion.value = row?.solucion || "";

  const tecnicosGroup = el("div", { class: "checkboxGroup" }, [
    ...(catalogos?.tecnicos || []).map((t) => {
      const isChecked = (row?.tecnicos || []).some((x) => x.idUsuario == t.idUsuario);
      return el("label", { class: "checkboxItem" }, [
        el("input", { type: "checkbox", value: t.idUsuario, checked: isChecked }),
        el("span", {}, [t.nombre])
      ]);
    })
  ]);

  function getSelectedTecnicos() {
    const checked = tecnicosGroup.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checked).map((cb) => Number(cb.value));
  }

  // Técnico placeholder "Pendiente Asignar" (regla negocio)
  // Si se selecciona un técnico real, se desmarca "Pendiente Asignar".
  // Si se marca "Pendiente Asignar", se desmarcan los demás.
  const PENDIENTE_ASIGNAR_ID = getPendingAsignarTecnicoId();
  function sanitizeTecnicosSelection() {
    const ids = getSelectedTecnicos();
    const hasReal = ids.some((id) => !PENDIENTE_ASIGNAR_ID || id !== PENDIENTE_ASIGNAR_ID);
    if (hasReal) {
      const pendingCb = tecnicosGroup.querySelector(
        `input[type="checkbox"][value="${PENDIENTE_ASIGNAR_ID}"]`
      );
      if (pendingCb && pendingCb.checked) pendingCb.checked = false;
    }
  }

  tecnicosGroup.addEventListener("change", (ev) => {
    const t = ev?.target;
    if (!t || t.tagName !== "INPUT" || t.type !== "checkbox") return;
    const tid = Number(t.value);
    if (!Number.isFinite(tid)) return;

    if (PENDIENTE_ASIGNAR_ID > 0 && tid === PENDIENTE_ASIGNAR_ID && t.checked) {
      // Placeholder exclusivo
      tecnicosGroup.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        const id = Number(cb.value);
        if (id !== PENDIENTE_ASIGNAR_ID) cb.checked = false;
      });
      return;
    }

    if (PENDIENTE_ASIGNAR_ID > 0 && tid !== PENDIENTE_ASIGNAR_ID && t.checked) {
      const pendingCb = tecnicosGroup.querySelector(
        `input[type="checkbox"][value="${PENDIENTE_ASIGNAR_ID}"]`
      );
      if (pendingCb) pendingCb.checked = false;
    }
  });

  let isCalif = isEdit ? isCalificado(row) : false;

  // Campo Clasificación (read-only, auto desde servicio/extraordinario)
  const clasificacionLabel = el("label", {}, [el("i", { class: "fas fa-tag" }), " Clasificación"]);
  const clasificacionDisplay = el("div", { id: "clasificacionDisplay", class: "clasificacion-display badge primary", style: "padding:8px 12px; font-weight:500; font-size:14px; min-height:32px; display:flex; align-items:center;" }, ["Seleccionar servicio"]);
  const clasificacionField = el("div", { class: "field" }, [clasificacionLabel, clasificacionDisplay]);

  // Campo Calificación
  const califBadge = el("span", {
    class: "badge " + (isCalif ? "closed" : "open")
  }, [isCalif ? String(row?.estadoCalificacion || "CALIFICADO") : "PENDIENTE"]);

  const calificacionDisplayField = el("div", { class: "field" }, [
    el("label", {}, [el("i", { class: "fas fa-star" }), " Estado calificación"]),
    califBadge
  ]);

  const avisoCalifWrap = el("div", {}, []);

  function refreshAvisoCalif() {
    avisoCalifWrap.innerHTML = "";
    if (!isCalif) return;

    avisoCalifWrap.appendChild(
      el("div", {
        class: "small",
        style: "color:#e74c3c; font-weight:bold; margin-top:10px; padding:8px; background:#fadbd8; border-radius:6px;"
      }, [
        el("i", { class: "fas fa-exclamation-triangle" }),
        " TICKET FINALIZADO: ya fue calificado, no se puede reabrir ni modificar."
      ])
    );
  }

  // Función para actualizar display de clasificación (read-only)
  function updateClasificacionDisplay() {
    const servicioId = Number(idServicio.value);
    const esExtraordinario = extraordinarioChk.checked;
    
    if (!servicioId) {
      clasificacionDisplay.textContent = "Seleccionar servicio";
      clasificacionDisplay.className = "badge";
      clasificacionDisplay.style.borderColor = "var(--border)";
      clasificacionDisplay.style.color = "var(--text)";
      clasificacionDisplay.style.background = "rgba(255,255,255,.03)";
      return;
    }
    
    const servicio = catalogos?.servicios?.find(s => s.idServicio == servicioId);
    if (!servicio) {
      clasificacionDisplay.textContent = "Servicio inválido";
      clasificacionDisplay.className = "badge";
      clasificacionDisplay.style.borderColor = "var(--danger)";
      clasificacionDisplay.style.color = "var(--danger)";
      clasificacionDisplay.style.background = "rgba(255,77,109,.08)";
      return;
    }
    
    // Si el usuario NO cambió servicio/extraordinario, mostrar la complejidad guardada (puede haber sido ajustada en Calificación).
    const unchanged = isEdit && servicioId === originalIdServicio && esExtraordinario === originalExtra;

    const normalizarClaveClasificacion = (value) =>
      String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .toUpperCase();

    const clasificaciones = Array.isArray(catalogos?.des_clasificaciones) ? catalogos.des_clasificaciones : [];
    const extraordinarioId =
      Number(catalogos?.meta_catalogos?.extraordinarioId || 0) ||
      Number(
        clasificaciones.find((item) =>
          normalizarClaveClasificacion(item?.nombre || "").includes("EXTRAORDINARIO")
        )?.idClasificacion || 0
      ) ||
      0;

    let idClasif = 0;
    if (esExtraordinario) {
      idClasif = extraordinarioId;
    } else if (unchanged && originalIdClasificacion) {
      idClasif = originalIdClasificacion;
    } else {
      idClasif = Number(servicio.idClasificacion || 0);
    }

    const clasifObj = clasificaciones.find((c) => Number(c.idClasificacion) === idClasif);
    const nombreClasif =
      clasifObj?.nombre ||
      (esExtraordinario ? "EXTRAORDINARIO" : idClasif ? `Clasif ${idClasif}` : "SIN CLASIF");
    clasificacionDisplay.textContent = nombreClasif;
    clasificacionDisplay.className = "badge";

    const clasifKey = normalizarClaveClasificacion(clasifObj?.nombre || nombreClasif);
    const meta =
      clasifKey.includes("BASICO")
        ? { c: "#10b981", bg: "rgba(16,185,129,.14)" }
        : clasifKey.includes("INTERMEDIO")
          ? { c: "#f59e0b", bg: "rgba(245,158,11,.16)" }
          : clasifKey.includes("COMPLEJO")
            ? { c: "#ef4444", bg: "rgba(239,68,68,.14)" }
            : clasifKey.includes("EXTRAORDINARIO")
              ? { c: "#8b5cf6", bg: "rgba(139,92,246,.14)" }
              : { c: "var(--text)", bg: "rgba(255,255,255,.03)" };
    clasificacionDisplay.style.borderColor = meta.c;
    clasificacionDisplay.style.color = meta.c;
    clasificacionDisplay.style.background = meta.bg;
  }

  function refreshCalifBadge() {
    califBadge.className = "badge " + (isCalif ? "closed" : "open");
    califBadge.textContent = isCalif ? String(row?.estadoCalificacion || "CALIFICADO") : "PENDIENTE";
  }

  // ==============================
  // EQUIPO RELACIONADO AL TICKET
  // ==============================
  const equipoSection = el("div", { class: "equipo-section" }, []);
  let tieneEquipo = false;
  let equipoInfo = null;
  let tipoEquipoSelectRef = null;
  let addingEquipoInline = !!envioPrefill?.idTipoEquipo;

  function cleanupSelect(ref) {
    if (ref && typeof ref._cleanup === "function") {
      try { ref._cleanup(); } catch (_) {}
    }
  }

  function buildNewTicketEquipoBox() {
    const box = el("div", { class: "equipo-ticket-box full-create" }, []);

    const header = el("div", { class: "equipo-ticket-header" }, [
      el("i", { class: "fas fa-desktop" }),
      " Equipo relacionado (opcional)"
    ]);
    box.appendChild(header);

    // Checkbox principal "Ingresar equipo"
    const ingresarEquipoChk = el("input", { 
      type: "checkbox", 
      id: "ingresarEquipo",
      checked: addingEquipoInline,
      onchange: () => {
        toggleEquipoFields(ingresarEquipoChk.checked);
      }
    });
    const ingresarLabel = el("label", { for: "ingresarEquipo", style: "display:flex; align-items:center; gap:8px; font-weight:500; margin-bottom:12px; cursor:pointer;" }, [
      ingresarEquipoChk,
      el("i", { class: "fas fa-tools", style: "color:var(--uiAccent);" }),
      " Ingresar equipo al taller"
    ]);
    box.appendChild(ingresarLabel);

    // Campos equipo (ocultos inicialmente)
    const equipoFields = el("div", { class: "equipo-fields", style: "display:none; padding:16px; background:var(--bgSecondary); border-radius:12px; border:1px solid var(--border);" }, [
      el("div", { class: "row", style: "gap:12px;" }, [
        el("div", { class: "field", style: "flex:1" }, [
          el("label", {}, [el("i", { class: "fas fa-layer-group" }), " Tipo equipo *"]),
          el("div", { ref: "tipoEquipoRef" })
        ]),
        el("div", { class: "field checkbox-field" }, [
          el("label", { style: "display:flex; align-items:center; gap:8px; cursor:pointer;" }, [
            el("input", { type: "checkbox", id: "equipoEnLugar" }),
            " Equipo en lugar"
          ])
        ])
      ]),
      el("div", { class: "small muted", style: "margin-top:8px;" }, [
        el("i", { class: "fas fa-info-circle" }), 
        " ✓ EQ-XXXXXX auto • EN_TALLER • PENDIENTE • Primer técnico asignado"
      ])
    ]);
    box.appendChild(equipoFields);

    function toggleEquipoFields(show) {
      // Reutilizamos el estado existente del modal: si el usuario marca aquí,
      // al guardar el ticket también crearemos el equipo (si hay tipo seleccionado).
      addingEquipoInline = !!show;
      equipoFields.style.display = show ? "block" : "none";

      if (!show) {
        cleanupSelect(tipoEquipoSelectRef);
        tipoEquipoSelectRef = null;
        return;
      }

      if (!tipoEquipoSelectRef) {
        tipoEquipoSelectRef = createSearchableSelect(
          getSelectOptions(catalogos?.tiposEquipo || [], "idTipoEquipo", "nombre"),
          "Seleccionar tipo equipo *requerido*",
          "",
          (val) => { tipoEquipoSelectRef.value = val; }
        );
        equipoFields.querySelector("[ref='tipoEquipoRef']").appendChild(tipoEquipoSelectRef);
        if (envioPrefill?.idTipoEquipo) {
          tipoEquipoSelectRef.setValue(envioPrefill.idTipoEquipo);
        }
      }
    }

    if (addingEquipoInline) {
      toggleEquipoFields(true);
    }

    return box;
  }

  async function showTipoEquipoSelector(equipoActual) {
    return new Promise((resolve) => {
      let selectedTipoEquipo = "";

      const tiposOptions = getSelectOptions(
        catalogos?.tiposEquipo || [],
        "idTipoEquipo",
        "nombre"
      );

      const tipoActualId = equipoActual?.idTipoEquipo ? String(equipoActual.idTipoEquipo) : "";

      const tipoSelect = createSearchableSelect(
        tiposOptions,
        "Seleccionar nuevo tipo...",
        tipoActualId,
        (val) => {
          selectedTipoEquipo = String(val || "");
          guardarBtn.disabled = !selectedTipoEquipo;
        }
      );

      if (tipoActualId) {
        selectedTipoEquipo = tipoActualId;
      }

      const bodyNode = el("div", { style: "padding:12px;" }, [
        el("div", { class: "small muted", style: "margin-bottom:12px;" }, [
          `Nuevo tipo para EQ-${equipoActual?.numeroEquipo || "—"}`
        ]),
        tipoSelect
      ]);

      const guardarBtn = el("button", {
        class: "btn primary",
        disabled: !selectedTipoEquipo,
        onclick: () => {
          const valorFinal = selectedTipoEquipo || tipoSelect.value;
          if (!valorFinal) {
            toast("Selecciona tipo de equipo.", "warn");
            return;
          }
          cleanup();
          modal.close();
          resolve(valorFinal);
        }
      }, [
        el("i", { class: "fas fa-save" }),
        " Guardar"
      ]);

      const cancelarBtn = el("button", {
        class: "btn",
        onclick: () => {
          cleanup();
          modal.close();
          resolve(null);
        }
      }, [
        el("i", { class: "fas fa-times" }),
        " Cancelar"
      ]);

      const modal = Modal(
        "Cambiar tipo de equipo",
        bodyNode,
        [cancelarBtn, guardarBtn]
      );

      function cleanup() {
        cleanupSelect(tipoSelect);
      }

      modal.back.addEventListener("click", (e) => {
        if (e.target === modal.back) {
          cleanup();
          resolve(null);
        }
      }, { once: true });
    });
  }

  async function refreshEquipoStatus() {
    equipoSection.innerHTML = "";

    // ========== NUEVO TICKET ==========
    if (!row?.idTicket) {
      equipoSection.appendChild(buildNewTicketEquipoBox());
      return;
    }

    // ========== TICKET EXISTENTE ==========
    try {
      const res = await window.api.equipos_byTicket(session, row.idTicket);

      if (!res?.ok) {
        equipoSection.appendChild(
          el("div", { class: "small muted" }, [
            "Error equipos: " + (res?.message || "?")
          ])
        );
        return;
      }

      const equipos = Array.isArray(res.data) ? res.data : [];
      const equipoActivo = equipos.find((x) =>
        String(x?.idTicket) === String(row.idTicket) &&
        x.estado !== "CANCELADO"
      );

      tieneEquipo = !!equipoActivo;
      equipoInfo = equipoActivo || null;

      const box = el("div", {
        class: `equipo-ticket-box compact${tieneEquipo && equipoInfo?.estado === "EN_TALLER" && equipoInfo.resultado === "PENDIENTE" ? " has-pending" : ""}`
      }, []);

      const header = el("div", { class: "equipo-ticket-header compact" }, [
        el("i", { class: "fas fa-desktop" }),
        " Equipo relacionado"
      ]);
      box.appendChild(header);

      // SIN EQUIPO
      if (!tieneEquipo || !equipoInfo) {
        const emptyContent = el("div", { class: "equipo-ticket-empty compact" }, [
          el("div", { class: "equipo-ticket-empty-text" }, ["Sin equipo relacionado"])
        ]);

        if (addingEquipoInline) {
          cleanupSelect(tipoEquipoSelectRef);

          tipoEquipoSelectRef = createSearchableSelect(
            getSelectOptions(catalogos?.tiposEquipo || [], "idTipoEquipo", "nombre"),
            "Seleccionar tipo de equipo *requerido*",
            tipoEquipoSelectRef?.value || "",
            (val) => { tipoEquipoSelectRef.value = val; }
          );

          const tipoField = el("div", {
            class: "field small equipo-ticket-empty-field compact",
            style: "margin-top:10px;"
          }, [
            tipoEquipoSelectRef
          ]);

    const addModeActions = el("div", {
      class: "equipo-ticket-actions equipo-add-actions compact",
      style: "margin-top:8px; gap:8px; justify-content:center; flex-wrap:wrap;"
    }, [
            el("button", {
              class: "btn",
              onclick: async () => {
                addingEquipoInline = false;
                cleanupSelect(tipoEquipoSelectRef);
                tipoEquipoSelectRef = null;
                await refreshEquipoStatus();
              }
            }, [el("i", { class: "fas fa-times" }), " Cancelar"]),

            el("button", {
              class: "btn primary",
              onclick: async () => {
                if (!idUnidad.value) {
                  toast("Primero selecciona una unidad.", "warn");
                  return;
                }

                const idTecnicoPrincipal = getSelectedTecnicos()[0];
                if (!idTecnicoPrincipal) {
                  toast("Asigna al menos un técnico.", "warn");
                  return;
                }

                if (!tipoEquipoSelectRef?.value) {
                  toast("Selecciona tipo de equipo.", "warn");
                  return;
                }

                const equipoPayload = {
                  idTicket: row.idTicket,
                  idUnidad: Number(idUnidad.value),
                  idTecnicoAsignado: Number(idTecnicoPrincipal),
                  idTipoEquipo: Number(tipoEquipoSelectRef.value),
                  // Fecha/hora automática (Windows) en BD
                  fechaRecibido: nowLocalMysql()
                };

                // NO enviar idClasificacion al backend - se calcula automáticamente

                const resEquipo = await window.api.equipos_create(session, equipoPayload);
                if (resEquipo?.ok) {
                  addingEquipoInline = false;
                  cleanupSelect(tipoEquipoSelectRef);
                  tipoEquipoSelectRef = null;
                  await refreshEquipoStatus();
                  toast("✅ Equipo ingresado al taller.", "ok");
                } else {
                  toast(resEquipo?.message || "Error creando equipo.", "err");
                }
              }
            }, [el("i", { class: "fas fa-save" }), " Guardar equipo"])
          ]);

          emptyContent.appendChild(tipoField);
          emptyContent.appendChild(addModeActions);
        } else {
          const canIngresarEquipo = !isTecnico() && !isClosed && !isCalif && can("EQUIPOS_CREATE");
          if (!canIngresarEquipo) {
            emptyContent.appendChild(
              el("div", { class: "small muted", style: "margin-top:10px;" }, [
                isCalif
                  ? "Ticket calificado: no se puede ingresar equipo."
                  : isClosed
                    ? "Reabre el ticket para ingresar equipo."
                    : "No tienes permisos para ingresar equipo."
              ])
            );
          } else {
            emptyContent.appendChild(
              el("div", { class: "equipo-ticket-empty-actions" }, [
                el("button", {
                  class: "btn primary equipo-ticket-btn-ingresar",
                  onclick: async () => {
                    addingEquipoInline = true;
                    await refreshEquipoStatus();
                  }
                }, [
                  el("i", { class: "fas fa-tools" }),
                  " Ingresar equipo a taller"
                ])
              ])
            );
          }
        }

        box.appendChild(emptyContent);
        equipoSection.appendChild(box);
        return;
      }

      // CON EQUIPO
      const tipoEquipoObj = catalogos?.tiposEquipo?.find(
        (t) => t.idTipoEquipo == equipoInfo.idTipoEquipo
      );

      const badgesRow = el("div", { class: "equipo-ticket-badges compact" }, [
        el("span", {
          class: `equipo-ticket-badge equipo-ticket-badge-estado badge ${String(equipoInfo.estado || "pendiente").toLowerCase()}`
        }, [equipoInfo.estado || "—"]),
        el("span", {
          class: `equipo-ticket-badge equipo-ticket-badge-resultado badge ${String(equipoInfo.resultado || "PENDIENTE").toLowerCase().replace(/_/g, "-")}`
        }, [
          equipoInfo.resultado === "CON_SOLUCION" ? "CON SOLUCIÓN" :
          equipoInfo.resultado === "SIN_SOLUCION" ? "SIN SOLUCIÓN" : "PENDIENTE"
        ])
      ]);
      box.appendChild(badgesRow);

      const body = el("div", { class: "equipo-ticket-body compact" }, [
        el("div", { class: "equipo-ticket-numero" }, [
          el("span", { class: "equipo-ticket-label" }, ["Número:"]),
          el("span", { class: "equipo-ticket-value" }, [`EQ-${equipoInfo.numeroEquipo || "—"}`])
        ]),
        el("div", { class: "equipo-ticket-tipo" }, [
          el("span", { class: "equipo-ticket-label" }, ["Tipo:"]),
          el("span", { class: "equipo-ticket-value" }, [tipoEquipoObj?.nombre || "—"])
        ])
      ]);
      box.appendChild(body);

      const resultadoTexto = equipoInfo.resultado || "PENDIENTE";

      if (equipoInfo.estado === "EN_TALLER" && resultadoTexto === "PENDIENTE" && !isClosed && !isTecnico()) {
        const result = el("div", { class: "equipo-ticket-result compact" }, [
          el("div", { class: "equipo-ticket-result-title" }, [
            el("i", { class: "fas fa-clipboard-check" }),
            " Resultado del equipo"
          ]),
          el("div", { class: "equipo-ticket-radios compact" }, [
            el("label", { class: "equipo-ticket-radio-item" }, [
              el("input", {
                type: "radio",
                name: "equipoResultado",
                value: "CON_SOLUCION"
              }),
              " Con solución"
            ]),
            el("label", { class: "equipo-ticket-radio-item" }, [
              el("input", {
                type: "radio",
                name: "equipoResultado",
                value: "SIN_SOLUCION"
              }),
              " Sin solución"
            ])
          ])
        ]);

        result.querySelectorAll('input[name="equipoResultado"]').forEach((radio) => {
          radio.addEventListener("change", async (e) => {
            if (!e.target.checked) return;
            try {
              const resEntrega = await window.api.equipos_entregar(
                session,
                equipoInfo.idEquipoControl,
                e.target.value
              );
              if (resEntrega?.ok) {
                await refreshEquipoStatus();
                toast("✅ Resultado actualizado.", "ok");
              } else {
                toast(resEntrega?.message || "Error.", "err");
              }
            } catch (err) {
              toast(err, "err");
            }
          });
        });

        box.appendChild(result);
      } else {
        const resultBadge = el("div", { class: "equipo-ticket-result compact" }, [
          el("div", { class: "equipo-ticket-result-title" }, [
            el("i", { class: "fas fa-clipboard-check" }),
            " Resultado del equipo"
          ]),
          el("div", { class: "equipo-ticket-result-badges" }, [
            el("span", {
              class: `equipo-ticket-result-badge badge ${resultadoTexto.toLowerCase().replace(/_/g, "-")}`
            }, [
              resultadoTexto === "CON_SOLUCION" ? "CON SOLUCIÓN" :
              resultadoTexto === "SIN_SOLUCION" ? "SIN SOLUCIÓN" : "PENDIENTE"
            ])
          ])
        ]);
        box.appendChild(resultBadge);
      }

      if (!isClosed && tieneEquipo && !isTecnico()) {
        const actions = el("div", {
          class: "equipo-ticket-actions compact",
          style: "margin-top:10px; gap:10px; justify-content:center;"
        }, [
          el("button", {
            class: "btn primary",
            onclick: async () => {
              const nuevoTipo = await showTipoEquipoSelector(equipoInfo);
              if (!nuevoTipo) return;

              try {
                const resUpdate = await window.api.equipos_update(session, {
                  idEquipoControl: Number(equipoInfo.idEquipoControl),
                  idTipoEquipo: Number(nuevoTipo)
                });

                if (!resUpdate?.ok) {
                  toast(resUpdate?.message || "Error al actualizar tipo de equipo.", "err");
                  return;
                }

                await refreshEquipoStatus();
                toast("✅ Tipo de equipo actualizado.", "ok");
              } catch (err) {
                toast(err, "err");
              }
            }
          }, [
            el("i", { class: "fas fa-edit" }),
            " Cambiar equipo"
          ]),

          el("button", {
            class: "btn danger",
            onclick: async () => {
              const confirmado = await confirmModal(
                "¿Quitar equipo?",
                `¿Confirmas quitar el equipo EQ-${equipoInfo.numeroEquipo} del ticket?`,
                "danger"
              );
              if (!confirmado) return;

              try {
                const resCancelar = await window.api.equipos_cancelar(session, equipoInfo.idEquipoControl);
                if (resCancelar?.ok) {
                  await refreshEquipoStatus();
                  toast("✅ Equipo quitado del ticket.", "ok");
                } else {
                  toast(resCancelar?.message || "Error.", "err");
                }
              } catch (err) {
                toast(err, "err");
              }
            }
          }, [
            el("i", { class: "fas fa-trash" }),
            " Quitar equipo"
          ])
        ]);

        box.appendChild(actions);
      }

      equipoSection.appendChild(box);

    } catch (err) {
      equipoSection.appendChild(
        el("div", { class: "small muted error" }, [
          "Error cargando equipos: " + getUserErrorMessage(err, "Ocurrió un error al cargar los equipos.")
        ])
      );
    }
  }

  refreshEquipoStatus();

  if (envioPrefill?.nombreSolicitante) {
    nombreSolicitante.value = envioPrefill.nombreSolicitante;
  }

  if (envioPrefill?.idPuesto) {
    idPuesto.setValue(envioPrefill.idPuesto);
  }

  if (envioPrefill?.idUnidad) {
    idUnidad.setValue(envioPrefill.idUnidad);
  }

  if (envioPrefill) {
    lockTextField(nombreSolicitante);
    lockSearchableField(idPuesto);
    lockSearchableField(idUnidad);
  }

  const form = el("div", {}, [
    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-user" }), " Nombre solicitante"]),
        nombreSolicitante
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-briefcase" }), " Puesto"]),
        idPuesto
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-building" }), " Unidad"]),
        idUnidad
      ])
    ]),

    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-cogs" }), " Tipo de servicio"]),
        idServicio
      ]),
      el("div", { class: "field" }, [
        el("label", { style: "display:flex;align-items:center;gap:8px;cursor:pointer;" }, [
          enLugar,
          " En el lugar"
        ])
      ]),
      el("div", { class: "field" }, [
        el("label", { style: "display:flex;align-items:center;gap:8px;cursor:pointer;" }, [
          extraordinarioChk,
          el("i", { class: "fas fa-lightbulb", style: "color:#f39c12;" }),
          " Caso Extraordinario"
        ])
      ])
    ]),

    // Nueva fila: Clasificación (read-only)
    el("div", { class: "row", style: "margin-top:10px;" }, [
      clasificacionField
    ]),


    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-calendar-alt" }), " Fecha de apertura"]),
        fechaApertura
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [el("i", { class: "fas fa-calendar-check" }), " Fecha de cierre"]),
        fechaCierre
      ])
    ]),

    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field", style: "flex:1" }, [
        el("label", {}, [el("i", { class: "fas fa-users" }), " Técnico(s) asignado(s) (compartido)"]),
        tecnicosGroup
      ])
    ]),

    el("div", { class: "row", style: "margin-top:10px" }, [
      el("div", { class: "field", style: "flex:1" }, [
        el("label", {}, [el("i", { class: "fas fa-check-circle" }), " Solución (requerida al cerrar)"]),
        solucion
      ])
    ]),

    el("div", { class: "row", style: "margin-top:10px" }, [
      calificacionDisplayField
    ]),

    el("div", { class: "row equipo-row", style: "margin-top:12px" }, [
      el("div", { class: "field fullwidth" }, [
        equipoSection
      ])
    ]),

    avisoCalifWrap
  ]);

  function applyFreeze() {
    const freezeTotal = isClosed || isCalif || isTecnico();
    setFormFrozen(form, freezeTotal, [tecnicosGroup]);
    fechaCierre.disabled = !!freezeTotal;
    refreshCalifBadge();
    refreshAvisoCalif();
    
    // Inicializar display de clasificación si es edit
    if (isEdit && row?.idServicio) {
      idServicio.setValue(row.idServicio);
      extraordinarioChk.checked = !!row.casoExtraordinario;
      updateClasificacionDisplay();
    }
  }

  const titleText = () => {
    if (!isEdit) return "Nuevo Ticket";
    return `Ticket #${row.idTicket} (${isClosed ? "CERRADO" : "ABIERTO"})`;
  };

  function buildTicketEditPayloadOrThrow() {
    const techs = getSelectedTecnicos();

    if (!nombreSolicitante.value.trim()) {
      throw new Error("Nombre solicitante requerido.");
    }
    if (!idPuesto.value) {
      throw new Error("Debe seleccionar un puesto.");
    }
    if (!idUnidad.value) {
      throw new Error("Debe seleccionar una unidad.");
    }
    if (!idServicio.value) {
      throw new Error("Debe seleccionar un servicio.");
    }
    if (!fechaApertura.value) {
      throw new Error("Debe seleccionar la fecha de apertura.");
    }
    if (!techs.length) {
      throw new Error("Debe asignar al menos 1 técnico.");
    }

    return {
      techs,
      payload: {
        idTicket: Number(row.idTicket),
        nombreSolicitante: nombreSolicitante.value.trim(),
        idPuesto: Number(idPuesto.value),
        idUnidad: Number(idUnidad.value),
        idServicio: Number(idServicio.value),
        enLugar: !!enLugar.checked,
        casoExtraordinario: extraordinarioChk.checked ? 1 : 0,
        tecnicos: techs,
        // Mantener hora original aunque visualmente solo se edite la fecha
        fechaApertura: dateToMysqlKeepTime(fechaApertura.value, row?.fechaApertura),
        solucion: solucion.value.trim() || null
      }
    };
  }

  function renderActions() {
    const actions = [];

    if (isTecnico()) {
      return actions;
    }

    if (!isEdit && can("TICKETS_CREATE")) {
      actions.push(
        createActionButton({
          class: "btn primary",
          icon: "fas fa-save",
          text: "Guardar",
          onClick: async () => {
            sanitizeTecnicosSelection();
            const techs = getSelectedTecnicos();

            if (!nombreSolicitante.value.trim()) {
              throw new Error("Nombre solicitante requerido.");
            }
            if (!idPuesto.value) {
              throw new Error("Debe seleccionar un puesto.");
            }
            if (!idUnidad.value) {
              throw new Error("Debe seleccionar una unidad.");
            }
            if (!idServicio.value) {
              throw new Error("Debe seleccionar un servicio.");
            }
            if (!fechaApertura.value) {
              throw new Error("Debe seleccionar la fecha de apertura.");
            }
            if (!techs.length) {
              throw new Error("Debe asignar al menos 1 técnico.");
            }
            if (fechaCierre.value && !solucion.value.trim()) {
              toast("Debes escribir la solución del ticket para poder crearlo ya cerrado.", "warn");
              throw new Error("Solución obligatoria.");
            }
            if (envioPrefill && fechaCierre.value) {
              toast("El ticket vinculado a un envío debe crearse abierto para poder pasar a revisión.", "warn");
              throw new Error("El ticket del envío no puede crearse ya cerrado.");
            }
            if (fechaCierre.value && addingEquipoInline) {
              toast("No puedes crear y cerrar un ticket al mismo tiempo si también ingresarás equipo al taller.", "warn");
              throw new Error("Ingreso de equipo incompatible con cierre inmediato.");
            }
            if (envioPrefill && !addingEquipoInline) {
              toast("Debes mantener activo el ingreso del equipo al taller para vincular este envío.", "warn");
              throw new Error("Debes ingresar el equipo al taller.");
            }

            const techsReal = PENDIENTE_ASIGNAR_ID > 0
              ? techs.filter((id) => id !== PENDIENTE_ASIGNAR_ID)
              : [...techs];
            if (fechaCierre.value && !techsReal.length) {
              toast("Debes seleccionar un técnico real antes de crear el ticket ya cerrado.", "warn");
              throw new Error("Técnico requerido.");
            }

            const idTecnicoPrincipal = techs[0];

            const payload = {
              nombreSolicitante: nombreSolicitante.value.trim(),
              idPuesto: Number(idPuesto.value),
              idUnidad: Number(idUnidad.value),
              idServicio: Number(idServicio.value),
              enLugar: !!enLugar.checked,
              casoExtraordinario: extraordinarioChk.checked ? 1 : 0,
              tecnicos: fechaCierre.value ? techsReal : techs,
              // UI solo fecha, BD guarda fecha + hora (auto)
              fechaApertura: dateToMysqlWithTime(fechaApertura.value),
              fechaCierre: fechaCierre.value ? dateToMysqlWithTime(fechaCierre.value) : null,
              solucion: solucion.value.trim() || null
            };

            const resTicket = await window.api.ticket_create(session, payload);
            if (!resTicket || !resTicket.ok) {
              throw new Error(resTicket?.message || "Error al crear ticket");
            }

            const newIdTicket = resTicket.idTicket;

            if (newIdTicket && can("EQUIPOS_CREATE") && addingEquipoInline && tipoEquipoSelectRef?.value) {
              const equipoPayload = {
                idTicket: newIdTicket,
                idUnidad: Number(idUnidad.value),
                idTecnicoAsignado: Number(idTecnicoPrincipal),
                idTipoEquipo: Number(tipoEquipoSelectRef.value),
                // Fecha/hora automática (Windows) en BD
                fechaRecibido: nowLocalMysql()
              };

              const resEquipo = await window.api.equipos_create(session, equipoPayload);

              if (resEquipo?.ok) {
                if (!envioPrefill?.idEnvioEquipo) {
                  toast("✅ Ticket y equipo creados correctamente.", "ok");
                }
              } else {
                toast("Ticket OK pero error equipo: " + (resEquipo?.message || ""), "warn");
              }
            } else {
              if (!envioPrefill?.idEnvioEquipo) {
                toast(fechaCierre.value ? "✅ Ticket creado y cerrado correctamente." : "✅ Ticket guardado correctamente.", "ok");
              }
            }

            if (envioPrefill?.idEnvioEquipo && newIdTicket) {
              const linkRes = await window.api.envio_equipo_assignTicket(session, {
                idEnvioEquipo: Number(envioPrefill.idEnvioEquipo),
                idTicket: Number(newIdTicket)
              });
              if (!linkRes?.ok) {
                toast(`TK-${newIdTicket} creado, pero no se pudo vincular al envío: ${linkRes?.message || "Error desconocido"}`, "warn");
              } else {
                toast(`✅ Ticket TK-${newIdTicket} creado y vinculado al envío ${envioPrefill.numeroEquipo || ""}.`, "ok");
              }
            }

            modal.close();
            onDone();
          }
        })
      );

      return actions;
    }

    if (isEdit && isClosed) {
      if (isCalif) return actions;

      if (can("TICKETS_REOPEN")) {
        actions.push(
          createActionButton({
            class: "btn ok",
            icon: "fas fa-lock-open",
            text: "Reabrir",
            onClick: async () => {
              const res = await window.api.ticket_reopen(session, Number(row.idTicket));
              if (!res || !res.ok) {
                throw new Error(res?.message || "Error al reabrir el ticket.");
              }

              row.fechaCierre = null;
              isClosed = false;

              modal.titleElement.textContent = titleText();
              applyFreeze();
              modal.rebuildActions(renderActions());
              await refreshEquipoStatus();
              onDone();
            }
          })
        );
      }

      if (can("TICKETS_DELETE")) {
        actions.push(
          createActionButton({
            class: "btn danger",
            icon: "fas fa-trash",
            text: "Borrar",
            onClick: async () => {
              const res = await window.api.ticket_delete(session, Number(row.idTicket));
              if (!res || !res.ok) {
                throw new Error(res?.message || "Error al borrar ticket");
              }

              modal.close();
              onDone();
            }
          })
        );
      }

      return actions;
    }

    if (isEdit && !isClosed && can("TICKETS_EDIT")) {
      actions.push(
        createActionButton({
          class: "btn primary",
          icon: "fas fa-edit",
          text: "Guardar Cambios",
          onClick: async () => {
            const { payload } = buildTicketEditPayloadOrThrow();

            const res = await window.api.ticket_update(session, payload);
            if (!res || !res.ok) {
              throw new Error(res?.message || "Error al actualizar ticket");
            }

            toast("✅ Ticket actualizado correctamente.", "ok");
            modal.close();
            onDone();
          }
        })
      );
    }

    if (isEdit && !isClosed && can("TICKETS_CLOSE")) {
      actions.push(
        createActionButton({
          class: "btn danger",
          icon: "fas fa-lock",
          text: "Cerrar Ticket",
          onClick: async () => {
            if (!solucion.value.trim()) {
              toast("Debes escribir la solución del ticket para poder cerrarlo.", "warn");
              throw new Error("Solución obligatoria.");
            }

            if (!fechaCierre.value) {
              toast("Debes seleccionar la fecha de cierre antes de cerrar el ticket.", "warn");
              throw new Error("Fecha de cierre requerida.");
            }

            // Regla: no permitir cerrar con técnico placeholder "Pendiente Asignar" (id=14)
            sanitizeTecnicosSelection();
            const { payload, techs } = buildTicketEditPayloadOrThrow();
            const techsRaw = techs;
            const techsReal = PENDIENTE_ASIGNAR_ID > 0
              ? techsRaw.filter((id) => id !== PENDIENTE_ASIGNAR_ID)
              : [...techsRaw];
            if (!techsReal.length) {
              toast("Debes seleccionar un técnico antes de cerrar (no puede quedar 'Pendiente Asignar').", "warn");
              throw new Error("Técnico requerido.");
            }

            if (
              tieneEquipo &&
              equipoInfo &&
              equipoInfo.estado === "EN_TALLER" &&
              (!equipoInfo.resultado || equipoInfo.resultado === "PENDIENTE")
            ) {
              toast("Debes indicar si el equipo quedó con solución o sin solución antes de cerrar el ticket.", "warn");
              throw new Error("Resultado de equipo pendiente.");
            }

            // Cierre: la fecha es obligatoria; la hora se completa automáticamente en BD.
            const fechaCierreMysql = dateToMysqlWithTime(fechaCierre.value);

            // Si el usuario también puede editar, guardamos primero los cambios del formulario
            // para permitir cerrar en una sola acción sin reabrir el ticket.
            if (can("TICKETS_EDIT")) {
              const resUpdate = await window.api.ticket_update(session, payload);
              if (!resUpdate || !resUpdate.ok) {
                throw new Error(resUpdate?.message || "Error guardando cambios del ticket antes de cerrar.");
              }
            }

            const resTicket = await window.api.ticket_close(
              session,
              row.idTicket,
              fechaCierreMysql,
              solucion.value.trim(),
              techsReal
            );

            if (!resTicket?.ok) {
              throw new Error(resTicket?.message || "Error cerrando ticket.");
            }

            row.fechaCierre = fechaCierreMysql;
            isClosed = true;

            modal.titleElement.textContent = titleText();
            applyFreeze();
            modal.rebuildActions(renderActions());
            await refreshEquipoStatus();

            toast("✅ Ticket cerrado correctamente.", "ok");
            onDone();
          }
        })
      );
    }

    if (isEdit && can("TICKETS_DELETE")) {
      actions.push(
        createActionButton({
          class: "btn danger",
          icon: "fas fa-trash",
          text: "Borrar",
          onClick: async () => {
            const res = await window.api.ticket_delete(session, Number(row.idTicket));
            if (!res || !res.ok) {
              throw new Error(res?.message || "Error al borrar ticket");
            }

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


function renderTickets(host) {
  host.innerHTML = "";
  const pendingPrefill = takePendingTicketPrefill();
  const pendingDirectTicketId = takePendingTicketOpenId();

  const info = el("div", { class: "small" }, [""]);
  // ✅ Flag para evitar múltiples cargas simultáneas
  let isLoading = false;

  const q = el("input", { type: "hidden", value: "" });

  const idUnidad = createSearchableSelect(
    getSelectOptions(catalogos?.unidades || [], 'idUnidad', 'nombre'),
    "(Unidad)",
    "",
    (val) => { idUnidad.value = val; }
  );
  const idTecnico = createSearchableSelect(
    getSelectOptions(catalogos?.tecnicos || [], 'idUsuario', 'nombre'),
    "(Técnico)",
    "",
    (val) => { idTecnico.value = val; }
  );

  // Solo fecha (sin hora) - en backend se convierte a rango del día completo
  const defaultRange = getMonthlyRange();
  const defaultDesde = mysqlToDateValue(defaultRange.start);
  const defaultHasta = mysqlToDateValue(defaultRange.end);
  const desde = el("input", { type: "date", value: defaultDesde });
  const hasta = el("input", { type: "date", value: defaultHasta });

  let page = 1;
  let pageSize = 25;

  // Solo UI: tabla con estilo tipo "Excel" (solo para Tickets list)
  const tableScroll = el("div", { class: "table-scroll" }, []);
  const tableFooter = el("div", { class: "table-footer-host" }, []);
  const tableWrap = el("div", { class: "tableWrap module-table tickets-excel has-footer" }, [tableScroll, tableFooter]);

  const headerActions = el("div", { class: "actions" }, [
    can("TICKETS_CREATE")
      ? el("button", { class: "btn primary", onclick: () => TicketModal(null, load) }, [el("i", { class: "fas fa-plus" }), " Nuevo Ticket"])
      : el("span", { class: "small" }, ["Sin permiso para crear"])
  ]);
  // ✅ Root wrapper para que apliquen correctamente los estilos del módulo (CSS espera .module-tickets como contenedor)
  const moduleRoot = el("div", { class: "module-tickets" }, []);

  const header = el("div", { class: "card module-header-tickets module-standard-header" }, [
    el("div", { class: "titleRow" }, [
      el("div", {}, [
        el("div", { class: "h1" }, [el("i", { class: "fas fa-ticket-alt" }), " Módulo Tickets"]),
      ]),
      el("div", { class: "actions" }, [
        (!isTecnico() && can("TICKETS_CREATE"))
          ? el("button", {
              class: "btn primary",
              onclick: () => {
                try { TicketModal(null, load); } catch (e) { toast(e?.message || "Error abriendo modal", "err"); }
              }
            }, [el("i", { class: "fas fa-plus" }), " Nuevo Ticket"])
          : el("span", { class: "small" }, ["Sin acceso a creación"])
      ])
    ]),

    // ✅ Filtros envueltos en .module-filters para que apliquen grillas/estilos del CSS
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

  async function openTicketByIdIgnoringDateRange(idTicket) {
    const ticketId = Number(idTicket || 0);
    if (!ticketId) return false;

    const res = await window.api.tickets_list(session, {
      q: String(ticketId),
      desde: "2000-01-01 00:00:00",
      hasta: "2100-12-31 23:59:59",
      page: 1,
      pageSize: 1
    });

    if (!res?.ok) {
      throw new Error(res?.message || "No se pudo abrir el ticket solicitado.");
    }

    const row = Array.isArray(res.data) ? res.data[0] : null;
    if (!row || Number(row.idTicket || 0) !== ticketId) {
      throw new Error(`No se encontró el ticket TK-${ticketId}.`);
    }

    TicketModal(row, load);
    return true;
  }

  // Debug ligero: confirma si los clicks están llegando a los botones del módulo.
  async function load() {
    // ✅ Previene múltiples cargas simultáneas
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


      const res = await window.api.tickets_list(session, filtros);

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
        const tecs = (r.tecnicos || []).map((x) => x.nombre).join(", ");
        const isCompartido = Number(r.totalTecnicos || (Array.isArray(r.tecnicos) ? r.tecnicos.length : 0)) > 1;

        const openTicket = () => {
          try { TicketModal(r, load); } catch (e) { toast(e?.message || "Error abriendo ticket", "err"); }
        };

        // ✅ Acciones: botón tipo "ojito" + lapicito (solo si puede editar)
        const btnView = el("button", {
          class: "calif-eye-btn",
          title: "Ver",
          onclick: openTicket
        }, [el("i", { class: "fas fa-eye" })]);

        const btnEdit = isTecnico()
          ? null
          : el("button", {
              class: "calif-eye-btn calif-edit-btn",
              title: "Editar",
              onclick: openTicket
            }, [el("i", { class: "fas fa-pen-to-square" })]);

        const actionIcons = el("span", { class: "action-icons" }, btnEdit ? [btnView, btnEdit] : [btnView]);

        return el("tr", {}, [
          el("td", { class: "mono" }, [`TK-${String(r.idTicket)}`]),
          el("td", {}, [r.nombreSolicitante || "—"]),
          el("td", {}, [r.unidad || "—"]),
          el("td", {}, [r.servicio || "—"]),
          el("td", {}, [ticketClasificacionText(r.clasificacion)]),
          el("td", { class: "wrap" }, [tecs || "—"]),
          el("td", {}, [badgeAsignacionCompartida(isCompartido)]),
          el("td", { class: "mono" }, [formatDate(r.fechaApertura)]),
          el("td", { class: "mono" }, [formatDate(r.fechaCierre)]),
          el("td", {}, [badgeOpen(closed)]),
          el("td", {}, [badgeTicketEstadoCalificacion(r)]),
          // ✅ Acciones como celda sticky (CSS apunta a td.actions / th.actions)
          el("td", { class: "actions" }, [actionIcons])
        ]);
      })); 

      const tbl = el("table", {}, [
        el("thead", {}, [
        el("tr", {}, [
          el("th", {}, compactIdHeader("fas fa-ticket-alt", "N. Ticket", "TK", true)),
          el("th", { title: "Solicitante" }, [tableHeadLabel("fas fa-user", "Solicitante")]),
          el("th", { title: "Unidad" }, [tableHeadLabel("fas fa-building", "Unidad")]),
          el("th", { title: "Servicio" }, [tableHeadLabel("fas fa-cogs", "Servicio")]),
          el("th", { title: "Clasificación" }, [tableHeadLabel("fas fa-tag", "Clasificación")]),
          el("th", { title: "Técnicos" }, [tableHeadLabel("fas fa-users", "Técnicos")]),
          el("th", { title: "Ind/Comp" }, [tableHeadLabel("fas fa-user-friends", "Ind/Comp")]),
          el("th", { title: "Apertura" }, [tableHeadLabel("fas fa-calendar-plus", "Apertura")]),
          el("th", { title: "Cierre" }, [tableHeadLabel("fas fa-calendar-check", "Cierre")]),
          el("th", { title: "Estado" }, [tableHeadLabel("fas fa-flag", "Estado")]),
          el("th", { title: "Est.Calif" }, [tableHeadLabel("fas fa-grip-lines", "Est.Calif")]),
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
      // ✅ Siempre liberar el flag de carga
      isLoading = false;
    }
  }

  load();

  if (pendingDirectTicketId) {
    setTimeout(() => {
      openTicketByIdIgnoringDateRange(pendingDirectTicketId).catch((err) => {
        toast(err?.message || `No se pudo abrir el ticket TK-${pendingDirectTicketId}.`, "err");
      });
    }, 0);
  } else if (pendingPrefill && can("TICKETS_CREATE")) {
    setTimeout(() => {
      try {
        TicketModal(null, load, pendingPrefill);
      } catch (e) {
        toast(e?.message || "Error abriendo ticket prellenado.", "err");
      }
    }, 0);
  }
}