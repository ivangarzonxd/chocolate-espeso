/**
 * ==============================================================
 * INTERFAZ - Control de pantallas, modales y renderizado de UI
 * ==============================================================
 * Módulo responsable de:
 * - Cambiar entre pantallas (login, pin, dashboard)
 * - Abrir y cerrar modales
 * - Renderizar dinámicamente lista de socios disponibles
 */

const Interfaz = {
    /**
     * Cambia la pantalla visible
     * Solo una pantalla puede verse a la vez
     * Las demás se ocultan agregando clase 'hidden'
     * 
     * Pantallas disponibles:
     * - 'pantalla-acceso': Selección de usuario
     * - 'pantalla-pin': Ingreso de PIN
     * - 'pantalla-principal': Dashboard con saldos
     * 
     * @param {string} idPantalla - ID del elemento HTML a mostrar
     */
    cambiarPantalla(idPantalla) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.screen').forEach(pantalla => pantalla.classList.add('hidden'));
        
        // Mostrar la pantalla solicitada
        document.getElementById(idPantalla).classList.remove('hidden');
    },

    /**
     * Abre un modal agregando clase 'active'
     * Si es modal de selección de socios: renderiza la lista
     * 
     * Modales disponibles:
     * - 'modal-socios': Seleccionar socio para transacción
     * - 'modal-transaccion': Ingresar monto y concepto
     * - 'modal-historial': Ver historial de transacciones
     * 
     * @param {string} idModal - ID del modal a abrir
     */
    abrirModal(idModal) {
        const modal = document.getElementById(idModal);
        modal.classList.add('active');
        
        // Si abre modal de socios: generar lista dinámicamente
        if (idModal === 'modal-socios') this.renderizarSociosEnModal();
    },

    /**
     * Cierra un modal removiendo clase 'active'
     * 
     * @param {string} idModal - ID del modal a cerrar
     */
    cerrarModal(idModal) {
        document.getElementById(idModal).classList.remove('active');
    },

    /**
     * Renderiza dinámicamente la lista de socios disponibles
     * Crea un botón por cada usuario excepto el actual
     * Los botones inician transacción con ese socio
     */
    renderizarSociosEnModal() {
        const lista = document.getElementById('lista-socios-disponibles');
        lista.innerHTML = ""; // Limpiar lista anterior
        
        // Crear botón para cada usuario (excepto el actual)
        USUARIOS.forEach(usuario => {
            if (usuario !== Autenticacion.usuarioActual) {
                const btn = document.createElement('button');
                btn.className = 'btn-user';
                btn.textContent = usuario;
                btn.onclick = () => Transacciones.iniciarConSocio(usuario);
                lista.appendChild(btn);
            }
        });
    }
};