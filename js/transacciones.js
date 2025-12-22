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
     * Destino del abono: 'general' o 'especifica'
     * Solo se usa cuando tipoSeleccionado === 'abono'
     */
    abonoDestino: null,

    /**
     * ID de la deuda específica seleccionada (transacción original)
     */
    deudaRefId: null,

    /**
     * Inicia una nueva transacción con un socio específico
     * Acciones:
     * 1. Guarda el nombre del socio
     * 2. Cierra modal de selección de socios
     * 3. Actualiza título con el nombre del socio
     * 4. Abre la pantalla de transacción completa
     * 
     * @param {string} nombre - Nombre del socio seleccionado
     */
    iniciarConSocio(nombre) {
        this.socioActivo = nombre;
        Interfaz.cerrarModal('modal-socios');
        
        // Actualizar título con el nombre del socio
        document.getElementById("titulo-socio-transaccion").innerText = nombre;
        
        // Ocultar formulario hasta que se seleccione tipo de transacción
        document.getElementById("seccion-formulario").classList.add("oculto");
        
        // Cambiar a la pantalla de transacción (no modal, sino pantalla completa)
        Interfaz.cambiarPantalla('pantalla-transaccion');
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

        // Si es ABONO, pedir destino: general o específico
        const opcionesAbono = document.getElementById("abono-opciones");
        const contenedorEspecifico = document.getElementById("abono-especifico-contenedor");
        const form = document.getElementById("seccion-formulario");
        const concepto = document.getElementById("input-concepto");
        const botonAbonar = document.querySelector("button[onclick=\"Transacciones.prepararTipo('abono')\"]");

        if (tipo === 'abono') {
            this.abonoDestino = null;
            this.deudaRefId = null;
            // Mostrar opciones de abono y ocultar formulario hasta elegir destino
            opcionesAbono.classList.remove('oculto');
            // Ocultar el botón "Abonar" para que en su lugar estén los dos botones
            if (botonAbonar) botonAbonar.style.display = 'none';
            form.classList.add('oculto');
            contenedorEspecifico.classList.add('oculto');
            concepto.value = "";
            concepto.disabled = true; // deshabilitado hasta elegir destino
        } else {
            // Para otros tipos, mostrar formulario normal
            // Mostrar botón "Abonar" nuevamente si se selecciona otro tipo
            if (botonAbonar) botonAbonar.style.display = '';
            opcionesAbono.classList.add('oculto');
            contenedorEspecifico.classList.add('oculto');
            form.classList.remove('oculto');
            // Limpiar y habilitar concepto
            concepto.value = "";
            concepto.placeholder = "Concepto";
            concepto.disabled = false;
            // Resetear flags de abono
            this.abonoDestino = null;
            this.deudaRefId = null;
            document.getElementById("input-monto").focus();
        }
    },

    /**
     * El usuario elige destino del abono: general o deuda específica
     * - general: no pide concepto, usa "Abono a capital"
     * - específica: muestra selector con deudas activas del socio
     */
    seleccionarDestinoAbono(destino) {
        this.abonoDestino = destino;
        const opcionesAbono = document.getElementById("abono-opciones");
        const form = document.getElementById("seccion-formulario");
        const concepto = document.getElementById("input-concepto");
        const contenedorEspecifico = document.getElementById("abono-especifico-contenedor");

        if (destino === 'general') {
            // Ocultar selector y fijar concepto
            contenedorEspecifico.classList.add('oculto');
            concepto.value = "Abono a capital";
            concepto.placeholder = "(no requerido)";
            concepto.disabled = true; // No editable para evitar errores
            // Mostrar formulario
            opcionesAbono.classList.add('oculto');
            form.classList.remove('oculto');
            document.getElementById("input-monto").focus();
        } else {
            // Abrir modal de selección y construir lista
            opcionesAbono.classList.add('oculto');
            form.classList.add('oculto');
            contenedorEspecifico.classList.add('oculto');
            concepto.value = "";
            concepto.placeholder = "Selecciona una deuda";
            concepto.disabled = true;
            this.construirListaDeudasEspecificas();
            Interfaz.abrirModal('modal-seleccion-deuda');
        }
    },

    /**
     * Construye la lista en el modal de selección de deuda específica
     */
    construirListaDeudasEspecificas() {
        const cont = document.getElementById('lista-deudas-especificas');
        cont.innerHTML = "";
        const deudas = this.obtenerDeudasDelSocio(this.socioActivo)
            .map(d => ({...d, restante: this.calcularSaldoConcepto(d.id)}))
            .filter(d => d.restante > 0);
        if (deudas.length === 0) {
            cont.innerHTML = `<div class="fila-historial"><div class="detalle-fila"><span class="descripcion-fila">No hay deudas específicas pendientes</span></div></div>`;
            return;
        }
        deudas.forEach(d => {
            const color = '#ffab00';
            cont.innerHTML += `
                <div class="fila-historial" onclick="Transacciones.seleccionarDeudaEspecifica('${d.id}')">
                    <div class="detalle-fila">
                        <span class="fecha-fila">${d.fecha_str} • ${d.creador === Autenticacion.usuarioActual ? 'Tú' : d.creador}</span>
                        <span class="descripcion-fila">${d.concepto} • original: ${d.monto}€ • pendiente: ${d.restante}€</span>
                    </div>
                    <div class="monto-fila" style="color:${color}">${d.restante}€</div>
                </div>`;
        });
    },

    /**
     * Selecciona la deuda específica desde el modal
     */
    seleccionarDeudaEspecifica(refId) {
        const conceptoInput = document.getElementById('input-concepto');
        const form = document.getElementById('seccion-formulario');
        const deudaOriginal = Principal.transaccionesGlobales.find(t => t.id === refId);
        this.deudaRefId = refId;
        conceptoInput.value = deudaOriginal ? `Abono a: ${deudaOriginal.concepto}` : 'Abono a deuda específica';
        conceptoInput.disabled = true;
        Interfaz.cerrarModal('modal-seleccion-deuda');
        form.classList.remove('oculto');
        document.getElementById('input-monto').focus();
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
        const montoStr = document.getElementById("input-monto").value;
        const conceptoInput = document.getElementById("input-concepto").value;
        const monto = parseFloat(montoStr);
        
        if (!monto || isNaN(monto) || monto <= 0) return alert("Monto inválido");

        // Construir concepto final
        let concepto = conceptoInput || "";
        let tipoParaBalance = this.tipoSeleccionado;

        // Si es abono, decidir signo correcto según saldo actual
        if (this.tipoSeleccionado === 'abono') {
            const saldo = this.obtenerSaldoConSocio(this.socioActivo);
            if (this.abonoDestino === 'general') {
                concepto = "Abono a capital";
            } else if (this.abonoDestino === 'especifica' && this.deudaRefId) {
                const deudaOriginal = Principal.transaccionesGlobales.find(t => t.id === this.deudaRefId);
                const restante = this.calcularSaldoConcepto(this.deudaRefId) - monto;
                concepto = `Abono a: ${deudaOriginal ? deudaOriginal.concepto : 'deuda específica'}`;
                // Crear anotación de actualización sin afectar balance
                const anotacion = {
                    id: `${Date.now().toString()}-note`,
                    creador: Autenticacion.usuarioActual,
                    contraparte: this.socioActivo,
                    tipo: 'anotacion',
                    monto: 0,
                    concepto: `Actualización ${deudaOriginal ? deudaOriginal.concepto : ''} (nuevo saldo: ${Math.max(restante,0)}€)`,
                    fecha_str: new Date().toLocaleDateString("es-ES", {day:"numeric", month:"short"}),
                    estado: 'activo',
                    refId: this.deudaRefId
                };
                // Guardar anotación primero
                db.collection("grupal_v4").doc("transacciones").update({
                    lista: firebase.firestore.FieldValue.arrayUnion(anotacion)
                });
            } else if (this.abonoDestino === 'especifica' && !this.deudaRefId) {
                return alert('Selecciona una deuda específica');
            }
            // set tipo para balance: si ellos me deben (saldo>0), un abono reduce => usar 'me_prestaron'
            // si yo debo (saldo<0), un abono reduce mi deuda => usar 'preste'
            tipoParaBalance = saldo > 0 ? 'me_prestaron' : 'preste';
        }

        const nuevoMovimiento = {
            id: Date.now().toString(),
            creador: Autenticacion.usuarioActual,
            contraparte: this.socioActivo,
            tipo: tipoParaBalance,
            monto: monto,
            concepto: concepto,
            fecha_str: new Date().toLocaleDateString("es-ES", {day:"numeric", month:"short"}),
            estado: 'activo',
            refId: this.deudaRefId || null
        };

        db.collection("grupal_v4").doc("transacciones").update({
            lista: firebase.firestore.FieldValue.arrayUnion(nuevoMovimiento)
        }).then(() => {
            Interfaz.cerrarModal('modal-transaccion');
            document.getElementById("input-monto").value = "";
            document.getElementById("input-concepto").value = "";
            document.getElementById("abono-opciones").classList.add('oculto');
            document.getElementById("abono-especifico-contenedor").classList.add('oculto');
        });
    },

    /**
     * Obtiene el saldo actual con un socio específico
     */
    obtenerSaldoConSocio(socio) {
        let saldo = 0;
        Principal.transaccionesGlobales.forEach(t => {
            if (t.estado === 'borrar_pendiente' || t.tipo === 'anotacion') return;
            const monto = parseFloat(t.monto);
            if ((t.creador === Autenticacion.usuarioActual && t.contraparte === socio)) {
                saldo += (t.tipo === 'me_prestaron' ? -monto : monto);
            } else if ((t.contraparte === Autenticacion.usuarioActual && t.creador === socio)) {
                saldo += (t.tipo === 'me_prestaron' ? monto : -monto);
            }
        });
        return saldo;
    },

    /**
     * Lista de deudas activas del socio (transacciones originales de deuda)
     * Considera como deuda original cualquier 'preste' o 'me_prestaron'
     */
    obtenerDeudasDelSocio(socio) {
        // Transacciones entre ambos que representan deuda original
        const candidatas = Principal.transaccionesGlobales.filter(t =>
            (t.creador === Autenticacion.usuarioActual && t.contraparte === socio) ||
            (t.creador === socio && t.contraparte === Autenticacion.usuarioActual)
        ).filter(t => t.estado !== 'borrar_pendiente' && (t.tipo === 'preste' || t.tipo === 'me_prestaron') && !t.refId);

        // Calcular efecto en el balance del usuario actual
        const yoDebo = candidatas.filter(t => {
            const monto = parseFloat(t.monto);
            let efecto = 0;
            if (t.creador === Autenticacion.usuarioActual) {
                efecto = (t.tipo === 'me_prestaron') ? -monto : monto;
            } else { // t.creador === socio
                efecto = (t.tipo === 'me_prestaron') ? monto : -monto;
            }
            // Si efecto < 0: aumenta mi deuda (son deudas donde YO debo)
            return efecto < 0;
        });

        // Ordenar por más reciente a más antigua (usando id timestamp)
        yoDebo.sort((a,b) => parseInt(b.id) - parseInt(a.id));
        return yoDebo;
    },

    /**
     * Calcula saldo restante para una deuda específica (por refId)
     * Suma el monto original y resta todos los abonos vinculados
     */
    calcularSaldoConcepto(refId) {
        if (!refId) return 0;
        let original = 0;
        let abonado = 0;
        Principal.transaccionesGlobales.forEach(t => {
            if (t.estado === 'borrar_pendiente') return;
            if (t.id === refId) original += parseFloat(t.monto);
            if (t.refId === refId && t.tipo !== 'anotacion') abonado += parseFloat(t.monto);
        });
        // Para signo correcto: el cálculo de restante es el valor absoluto restante
        const restante = Math.max(original - abonado, 0);
        return Number(restante.toFixed(2));
    },

    /**
     * Abre la pantalla de historial completo
     */
    abrirHistorialPantalla() {
        Interfaz.cambiarPantalla('pantalla-historial');
        // Usar setTimeout para asegurar que la pantalla esté activa antes de llenar
        setTimeout(() => {
            this.cargarHistorial(this.socioActivo, true);
        }, 50);
    },

    /**
     * Toggle para mostrar/ocultar el historial
     */
    toggleHistorial() {
        const wrapper = document.getElementById('contenedor-historial-wrapper');
        const isHidden = wrapper.classList.contains('oculto');
        
        if (isHidden) {
            // Mostrar y cargar historial
            wrapper.classList.remove('oculto');
            this.cargarHistorial(this.socioActivo, false);
        } else {
            // Ocultar
            wrapper.classList.add('oculto');
        }
    },

    /**
     * Abre el historial de transacciones desde el modal principal
     * Requiere que ya exista socioActivo
     */
    verHistorialDesdeModal() { 
        if (this.socioActivo) this.cargarHistorial(this.socioActivo, false); 
    },

    /**
     * Compatibilidad: redirige a cargarHistorial
     */
    verHistorialSocio(socio) {
        this.cargarHistorial(socio, false);
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
     * @param {boolean} enPantalla - Si es true, usa contenedor de pantalla-historial
     */
    cargarHistorial(socio, enPantalla = false) {
        this.socioActivo = socio;
        
        // Seleccionar contenedor según el contexto
        const contenedor = enPantalla 
            ? document.getElementById("contenedor-historial-pantalla")
            : document.getElementById("contenedor-historial");
        
        // Actualizar encabezado según el contexto
        if (enPantalla) {
            document.getElementById("nombre-socio-historial-pantalla").innerText = `Historial - ${socio}`;
        }
        
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
            let filaClase = "fila-historial";
            let checkIcono = "⬜";
            let textoBoton = "Eliminar";
            let clickAccion = `onclick="Transacciones.pedirBorrado('${t.id}')"`;

            if (t.estado === "borrar_pendiente") {
                // Hay solicitud de eliminación pendiente
                filaClase += " pendiente";
                
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
                    <div class="detalle-fila">
                        <span class="fecha-fila">${t.fecha_str} • ${esMio ? 'Tú' : t.creador}</span>
                        <span class="descripcion-fila">${t.concepto}</span>
                    </div>
                    <div class="monto-fila" style="color:${color}">${t.monto}€</div>
                    <div class="accion-fila">
                        <div class="icono-eliminar" ${clickAccion}>${checkIcono}</div>
                        <div class="etiqueta-eliminar">${textoBoton}</div>
                    </div>
                </div>`;
        });
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