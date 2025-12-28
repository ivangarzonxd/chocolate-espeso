# 🎨 Arquitectura de Botones - Cuentas Claras

## Descripción General

El sistema de botones de **Cuentas Claras** utiliza un patrón **madre-hijo (parent-child)** en CSS para garantizar coherencia visual y mantener código limpio sin repeticiones.

---

## 📋 Estructura Jerárquica

### 1. **Clase Madre: `.boton`**

Define **TODAS** las propiedades comunes de botones en el sistema. Está ubicada en [estilos.css](estilos.css).

```css
.boton {
  /* Dimensiones */
  height: 55px;                     /* Altura estándar */
  width: 100%;                      /* Ancho completo */
  margin-bottom: 15px;              /* Espaciado uniforme en TODO el sistema */
  
  /* Bordes y esquinas */
  border: 1px solid #444;           /* Borde gris consistente */
  border-radius: 12px;              /* Esquinas redondeadas */
  
  /* Tipografía */
  font-weight: bold;                /* Siempre negrita */
  text-transform: uppercase;        /* Siempre mayúsculas */
  letter-spacing: 0.5px;            /* Espaciado entre letras */
  
  /* Colores */
  background: #252525;              /* Fondo gris oscuro */
  color: white;                     /* Texto blanco */
  
  /* Layout */
  display: flex;
  align-items: center;              /* Centra verticalmente */
  justify-content: center;          /* Centra horizontalmente */
  
  /* Sombra: Flotante hacia abajo/derecha */
  box-shadow: 8px 12px 20px rgba(255, 255, 255, 0.25), 
              2px 4px 10px rgba(0, 0, 0, 0.35);
  
  /* Interacción */
  cursor: pointer;
  transition: transform 0.1s, filter 0.2s, box-shadow 0.2s;
}

.boton:active {
  transform: scale(0.98);           /* Se encoge al presionar */
  filter: brightness(1.15);         /* Se ilumina */
}
```

---

### 2. **Clases Hijas: Variantes de Color**

Todas heredan de `.boton` y **SOLO modifican la sombra (box-shadow)** según su propósito.

| Clase | Color | Uso |
|-------|-------|-----|
| `.boton-verde` | Verde (#00e676) | "Le presté" - Altura 60px, font 1.1rem |
| `.boton-verde-suave` | Verde (#00e676) | "Le presté" en transacciones |
| `.boton-rojo-suave` | Rojo (#ff5252) | "Me prestó" |
| `.boton-azul` | Blanco | Acciones secundarias |
| `.boton-naranja` | Blanco | Acciones principales |
| `.boton-gris` | Blanco | Botones neutrales |
| `.boton-blanco` | Blanco | Botones secundarios |
| `.boton-transparente` | Ninguno | Cancelar, Volver (sin bg, borde, sombra) |

**Ejemplo de clase hija:**
```css
.boton-verde-suave {
  box-shadow: 8px 12px 20px rgba(0, 230, 118, 0.30), 
              2px 4px 10px rgba(0, 0, 0, 0.35);
}
```

---

## 🔧 Variantes Especiales

### Botones de Contexto Específico

Estos **heredan** de `.boton` pero tienen overrides mínimos:

| Clase | Ubicación | Descripción |
|-------|-----------|-------------|
| `.boton-usuario` | [estilos.css](estilos.css) | Bloque Login - padding 18px, height auto |
| `.boton-dashboard` | [estilos.css](estilos.css) | Bloque Dashboard - padding 8px 14px |
| `.boton-historial-cuenta` | [estilos.css](estilos.css) | Bloque Dashboard - icono + "Historial" - width 60px |
| `.boton-volver-historial` | [estilos.css](estilos.css) | Bloque Dashboard - width auto, font 1rem |

---

## 📝 Uso en HTML

**Patrón simple y consistente:**

```html
<!-- Botones principales con variante de color -->
<button class="boton boton-verde-suave">Le presté</button>
<button class="boton boton-rojo-suave">Me prestó</button>
<button class="boton boton-azul">Abonar / Pagar</button>

<!-- Botones transparentes (Cancelar, Volver) -->
<button class="boton boton-transparente">Cancelar</button>

<!-- Botones especiales de login -->
<button class="boton-usuario">Juan García</button>

<!-- Botones especiales del dashboard -->
<button class="boton-dashboard">Salir</button>
```

---

## 🎯 Ventajas del Sistema

1. ✅ **DRY (Don't Repeat Yourself)**
   - Una sola definición de altura, ancho, bordes, espaciado
   - Cambios globales se aplican a todos los botones automáticamente

2. ✅ **Consistencia Visual**
   - Todos los botones tienen el mismo aspecto base
   - Diferenciación clara por color de sombra
   - Espaciado uniforme (15px margin-bottom)

3. ✅ **Mantenibilidad**
   - Nuevas variantes se crean con solo 1-2 líneas CSS
   - Fácil cambiar propiedades globales en `.boton`

4. ✅ **Performance**
   - Código CSS minimalista sin repeticiones
   - Menos bytes transmitidos

5. ✅ **Escalabilidad**
   - Agregar nuevo botón: `<button class="boton boton-[color]">`
   - Agregar variante: Crear `.boton-[nombre]` que herede de `.boton`

---

## 🚀 Cómo Agregar una Variante Nueva

**Paso 1:** Agregar clase en [estilos.css](estilos.css)

```css
/** Morado: Para futuras acciones especiales */
.boton-morado {
  box-shadow: 8px 12px 20px rgba(156, 39, 176, 0.30), 
              2px 4px 10px rgba(0, 0, 0, 0.35);
}
```

**Paso 2:** Usar en HTML

```html
<button class="boton boton-morado">Mi Botón Morado</button>
```

¡Listo! Automáticamente hereda todos los estilos de `.boton`.

---

## 📍 Archivos Relacionados

- **[estilos.css](estilos.css)** - Archivo único: variables, base, botones y pantallas

---

## 🎨 Paleta de Colores de Sombra

| Color | Valor RGBA | Botón |
|-------|-----------|-------|
| Verde | rgba(0, 230, 118, 0.30) | `.boton-verde`, `.boton-verde-suave` |
| Rojo | rgba(255, 82, 82, 0.30) | `.boton-rojo-suave` |
| Blanco | rgba(255, 255, 255, 0.25) | Resto de botones |

---

## 💡 Notas de Diseño

- **Sombra Flotante:** Doble sombra (offset + base) crea efecto de profundidad
- **Margin-bottom:** Consistente en 15px para alineación de grillas
- **Altura Estándar:** 55px (variable `--altura-boton`)
- **Border-radius:** 12px (variable `--borde-radio-medio`)
- **Interacción:** Scale(0.98) al presionar + brightness(1.15)

---

**Última actualización:** Sistema completamente refactorizado
**Estado:** ✅ Profesional, coherente y listo para producción
