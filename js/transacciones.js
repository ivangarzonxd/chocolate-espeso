/**
 * ==============================================================
 * TRANSACCIONES - Gestión de préstamos, abonos e historial
 * ==============================================================
 * Módulo responsable de:
 * - Crear nuevas transacciones (préstamos y abonos)
 * - Mostrar historial de transacciones con cada socio
 * - Solicitar y aprobar eliminación de transacciones
 * - Guardar datos en Firestore
 */

const Transacciones = {
    /**
     * Nombre del socio con el que se está realizando la transacción
     * Se establece al abrir el modal de transacción
     * @type {string|null}
     */
    socioActivo: null,
    
    /**
     * Tipo de transacción seleccionada
     * Posibles valores:
     * - "preste": El usuario prestó dinero
     * - "me_prestaron": El usuario recibió un préstamo
     * - "abono": Pago/abono de un préstamo anterior
     * @type {string|null}
     */
    tipoSeleccionado: null,

    /**
     * Inicia una nueva transacción con un socio específico
     * Acciones:
     * 1. Guarda el nombre del socio
     * 2. Cierra modal de selección de socios
     * 3. Actualiza título del modal de transacción
     * 4. Abre modal para ingresar monto y concepto
     * 
     * @param {string} nombre - Nombre del socio seleccionado
     */
    iniciarConSocio(nombre) {
        this.socioActivo = nombre;
        Interfaz.cerrarModal('modal-socios');
        
        // Actualizar título del modal con el nombre del socio
        document.getElementById("titulo-socio-transaccion").innerText = nombre;
        
        // Ocultar formulario hasta que se seleccione tipo de transacción
        document.getElementById("seccion-formulario").classList.add("hidden");
        
        // Abrir modal de transacción
        Interfaz.abrirModal('modal-transaccion');
    },

    /**
     * Prepara el formulario para registrar la transacción
     * Acciones:
     * 1. Guarda el tipo de transacción seleccionado
     * 2. Muestra el formulario (monto y concepto)
     * 3. Enfoca en el campo de monto
     * 
     * @param {string} tipo - Tipo: 'preste', 'me_prestaron' o 'abono'
     */
    prepararTipo(tipo) {
        this.tipoSeleccionado = tipo;
        
        // Mostrar formulario de monto y concepto
        document.getElementById("seccion-formulario").classList.remove("hidden");
        
        // Enfocar automáticamente en el campo de monto
        document.getElementById("input-monto").focus();
    },

    /**
     * Guarda una nueva transacción en Firestore
     * Validaciones:
     * - Monto debe ser número positivo
     * - Concepto no puede estar vacío
     * 
     * Estructura de datos guardada:
     * {
     *   id: timestamp único
     *   creador: usuario que crea la transacción
     *   contraparte: otro usuario involucrado
     *   tipo: 'preste' | 'me_prestaron' | 'abono'
     *   monto: cantidad en euros
     *   concepto: descripción del movimiento
     *   fecha_str: fecha formateada (ej: "20 dic")
     *   estado: 'activo' | 'borrar_pendiente'
     * }
     */
    guardarMovimiento() {
        const monto = document.getElementById("input-monto").value;
        const concepto = document.getElementById("input-concepto").value;
        
        // Validar que ambos campos tengan datos
        if (!monto || !concepto) return alert("Faltan datos");

        // Crear objeto de transacción
        const nuevoMovimiento = {
            id: Date.now().toString(), // ID único basado en timestamp
            creador: Autenticacion.usuarioActual,
            contraparte: this.socioActivo,
            tipo: this.tipoSeleccionado,
            monto: parseFloat(monto),
            concepto: concepto,
            fecha_str: new Date().toLocaleDateString("es-ES", {day:"numeric", month:"short"}),
            estado: "activo" // Nueva transacción, activa por defecto
        };

        // Guardar en Firestore (añade al array de transacciones)
        db.collection("grupal_v4").doc("transacciones").update({
            lista: firebase.firestore.FieldValue.arrayUnion(nuevoMovimiento)
        }).then(() => {
            // Limpiar después de guardar
            Interfaz.cerrarModal('modal-transaccion');
            document.getElementById("input-monto").value = "";
            document.getElementById("input-concepto").value = "";
        });
    },

    /**
     * Abre el historial de transacciones desde el modal principal
     * Requiere que ya exista socioActivo
     */
    verHistorialDesdeModal() { 
        if (this.socioActivo) this.verHistorialSocio(this.socioActivo); 
    },

    /**
     * Muestra el historial completo de transacciones con un socio específico
     * Acciones:
     * 1. Filtra transacciones relevantes (solo con este socio)
     * 2. Las ordena de más reciente a más antigua
     * 3. Muestra monto, concepto, fecha y botones para eliminar
     * 4. Indica estado (activo, pendiente de borrar, etc.)
     * 
     * @param {string} socio - Nombre del socio
     */
    verHistorialSocio(socio) {
        this.socioActivo = socio;
        const contenedor = document.getElementById("contenedor-historial");
        
        // Actualizar encabezado del modal
        document.getElementById("nombre-socio-historial").innerText = socio;
        contenedor.innerHTML = "";

        // Filtrar transacciones relevantes: solo entre el usuario actual y este socio
        const relevantes = Principal.transaccionesGlobales.filter(t => 
            (t.creador === Autenticacion.usuarioActual && t.contraparte === socio) || 
            (t.creador === socio && t.contraparte === Autenticacion.usuarioActual)
        ).reverse(); // Invertir para mostrar más recientes primero

        // Renderizar cada transacción
        relevantes.forEach(t => {
            // Determinar si el usuario actual fue quien prestó
            const esMio = t.creador === Autenticacion.usuarioActual;
            const soyPagador = (esMio && t.tipo !== "me_prestaron") || (!esMio && t.tipo === "me_prestaron");
            const color = soyPagador ? "#00e676" : "#ff5252"; // Verde si es a favor, rojo si es en contra

            // Determinar estado y ícono del botón de eliminar
            let filaClase = "hist-row";
            let checkIcono = "⬜";
            let textoBoton = "Eliminar";
            let clickAccion = `onclick="Transacciones.pedirBorrado('${t.id}')"`;

            if (t.estado === "borrar_pendiente") {
                // Hay solicitud de eliminación pendiente
                filaClase += " pending-row";
                
                if (t.solicitado_por === Autenticacion.usuarioActual) { 
                    // Yo solicité la eliminación
                    checkIcono = "⏳";
                    textoBoton = "Esperando";
                    clickAccion = ""; // No se puede hacer más nada
                } else { 
                    // El otro usuario solicitó la eliminación
                    checkIcono = "⚠️";
                    textoBoton = "Aprobar";
                    clickAccion = `onclick="Transacciones.aprobarBorrado('${t.id}')"`; // Botón para aprobar
                }
            }

            // Insertar fila en el historial
            contenedor.innerHTML += `
                <div class="${filaClase}">
                    <div class="row-det">
                        <span class="row-date">${t.fecha_str} • ${esMio ? 'Tú' : t.creador}</span>
                        <span class="row-desc">${t.concepto}</span>
                    </div>
                    <div class="row-mon" style="color:${color}">${t.monto}€</div>
                    <div class="row-tra">
                        <div class="check-delete" ${clickAccion}>${checkIcono}</div>
                        <div class="btn-eliminar-texto">${textoBoton}</div>
                    </div>
                </div>`;
        });
        
        // Abrir modal con el historial
        Interfaz.abrirModal('modal-historial');
    },

    /**
     * Solicita la eliminación de una transacción
     * Al solicitar: la transacción se marca con estado 'borrar_pendiente'
     * El otro usuario puede ver la solicitud y aprobarla
     * Requiere confirmación del usuario
     * 
     * @param {string} id - ID único de la transacción
     */
    pedirBorrado(id) {
        if (!confirm("¿Marcar para borrar?")) return; // Pedir confirmación
        
        // Marcar como pendiente de borrado, indicando quién lo solicitó
        this.modificarEstado(id, "borrar_pendiente", Autenticacion.usuarioActual);
        Interfaz.cerrarModal('modal-historial');
    },

    /**
     * Aprueba la eliminación de una transacción
     * Solo el otro usuario (quien no solicitó) puede aprobar
     * Una vez aprobada: la transacción se elimina completamente
     * Requiere confirmación del usuario
     * 
     * @param {string} id - ID único de la transacción
     */
    aprobarBorrado(id) {
        if (confirm("¿Aprobar eliminación?")) {
            // Crear nueva lista sin la transacción a eliminar
            const nuevaLista = Principal.transaccionesGlobales.filter(t => t.id !== id);
            
            // Guardar lista actualizada en Firestore
            db.collection("grupal_v4").doc("transacciones").update({ lista: nuevaLista });
            Interfaz.cerrarModal('modal-historial');
        }
    },

    /**
     * Modifica el estado de una transacción existente
     * Se usa para marcar transacciones como 'borrar_pendiente'
     * Guarda quien solicitó el cambio de estado
     * 
     * @param {string} id - ID único de la transacción
     * @param {string} estado - Nuevo estado: 'activo' o 'borrar_pendiente'
     * @param {string} quien - Usuario que solicitó el cambio
     */
    modificarEstado(id, estado, quien) {
        // Crear copia de transacciones para modificar
        const lista = [...Principal.transaccionesGlobales];
        const index = lista.findIndex(t => t.id === id);
        
        if (index >= 0) {
            // Actualizar estado y registrar quién lo solicitó
            lista[index].estado = estado;
            lista[index].solicitado_por = quien;
            
            // Guardar cambios en Firestore
            db.collection("grupal_v4").doc("transacciones").update({ lista: lista });
        }
    }
};