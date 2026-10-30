PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `schema_version` (
  `version` TEXT NOT NULL,
  `appliedAt` TEXT NOT NULL,
  PRIMARY KEY (`version`)
);

CREATE TABLE IF NOT EXISTS `catalogoequiporevisador` (
  `idCatalogoEquipoRevisadoR` INTEGER NOT NULL,
  `clave` TEXT NOT NULL,
  `nombre` TEXT NOT NULL,
  `orden` INTEGER NOT NULL DEFAULT 0,
  `activo` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`idCatalogoEquipoRevisadoR`)
);

CREATE TABLE IF NOT EXISTS `des_clasificacion` (
  `idClasificacion` INTEGER NOT NULL,
  `nombre` TEXT NOT NULL,
  PRIMARY KEY (`idClasificacion`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_des_clasificacion_nombre` ON `des_clasificacion` (`nombre`);

CREATE TABLE IF NOT EXISTS `des_estado_calificacion` (
  `idEstadoCalificacion` INTEGER NOT NULL,
  `nombre` TEXT NOT NULL,
  PRIMARY KEY (`idEstadoCalificacion`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_des_estado_calificacion_nombre` ON `des_estado_calificacion` (`nombre`);

CREATE TABLE IF NOT EXISTS `des_estado_envio` (
  `idEstadoEnvio` INTEGER NOT NULL,
  `clave` TEXT NOT NULL,
  `nombre` TEXT NOT NULL,
  `orden` INTEGER NOT NULL DEFAULT 0,
  `activo` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`idEstadoEnvio`)
);

CREATE TABLE IF NOT EXISTS `des_estado_validacion` (
  `idEstadoValidacion` INTEGER NOT NULL,
  `nombre` TEXT NOT NULL,
  PRIMARY KEY (`idEstadoValidacion`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_des_estado_validacion_nombre` ON `des_estado_validacion` (`nombre`);

CREATE TABLE IF NOT EXISTS `des_medio_envio` (
  `idMedioEnvio` INTEGER NOT NULL,
  `clave` TEXT NOT NULL,
  `nombre` TEXT NOT NULL,
  `orden` INTEGER NOT NULL DEFAULT 0,
  `activo` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`idMedioEnvio`)
);

CREATE TABLE IF NOT EXISTS `des_motivo_envio` (
  `idMotivoEnvio` INTEGER NOT NULL,
  `clave` TEXT NOT NULL,
  `nombre` TEXT NOT NULL,
  `orden` INTEGER NOT NULL DEFAULT 0,
  `activo` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`idMotivoEnvio`)
);

CREATE TABLE IF NOT EXISTS `des_tipo_ruta` (
  `idTipoRuta` INTEGER NOT NULL,
  `nombre` TEXT NOT NULL,
  PRIMARY KEY (`idTipoRuta`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_des_tipo_ruta_nombre` ON `des_tipo_ruta` (`nombre`);

CREATE TABLE IF NOT EXISTS `envio_equipo` (
  `idEnvioEquipo` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `numeroEquipo` TEXT NOT NULL,
  `idUnidad` INTEGER NOT NULL,
  `idTipoEquipo` INTEGER NOT NULL,
  `nombreSolicitanteEnvio` TEXT NULL DEFAULT NULL,
  `idPuestoSolicitante` INTEGER NULL DEFAULT NULL,
  `idMotivoEnvio` INTEGER NOT NULL,
  `observaciones` text NULL,
  `idMedioEnvio` INTEGER NOT NULL,
  `nombrePiloto` TEXT NULL DEFAULT NULL,
  `telefonoPiloto` TEXT NULL DEFAULT NULL,
  `placaVehiculo` TEXT NULL DEFAULT NULL,
  `nombrePersonalSucursal` TEXT NULL DEFAULT NULL,
  `idPuestoPersonalSucursal` INTEGER NULL DEFAULT NULL,
  `idTecnicoPersonalIT` INTEGER NULL DEFAULT NULL,
  `fechaEnvio` TEXT NOT NULL,
  `idEstadoEnvio` INTEGER NOT NULL DEFAULT 1,
  `observacionesEstadoActual` text NULL,
  `fechaRecepcion` TEXT NULL DEFAULT NULL,
  `fechaRevision` TEXT NULL DEFAULT NULL,
  `fechaReparacion` TEXT NULL DEFAULT NULL,
  `fechaEntrega` TEXT NULL DEFAULT NULL,
  `fechaExtravio` TEXT NULL DEFAULT NULL,
  `idTicketAsignado` INTEGER NULL DEFAULT NULL,
  `creadoPor` INTEGER NOT NULL,
  `actualizadoPor` INTEGER NULL DEFAULT NULL,
  `createdAt` TEXT NULL DEFAULT NULL,
  `updatedAt` TEXT NULL DEFAULT NULL,
  `fechaRegistro` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaModificacion` TEXT NULL DEFAULT NULL,
  FOREIGN KEY (`actualizadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`creadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTicketAsignado`) REFERENCES `ticket` (`idTicket`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTipoEquipo`) REFERENCES `tipo_equipo` (`idTipoEquipo`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idEstadoEnvio`) REFERENCES `des_estado_envio` (`idEstadoEnvio`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idMedioEnvio`) REFERENCES `des_medio_envio` (`idMedioEnvio`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idMotivoEnvio`) REFERENCES `des_motivo_envio` (`idMotivoEnvio`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_envio_equipo_numero` ON `envio_equipo` (`numeroEquipo`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_envio_equipo_ticket_asignado` ON `envio_equipo` (`idTicketAsignado`);
CREATE INDEX IF NOT EXISTS `idx_envio_equipo_unidad_fecha` ON `envio_equipo` (`idUnidad`, `fechaEnvio`);
CREATE INDEX IF NOT EXISTS `idx_envio_equipo_tipo` ON `envio_equipo` (`idTipoEquipo`);
CREATE INDEX IF NOT EXISTS `idx_envio_equipo_ticket` ON `envio_equipo` (`idTicketAsignado`);
CREATE INDEX IF NOT EXISTS `idx_envio_equipo_creado_por` ON `envio_equipo` (`creadoPor`);
CREATE INDEX IF NOT EXISTS `idx_envio_equipo_actualizado_por` ON `envio_equipo` (`actualizadoPor`);
CREATE INDEX IF NOT EXISTS `idx_envio_motivo` ON `envio_equipo` (`idMotivoEnvio`);
CREATE INDEX IF NOT EXISTS `idx_envio_medio` ON `envio_equipo` (`idMedioEnvio`);
CREATE INDEX IF NOT EXISTS `idx_envio_estado` ON `envio_equipo` (`idEstadoEnvio`);
CREATE INDEX IF NOT EXISTS `idx_envio_equipo_puesto_solicitante` ON `envio_equipo` (`idPuestoSolicitante`);

CREATE TABLE IF NOT EXISTS `equipos_revisados_rutas` (
  `idEquipoRevisadoRuta` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `idRuta` INTEGER NOT NULL,
  `idCatalogoEquipoRevisadoR` INTEGER NOT NULL,
  `cantidad` INTEGER NOT NULL DEFAULT 0,
  `validado` INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (`idCatalogoEquipoRevisadoR`) REFERENCES `catalogoequiporevisador` (`idCatalogoEquipoRevisadoR`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idRuta`) REFERENCES `ruta` (`idRuta`) ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_errr_ruta_equipo` ON `equipos_revisados_rutas` (`idRuta`, `idCatalogoEquipoRevisadoR`);
CREATE INDEX IF NOT EXISTS `idx_errr_ruta` ON `equipos_revisados_rutas` (`idRuta`);
CREATE INDEX IF NOT EXISTS `idx_errr_equipo` ON `equipos_revisados_rutas` (`idCatalogoEquipoRevisadoR`);
CREATE INDEX IF NOT EXISTS `idx_errr_validado` ON `equipos_revisados_rutas` (`validado`);

CREATE TABLE IF NOT EXISTS `notificacion_asignacion` (
  `idNotificacion` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `idUsuario` INTEGER NOT NULL,
  `tipo` TEXT NOT NULL,
  `idReferencia` INTEGER NOT NULL,
  `idUnidad` INTEGER NULL DEFAULT NULL,
  `creadoPor` INTEGER NULL DEFAULT NULL,
  `createdAt` TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_notificacion_usuario_fecha` ON `notificacion_asignacion` (`idUsuario`, `createdAt`, `idNotificacion`);
CREATE INDEX IF NOT EXISTS `idx_notificacion_referencia` ON `notificacion_asignacion` (`tipo`, `idReferencia`);

CREATE TABLE IF NOT EXISTS `permiso` (
  `idPermiso` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` TEXT NOT NULL,
  `descripcion` TEXT NULL DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_permiso_code` ON `permiso` (`code`);

CREATE TABLE IF NOT EXISTS `proyecto_especial` (
  `idProyectoEspecial` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `titulo` TEXT NOT NULL,
  `descripcion` text NULL,
  `fechaRegistro` TEXT NOT NULL,
  `idUnidad` INTEGER NOT NULL,
  `idUsuarioCreador` INTEGER NOT NULL,
  `estadoRevision` TEXT NOT NULL DEFAULT 'PENDIENTE',
  `fechaRevision` TEXT NULL DEFAULT NULL,
  `idAdminRevisor` INTEGER NULL DEFAULT NULL,
  `activo` INTEGER NOT NULL DEFAULT 1,
  `urlDocumento` TEXT NULL DEFAULT NULL,
  FOREIGN KEY (`idUsuarioCreador`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idAdminRevisor`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_pe_estado` ON `proyecto_especial` (`estadoRevision`);
CREATE INDEX IF NOT EXISTS `idx_pe_fecha` ON `proyecto_especial` (`fechaRegistro`);
CREATE INDEX IF NOT EXISTS `idx_pe_creador` ON `proyecto_especial` (`idUsuarioCreador`);
CREATE INDEX IF NOT EXISTS `fk_pe_unidad` ON `proyecto_especial` (`idUnidad`);
CREATE INDEX IF NOT EXISTS `fk_pe_revisor` ON `proyecto_especial` (`idAdminRevisor`);

CREATE TABLE IF NOT EXISTS `proyecto_especial_participante` (
  `idProyectoEspecial` INTEGER NOT NULL,
  `idUsuario` INTEGER NOT NULL,
  PRIMARY KEY (`idProyectoEspecial`, `idUsuario`),
  FOREIGN KEY (`idProyectoEspecial`) REFERENCES `proyecto_especial` (`idProyectoEspecial`) ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `fk_pep_usuario` ON `proyecto_especial_participante` (`idUsuario`);

CREATE TABLE IF NOT EXISTS `puesto` (
  `idPuesto` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` TEXT NOT NULL,
  `activo` INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_puesto_nombre` ON `puesto` (`nombre`);

CREATE TABLE IF NOT EXISTS `rol` (
  `idRol` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_rol_nombre` ON `rol` (`nombre`);

CREATE TABLE IF NOT EXISTS `rol_permiso` (
  `idRol` INTEGER NOT NULL,
  `idPermiso` INTEGER NOT NULL,
  PRIMARY KEY (`idRol`, `idPermiso`),
  FOREIGN KEY (`idPermiso`) REFERENCES `permiso` (`idPermiso`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idRol`) REFERENCES `rol` (`idRol`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `fk_rp_perm` ON `rol_permiso` (`idPermiso`);

CREATE TABLE IF NOT EXISTS `ruta` (
  `idRuta` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `idUnidad` INTEGER NOT NULL,
  `idTipoRuta` INTEGER NOT NULL,
  `tipo` TEXT NOT NULL,
  `fechaApertura` TEXT NOT NULL,
  `fechaCierre` TEXT NULL DEFAULT NULL,
  `observaciones` text NULL,
  `idEstadoValidacion` INTEGER NOT NULL DEFAULT 0,
  `nombreValidador` TEXT NULL DEFAULT NULL,
  `puestoValidador` TEXT NULL DEFAULT NULL,
  `fechaValidacion` TEXT NULL DEFAULT NULL,
  `idEstadoCalificacion` INTEGER NOT NULL DEFAULT 0,
  `fechaCalificacion` TEXT NULL DEFAULT NULL,
  `idUsuarioCalificador` INTEGER NULL DEFAULT NULL,
  `open` INTEGER NOT NULL DEFAULT 0,
  `creadoPor` INTEGER NOT NULL,
  FOREIGN KEY (`creadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idEstadoCalificacion`) REFERENCES `des_estado_calificacion` (`idEstadoCalificacion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idEstadoValidacion`) REFERENCES `des_estado_validacion` (`idEstadoValidacion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTipoRuta`) REFERENCES `des_tipo_ruta` (`idTipoRuta`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUsuarioCalificador`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_ruta_open_fecha` ON `ruta` (`open`, `fechaApertura`);
CREATE INDEX IF NOT EXISTS `idx_ruta_unidad_open_fecha` ON `ruta` (`idUnidad`, `open`, `fechaApertura`);
CREATE INDEX IF NOT EXISTS `idx_ruta_creadoPor` ON `ruta` (`creadoPor`);
CREATE INDEX IF NOT EXISTS `idx_ruta_tipo_ruta` ON `ruta` (`idTipoRuta`);
CREATE INDEX IF NOT EXISTS `idx_ruta_estado_validacion` ON `ruta` (`idEstadoValidacion`);
CREATE INDEX IF NOT EXISTS `idx_ruta_estado_calificacion` ON `ruta` (`idEstadoCalificacion`);
CREATE INDEX IF NOT EXISTS `idx_ruta_usuario_calificador` ON `ruta` (`idUsuarioCalificador`);
CREATE INDEX IF NOT EXISTS `idx_ruta_estado_calificacion_fecha` ON `ruta` (`idEstadoCalificacion`, `fechaApertura`);

CREATE TABLE IF NOT EXISTS `ruta_participante` (
  `idRuta` INTEGER NOT NULL,
  `idTecnico` INTEGER NOT NULL,
  PRIMARY KEY (`idRuta`, `idTecnico`),
  FOREIGN KEY (`idRuta`) REFERENCES `ruta` (`idRuta`) ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY (`idTecnico`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_rp_tecnico` ON `ruta_participante` (`idTecnico`);

CREATE TABLE IF NOT EXISTS `ruta_revision_equipo` (
  `idRutaRevisionEquipo` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `idRuta` INTEGER NOT NULL,
  `equipoKey` TEXT NOT NULL,
  `equipoLabel` TEXT NOT NULL,
  `cantidad` INTEGER NOT NULL DEFAULT 0,
  `validado` INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (`idRuta`) REFERENCES `ruta` (`idRuta`) ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_rre_ruta` ON `ruta_revision_equipo` (`idRuta`);
CREATE INDEX IF NOT EXISTS `idx_rre_equipo` ON `ruta_revision_equipo` (`equipoKey`);
CREATE INDEX IF NOT EXISTS `idx_rre_validado` ON `ruta_revision_equipo` (`validado`);

CREATE TABLE IF NOT EXISTS `servicio` (
  `idServicio` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` TEXT NOT NULL,
  `idClasificacion` INTEGER NOT NULL DEFAULT 1,
  `activo` INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`idClasificacion`) REFERENCES `des_clasificacion` (`idClasificacion`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_servicio_nombre` ON `servicio` (`nombre`);
CREATE INDEX IF NOT EXISTS `idx_servicio_clasificacion` ON `servicio` (`idClasificacion`);

CREATE TABLE IF NOT EXISTS `ticket` (
  `idTicket` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombreSolicitante` TEXT NOT NULL,
  `idPuesto` INTEGER NOT NULL,
  `idUnidad` INTEGER NOT NULL,
  `idServicio` INTEGER NOT NULL,
  `enLugar` INTEGER NOT NULL DEFAULT 0,
  `fechaApertura` TEXT NOT NULL,
  `fechaCierre` TEXT NULL DEFAULT NULL,
  `solucion` text NULL,
  `open` INTEGER NOT NULL DEFAULT 0,
  `creadoPor` INTEGER NOT NULL,
  `idClasificacion` INTEGER NULL DEFAULT NULL,
  `idEstadoCalificacion` INTEGER NOT NULL DEFAULT 0,
  `fechaCalificacion` TEXT NULL DEFAULT NULL,
  `idUsuarioCalificador` INTEGER NULL DEFAULT NULL,
  `casoExtraordinario` INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (`idClasificacion`) REFERENCES `des_clasificacion` (`idClasificacion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`creadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idEstadoCalificacion`) REFERENCES `des_estado_calificacion` (`idEstadoCalificacion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idPuesto`) REFERENCES `puesto` (`idPuesto`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idServicio`) REFERENCES `servicio` (`idServicio`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUsuarioCalificador`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_ticket_open_fecha` ON `ticket` (`open`, `fechaApertura`);
CREATE INDEX IF NOT EXISTS `idx_ticket_unidad_open_fecha` ON `ticket` (`idUnidad`, `open`, `fechaApertura`);
CREATE INDEX IF NOT EXISTS `idx_ticket_creadoPor` ON `ticket` (`creadoPor`);
CREATE INDEX IF NOT EXISTS `fk_ticket_puesto` ON `ticket` (`idPuesto`);
CREATE INDEX IF NOT EXISTS `fk_ticket_servicio` ON `ticket` (`idServicio`);
CREATE INDEX IF NOT EXISTS `idx_ticket_clasificacion` ON `ticket` (`idClasificacion`);
CREATE INDEX IF NOT EXISTS `idx_ticket_estado_calificacion` ON `ticket` (`idEstadoCalificacion`);
CREATE INDEX IF NOT EXISTS `idx_ticket_usuario_calificador` ON `ticket` (`idUsuarioCalificador`);
CREATE INDEX IF NOT EXISTS `idx_ticket_estado_calificacion_fecha` ON `ticket` (`idEstadoCalificacion`, `fechaApertura`);

CREATE TABLE IF NOT EXISTS `ticket_equipo` (
  `idEquipoControl` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `idTicket` INTEGER NOT NULL,
  `idUnidad` INTEGER NOT NULL,
  `idTipoEquipo` INTEGER NOT NULL,
  `idTecnicoAsignado` INTEGER NOT NULL,
  `registradoPor` INTEGER NOT NULL,
  `numeroEquipo` TEXT NOT NULL,
  `fechaRecibido` TEXT NOT NULL,
  `fechaSalida` TEXT NULL DEFAULT NULL,
  `estado` TEXT NOT NULL DEFAULT 'EN_TALLER',
  `resultado` TEXT NOT NULL DEFAULT 'PENDIENTE',
  `activo` INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`registradoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTecnicoAsignado`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTipoEquipo`) REFERENCES `tipo_equipo` (`idTipoEquipo`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_te_ticket` ON `ticket_equipo` (`idTicket`);
CREATE INDEX IF NOT EXISTS `idx_te_unidad` ON `ticket_equipo` (`idUnidad`);
CREATE INDEX IF NOT EXISTS `idx_te_tecnico` ON `ticket_equipo` (`idTecnicoAsignado`);
CREATE INDEX IF NOT EXISTS `idx_te_estado` ON `ticket_equipo` (`estado`);
CREATE INDEX IF NOT EXISTS `fk_te_registrado` ON `ticket_equipo` (`registradoPor`);
CREATE INDEX IF NOT EXISTS `idx_te_tipo` ON `ticket_equipo` (`idTipoEquipo`);

CREATE TABLE IF NOT EXISTS `ticket_tecnico` (
  `idTicket` INTEGER NOT NULL,
  `idTecnico` INTEGER NOT NULL,
  PRIMARY KEY (`idTicket`, `idTecnico`),
  FOREIGN KEY (`idTecnico`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_tt_tecnico` ON `ticket_tecnico` (`idTecnico`);

CREATE TABLE IF NOT EXISTS `tipo_equipo` (
  `idTipoEquipo` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` TEXT NOT NULL,
  `activo` INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS `uk_tipo_equipo_nombre` ON `tipo_equipo` (`nombre`);

CREATE TABLE IF NOT EXISTS `unidad` (
  `idUnidad` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` TEXT NOT NULL,
  `idTipoRuta` INTEGER NOT NULL DEFAULT 2,
  `activo` INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`idTipoRuta`) REFERENCES `des_tipo_ruta` (`idTipoRuta`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_unidad_nombre` ON `unidad` (`nombre`);
CREATE INDEX IF NOT EXISTS `idx_unidad_tipo_ruta` ON `unidad` (`idTipoRuta`);

CREATE TABLE IF NOT EXISTS `usuario` (
  `idUsuario` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `usuario` TEXT NOT NULL,
  `pass` TEXT NOT NULL,
  `nombre` TEXT NOT NULL,
  `idRol` INTEGER NOT NULL,
  `activo` INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`idRol`) REFERENCES `rol` (`idRol`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_usuario_user` ON `usuario` (`usuario`);
CREATE INDEX IF NOT EXISTS `idx_usuario_rol` ON `usuario` (`idRol`);

CREATE TABLE IF NOT EXISTS `usuario_unidad` (
  `idUsuario` INTEGER NOT NULL,
  `idUnidad` INTEGER NOT NULL,
  PRIMARY KEY (`idUsuario`, `idUnidad`),
  FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS `fk_uu_unidad` ON `usuario_unidad` (`idUnidad`);
