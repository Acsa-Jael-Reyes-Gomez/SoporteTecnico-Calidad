function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

/** Convierte errores de infraestructura en mensajes breves para el usuario final. */
export function translateTechnicalErrorToSpanish(value: unknown, fallback = "No se pudo completar la operación.") {
  const message = String(value || "").trim();
  if (!message) return fallback;
  const lower = message.toLowerCase();

  if (includesAny(lower, ["im002", "data source name not found", "dsn no encontrado", "odbc driver manager"])) {
    return "No se encontró la conexión ODBC configurada.";
  }
  if (includesAny(lower, ["access denied for user", "authentication failed", "invalid authorization", "28000"])) {
    return "La base de datos rechazó el usuario o la contraseña configurados en ODBC.";
  }
  if (includesAny(lower, ["server has gone away", "lost connection", "communication link failure", "08s01"])) {
    return "Se perdió la conexión con la base de datos. Intenta nuevamente.";
  }
  if (includesAny(lower, ["connection refused", "can't connect", "cannot connect", "login timeout", "connection timeout"])) {
    return "No fue posible conectarse con la base de datos. Comunicate con sistemas.";
  }
  if (includesAny(lower, ["doesn't exist", "does not exist", "base table or view not found", "42s02"])) {
    return "Falta una tabla necesaria en la base de datos. Comunícate con Sistemas.";
  }
  if (includesAny(lower, ["unknown column", "column not found", "42s22"])) {
    return "La estructura de la base de datos no coincide con la versión del sistema. Comunícate con Sistemas.";
  }
  if (includesAny(lower, ["syntax error", "sql syntax", "42000", "er_parse_error"])) {
    return "Ocurrió un error interno al consultar la base de datos. Comunícate con Sistemas.";
  }
  if (includesAny(lower, ["duplicate entry", "unique constraint", "23000"])) {
    return "Ya existe un registro con la misma información.";
  }
  if (includesAny(lower, ["foreign key constraint", "cannot add or update a child row"])) {
    return "No se puede completar la operación porque existen registros relacionados.";
  }
  if (includesAny(lower, ["data too long", "string data, right truncation", "22001"])) {
    return "Uno de los textos ingresados supera el tamaño permitido.";
  }
  if (includesAny(lower, ["cannot be null", "doesn't have a default value", "not null constraint"])) {
    return "Falta completar un dato obligatorio.";
  }
  if (includesAny(lower, ["deadlock", "lock wait timeout"])) {
    return "La información estaba siendo utilizada por otro proceso. Intenta nuevamente.";
  }
  if (includesAny(lower, ["command failed: powershell", "fullyqualifiederrorid", "categoryinfo", "hresult", "0x800a"])) {
    return "Excel no pudo generar el archivo solicitado. Cierra otros libros de Excel e intenta nuevamente.";
  }
  if (includesAny(lower, ["enoent", "no such file or directory", "cannot find the path", "cannot find the file"])) {
    return "No se encontró un archivo necesario para completar la operación.";
  }
  if (includesAny(lower, ["eacces", "eperm", "permission denied", "access is denied"])) {
    return "Windows no permitió acceder al archivo o carpeta seleccionados.";
  }
  if (includesAny(lower, ["unexpected token", "unexpected identifier", "is not a function", "cannot read properties", "cannot set properties"])) {
    return "Ocurrió un error interno en la aplicación. Comunícate con Sistemas.";
  }

  const looksTechnicalOrEnglish = /\b(command failed|exception|failed|cannot|could not|unknown|not found|doesn't exist|sqlstate|odbc|mysql|hresult|stack trace)\b/i.test(message);
  return looksTechnicalOrEnglish ? fallback : message;
}
