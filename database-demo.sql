
CREATE TABLE `schema_version` (
  `version` varchar(20) NOT NULL,
  `appliedAt` datetime NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB CHARACTER SET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `catalogoequiporevisador`  (
  `idCatalogoEquipoRevisadoR` tinyint(3) UNSIGNED NOT NULL,
  `clave` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `nombre` varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `orden` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idCatalogoEquipoRevisadoR`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `des_clasificacion`  (
  `idClasificacion` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(20) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`idClasificacion`),
  UNIQUE KEY `uq_des_clasificacion_nombre` (`nombre`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `des_estado_calificacion`  (
  `idEstadoCalificacion` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`idEstadoCalificacion`),
  UNIQUE KEY `uq_des_estado_calificacion_nombre` (`nombre`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `des_estado_envio`  (
  `idEstadoEnvio` smallint(5) UNSIGNED NOT NULL,
  `clave` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `nombre` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `orden` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idEstadoEnvio`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `des_estado_validacion`  (
  `idEstadoValidacion` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`idEstadoValidacion`),
  UNIQUE KEY `uq_des_estado_validacion_nombre` (`nombre`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `des_medio_envio`  (
  `idMedioEnvio` smallint(5) UNSIGNED NOT NULL,
  `clave` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `nombre` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `orden` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idMedioEnvio`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `des_motivo_envio`  (
  `idMotivoEnvio` smallint(5) UNSIGNED NOT NULL,
  `clave` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `nombre` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `orden` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idMotivoEnvio`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `des_tipo_ruta`  (
  `idTipoRuta` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(20) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`idTipoRuta`),
  UNIQUE KEY `uq_des_tipo_ruta_nombre` (`nombre`)
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `envio_equipo`  (
  `idEnvioEquipo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `numeroEquipo` varchar(40) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `idUnidad` smallint(5) UNSIGNED NOT NULL,
  `idTipoEquipo` smallint(5) UNSIGNED NOT NULL,
  `nombreSolicitanteEnvio` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `idPuestoSolicitante` smallint(5) UNSIGNED NULL DEFAULT NULL,
  `motivoEnvio` varchar(160) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `idMotivoEnvio` smallint(5) UNSIGNED NOT NULL,
  `observaciones` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `medioEnvio` enum('CAMION','PERSONAL_SUCURSAL','PERSONAL_IT') CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `idMedioEnvio` smallint(5) UNSIGNED NOT NULL,
  `nombrePiloto` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `telefonoPiloto` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `placaVehiculo` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `nombrePersonalSucursal` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `idPuestoPersonalSucursal` smallint(5) UNSIGNED NULL DEFAULT NULL,
  `idTecnicoPersonalIT` int(10) UNSIGNED NULL DEFAULT NULL,
  `fechaEnvio` datetime NOT NULL,
  `idEstadoEnvio` smallint(5) UNSIGNED NOT NULL DEFAULT 1,
  `observacionesEstadoActual` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `fechaRecepcion` datetime NULL DEFAULT NULL,
  `fechaRevision` datetime NULL DEFAULT NULL,
  `fechaReparacion` datetime NULL DEFAULT NULL,
  `fechaEntrega` datetime NULL DEFAULT NULL,
  `fechaExtravio` datetime NULL DEFAULT NULL,
  `idTicketAsignado` int(10) UNSIGNED NULL DEFAULT NULL,
  `creadoPor` int(10) UNSIGNED NOT NULL,
  `actualizadoPor` int(10) UNSIGNED NULL DEFAULT NULL,
  `createdAt` datetime NULL DEFAULT NULL,
  `updatedAt` datetime NULL DEFAULT NULL,
  `fechaRegistro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaModificacion` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`idEnvioEquipo`),
  UNIQUE KEY `uq_envio_equipo_numero` (`numeroEquipo`),
  KEY `idx_envio_equipo_unidad_fecha` (`idUnidad`, `fechaEnvio`),
  KEY `idx_envio_equipo_tipo` (`idTipoEquipo`),
  KEY `idx_envio_equipo_ticket` (`idTicketAsignado`),
  KEY `idx_envio_equipo_creado_por` (`creadoPor`),
  KEY `idx_envio_equipo_actualizado_por` (`actualizadoPor`),
  KEY `idx_envio_equipo_puesto_solicitante` (`idPuestoSolicitante`),
  KEY `idx_envio_motivo` (`idMotivoEnvio`),
  KEY `idx_envio_medio` (`idMedioEnvio`),
  KEY `idx_envio_estado` (`idEstadoEnvio`),
  CONSTRAINT `fk_envio_equipo_actualizado_por` FOREIGN KEY (`actualizadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_equipo_creado_por` FOREIGN KEY (`creadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_equipo_ticket` FOREIGN KEY (`idTicketAsignado`) REFERENCES `ticket` (`idTicket`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_equipo_tipo` FOREIGN KEY (`idTipoEquipo`) REFERENCES `tipo_equipo` (`idTipoEquipo`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_equipo_unidad` FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_estado` FOREIGN KEY (`idEstadoEnvio`) REFERENCES `des_estado_envio` (`idEstadoEnvio`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_medio` FOREIGN KEY (`idMedioEnvio`) REFERENCES `des_medio_envio` (`idMedioEnvio`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_envio_motivo` FOREIGN KEY (`idMotivoEnvio`) REFERENCES `des_motivo_envio` (`idMotivoEnvio`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `equipos_revisados_rutas`  (
  `idEquipoRevisadoRuta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `idRuta` int(10) UNSIGNED NOT NULL,
  `idCatalogoEquipoRevisadoR` tinyint(3) UNSIGNED NOT NULL,
  `cantidad` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `validado` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idEquipoRevisadoRuta`),
  UNIQUE KEY `uq_errr_ruta_equipo` (`idRuta`, `idCatalogoEquipoRevisadoR`),
  KEY `idx_errr_ruta` (`idRuta`),
  KEY `idx_errr_equipo` (`idCatalogoEquipoRevisadoR`),
  KEY `idx_errr_validado` (`validado`),
  CONSTRAINT `fk_errr_equipo` FOREIGN KEY (`idCatalogoEquipoRevisadoR`) REFERENCES `catalogoequiporevisador` (`idCatalogoEquipoRevisadoR`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_errr_ruta` FOREIGN KEY (`idRuta`) REFERENCES `ruta` (`idRuta`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `permiso`  (
  `idPermiso` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `descripcion` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`idPermiso`),
  UNIQUE KEY `uq_permiso_code` (`code`)
) ENGINE = InnoDB AUTO_INCREMENT = 138 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `proyecto_especial`  (
  `idProyectoEspecial` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `fechaRegistro` datetime NOT NULL,
  `idUnidad` smallint(5) UNSIGNED NOT NULL,
  `idUsuarioCreador` int(10) UNSIGNED NOT NULL,
  `estadoRevision` enum('PENDIENTE','APROBADO') CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT 'PENDIENTE',
  `fechaRevision` datetime NULL DEFAULT NULL,
  `idAdminRevisor` int(10) UNSIGNED NULL DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `urlDocumento` varchar(500) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`idProyectoEspecial`),
  KEY `idx_pe_estado` (`estadoRevision`),
  KEY `idx_pe_fecha` (`fechaRegistro`),
  KEY `idx_pe_creador` (`idUsuarioCreador`),
  KEY `fk_pe_unidad` (`idUnidad`),
  KEY `fk_pe_revisor` (`idAdminRevisor`),
  CONSTRAINT `fk_pe_creador` FOREIGN KEY (`idUsuarioCreador`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pe_revisor` FOREIGN KEY (`idAdminRevisor`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pe_unidad` FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `proyecto_especial_participante`  (
  `idProyectoEspecial` int(10) UNSIGNED NOT NULL,
  `idUsuario` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idProyectoEspecial`, `idUsuario`),
  KEY `fk_pep_usuario` (`idUsuario`),
  CONSTRAINT `fk_pep_proyecto` FOREIGN KEY (`idProyectoEspecial`) REFERENCES `proyecto_especial` (`idProyectoEspecial`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_pep_usuario` FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `puesto`  (
  `idPuesto` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idPuesto`),
  UNIQUE KEY `uq_puesto_nombre` (`nombre`)
) ENGINE = InnoDB AUTO_INCREMENT = 41 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `rol`  (
  `idRol` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`idRol`),
  UNIQUE KEY `uq_rol_nombre` (`nombre`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `rol_permiso`  (
  `idRol` tinyint(3) UNSIGNED NOT NULL,
  `idPermiso` smallint(5) UNSIGNED NOT NULL,
  PRIMARY KEY (`idRol`, `idPermiso`),
  KEY `fk_rp_perm` (`idPermiso`),
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`idPermiso`) REFERENCES `permiso` (`idPermiso`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_rp_rol` FOREIGN KEY (`idRol`) REFERENCES `rol` (`idRol`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `ruta`  (
  `idRuta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `idUnidad` smallint(5) UNSIGNED NOT NULL,
  `idTipoRuta` tinyint(3) UNSIGNED NOT NULL,
  `tipo` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `fechaApertura` datetime NOT NULL,
  `fechaCierre` datetime NULL DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `idEstadoValidacion` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `nombreValidador` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `puestoValidador` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `fechaValidacion` datetime NULL DEFAULT NULL,
  `idEstadoCalificacion` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `fechaCalificacion` datetime NULL DEFAULT NULL,
  `idUsuarioCalificador` int(10) UNSIGNED NULL DEFAULT NULL,
  `open` tinyint(1) NOT NULL DEFAULT 0,
  `creadoPor` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idRuta`),
  KEY `idx_ruta_open_fecha` (`open`, `fechaApertura`),
  KEY `idx_ruta_unidad_open_fecha` (`idUnidad`, `open`, `fechaApertura`),
  KEY `idx_ruta_creadoPor` (`creadoPor`),
  KEY `idx_ruta_tipo_ruta` (`idTipoRuta`),
  KEY `idx_ruta_estado_validacion` (`idEstadoValidacion`),
  KEY `idx_ruta_estado_calificacion` (`idEstadoCalificacion`),
  KEY `idx_ruta_usuario_calificador` (`idUsuarioCalificador`),
  KEY `idx_ruta_estado_calificacion_fecha` (`idEstadoCalificacion`, `fechaApertura`),
  CONSTRAINT `fk_ruta_creadoPor` FOREIGN KEY (`creadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ruta_estado_calificacion` FOREIGN KEY (`idEstadoCalificacion`) REFERENCES `des_estado_calificacion` (`idEstadoCalificacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ruta_estado_validacion` FOREIGN KEY (`idEstadoValidacion`) REFERENCES `des_estado_validacion` (`idEstadoValidacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ruta_tipo_ruta` FOREIGN KEY (`idTipoRuta`) REFERENCES `des_tipo_ruta` (`idTipoRuta`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ruta_unidad` FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ruta_usuario_calificador` FOREIGN KEY (`idUsuarioCalificador`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `ruta_participante`  (
  `idRuta` int(10) UNSIGNED NOT NULL,
  `idTecnico` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idRuta`, `idTecnico`),
  KEY `idx_rp_tecnico` (`idTecnico`),
  CONSTRAINT `fk_rp_ruta` FOREIGN KEY (`idRuta`) REFERENCES `ruta` (`idRuta`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_rp_tecnico` FOREIGN KEY (`idTecnico`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `ruta_revision_equipo`  (
  `idRutaRevisionEquipo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `idRuta` int(10) UNSIGNED NOT NULL,
  `equipoKey` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `equipoLabel` varchar(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `cantidad` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `validado` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idRutaRevisionEquipo`),
  KEY `idx_rre_ruta` (`idRuta`),
  KEY `idx_rre_equipo` (`equipoKey`),
  KEY `idx_rre_validado` (`validado`),
  CONSTRAINT `fk_rre_ruta` FOREIGN KEY (`idRuta`) REFERENCES `ruta` (`idRuta`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

CREATE TABLE `servicio`  (
  `idServicio` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `idClasificacion` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idServicio`),
  UNIQUE KEY `uq_servicio_nombre` (`nombre`),
  KEY `idx_servicio_clasificacion` (`idClasificacion`),
  CONSTRAINT `fk_servicio_clasificacion` FOREIGN KEY (`idClasificacion`) REFERENCES `des_clasificacion` (`idClasificacion`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 111 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `ticket`  (
  `idTicket` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombreSolicitante` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `idPuesto` smallint(5) UNSIGNED NOT NULL,
  `idUnidad` smallint(5) UNSIGNED NOT NULL,
  `idServicio` smallint(5) UNSIGNED NOT NULL,
  `enLugar` tinyint(1) NOT NULL DEFAULT 0,
  `fechaApertura` datetime NOT NULL,
  `fechaCierre` datetime NULL DEFAULT NULL,
  `solucion` text CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `open` tinyint(1) NOT NULL DEFAULT 0,
  `creadoPor` int(10) UNSIGNED NOT NULL,
  `idClasificacion` tinyint(3) UNSIGNED NULL DEFAULT NULL,
  `idEstadoCalificacion` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `fechaCalificacion` datetime NULL DEFAULT NULL,
  `idUsuarioCalificador` int(10) UNSIGNED NULL DEFAULT NULL,
  `casoExtraordinario` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idTicket`),
  KEY `idx_ticket_open_fecha` (`open`, `fechaApertura`),
  KEY `idx_ticket_unidad_open_fecha` (`idUnidad`, `open`, `fechaApertura`),
  KEY `idx_ticket_creadoPor` (`creadoPor`),
  KEY `fk_ticket_puesto` (`idPuesto`),
  KEY `fk_ticket_servicio` (`idServicio`),
  KEY `idx_ticket_clasificacion` (`idClasificacion`),
  KEY `idx_ticket_estado_calificacion` (`idEstadoCalificacion`),
  KEY `idx_ticket_usuario_calificador` (`idUsuarioCalificador`),
  KEY `idx_ticket_estado_calificacion_fecha` (`idEstadoCalificacion`, `fechaApertura`),
  CONSTRAINT `fk_ticket_clasificacion_nueva` FOREIGN KEY (`idClasificacion`) REFERENCES `des_clasificacion` (`idClasificacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ticket_creadoPor` FOREIGN KEY (`creadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ticket_estado_calificacion` FOREIGN KEY (`idEstadoCalificacion`) REFERENCES `des_estado_calificacion` (`idEstadoCalificacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ticket_puesto` FOREIGN KEY (`idPuesto`) REFERENCES `puesto` (`idPuesto`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ticket_servicio` FOREIGN KEY (`idServicio`) REFERENCES `servicio` (`idServicio`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ticket_unidad` FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ticket_usuario_calificador` FOREIGN KEY (`idUsuarioCalificador`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `ticket_equipo`  (
  `idEquipoControl` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `idTicket` int(10) UNSIGNED NOT NULL,
  `idUnidad` smallint(5) UNSIGNED NOT NULL,
  `idTipoEquipo` smallint(5) UNSIGNED NOT NULL,
  `idTecnicoAsignado` int(10) UNSIGNED NOT NULL,
  `registradoPor` int(10) UNSIGNED NOT NULL,
  `numeroEquipo` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `fechaRecibido` datetime NOT NULL,
  `fechaSalida` datetime NULL DEFAULT NULL,
  `estado` enum('EN_TALLER','ENTREGADO','CANCELADO') CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT 'EN_TALLER',
  `resultado` enum('PENDIENTE','CON_SOLUCION','SIN_SOLUCION') CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT 'PENDIENTE',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idEquipoControl`),
  KEY `idx_te_ticket` (`idTicket`),
  KEY `idx_te_unidad` (`idUnidad`),
  KEY `idx_te_tecnico` (`idTecnicoAsignado`),
  KEY `idx_te_estado` (`estado`),
  KEY `fk_te_registrado` (`registradoPor`),
  KEY `idx_te_tipo` (`idTipoEquipo`),
  CONSTRAINT `fk_te_registrado` FOREIGN KEY (`registradoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_te_tecnico` FOREIGN KEY (`idTecnicoAsignado`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_te_ticket` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_te_tipo_equipo` FOREIGN KEY (`idTipoEquipo`) REFERENCES `tipo_equipo` (`idTipoEquipo`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_te_unidad` FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `ticket_tecnico`  (
  `idTicket` int(10) UNSIGNED NOT NULL,
  `idTecnico` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`idTicket`, `idTecnico`),
  KEY `idx_tt_tecnico` (`idTecnico`),
  CONSTRAINT `fk_tt_tecnico` FOREIGN KEY (`idTecnico`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_tt_ticket` FOREIGN KEY (`idTicket`) REFERENCES `ticket` (`idTicket`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `tipo_equipo`  (
  `idTipoEquipo` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idTipoEquipo`),
  UNIQUE KEY `uk_tipo_equipo_nombre` (`nombre`)
) ENGINE = InnoDB AUTO_INCREMENT = 162 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `unidad`  (
  `idUnidad` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `idTipoRuta` tinyint(3) UNSIGNED NOT NULL DEFAULT 2,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idUnidad`),
  UNIQUE KEY `uq_unidad_nombre` (`nombre`),
  KEY `idx_unidad_tipo_ruta` (`idTipoRuta`),
  CONSTRAINT `fk_unidad_tipo_ruta` FOREIGN KEY (`idTipoRuta`) REFERENCES `des_tipo_ruta` (`idTipoRuta`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 127 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `usuario`  (
  `idUsuario` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario` varchar(40) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `pass` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `nombre` varchar(80) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `idRol` tinyint(3) UNSIGNED NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idUsuario`),
  UNIQUE KEY `uq_usuario_user` (`usuario`),
  KEY `idx_usuario_rol` (`idRol`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`idRol`) REFERENCES `rol` (`idRol`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 29 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE TABLE `usuario_unidad`  (
  `idUsuario` int(10) UNSIGNED NOT NULL,
  `idUnidad` smallint(5) UNSIGNED NOT NULL,
  PRIMARY KEY (`idUsuario`, `idUnidad`),
  KEY `fk_uu_unidad` (`idUnidad`),
  CONSTRAINT `fk_uu_unidad` FOREIGN KEY (`idUnidad`) REFERENCES `unidad` (`idUnidad`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_uu_usuario` FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;
