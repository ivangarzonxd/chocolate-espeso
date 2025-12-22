/**
 * ==============================================================
 * PRINCIPAL - Dashboard y cálculos de saldos
 * ==============================================================
 * Módulo principal que gestiona:
 * - Inicialización del dashboard
 * - Cálculo de balances entre usuarios
 * - Renderizado de la lista de cuentas
 * - Detección de transacciones pendientes de eliminación
 */

const Principal = {
    /**
     * Array que almacena todas las transacciones del grupo
     * Datos de Firestore: se actualiza en tiempo real (onSnapshot)
     * @type {Array<Object>}
     */
    transaccionesGlobales: [],

    /**
     * Inicializa el dashboard cuando el usuario inicia sesión
     * Acciones:
     * 1. Muestra la pantalla principal
     * 2. Actualiza el nombre del usuario en la barra superior
     * 3. Configura listener en tiempo real de transacciones
     * 4. Calcula y renderiza los saldos
     */
    iniciar() {
        // Mostrar pantalla del dashboard
        Interfaz.cambiarPantalla('pantalla-principal');
        
        // Mostrar nombre del usuario en la barra superior
        document.getElementById("nombre-usuario-barra").innerText = Autenticacion.usuarioActual;

        // Listener en tiempo real: se ejecuta cada vez que cambian las transacciones
        db.collection("grupal_v4").doc("transacciones").onSnapshot(doc => {
            if (!doc.exists) {
                // Si no existe el documento: crear documento vacío
                db.collection("grupal_v4").doc("transacciones").set({ lista: [] });
            } else {
                // Guardar todas las transacciones en memoria
                this.transaccionesGlobales = doc.data().lista || [];
                // Recalcular saldos con los datos actualizados
                this.calcularBalances();
            }
        });
    },

    /**
     * Calcula los balances netos entre el usuario actual y sus socios
     * Lógica:
     * - Recorre todas las transacciones
     * - Suma préstamos que le hizo (saldo positivo)
     * - Suma préstamos que recibió (saldo negativo)
     * - Ignora transacciones marcadas para eliminar
     * - Renderiza la lista de saldos
     */
    calcularBalances() {
        // Inicializar balances: un registro para cada socio
        let balances = {};
        let sumaTotal = 0;
        
        // Crear entrada para cada usuario (excepto el actual)
        USUARIOS.forEach(u => { 
            if (u !== Autenticacion.usuarioActual) balances[u] = 0;
        });

        // Procesar cada transacción
        this.transaccionesGlobales.forEach(t => {
            // Ignorar anotaciones (no afectan balance)
            if (t.tipo === 'anotacion') return;
            // Ignorar transacciones marcadas para eliminar
            if (t.estado === "borrar_pendiente") return;
            
            const monto = parseFloat(t.monto);
            
            if (t.creador === Autenticacion.usuarioActual) {
                // Transacción creada por el usuario actual
                // "Presté" = positivo (la otra persona me debe)
                // "Me prestaron" = negativo (yo le debo)
                balances[t.contraparte] += (t.tipo === "me_prestaron" ? -monto : monto);
            } else if (t.contraparte === Autenticacion.usuarioActual) {
                // Transacción donde el usuario actual es receptor
                // "Prestó" = negativo (yo le debo)
                // "Me prestó" = positivo (me debe a mí)
                balances[t.creador] += (t.tipo === "me_prestaron" ? monto : -monto);
            }
        });

        // Mostrar la lista calculada
        this.renderizarLista(balances);
    },

    /**
     * Renderiza la lista visual de saldos
     * Muestra:
     * - Nombre del socio
     * - Saldo neto ("Te debe X€" o "Debes X€")
     * - Icono de alerta si hay eliminación pendiente
     * - Botón para ver historial
     * 
     * @param {Object} balances - Diccionario {socio: monto_neto}
     */
    renderizarLista(balances) {
        const contenedor = document.getElementById('lista-cuentas-contenedor');
        contenedor.innerHTML = ""; // Limpiar lista anterior
        let saldoGeneral = 0;

        // Renderizar una fila por cada socio
        for (const [nombre, saldo] of Object.entries(balances)) {
            saldoGeneral += saldo;
            
            // Omitir saldos muy pequeños (menor que 0.5€)
            if (Math.abs(saldo) < 0.5) continue;

            // Determinar color según el saldo
            const color = saldo > 0 ? "#00e676" : "#ff5252"; // Verde si me deben, rojo si debo
            const texto = saldo > 0 ? `Te debe ${saldo}€` : `Debes ${Math.abs(saldo)}€`;
            
            // Mostrar alerta si hay eliminación pendiente con este socio
            const alerta = this.tieneAlerta(nombre) ? "⚠️" : "";

            // Insertar HTML de la fila
            contenedor.innerHTML += `
                <div class="fila-cuenta" style="border-left-color:${color}">
                    <div class="contenido-cuenta" onclick="Transacciones.iniciarConSocio('${nombre}')">
                        <div class="nombre-cuenta">${nombre} ${alerta}</div>
                        <div class="saldo-cuenta" style="color:${color}">${texto}</div>
                    </div>
                    <div class="boton-historial-cuenta" onclick="Transacciones.verHistorialSocio('${nombre}')">📖</div>
                </div>`;
        }

        // Actualizar saldo total en la tarjeta superior
        const visor = document.getElementById("valor-saldo-global");
        visor.innerText = `${Math.abs(saldoGeneral).toFixed(0)}€`;
        
        // Cambiar color del saldo según si es positivo/negativo/neutro
        visor.className = `saldo-positivo ${saldoGeneral > 0 ? '' : (saldoGeneral < 0 ? 'saldo-negativo' : 'saldo-neutral')}`.trim();
        
        // Cambiar etiqueta del saldo
        document.getElementById("etiqueta-saldo").innerText = saldoGeneral >= 0 ? "Te deben en total" : "Debes en total";
    },

    /**
     * Verifica si hay una transacción pendiente de eliminación con un socio
     * Se usa para mostrar icono de alerta (⚠️) en el listado
     * 
     * @param {string} socio - Nombre del socio a verificar
     * @returns {boolean} - true si hay eliminación pendiente
     */
    tieneAlerta(socio) {
        return this.transaccionesGlobales.some(t => 
            // Verificar que sea una transacción entre el usuario actual y el socio
            ((t.creador === Autenticacion.usuarioActual && t.contraparte === socio) || 
             (t.creador === socio && t.contraparte === Autenticacion.usuarioActual)) &&
            // Verificar que esté marcada para borrar y solicitada por el socio
            t.estado === "borrar_pendiente" && 
            t.solicitado_por === socio
        );
    }
};