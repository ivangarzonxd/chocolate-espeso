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
        document.querySelectorAll('.pantalla').forEach(pantalla => pantalla.classList.add('oculto'));
        
        // Mostrar la pantalla solicitada
        document.getElementById(idPantalla).classList.remove('oculto');
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
        modal.classList.add('activo');
        
        // Si abre modal de socios: generar lista dinámicamente
        if (idModal === 'modal-socios') this.renderizarSociosEnModal();
    },

    /**
     * Cierra un modal removiendo clase 'active'
     * 
     * @param {string} idModal - ID del modal a cerrar
     */
    cerrarModal(idModal) {
        document.getElementById(idModal).classList.remove('activo');
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
                btn.className = 'boton-usuario';
                btn.textContent = usuario;
                btn.onclick = () => Transacciones.iniciarConSocio(usuario);
                lista.appendChild(btn);
            }
        });
    },

    /**
     * Carga y inyecta el header reutilizable en las pantallas que lo necesitan
     * Se ejecuta una sola vez al cargar la página
     */
    async cargarHeadersReutilizables() {
        try {
            const response = await fetch('componentes/header.html');
            const headerHTML = await response.text();
            
            // Inyectar header en pantallas que lo necesitan
            const pantallasConHeader = ['pantalla-acceso', 'pantalla-pin', 'pantalla-principal', 'pantalla-transaccion'];
            
            pantallasConHeader.forEach(idPantalla => {
                const pantalla = document.getElementById(idPantalla);
                if (pantalla) {
                    // Insertar header al inicio de cada pantalla
                    pantalla.insertAdjacentHTML('afterbegin', headerHTML);
                }
            });
        } catch (error) {
            console.error('Error al cargar headers reutilizables:', error);
        }
    },

    /**
     * Muestra notificaciones tipo toast en la pantalla
     * Se posiciona en el centro superior y se oculta automáticamente
     * 
     * @param {string} mensaje - Texto a mostrar en la notificación
     * @param {string} tipo - 'exito' (verde) o 'error' (rojo)
     * @param {number} duracion - Milisegundos antes de ocultarse (default 3000)
     */
    mostrarNotificacion(mensaje, tipo = 'exito', duracion = 3000) {
        const contenedor = document.getElementById('contenedor-notificaciones');
        
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.textContent = mensaje;
        
        contenedor.appendChild(notificacion);
        
        // Animar entrada
        setTimeout(() => notificacion.classList.add('visible'), 10);
        
        // Auto-remover después del tiempo especificado
        setTimeout(() => {
            notificacion.classList.remove('visible');
            setTimeout(() => notificacion.remove(), 300);
        }, duracion);
    }
};