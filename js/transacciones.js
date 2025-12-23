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
     * Modo de eliminación en historial (si está activo, tocar una fila elimina o aprueba)
     */
    modoEliminarHistorial: false,

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
     *   fecha_str: fecha formateada (ej: "20 de diciembre de 2025")
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
                concepto = `Abono a: ${deudaOriginal ? deudaOriginal.concepto : 'deuda específica'}`;
                // Ya no crear anotación - el saldo se muestra directamente en el historial
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
            fecha_str: new Date().toLocaleDateString("es-ES", {day:"numeric", month:"long", year:"numeric"}),
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
     * Activa/Desactiva el modo de eliminar en el historial
     * Al activar: las filas se pueden tocar para pedir/aprobar borrado
     */
    toggleModoEliminarHistorial() {
        this.modoEliminarHistorial = !this.modoEliminarHistorial;
        const controlPie = document.getElementById('control-eliminar-pie');
        const lista = document.getElementById('contenedor-historial-pantalla');
        if (controlPie) controlPie.classList.toggle('activo', this.modoEliminarHistorial);
        if (lista) lista.classList.toggle('modo-eliminar-activo', this.modoEliminarHistorial);
    },

    /**
     * Gestiona el toque en una fila del historial cuando el modo eliminar está activo
     * - Si está 'activo' => solicita borrado
     * - Si está 'borrar_pendiente' y lo solicitó otro => aprueba borrado
     */
    onClickFilaHistorial(id, estado, solicitadoPor) {
        if (!this.modoEliminarHistorial) return;
        if (estado === 'borrar_pendiente') {
            if (solicitadoPor && solicitadoPor !== Autenticacion.usuarioActual) {
                this.aprobarBorrado(id);
            } else {
                alert('Eliminación ya solicitada; esperando aprobación.');
            }
        } else {
            this.pedirBorrado(id);
        }
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
        // Excluir anotaciones del historial visible
        const relevantes = Principal.transaccionesGlobales.filter(t => 
            ((t.creador === Autenticacion.usuarioActual && t.contraparte === socio) || 
            (t.creador === socio && t.contraparte === Autenticacion.usuarioActual)) &&
            t.tipo !== 'anotacion'
        ).reverse(); // Invertir para mostrar más recientes primero

        // Función auxiliar para convertir fecha corta a larga
        const convertirFechaLarga = (fechaStr) => {
            if (fechaStr && fechaStr.match(/^\d+\s\w+$/)) {
                const partes = fechaStr.split(' ');
                const dia = parseInt(partes[0]);
                const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                const mesIdx = meses.indexOf(partes[1]);
                if (mesIdx >= 0) {
                    const fecha = new Date(new Date().getFullYear(), mesIdx, dia);
                    return fecha.toLocaleDateString("es-ES", {day:"numeric", month:"long", year:"numeric"});
                }
            }
            return fechaStr;
        };

        // Agrupar abonos por su deuda original (globalmente, sin importar fecha)
        const abonosPorDeuda = {};
        relevantes.forEach(t => {
            // Un abono específico es cualquier transacción con refId (sin importar el tipo)
            if (t.refId && t.tipo !== 'anotacion') {
                if (!abonosPorDeuda[t.refId]) {
                    abonosPorDeuda[t.refId] = [];
                }
                abonosPorDeuda[t.refId].push(t);
            }
        });
        // Ordenar los abonos de cada deuda cronológicamente (más antiguo primero)
        Object.keys(abonosPorDeuda).forEach(deudaId => {
            abonosPorDeuda[deudaId].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        });

        console.log('=== DEBUG HISTORIAL ===');
        console.log('Socio:', socio);
        console.log('Total transacciones:', relevantes.length);
        console.log('Abonos agrupados:', abonosPorDeuda);
        console.log('Claves de deudas con abonos:', Object.keys(abonosPorDeuda));

        // Función para renderizar una transacción
        const renderTransaccion = (t, esAbonoBajo = false, deudaOriginalId = null) => {
            const esMio = t.creador === Autenticacion.usuarioActual;
            const soyPagador = (esMio && t.tipo !== "me_prestaron") || (!esMio && t.tipo === "me_prestaron");
            const color = soyPagador ? "#00e676" : "#ff5252";
            
            let filaClase = "fila-historial";
            // Un abono específico es cualquier transacción con refId (excepto anotaciones)
            if (t.refId && t.tipo !== 'anotacion') {
                filaClase += " abono-especifico" + (esAbonoBajo ? " bajo-deuda" : "");
            }
            if (t.estado === "borrar_pendiente") {
                filaClase += " pendiente";
            }
            
            // Si es un abono bajo deuda, calcular el saldo restante DESPUÉS de este abono
            let conceptoFinal = t.concepto;
            if (esAbonoBajo && deudaOriginalId) {
                // Obtener la deuda original
                const deudaOriginal = Principal.transaccionesGlobales.find(tr => tr.id === deudaOriginalId);
                const montoOriginal = deudaOriginal ? parseFloat(deudaOriginal.monto) : 0;
                
                // Calcular total abonado HASTA e INCLUYENDO este abono
                const totalAbonado = Principal.transaccionesGlobales
                    .filter(tr => tr.refId === deudaOriginalId && tr.tipo !== 'anotacion' && parseInt(tr.id) <= parseInt(t.id))
                    .reduce((sum, tr) => sum + parseFloat(tr.monto), 0);
                
                // Saldo restante = monto original - total abonado
                const saldoRestante = Math.max(montoOriginal - totalAbonado, 0);
                
                // Mostrar solo "Abono" con el nuevo saldo (en rojo si es > 0)
                const colorSaldo = saldoRestante > 0 ? '#ff5252' : '#888';
                conceptoFinal = `Abono <span style="color:${colorSaldo}; font-size:0.75rem;">• Nuevo saldo: ${saldoRestante.toFixed(2)}€</span>`;
            }
            
            console.log(`Renderizando: ${t.concepto} | tipo: ${t.tipo} | refId: ${t.refId} | clase: ${filaClase}`);
            
            return `
                <div class="${filaClase}" onclick="Transacciones.onClickFilaHistorial('${t.id}', '${t.estado || 'activo'}', '${t.solicitado_por || ''}')">
                    <div class="detalle-fila">
                        <span class="fecha-fila">${esMio ? 'Tú' : t.creador}</span>
                        <span class="descripcion-fila">${conceptoFinal}</span>
                    </div>
                    <div class="monto-fila" style="color:${color}">${t.monto}€</div>
                </div>`;
        };

        // Agrupar por fecha todas las transacciones (excepto abonos con refId que se renderizarán bajo su deuda)
        const porFecha = {};
        relevantes.forEach(t => {
            // Saltar abonos específicos (tienen refId y no son anotaciones), se renderizan bajo su deuda
            if (t.refId && t.tipo !== 'anotacion') return;
            
            const fechaLarga = convertirFechaLarga(t.fecha_str);
            if (!porFecha[fechaLarga]) {
                porFecha[fechaLarga] = [];
            }
            porFecha[fechaLarga].push(t);
        });

        // Renderizar agrupado por fecha
        Object.keys(porFecha).forEach(fecha => {
            // Insertar encabezado de fecha
            contenedor.innerHTML += `<div class="encabezado-fecha">${fecha}</div>`;

            // Renderizar transacciones de esa fecha
            porFecha[fecha].forEach(t => {
                contenedor.innerHTML += renderTransaccion(t, false, null);
                
                // Si es una deuda y tiene abonos específicos, renderizarlos debajo
                if ((t.tipo === 'preste' || t.tipo === 'me_prestaron') && abonosPorDeuda[t.id]) {
                    abonosPorDeuda[t.id].forEach(abono => {
                        contenedor.innerHTML += renderTransaccion(abono, true, t.id);
                    });
                }
            });
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
    },

    /**
     * Debug: Muestra el estado actual de todos los abonos y sus refId
     * Ejecutar: Transacciones.debugAbonos()
     */
    debugAbonos() {
        const lista = Principal.transaccionesGlobales;
        console.log('=== DEBUG ABONOS ===');
        console.log(`Total de transacciones: ${lista.length}`);
        
        const abonos = lista.filter(t => t.tipo === 'abono');
        console.log(`\nTotal de abonos: ${abonos.length}`);
        
        abonos.forEach(abono => {
            console.log(`\n📝 Abono: "${abono.concepto}"`);
            console.log(`   ID: ${abono.id}`);
            console.log(`   refId: ${abono.refId}`);
            
            if (abono.refId) {
                const deuda = lista.find(d => d.id === abono.refId);
                if (deuda) {
                    console.log(`   ✓ Deuda encontrada: "${deuda.concepto}"`);
                } else {
                    console.log(`   ✗ DEUDA NO ENCONTRADA (refId inválido)`);
                }
            } else {
                console.log(`   ⚠ Sin refId`);
            }
        });
    },

    /**
     * Elimina todas las transacciones de tipo "anotacion" de la base de datos
     * Ejecutar: Transacciones.eliminarAnotaciones()
     */
    eliminarAnotaciones() {
        const lista = [...Principal.transaccionesGlobales];
        const anotaciones = lista.filter(t => t.tipo === 'anotacion');
        
        console.log(`=== ELIMINANDO ANOTACIONES ===`);
        console.log(`Total de anotaciones encontradas: ${anotaciones.length}`);
        
        if (anotaciones.length === 0) {
            alert('No hay anotaciones para eliminar.');
            return;
        }

        if (!confirm(`¿Eliminar ${anotaciones.length} anotaciones de la base de datos?\n\nEsto es PERMANENTE.`)) {
            return;
        }

        // Crear nueva lista sin anotaciones
        const nuevaLista = lista.filter(t => t.tipo !== 'anotacion');
        
        console.log(`Nueva lista: ${nuevaLista.length} transacciones (${lista.length - nuevaLista.length} eliminadas)`);

        // Guardar en Firestore
        db.collection("grupal_v4").doc("transacciones").update({ lista: nuevaLista })
            .then(() => {
                alert(`✓ ${anotaciones.length} anotaciones eliminadas correctamente.`);
                window.location.reload();
            })
            .catch(err => {
                alert(`✗ Error al eliminar: ${err.message}`);
                console.error(err);
            });
    },

    /**
     * Limpiar y validar abonos
     */
    limpiarYValidarAbonos() {
        const lista = [...Principal.transaccionesGlobales];
        let corregidos = 0;
        let eliminados = 0;

        console.log('=== VALIDANDO Y LIMPIANDO ABONOS ===');
        console.log('Total de transacciones:', lista.length);

        // Paso 1: Validar todos los refId
        lista.forEach((t, idx) => {
            if (t.tipo === 'abono') {
                console.log(`\n📝 Abono: "${t.concepto}"`);
                console.log(`   refId actual: ${t.refId}`);
                
                // Verificar si refId es válido
                if (!t.refId || t.refId === 'undefined' || t.refId === null || t.refId === '') {
                    console.log(`   ⚠ refId vacío o undefined`);
                    // Intentar encontrar la deuda por concepto
                    const match = t.concepto.match(/Abono a:\s*(.+)$/);
                    if (match) {
                        const conceptoDeuda = match[1].trim();
                        const deuda = lista.find(d => 
                            d.concepto === conceptoDeuda && 
                            (d.tipo === 'preste' || d.tipo === 'me_prestaron')
                        );
                        if (deuda) {
                            lista[idx].refId = deuda.id;
                            corregidos++;
                            console.log(`   ✓ Asignado refId: ${deuda.id}`);
                        }
                    }
                } else {
                    // refId existe, verificar si apunta a una deuda real
                    const deudaExiste = lista.find(d => d.id === t.refId);
                    if (!deudaExiste) {
                        console.log(`   ✗ refId ${t.refId} NO EXISTE en la lista`);
                        // Buscar por concepto
                        const match = t.concepto.match(/Abono a:\s*(.+)$/);
                        if (match) {
                            const conceptoDeuda = match[1].trim();
                            const deuda = lista.find(d => 
                                d.concepto === conceptoDeuda && 
                                (d.tipo === 'preste' || d.tipo === 'me_prestaron')
                            );
                            if (deuda) {
                                lista[idx].refId = deuda.id;
                                corregidos++;
                                console.log(`   ✓ Corregido a refId: ${deuda.id}`);
                            } else {
                                // Si no encuentra deuda, es un abono huérfano
                                console.log(`   ✗ No hay deuda asociada para este abono`);
                            }
                        }
                    } else {
                        console.log(`   ✓ refId válido`);
                    }
                }
            }
        });

        console.log('\n=== RESUMEN ===');
        console.log(`Abonos corregidos: ${corregidos}`);

        if (corregidos > 0) {
            db.collection("grupal_v4").doc("transacciones").update({ lista: lista })
                .then(() => {
                    alert(`✓ Limpieza completada:\n${corregidos} abonos corregidos`);
                    window.location.reload();
                })
                .catch(err => {
                    alert(`✗ Error: ${err.message}`);
                    console.error(err);
                });
        } else {
            alert('✓ Todos los abonos ya tienen refID válido');
        }
    }
};
