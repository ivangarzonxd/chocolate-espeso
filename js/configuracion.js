/**
 * ==============================================================
 * CONFIGURACI\u00d3N - Inicializaci\u00f3n de Firebase y constantes globales
 * ==============================================================
 * Este archivo contiene:
 * - Credenciales de conexi\u00f3n a Firebase/Firestore
 * - Constantes globales (usuarios, c\u00f3digos maestros)
 * - Inicializaci\u00f3n de la base de datos
 */

/**
 * Objeto de configuraci\u00f3n de Firebase
 * Contiene las credenciales para conectar a:
 * - Proyecto: cuentas-claras-chocolate
 * - Base de datos: Firestore (NoSQL en tiempo real)
 * @type {Object}
 */
const firebaseConfig = {
    apiKey: "AIzaSyCwTlr88g79WlOpZWdltm9ee1x49uZpCZY",
    authDomain: "cuentas-claras-chocolate.firebaseapp.com",
    projectId: "cuentas-claras-chocolate",
    storageBucket: "cuentas-claras-chocolate.firebasestorage.app",
    messagingSenderId: "1073064742072",
    appId: "1:1073064742072:web:7001d38ee25069506a384d",
    measurementId: "G-7ZJDW0DTBK"
};

// Inicializar Firebase con las credenciales configuradas
firebase.initializeApp(firebaseConfig);

/**
 * Referencia global a Firestore (base de datos)
 * Usada por todos los m\u00f3dulos para: guardar, consultar y actualizar datos
 * @global
 * @type {Object}
 */
const db = firebase.firestore();

/**
 * Lista de usuarios autorizados en la aplicaci\u00f3n
 * Solo estos usuarios pueden acceder al sistema
 * @type {Array<string>}
 */
const USUARIOS = ["Ivan", "Geral", "Michel", "Kimberly"];

/**
 * C\u00f3digo maestro para operaciones administrativas
 * Se usa para restablecer PINs olvidados
 * NOTA: Cambiar peri\u00f3dicamente por seguridad
 * @type {string}
 */
const CODIGO_MAESTRO = "2025";