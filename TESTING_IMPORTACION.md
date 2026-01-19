# 🧪 Guía de Testing - Importación de Diagrama desde Imagen

## Quick Start

### 1. Inicia el backend
```bash
cd backend
npm run start:dev
```

Espera hasta ver:
```
[Nest] XXXXX - DD/MM/YYYY, HH:MM:SS p.m.     LOG [Bootstrap] Aplicación iniciada en http://localhost:3000
```

### 2. Inicia el frontend (en otra terminal)
```bash
cd frontend
npm run dev
```

### 3. Abre el navegador
```
http://localhost:5173
```

---

## 📋 Checklist de Testing

### Test 1: Importar Diagrama Simple
**Objetivo:** Verificar detección de clases y atributos básicos

**Imagen de prueba:** Un diagrama UML con 3 clases:
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Libro   │  │ Usuario  │  │ Préstamo │
├──────────┤  ├──────────┤  ├──────────┤
│ +id:int  │  │ +id:int  │  │ +id:int  │
│ +titulo  │  │ +nombre  │  │ +fecha   │
│ +autor   │  │ +email   │  │ +dias    │
└──────────┘  └──────────┘  └──────────┘
```

**Pasos:**
1. Click en "Importar desde imagen"
2. Selecciona la imagen
3. Espera respuesta

**✅ Resultado esperado:**
- [ ] Se muestran 3 clases: Libro, Usuario, Préstamo
- [ ] Cada clase tiene atributos: id, titulo/nombre/fecha, etc.
- [ ] Las clases aparecen en el editor

**❌ Si falla:**
Revisa en consola backend:
```
[DiagramScanner] ✅ Texto extraído combinado:
```
¿Contiene "+id:int", "+titulo", etc.?

---

### Test 2: Diagrama con Relaciones
**Objetivo:** Verificar detección de relaciones entre clases

**Imagen:** Las 3 clases anteriores PERO CON RELACIONES:
```
┌──────────┐     1..*    ┌──────────┐
│  Libro   ├────────────┤ Préstamo │
└──────────┘  tiene      └──────────┘
                           ^
                          │ 1
                          │
                    ┌──────────┐
                    │ Usuario  │
                    └──────────┘
```

**Pasos:**
1. Importa la imagen
2. Revisa que se detecten las relaciones

**✅ Resultado esperado:**
- [ ] Aparecen líneas conectando las clases
- [ ] Las cardinalidades se muestran (1..*, 1, etc.)
- [ ] Se pueden ver los nombres de relaciones si están etiquetadas

---

### Test 3: Diagrama con Métodos
**Objetivo:** Verificar detección de métodos

**Imagen:**
```
┌──────────┐
│ Usuario  │
├──────────┤
│ +id:int  │
│ +nombre  │
├──────────┤
│ +crear() │
│ +login() │
└──────────┘
```

**✅ Resultado esperado:**
- [ ] Se detectan métodos: crear(), login()
- [ ] Aparecen en la clase en el editor

---

### Test 4: Diagrama de Calidad Media (OCR desafiante)
**Objetivo:** Verificar fallback cuando OCR es deficiente

**Imagen:** Diagrama borroso, desenfocado o con mala calidad

**✅ Resultado esperado:**
- [ ] Al menos se detectan las CLASES
- [ ] Si no hay atributos, se sugieren genéricos: id, nombre, descripcion
- [ ] El mensaje dice: "⚠️ Se detectaron pocas características. Puedes editarlas después"
- [ ] Puedo clickear las clases y editar manualmente

---

## 🔧 Debugging Detallado

### Problema: No detecta atributos

**1. Abre DevTools del navegador (F12)**

**2. Abre la consola del backend**

**3. Busca en backend:**
```
[DiagramScanner] ✅ Texto extraído combinado
```

Copia ese texto y pregúntate:
- ¿Contiene nombres de clases? (Libro, Usuario, etc.)
- ¿Contiene líneas tipo "+id:int", "+nombre"?
- ¿Tiene "/" o "-" delante de nombres? (Eso es ruido)

**4. Busca la respuesta de Groq:**
```
[Groq] Respuesta recibida (primeros 500 chars):
```

Verifica el JSON:
```json
{
  "classes": [
    {
      "name": "Libro",
      "attributes": ["+id: int", "+titulo: String"],  ← Deben estar aquí
      "methods": []
    }
  ]
}
```

**5. Si los atributos están en Groq pero no en el frontend:**
```
[AiAssistant] Sugerencias generadas: { classes: 3, attributes: 9, methods: 0 }
```

La culpa es del frontend. Abre DevTools → Network, busca la request a `/api/ai/scan-diagram` y verifica la response.

---

### Problema: Detecta clases pero vacias (0 atributos)

**En backend, busca:**
```
[AiAssistant] ⚠️ Clases sin atributos detectadas. Intentando extracción mejorada...
```

Esto significa:
1. OCR no encontró atributos
2. Groq tampoco los interpretó
3. Se aplicó fallback (atributos genéricos)

**Solución:**
- [ ] Asegúrate que la imagen sea clara
- [ ] Aumenta resolución si es pequeña
- [ ] Intenta con una foto más nítida

---

### Problema: Se ve mensaje "confianza: low"

**Significa:**
- OCR tuvo dificultades
- Groq detectó pocas clases o atributos
- Pero aún devolvió algo

**En logs backend:**
```
[DiagramScanner] ✨ Análisis completado exitosamente: { clases: 3, relaciones: 0, confianza: 'low' }
```

**Checklist:**
- ¿La imagen tiene diagrama UML válido?
- ¿Son visibles las líneas de caja?
- ¿Se puede leer el texto?
- ¿Hay suficiente contraste?

---

## 📊 Logs Esperados (Success Path)

```
[AiController] Escaneando diagrama desde imagen:
[AiController] Object(3) { filename: '...', size: 62134, mimetype: 'image/png' }
[DiagramScanner] 🔍 Iniciando análisis avanzado de imagen...
[DiagramScanner] 📊 Imagen original: { width: 1061, height: 591, format: 'png', hasAlpha: true }
[DiagramScanner] 🔧 Generando versiones optimizadas...
[DiagramScanner] ✅ Generadas 4 versiones optimizadas
[DiagramScanner] 📝 Ejecutando OCR multinivel...
[OCR] Pasada 1: Segmentación automática...
[OCR] Pasada 1 - Progreso: 100%
[OCR] ✅ Pasada 1 completada: XXX caracteres
[OCR] Pasada 2: Bloques uniformes (óptimo para clases)...
[OCR] Pasada 2 - Progreso: 100%
[OCR] ✅ Pasada 2 completada: YYY caracteres
[OCR-Merge] Líneas base detectadas: ZZ líneas únicas
[OCR-Merge] Pasada 1: Agregadas 10 líneas nuevas
[OCR-Merge] Texto final mergeado: AAAA caracteres
[DiagramScanner] 🤖 Analizando con IA (Groq)...
[Groq] Respuesta recibida (primeros 500 chars): { "classes": [{"name": "Libro", "attributes": [...
[DiagramScanner] 🔍 Validando y refinando resultados...
[DiagramScanner] ✨ Análisis completado exitosamente: { clases: 3, relaciones: 2, confianza: 'high' }
[AiController] Scan completado: { classCount: 3, relationCount: 2, confidence: 'high' }
[AiAssistant] Convirtiendo scan a sugerencias: { classCount: 3, relationCount: 2, description: '...' }
[AiAssistant] Sugerencias generadas: { classes: 3, attributes: 9, methods: 2, relations: 2 }
```

---

## 🎯 Criterios de Éxito

### Mínimo (Level 1)
- ✅ Se importa imagen sin errores
- ✅ Se detectan 2+ clases
- ✅ Se crean en el diagrama
- ✅ Se pueden editar manualmente

### Bueno (Level 2)
- ✅ Se detectan clases CON atributos (aunque sean genéricos)
- ✅ Se detectan relaciones simples
- ✅ Confianza: "medium" o superior

### Excelente (Level 3)
- ✅ Se detectan atributos correctos de la imagen
- ✅ Se detectan relaciones CON cardinalidades
- ✅ Se detectan métodos
- ✅ Confianza: "high"

---

## 🚀 Si Todo Funciona

**Felicidades! El sistema está listo:**
1. ✅ OCR multinivel mejorado
2. ✅ Detección de clases, atributos, métodos
3. ✅ Detección de relaciones
4. ✅ Fallback inteligente para OCR deficiente
5. ✅ Visualización correcta en frontend

---

## 📧 Reporte de Issues

Si algo no funciona, reporta:

**Información necesaria:**
- Screenshot de la imagen importada
- Consola backend (logs desde [DiagramScanner])
- Consola frontend (DevTools)
- Confianza reportada ("low", "medium", "high")
- ¿Se detectaron clases sí/no?
- ¿Se detectaron atributos sí/no?
- ¿Se detectaron relaciones sí/no?

**Ejemplo:**
```
Imagen: [adjunta]
Backend log:
  [DiagramScanner] Texto extraído: "..."
  [Groq] Respuesta: {...}
  [AiAssistant] Sugerencias: { classes: 3, attributes: 0, relations: 0 }
Frontend:
  - Se crean 3 clases: ✓
  - Tienen atributos: ✗
  - Se ve relaciones: ✗
```
