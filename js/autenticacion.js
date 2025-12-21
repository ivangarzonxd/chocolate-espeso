/**
 * ==============================================================
 * AUTENTICACIÓN - Gestión de acceso y PINs de usuario
 * ==============================================================
 * Módulo encargado de:
 * - Validar identidad de usuarios mediante PIN
 * - Crear PINs para cuentas nuevas
 * - Gestionar sesiones (login/logout)
 * - Recuperar PINs mediante código maestro
 */

const Autenticacion = {
    /**
     * Almacena el nombre del usuario actualmente autenticado
     * Se usa para identificar al usuario en todas las operaciones
     * @type {string|null}
     */
    usuarioActual: null,
    
    /**
     * Almacena temporalmente los dígitos ingresados del PIN (0-9)
     * Se limpia después de validar o presionar "C" (Cancelar)
     * @type {string}
     */
    pinIngresado: "",

    /**
     * Inicia el proceso de acceso para un usuario específico
     * Pasos:
     * 1. Guarda el nombre del usuario
     * 2. Consulta Firestore para verificar si ya tiene PIN
     * 3. Si es nuevo: muestra "Crea tu PIN"
     * 4. Si existe: muestra "Hola [nombre]" (validar PIN)
     * 
     * @param {string} nombre - Nombre del usuario seleccionado en login
     */
    prepararAcceso(nombre) {
        this.usuarioActual = nombre;
        
        // Buscar PIN del usuario en Firestore
        db.collection("grupal_v4").doc("config").get().then(doc => {
            let pinUsuario = (doc.exists && doc.data()[nombre]) ? doc.data()[nombre].pin : null;

            // Cambiar a pantalla de PIN
            Interfaz.cambiarPantalla('pantalla-pin');
            const titulo = document.getElementById("titulo-pin");

            if (!pinUsuario) {
                // Nuevo usuario: debe crear PIN
                titulo.innerText = `Crea tu PIN, ${nombre}`;
                titulo.dataset.modo = "crear";
            } else {
                // Usuario existente: validar PIN
                titulo.innerText = `Hola ${nombre}`;
                titulo.dataset.modo = "validar";
                titulo.dataset.target = pinUsuario; // Guardar PIN para comparar después
            }
        });
    },

    /**
     * Registra un dígito presionado en el teclado numérico
     * Limitaciones:
     * - Máximo 4 dígitos
     * - Muestra asteriscos (*) por seguridad, no los números
     * 
     * @param {number} numero - Dígito presionado (0-9)
     */
    escribirPin(numero) {
        if (this.pinIngresado.length < 4) {
            this.pinIngresado += numero;
            // Mostrar asterisco por cada dígito (protege privacidad del PIN)
            document.getElementById("visor-pin").innerText = "*".repeat(this.pinIngresado.length);
        }
    },

    /**
     * Borra el PIN ingresado y limpia el visor
     * Se ejecuta al presionar botón "C" (Cancelar)
     */
    limpiarPin() {
        this.pinIngresado = "";
        document.getElementById("visor-pin").innerText = "";
    },

    /**
     * Valida o guarda el PIN según el modo
     * CREAR: Guarda el nuevo PIN en Firestore
     * VALIDAR: Compara PIN ingresado con el guardado
     * 
     * Solo procesa si el PIN tiene exactamente 4 dígitos
     */
    verificarPin() {
        const titulo = document.getElementById("titulo-pin");
        
        // Validar que el PIN tenga 4 dígitos
        if (this.pinIngresado.length !== 4) return;

        if (titulo.dataset.modo === "crear") {
            // NUEVO USUARIO: guardar PIN en Firestore
            db.collection("grupal_v4").doc("config").set({ 
                [this.usuarioActual]: { pin: this.pinIngresado } 
            }, { merge: true }).then(() => this.accesoExitoso());
            
        } else {
            // USUARIO EXISTENTE: validar PIN
            if (this.pinIngresado === titulo.dataset.target) {
                // PIN correcto: proceder
                this.accesoExitoso();
            } else {
                // PIN incorrecto: mostrar error y permitir reintentar
                alert("PIN Incorrecto");
                this.limpiarPin(); // Borrar PIN erróneo
            }
        }
    },

    /**
     * Completa el login exitosamente
     * Acciones:
     * 1. Guarda usuario en localStorage (sesión persistente)
     * 2. Marca dispositivo como "confiable" (permite auto-login)
     * 3. Limpia PIN de memoria (seguridad)
     * 4. Carga el dashboard principal
     */
    accesoExitoso() {
        // Guardar sesión en localStorage para mantener login entre visitas
        localStorage.setItem("v5_usuario", this.usuarioActual);
        localStorage.setItem("v5_dispositivo", "trusted"); // Permite auto-login sin PIN
        
        // Eliminar PIN de memoria por seguridad
        this.limpiarPin();
        
        // Cargar dashboard con datos del usuario
        Principal.iniciar();
    },

    /**
     * Restaura un PIN olvidado usando código maestro
     * Requiere ingresar CODIGO_MAESTRO como validación de seguridad
     * Borra el PIN anterior permitiendo crear uno nuevo
     */
    restablecerPinMaestro() {
        // Solicitar código maestro (solo administradores lo conocen)
        if (prompt("Código Maestro:") === CODIGO_MAESTRO) {
            // Eliminar PIN del usuario en Firestore
            db.collection("grupal_v4").doc("config").update({
                [`${this.usuarioActual}.pin`]: firebase.firestore.FieldValue.delete()
            }).then(() => { 
                alert("PIN borrado. Crea uno nuevo en el próximo acceso.");
                location.reload(); // Reiniciar app
            });
        }
    },

    /**
     * Cierra la sesión del usuario actual
     * Acciones:
     * 1. Elimina todas las credenciales de localStorage
     * 2. Recarga la página para volver a pantalla de login
     * 3. El usuario debe volver a ingresar su PIN
     */
    cerrarSesion() {
        localStorage.clear(); // Eliminar sesión y usuario guardado
        location.reload(); // Volver a pantalla de selección de usuario
    }
};

/**
 * EVENT LISTENER - Se ejecuta automáticamente al cargar la página
 * Verifica si existe una sesión activa en el dispositivo
 * Si hay usuario logueado + dispositivo confiable: auto-login (sin pedir PIN)
 * Si no: muestra pantalla de selección de usuario
 */
window.onload = () => {
    const usuarioLogueado = localStorage.getItem("v5_usuario");
    
    // Verificar si el usuario estaba logueado Y el dispositivo es confiable
    if (usuarioLogueado && localStorage.getItem("v5_dispositivo") === "trusted") {
        // Auto-login: cargar usuario y mostrar dashboard
        Autenticacion.usuarioActual = usuarioLogueado;
        Principal.iniciar();
    }
    // Si no hay sesión válida: se muestra pantalla de selección de usuario por defecto
};