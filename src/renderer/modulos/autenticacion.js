let promesaCatalogos = null;
let catalogosRequestVersion = 0;

function resetCatalogosState() {
  catalogos = null;
  promesaCatalogos = null;
  catalogosRequestVersion = 0;
}

function getLoginInitialRoute() {
  return String(session?.rol || "") === "GERENCIAL" ? "validar_rutas" : getInitialRoute();
}

function ensureCatalogosLoaded(forceReload = false) {
  if (!isSessionValid()) {
    return Promise.reject(new Error("La sesión ya no es válida."));
  }

  if (forceReload) {
    catalogos = null;
    promesaCatalogos = null;
  }

  if (!forceReload && catalogos && typeof catalogos === "object") {
    return Promise.resolve(catalogos);
  }

  if (!forceReload && promesaCatalogos) {
    return promesaCatalogos;
  }

  const requestVersion = ++catalogosRequestVersion;
  promesaCatalogos = window.api
    .catalogos(session)
    .then((catResult) => {
      if (!catResult || !catResult.ok) {
        throw new Error(toUserText(catResult?.message, "No se pudieron cargar los catálogos."));
      }

      if (requestVersion === catalogosRequestVersion) {
        catalogos = catResult.data || {};
      }
      return catalogos;
    })
    .catch((error) => {
      if (requestVersion === catalogosRequestVersion) {
        promesaCatalogos = null;
      }
      throw error;
    })
    .finally(() => {
      if (requestVersion === catalogosRequestVersion) {
        promesaCatalogos = null;
      }
    });

  return promesaCatalogos;
}

window.ensureCatalogosLoaded = ensureCatalogosLoaded;
window.resetCatalogosState = resetCatalogosState;

function LoginView() {
  const passWrap = el("div", { class: "password-input-wrap" }, []);
  const pass = el("input", {
    placeholder: "Contraseña",
    type: "password",
    class: "password-input",
    style: "width:100%; padding-right:40px;"
  });

  const togglePassBtn = el("button", {
    type: "button",
    class: "password-toggle-btn",
    onclick: (e) => {
      e.stopPropagation();
      if (pass.type === "password") {
        pass.type = "text";
        togglePassBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        togglePassBtn.classList.add("active");
      } else {
        pass.type = "password";
        togglePassBtn.innerHTML = '<i class="fas fa-eye"></i>';
        togglePassBtn.classList.remove("active");
      }
    }
  }, [el("i", { class: "fas fa-eye" })]);

  passWrap.appendChild(pass);
  passWrap.appendChild(togglePassBtn);

  const user = el("input", { placeholder: "Usuario", style: "width:100%" });
  const msg = el("div", { class: "small", style: "text-align:center; margin-top:10px;" }, [""]);
  let loginInFlight = false;
  let btn;

  const doLogin = async () => {
    if (loginInFlight) return;
    loginInFlight = true;
    if (btn) btn.disabled = true;
    msg.textContent = "Validando...";

    try {
      const loginResult = await window.api.login(user.value.trim(), pass.value);

      if (!loginResult || !loginResult.ok) {
        msg.textContent = toUserText(loginResult?.message, "No se pudo iniciar sesión.");
        return;
      }
      if (!loginResult.session || !loginResult.session.idUsuario) {
        msg.textContent = "La respuesta de sesión no es válida.";
        return;
      }

      session = loginResult.session;
      resetCatalogosState();

      const initialRoute = getLoginInitialRoute();

      msg.textContent = "Abriendo sistema...";
      if (typeof window.ensureShellModuleLoaded === "function") {
        await window.ensureShellModuleLoaded();
      }
      if (typeof window.ensureRouteModulesLoaded === "function") {
        await window.ensureRouteModulesLoaded(initialRoute);
      }

      if (initialRoute !== "dashboard") {
        msg.textContent = "Cargando catálogos...";
        await ensureCatalogosLoaded();
      } else {
        void ensureCatalogosLoaded().catch(() => {});
      }

      AppShell(initialRoute);

      if (typeof window.warmupApplicationModules === "function") {
        void window.warmupApplicationModules(initialRoute);
      }
    } catch (e) {
      if (!catalogos) {
        session = null;
      }
      msg.textContent = getUserErrorMessage(e, "No se pudo iniciar sesión.");
    } finally {
      loginInFlight = false;
      if (btn) btn.disabled = false;
    }
  };

  user.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doLogin();
    }
  });
  pass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doLogin();
    }
  });

  btn = el(
    "button",
    {
      class: "btn primary loginBtn",
      onclick: doLogin
    },
    [el("i", { class: "fas fa-sign-in-alt" }), " Ingresar"]
  );

  const logo = el("div", { class: "loginLogo" }, [
    el("span", { class: "fa-stack" }, [
      el("i", { class: "fas fa-computer fa-stack-2x" }),
      el("i", { class: "fas fa-wifi fa-stack-1x" })
    ])
  ]);

  return el("div", { class: "loginWrap" }, [
    el("div", { class: "card loginCard" }, [
      el("div", { class: "loginHeader" }, [
        logo,
        el("div", { class: "loginTitle" }, ["IT TICKETS / RUTAS"])
      ]),

      el("div", { class: "loginGrid" }, [
        el("div", { class: "field" }, [
          el("label", {}, [el("i", { class: "fas fa-user" }), " Usuario"]),
          user
        ]),
        el("div", { class: "field" }, [
          el("label", {}, [el("i", { class: "fas fa-lock" }), " Contraseña"]),
          passWrap
        ])
      ]),

      el("div", { class: "loginActions" }, [btn]),
      el("div", {}, [msg]),
      el("div", { class: "small", style: "text-align:center; margin-top:14px;" }, [
        "IT Technology v6.0.0 - 2026"
      ])
    ])
  ]);
}

/* =========================
   SHELL
========================= */
