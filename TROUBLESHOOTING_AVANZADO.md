# 🔧 TROUBLESHOOTING - Guía de Debugging Avanzado

## Problema 1: Se detectan clases pero SIN atributos

### Síntomas
```
[AiAssistant] Sugerencias: { classes: 3, attributes: 0, methods: 0 }
```

### Paso 1: Revisar OCR
En logs backend, busca:
```
[DiagramScanner] ✅ Texto extraído combinado (primeros 1000 chars):
```

**❓ Pregúntate:**
- ¿Contiene "+id", "+nombre", etc.?
- ¿Contiene ":", por ejemplo "+id:int"?
- ¿O solo tiene nombres de clases?

**Solución:**
```
SI TIENE ATRIBUTOS → Problema en Groq
SI SOLO NOMBRES → Problema en OCR
```

### Paso 2: Si es OCR (solo nombres)

**Causa probable:**
- Imagen muy pequeña (< 500px ancho)
- Imagen borrosa/desenfocada
- Contraste bajo
- Texto muy pequeño

**Soluciones:**
1. **Captura mejor imagen:**
   - Mayor resolución
   - Más nitidez
   - Mejor contraste
   - Fotografía clara sin ángulos

2. **En código (debug):**
   En `diagram-scanner.service.ts`, línea ~90:
   ```typescript
   console.log('[OCR-Merge] Texto final mergeado:', cleaned);
   ```
   Cópialo y verifica qué está extrayendo

### Paso 3: Si es Groq (tiene atributos OCR)

Busca en logs:
```
[Groq] Respuesta recibida (primeros 500 chars):
```

**Ejemplo de respuesta MALA:**
```json
{
  "classes": [
    { "name": "Libro", "attributes": [], "methods": [] }
  ]
}
```

**Ejemplo de respuesta BUENA:**
```json
{
  "classes": [
    { "name": "Libro", "attributes": ["+id: int", "+titulo: String"], "methods": [] }
  ]
}
```

**Si es mala respuesta:**
- Groq no interpretó el texto correctamente
- Intenta con mejor imagen (más clara)
- O la imagen está muy corrupta para OCR

**Solución rápida:**
Si no hay atributos en Groq, se activa fallback:
```
[AiAssistant] ⚠️ Clases sin atributos detectadas. Intentando extracción mejorada...
```
↑ Esto agrega atributos genéricos automáticamente

---

## Problema 2: Confianza "LOW" (baja)

### Síntomas
```
[DiagramScanner] confianza: 'low'
```

**Significado:**
- OCR tuvo dificultades
- Pocas características detectadas
- Pero algo devolvió

### Soluciones

1. **Mejorar imagen:**
   - Mayor tamaño (al menos 800x600px)
   - Más contraste
   - Mejor enfoque
   - Sin rotaciones

2. **Esperar fallback:**
   - Aún si es low, se aplicará fallback
   - Las clases tendrán atributos genéricos
   - Puedes editarlas después

3. **En código:**
   En `diagram-scanner.service.ts`, línea ~650:
   ```typescript
   const confidence = this.calculateConfidence(classes, relations, text);
   ```
   Puedes ajustar los thresholds

---

## Problema 3: Error completo al escanear

### Síntomas
```
Error al analizar el diagrama
```

O en consola:
```
[DiagramScanner] ❌ Error: ...
```

### Checklist

1. **¿Es archivo imagen válido?**
   - .png, .jpg, .jpeg, .gif, .bmp, .webp
   - < 10MB
   - Formato válido (no corrupto)

2. **¿Hay tokens disponibles en GROQ?**
   ```
   Si ves: "Error 429" → Se acabaron tokens
   Si ves: "Error 401" → GROQ_API_KEY inválida
   ```

3. **¿Tesseract instalado?**
   En terminal (desde cualquier carpeta):
   ```bash
   npm ls tesseract.js
   ```
   Debe mostrar versión

4. **¿Sharp (para imágenes)?**
   ```bash
   npm ls sharp
   ```

### Soluciones

**Si falta GROQ_API_KEY:**
```bash
# En backend, crear/editar .env
GROQ_API_KEY=tu_clave_aqui
```

**Si falta dependencia:**
```bash
cd backend
npm install
```

**Si error persist:**
Revisa el full error en logs:
```
[DiagramScanner] ❌ Error: [FULL_MESSAGE_AQUI]
```

---

## Problema 4: Diagrama se crea pero vacío

### Síntomas
```
✅ 3 clases creadas
✅ Relaciones creadas
❌ Pero en el editor aparecen vacías (sin atributos)
```

**Culpa:** Frontend

### Debugging

1. **Abre DevTools (F12)**

2. **Consola → Busca:**
   ```
   [AIAssistant] 📸 Scan de imagen completado:
   ```
   ¿Muestra classCount?

3. **Network → Busca request a `/api/ai/scan-diagram`**
   - Response Status: ¿200 OK?
   - Response Body: ¿Contiene `suggestions.classes` con atributos?

4. **Ejemplo respuesta correcta:**
   ```json
   {
     "message": "...",
     "suggestions": {
       "classes": [
         {
           "name": "Libro",
           "attributes": ["+id: int", "+titulo: String"],
           "methods": []
         }
       ]
     }
   }
   ```

### Si response tiene atributos pero no se ven

**Error en frontend (posible bug):**
- Revisa consola de DevTools por errores
- Mira método `applySuggestion` en `AIAssistant.tsx`
- Verifica que `onAddClass` se llama correctamente

---

## Problema 5: Relaciones no se crean

### Síntomas
```
✅ Clases creadas correctamente
❌ Relaciones: 0
```

### Causas

1. **OCR no detectó relaciones**
   - Busca en logs: `relationCount: 0`
   - Las relaciones están dibujadas en la imagen?
   - ¿Son claras/visibles?

2. **Groq no las interpretó**
   - Busca en Groq response: `"relations": []`
   - Hay texto indicando relación (hereda, tiene, etc.)?

3. **Frontend no las aplicó**
   - Verifica Network → response.suggestions.relations
   - ¿Tiene elementos?

### Soluciones

Si OCR no detectó:
- Imagen debe mostrar líneas de conexión claramente
- Texto descriptivo ayuda (ej: "Alumno inscribe Materia")

Si Groq no interpretó:
- Busca en texto OCR palabras clave:
  ```
  "hereda", "tiene", "posee", "contiene", "agrega", "depende"
  ```
- Si no hay, Groq no puede detectar relaciones

Si cardinalidades no aparecen:
- Texto OCR debe contener: "1..*", "0..1", "*", etc.
- Groq solo sugiere lo que ve en texto

---

## Problema 6: Demora excesiva

### Síntomas
```
Toma > 20 segundos en responder
```

### Causas

1. **OCR multinivel (pasadas 1-4)**
   - Toma ~10-15 segundos normalmente
   - Es esperado con 4 pasadas

2. **Groq respuesta lenta**
   - API de Groq está lenta
   - Timeout en 12 segundos (ver AIAssistant.tsx línea ~300)

### Soluciones

1. **Reducir pasadas OCR:**
   En `diagram-scanner.service.ts`, línea ~190:
   ```typescript
   for (let i = 0; i < Math.min(imageBuffers.length, configs.length); i++) {
   ```
   Cambiar `configs.length` a número menor (ej: 2)

2. **Aumentar timeout frontend:**
   En `AIAssistant.tsx`, línea ~305:
   ```typescript
   const timeout = setTimeout(() => controller.abort(), 12000); // 12 segundos
   ```
   Cambiar a 20000 o más

3. **Usar imagen más pequeña:**
   OCR es más rápido con imágenes pequeñas (~1000px)

---

## Problema 7: Groq_API_KEY no válida

### Síntomas
```
Error 401: Unauthorized
```

### Solución

1. **Verificar .env:**
   ```bash
   cat backend/.env | grep GROQ_API_KEY
   ```

2. **Debe mostrar:**
   ```
   GROQ_API_KEY=gsk_xxxxxxxxx...
   ```

3. **Si está vacío:**
   ```bash
   # Editar archivo
   # Agregar tu clave de https://console.groq.com
   ```

4. **Si está mal:**
   - Ve a https://console.groq.com
   - Copia la clave completa (sin espacios)
   - Actualiza .env
   - Reinicia backend: `npm run start:dev`

---

## Problema 8: Imagen muy grande tarda mucho

### Síntomas
```
Imagen 5000x3000 px toma 1+ minuto
```

### Causa
Sharp está redimensionando a 4000px, después OCR procesa eso

### Soluciones

1. **Reducir tamaño imagen:**
   - Máximo 1500x1000px
   - O 2000x1500px si es muy detallada

2. **Reducir procesamiento:**
   En `diagram-scanner.service.ts`, línea ~117:
   ```typescript
   const version1 = await sharp(imageBuffer)
     .resize(2000, null, { ... }) // Cambiar 4000 a 2000
   ```

3. **Resultado:**
   - Más rápido (OCR es O(pixels²))
   - Sigue funciona bien con 2000px

---

## Debug Logs a Tener

**Guarda estos logs para reportar bugs:**

1. **Full OCR text:**
   ```
   [DiagramScanner] ✅ Texto extraído combinado:
   ```

2. **Groq response:**
   ```
   [Groq] Respuesta recibida:
   ```

3. **Final sugerencias:**
   ```
   [AiAssistant] Sugerencias generadas:
   ```

4. **Frontend network response:**
   - DevTools → Network → `/api/ai/scan-diagram` → Response

---

## Comando Útiles

```bash
# Ver logs en tiempo real (backend)
npm run start:dev 2>&1 | grep -E "\[DiagramScanner\]|\[Groq\]|\[AiAssistant\]"

# Ver solo errores
npm run start:dev 2>&1 | grep -E "Error|❌"

# Verificar APIs
curl http://localhost:3000/api/ai/analyze-image \
  -F "image=@path/to/image.png"
```

---

## Reporte Efectivo de Bug

Si nada funciona, reporta:

```
IMAGEN: [adjunta]

LOGS BACKEND:
[DiagramScanner] Texto extraído: "..."
[Groq] Respuesta: {...}
[AiAssistant] Sugerencias: { classes: X, attributes: Y }

FRONTEND NETWORK:
Response status: 200/400/500
Response body: {...}

RESULTADO:
- Clases detectadas: ✓/✗
- Atributos detectados: ✓/✗
- Se ven en diagrama: ✓/✗

AMBIENTE:
- Backend: npm run start:dev → OK/ERROR
- Node version: $(node -v)
- Imagen tamaño: XXXxXXX px
- Groq tokens: OK/Finalizados
```

---

## Checklist Final

- [ ] Imagen válida (formato, tamaño, calidad)
- [ ] Backend corriendo sin errores
- [ ] GROQ_API_KEY configurada
- [ ] Tesseract y Sharp instalados
- [ ] Frontend corriendo en http://localhost:5173
- [ ] Red sin VPN/proxy que bloquee APIs
- [ ] Logs muestran progreso (4 pasadas OCR)
- [ ] Groq devuelve JSON válido
- [ ] Frontend recibe response con suggestions

Si pasa todos los checks y aún no funciona, revisa los logs específicos arriba.
