function AppShell(route) {
  if (window.__soporteSessionHeartbeatId) {
    window.clearInterval(window.__soporteSessionHeartbeatId);
    window.__soporteSessionHeartbeatId = null;
  }
  if (window.__envioNotificationPollId) {
    window.clearInterval(window.__envioNotificationPollId);
    window.__envioNotificationPollId = null;
  }
  if (!isSessionValid()) {
    session = null;
    if (typeof window.resetCatalogosState === "function") {
      window.resetCatalogosState();
    } else {
      catalogos = null;
    }
    mount(LoginView());
    toast("Tu sesión ha expirado. Por favor ingresa nuevamente.", "warn");
    return;
  }

  const gerencialAllowedRoutes = new Set(["validar_rutas", "envio_equipo"]);
  const safeRoute = hasRole("GERENCIAL")
    ? (gerencialAllowedRoutes.has(String(route || "")) ? route : "validar_rutas")
    : route;

  const content = el("div", { class: "content" }, []);

  // Sidebar: expandido en escritorio, colapsable a iconos y overlay en móvil.
  const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
  const isCompactViewport = () => window.matchMedia("(max-width: 900px)").matches;
  let sidebarCollapsed = false;
  try {
    sidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {}
  let sidebarOverlayOpen = false;

  const sidebarToggleIcon = el("i", { class: "fas fa-bars" });
  const btnSidebarToggle = el(
    "button",
    { class: "btn small sidebar-toggle", type: "button" },
    [sidebarToggleIcon]
  );

  const sidebarDesktopToggleIcon = el("i", { class: "fas fa-angle-left" });
  const btnSidebarDesktopToggle = el(
    "button",
    { class: "btn small sidebar-collapse-btn", type: "button" },
    [sidebarDesktopToggleIcon]
  );

  function applySidebarState() {
    const compactViewport = isCompactViewport();

    if (!compactViewport) {
      sidebarOverlayOpen = false;
    }

    document.body.classList.toggle("sidebar-collapsed", !compactViewport && !!sidebarCollapsed);
    document.body.classList.toggle("sidebar-open", compactViewport && !!sidebarOverlayOpen);

    btnSidebarToggle.title = compactViewport
      ? (sidebarOverlayOpen ? "Cerrar menº" : "Mostrar menº")
      : (sidebarCollapsed ? "Expandir menº" : "Contraer menº");
    btnSidebarToggle.setAttribute("aria-label", btnSidebarToggle.title);
    btnSidebarToggle.setAttribute("aria-expanded", compactViewport && sidebarOverlayOpen ? "true" : "false");
    sidebarToggleIcon.className = compactViewport
      ? `fas ${sidebarOverlayOpen ? "fa-times" : "fa-bars"}`
      : `fas ${sidebarCollapsed ? "fa-bars" : "fa-angle-left"}`;

    btnSidebarDesktopToggle.title = sidebarCollapsed ? "Expandir menº" : "Contraer menº";
    btnSidebarDesktopToggle.setAttribute("aria-label", btnSidebarDesktopToggle.title);
    sidebarDesktopToggleIcon.className = `fas ${sidebarCollapsed ? "fa-angle-right" : "fa-angle-left"}`;
  }

  function closeSidebarOverlay() {
    if (!isCompactViewport() || !sidebarOverlayOpen) return;
    sidebarOverlayOpen = false;
    applySidebarState();
  }

  function toggleSidebar() {
    if (isCompactViewport()) {
      sidebarOverlayOpen = !sidebarOverlayOpen;
      applySidebarState();
      return;
    }

    sidebarCollapsed = !sidebarCollapsed;
    sidebarOverlayOpen = false;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {}
    applySidebarState();
  }

  btnSidebarToggle.addEventListener("click", toggleSidebar);
  btnSidebarDesktopToggle.addEventListener("click", toggleSidebar);

  const handleSidebarViewportResize = debounce(() => {
    if (!isCompactViewport()) {
      sidebarOverlayOpen = false;
    }
    applySidebarState();
  }, 80);
  window.addEventListener("resize", handleSidebarViewportResize);

  const sidebarBackdrop = el("div", {
    class: "sidebar-backdrop",
    onclick: () => closeSidebarOverlay()
  });

  const btnMin = el("button", {
    class: "window-btn minimize",
    title: "Minimizar",
    onclick: async () => {
      try {
        if (window.api?.window_minimize) {
          await window.api.window_minimize();
        }
      } catch (e) {
        toast(e?.message || "No se pudo minimizar", "err");
      }
    }
  }, [el("i", { class: "fas fa-minus" })]);

  const btnMax = el("button", {
    class: "window-btn maximize",
    title: "Maximizar / Restaurar",
    onclick: async () => {
      try {
        if (window.api?.window_maximize) {
          await window.api.window_maximize();
        }
      } catch (e) {
        toast(e?.message || "No se pudo maximizar", "err");
      }
    }
  }, [el("i", { class: "fas fa-expand" })]);

  const btnClose = el("button", {
    class: "window-btn close",
    title: "Cerrar",
    onclick: async () => {
      try {
        if (window.api?.window_close) {
          await window.api.window_close();
        }
      } catch (e) {
        toast(e?.message || "No se pudo cerrar", "err");
      }
    }
  }, [el("i", { class: "fas fa-times" })]);

  //Notificaciones de equipo

  let notificationCenter = null;
  const canReceiveNotifications = isTecnico() || hasRole("SUPERVISOR") || ((hasRole("GERENCIAL") || isAnalista()) && can("ENVIO_EQUIPO_VIEW"));
  if (canReceiveNotifications && typeof window.api?.envio_equipo_notifications === "function") {
    const notificationCursorKey = `notificationCursorV4:${Number(session.idUsuario || 0)}`;
    const notificationItems = [];
    const knownNotificationKeys = new Set();
    let unreadNotifications = 0;
    let notificationPanelOpen = false;
    let notificationPolling = false;

    const notificationBadge = el("span", { class: "notification-badge", hidden: true }, ["0"]);
    const notificationList = el("div", { class: "notification-list" }, []);
    const notificationEmpty = el("div", { class: "notification-empty" }, [
      el("i", { class: "far fa-bell-slash" }),
      el("span", {}, ["Sin cambios nuevos"])
    ]);
    const notificationPanel = el("div", { class: "notification-panel" }, [
      el("div", { class: "notification-panel-title" }, ["Notificaciones"]),
      notificationList,
      notificationEmpty
    ]);

    const toMysqlCursor = (value) => {
      if (!value) return "";
      const raw = String(value).trim();
      const mysqlMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
      if (mysqlMatch) return `${mysqlMatch[1]} ${mysqlMatch[2]}`;
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      const pad = (number) => String(number).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const formatNotificationDate = (value) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
    };

    const updateNotificationBadge = () => {
      notificationBadge.hidden = unreadNotifications <= 0;
      notificationBadge.textContent = unreadNotifications > 99 ? "99+" : String(unreadNotifications);
    };

    const renderNotificationItems = () => {
      notificationList.innerHTML = "";
      notificationEmpty.hidden = notificationItems.length > 0;
      for (const item of notificationItems) {
        const number = String(item?.numeroEquipo || `EE-${item?.idEnvioEquipo || ""}`);
        const state = String(item?.estadoNombre || item?.estadoClave || "Actualizado");
        const eventType = String(item?.eventType || "");
        const isNewShipment = eventType === "NEW_SHIPMENT";
        const isTicketAssignment = eventType === "TICKET_ASIGNADO";
        const isRouteAssignment = eventType === "RUTA_ASIGNADA";
        const isRouteValidated = eventType === "RUTA_VALIDADA";
        const title = isRouteValidated
          ? `La ruta #${item?.idReferencia || ""} fue validada por Gerencial`
          : isTicketAssignment
          ? `Te asignaron el ticket #${item?.idReferencia || ""}`
          : isRouteAssignment
            ? `Te asignaron la ruta #${item?.idReferencia || ""}`
            : isNewShipment
              ? `${item?.unidadNombre || "Sucursal"} envió ${number}`
              : `Equipo n. ${number} ya fue ${state.toLocaleLowerCase("es-GT")}`;
        const meta = [item?.tipoEquipoNombre, item?.actorNombre, formatNotificationDate(item?.eventAt)]
          .filter(Boolean)
          .join(" • ");
        const dismissNotification = () => {
          const index = notificationItems.indexOf(item);
          if (index >= 0) notificationItems.splice(index, 1);
          renderNotificationItems();
        };
        const openNotification = () => {
          dismissNotification();
          notificationPanelOpen = false;
          notificationCenter?.classList.remove("open");
          if (!isTicketAssignment && !isRouteAssignment) {
            try { sessionStorage.setItem("envioEquipoInitialTab", "historial"); } catch {}
          }
          void openRoute(isTicketAssignment ? "tickets" : (isRouteAssignment || isRouteValidated) ? "rutas" : "envio_equipo");
        };
        notificationList.appendChild(el("div", { class: "notification-row" }, [
          el("button", {
          class: "notification-item",
          type: "button",
          onclick: openNotification
        }, [
          el("span", { class: "notification-item-icon" }, [
            el("i", { class: isTicketAssignment ? "fas fa-ticket" : (isRouteAssignment || isRouteValidated) ? "fas fa-route" : isNewShipment ? "fas fa-box" : "fas fa-arrows-rotate" })
          ]),
          el("span", { class: "notification-item-copy" }, [
            el("b", {}, [title]),
            el("small", {}, [meta])
          ])
          ]),
          el("button", {
            class: "notification-dismiss",
            type: "button",
            title: "Descartar notificación",
            "aria-label": "Descartar notificación",
            onclick: (event) => {
              event.stopPropagation();
              dismissNotification();
            }
          }, [el("i", { class: "fas fa-xmark" })])
        ]));
      }
    };

    const bellButton = el("button", {
      class: "notification-bell",
      type: "button",
      title: "Notificaciones",
      "aria-label": "Notificaciones",
      onclick: (event) => {
        event.stopPropagation();
        notificationPanelOpen = !notificationPanelOpen;
        notificationCenter?.classList.toggle("open", notificationPanelOpen);
        if (notificationPanelOpen) {
          unreadNotifications = 0;
          updateNotificationBadge();
        }
      }
    }, [el("i", { class: "fas fa-bell" }), notificationBadge]);

    notificationCenter = el("div", { class: "notification-center" }, [bellButton, notificationPanel]);

    const pollEnvioNotifications = async () => {
      if (notificationPolling || !isSessionValid()) return;
      notificationPolling = true;
      try {
        let cursor = "";
        try { cursor = localStorage.getItem(notificationCursorKey) || ""; } catch {}
        if (!cursor) {
          cursor = toMysqlCursor(new Date(Date.now() - 24 * 60 * 60 * 1000));
        }
        const result = await window.api.envio_equipo_notifications(session, { since: cursor });
        if (!result?.ok) return;

        const rows = Array.isArray(result.data) ? result.data : [];

        let added = 0;
        for (const row of rows) {
          const key = `${row?.eventType || "EVENT"}:${row?.idNotificacion || row?.idEnvioEquipo || row?.idReferencia || 0}:${toMysqlCursor(row?.eventAt)}`;
          if (knownNotificationKeys.has(key)) continue;
          knownNotificationKeys.add(key);
          notificationItems.unshift(row);
          added += 1;
        }
        if (notificationItems.length > 30) notificationItems.length = 30;
        if (rows.length) {
          const latestCursor = toMysqlCursor(rows[rows.length - 1]?.eventAt);
          if (latestCursor) {
            try { localStorage.setItem(notificationCursorKey, latestCursor); } catch {}
          }
        } else {
          const serverCursor = toMysqlCursor(result.serverTime);
          if (serverCursor) {
            try { localStorage.setItem(notificationCursorKey, serverCursor); } catch {}
          }
        }
        if (added) {
          unreadNotifications += added;
          updateNotificationBadge();
          renderNotificationItems();
        }
      } catch {
        // El siguiente sondeo reintenta sin interrumpir el trabajo del usuario.
      } finally {
        notificationPolling = false;
      }
    };

    if (window.__envioNotificationPollId) window.clearInterval(window.__envioNotificationPollId);
    void pollEnvioNotifications();
    window.__envioNotificationPollId = window.setInterval(pollEnvioNotifications, 15_000);
  }

  const topbar = el("div", { class: "topbar" }, [
    el("div", { class: "topbar-left" }, [
      btnSidebarToggle,
      el("div", { class: "topbar-user" }, [
        el("b", {}, [
          el("i", { class: "fas fa-user-circle" }),
          " Sesión: ",
          String(session.nombre || "")
        ]),
        el("div", { class: "small" }, [
          el("i", { class: "fas fa-user-shield" }),
          " Rol: ",
          String(session.rol || "")
        ])
      ])
    ]),
    ...(notificationCenter ? [notificationCenter] : []),
    el("div", { class: "window-controls" }, [
      btnMin,
      btnMax,
      btnClose
    ])
  ]);

  const navButtons = [];
  const routeButtons = [];
  const allowedRoutes = new Set();
  const routeRendererNames = {
    dashboard: "renderDashboard",
    tickets: "renderTickets",
    rutas: "renderRutas",
    validar_rutas: "renderValidarRutas",
    envio_equipo: "renderEnvioEquipo",
    equipos: "renderEquipos",
    proyectos_especiales: "renderProyectosEspeciales",
    reportes: "renderReportes",
    calificacion: "renderCalificacion"
  };
  const routesWithCatalogos = new Set([
    "tickets",
    "rutas",
    "validar_rutas",
    "envio_equipo",
    "equipos",
    "proyectos_especiales",
    "reportes",
    "calificacion"
  ]);
  let routeRequestToken = 0;
  let activeRouteKey = null;
  const routeViewCache = new Map();
  const ROUTE_VIEW_CACHE_TTL_MS = 2 * 60 * 1000;

  function cacheCurrentRouteView() {
    if (!activeRouteKey || !content.childNodes.length) return;
    if (document.querySelector('.modalBack[data-block-route-change="1"]:not(.is-minimized)')) return;

    const holder = document.createElement("div");
    while (content.firstChild) {
      holder.appendChild(content.firstChild);
    }

    routeViewCache.set(activeRouteKey, {
      holder,
      className: content.className || "content",
      savedAt: Date.now()
    });
  }

  function restoreRouteView(routeKey) {
    const cached = routeViewCache.get(routeKey);
    if (!cached) return false;

    if (Date.now() - Number(cached.savedAt || 0) > ROUTE_VIEW_CACHE_TTL_MS) {
      routeViewCache.delete(routeKey);
      return false;
    }

    content.innerHTML = "";
    content.className = cached.className || "content";
    while (cached.holder.firstChild) {
      content.appendChild(cached.holder.firstChild);
    }
    activeRouteKey = routeKey;
    return true;
  }

  function refreshRestoredRouteView(routeKey, requestToken) {
    window.setTimeout(() => {
      if (requestToken !== routeRequestToken || activeRouteKey !== routeKey) return;
      const root = content.firstElementChild;
      if (root) {
        const handled = root.dispatchEvent(new CustomEvent("app:refresh-route", { bubbles: true, cancelable: true }));
        if (!handled) return;
      }
      const refreshBtn = content.querySelector(".module-filters .actions-inline .btn");
      if (refreshBtn && typeof refreshBtn.click === "function" && !refreshBtn.disabled) {
        refreshBtn.click();
      }
    }, 50);
  }

  function getRouteRenderer(routeKey) {
    const rendererName = routeRendererNames[String(routeKey || "")];
    return rendererName && typeof window[rendererName] === "function"
      ? window[rendererName]
      : null;
  }

  function setActiveRoute(routeKey) {
    routeButtons.forEach(({ key, button }) => {
      const isActive = key === routeKey;
      button.classList.toggle("active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function renderRouteLoading(routeKey) {
    const label = routeButtons.find((item) => item.key === routeKey)?.button?.dataset?.label || "Módulo";
    content.innerHTML = "";
    content.appendChild(
      el("div", { class: "card", style: "padding:24px;" }, [
        el("div", { class: "h1" }, [`Cargando ${label}...`]),
        el("div", { class: "small", style: "margin-top:8px;" }, [
          "Preparando datos y componentes del módulo."
        ])
      ])
    );
  }

  function renderRouteError(error, routeKey) {
    const label = routeButtons.find((item) => item.key === routeKey)?.button?.dataset?.label || "módulo";
    content.innerHTML = "";
    content.appendChild(
      el("div", { class: "card", style: "padding:24px;" }, [
        el("div", { class: "h1" }, [`No se pudo abrir ${label}`]),
        el("div", { class: "small", style: "margin-top:8px;" }, [
          getUserErrorMessage(error, "Ocurrió un error al cargar el módulo.")
        ])
      ])
    );
  }

  async function openRoute(routeKey) {
    const blockingModal = document.querySelector('.modalBack[data-block-route-change="1"]:not(.is-minimized)');
    if (blockingModal) {
      toast("Primero guarda o cierra la ventana que tienes abierta.", "warn");
      return;
    }

    if (!allowedRoutes.has(routeKey)) {
      toast("Sin acceso a este módulo.", "warn");
      routeKey = Array.from(allowedRoutes)[0] || "dashboard";
    }

    if (routeKey === activeRouteKey) {
      refreshRestoredRouteView(routeKey, ++routeRequestToken);
      return;
    }

    if (routeKey !== activeRouteKey) {
      cacheCurrentRouteView();
    }

    const requestToken = ++routeRequestToken;
    setActiveRoute(routeKey);

    if (restoreRouteView(routeKey)) {
      closeSidebarOverlay();
      refreshRestoredRouteView(routeKey, requestToken);
      return;
    }

    content.classList.remove("report-module", "calif-module", "envio-equipo-module");
    renderRouteLoading(routeKey);

    try {
      if (typeof window.ensureRouteModulesLoaded === "function") {
        await window.ensureRouteModulesLoaded(routeKey);
      }

      if (routesWithCatalogos.has(routeKey) && typeof window.ensureCatalogosLoaded === "function") {
        await window.ensureCatalogosLoaded();
      }

      if (requestToken !== routeRequestToken) return;

      const renderRoute = getRouteRenderer(routeKey);
      if (!renderRoute) {
        throw new Error("El módulo solicitado no está disponible.");
      }

      renderRoute(content);
      activeRouteKey = routeKey;
      closeSidebarOverlay();

      if (typeof window.warmupApplicationModules === "function") {
        void window.warmupApplicationModules(routeKey);
      }
    } catch (error) {
      if (requestToken !== routeRequestToken) return;

      renderRouteError(error, routeKey);

      if (isSessionErrorMessage(error?.message || error)) {
        session = null;
        if (typeof window.resetCatalogosState === "function") {
          window.resetCatalogosState();
        } else {
          catalogos = null;
        }
        routeViewCache.clear();
        activeRouteKey = null;
        mount(LoginView());
        return;
      }

      toast(getUserErrorMessage(error, "No se pudo cargar el módulo."), "err");
    }
  }

  const makeNavBtn = (routeKey, iconClass, label) => {
    const button = el("button", {
      class: "btn sidebar-nav-btn",
      type: "button",
      title: label,
      "data-label": label,
      onclick: () => { void openRoute(routeKey); }
    }, [el("i", { class: iconClass }), el("span", { class: "sidebar-nav-label" }, [label])]);

    routeButtons.push({ key: routeKey, button });
    return button;
  };

  const addNavBtn = (routeKey, button) => {
    if (!button) return;
    navButtons.push(button);
    allowedRoutes.add(routeKey);
  };

  const btnDashboard = makeNavBtn("dashboard", "fas fa-chart-line", "Dashboard");
  const btnTickets = makeNavBtn("tickets", "fas fa-ticket-alt", "Módulo Tickets");
  const btnRutas = makeNavBtn("rutas", "fas fa-route", "Módulo Rutas");

  const btnValidarRutas = can("VALIDACION_VIEW")
    ? makeNavBtn("validar_rutas", "fas fa-route", "Validar Rutas")
    : null;

  const btnEnvioEquipo = can("ENVIO_EQUIPO_VIEW")
    ? makeNavBtn("envio_equipo", "fas fa-shipping-fast", "Módulo Envío de Equipo")
    : null;

  const btnEquipos = can("EQUIPOS_VIEW")
    ? makeNavBtn("equipos", "fas fa-desktop", "Módulo Equipos")
    : null;

  const btnProyectos = can("PROYECTOS_ESPECIALES_VIEW_ALL")
    ? makeNavBtn("proyectos_especiales", "fas fa-project-diagram", "Módulo Proyectos Especiales")
    : null;

  const btnReportes = can("REPORTS_VIEW")
    ? makeNavBtn("reportes", "fas fa-chart-bar", "Módulo Reportes")
    : null;

  const btnCalificacion = can("CALIFICACION_VIEW")
    ? makeNavBtn("calificacion", "fas fa-star", "Módulo Calificación")
    : null;

  if (hasRole("GERENCIAL")) {
    addNavBtn("validar_rutas", btnValidarRutas);
    addNavBtn("envio_equipo", btnEnvioEquipo);
  } else if (isAnalista()) {
    addNavBtn("dashboard", btnDashboard);
    addNavBtn("tickets", btnTickets);
    addNavBtn("equipos", btnEquipos);
    addNavBtn("envio_equipo", btnEnvioEquipo);
  } else {
    addNavBtn("dashboard", btnDashboard);
    addNavBtn("tickets", btnTickets);
    addNavBtn("rutas", btnRutas);
    addNavBtn("validar_rutas", btnValidarRutas);
    addNavBtn("envio_equipo", btnEnvioEquipo);
    addNavBtn("equipos", btnEquipos);
    addNavBtn("proyectos_especiales", btnProyectos);
    addNavBtn("calificacion", btnCalificacion);
    addNavBtn("reportes", btnReportes);
  }

  const sidebar = el("aside", { class: "sidebar" }, [
    el("div", { class: "sidebar-header" }, [
      el("div", { class: "brand" }, [
        el("div", { class: "brand-mark brand-mark-logo", "aria-hidden": "true" }),
        el("div", { class: "brand-copy" }, [
          el("div", { class: "brand-title" }, ["SOPORTE TÉCNICO IT"]),
          el("div", { class: "brand-tagline" }, ["Panel de módulos"])
        ])
      ]),
      btnSidebarDesktopToggle
    ]),
    el("div", { class: "nav" }, navButtons),
    el("div", { class: "sidebar-footer" }, [
      el("div", { class: "sidebar-footer-logo", "aria-hidden": "true" })
    ])
  ]);

  const main = el("div", { class: "main" }, [topbar, content]);
  mount(el("div", { class: "container" }, [sidebar, sidebarBackdrop, main]));

  if (typeof window.api?.session_status === "function") {
    window.__soporteSessionHeartbeatId = window.setInterval(async () => {
      try {
        const status = await window.api.session_status();
        if (status?.active) return;
        window.clearInterval(window.__soporteSessionHeartbeatId);
        window.__soporteSessionHeartbeatId = null;
        session = null;
        if (typeof window.resetCatalogosState === "function") window.resetCatalogosState();
        else catalogos = null;
        mount(LoginView());
        toast("Tu sesión ha expirado. Ingresa nuevamente.", "warn");
      } catch {
        // Un fallo transitorio de IPC no debe cerrar una sesión válida.
      }
    }, 30_000);
  }

  applySidebarState();

  const initialRoute = allowedRoutes.has(safeRoute)
    ? safeRoute
    : (Array.from(allowedRoutes)[0] || "dashboard");

  void openRoute(routeRendererNames[initialRoute] ? initialRoute : "dashboard");
}
