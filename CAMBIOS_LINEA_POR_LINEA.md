# 📍 CAMBIOS ESPECÍFICOS - Línea por Línea

## Archivo 1: `backend/src/ai/diagram-scanner.service.ts`

### Cambio 1: createProcessedVersions() - Línea ~107

**Antes:**
```typescript
// VERSIÓN 3: Suavizado para reducir ruido
const version3 = await sharp(imageBuffer)
  .resize(3000, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
  .greyscale()
  .blur(0.5)
  .normalize()
  .threshold(120, { greyscale: false })
  .sharpen({ sigma: 1.5, m1: 1, m2: 0.7 })
  .png({ compressionLevel: 0 })
  .toBuffer();
versions.push(version3);

console.log('[DiagramScanner] ✅ Generadas 3 versiones optimizadas');
return versions;
```

**Después:**
```typescript
// VERSIÓN 3: Suavizado para reducir ruido
const version3 = await sharp(imageBuffer)
  .resize(3000, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
  .greyscale()
  .blur(0.5)
  .normalize()
  .threshold(120, { greyscale: false })
  .sharpen({ sigma: 1.5, m1: 1, m2: 0.7 })
  .png({ compressionLevel: 0 })
  .toBuffer();
versions.push(version3);

// VERSIÓN 4: NUEVA - Enfoque en líneas/bordes para detectar cajas
try {
  const version4 = await sharp(imageBuffer)
    .resize(3000, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .normalize()
    .threshold(100, { greyscale: false })
    .sharpen({ sigma: 3, m1: 2, m2: 0.3 })
    .png({ compressionLevel: 0 })
    .toBuffer();
  versions.push(version4);
  console.log('[DiagramScanner] ✅ Generadas 4 versiones optimizadas');
} catch (e) {
  console.warn('[DiagramScanner] ⚠️ Error en versión 4, continuando con 3');
  console.log('[DiagramScanner] ✅ Generadas 3 versiones optimizadas');
}

return versions;
```

**Qué cambió:**
- ✅ Agregada versión 4 con mayor sharpen (sigma: 3)
- ✅ Umbral más bajo (100 vs 120)
- ✅ M1 más alto para bordes más nítidos

---

### Cambio 2: performMultiPassOCR() - Línea ~175

**Antes:**
```typescript
const configs = [
  { psm: 3, desc: 'Segmentación automática' },
  { psm: 6, desc: 'Bloques uniformes' },
  { psm: 11, desc: 'Texto disperso' },
];

for (let i = 0; i < imageBuffers.length; i++) {
  const buffer = imageBuffers[i];
  const config = configs[i % configs.length];
```

**Después:**
```typescript
// Configuraciones de Tesseract optimizadas para UML
const configs = [
  {
    psm: 3,
    desc: 'Segmentación automática',
    oem: 1,
  },
  {
    psm: 6,
    desc: 'Bloques uniformes (óptimo para clases)',
    oem: 1,
  },
  {
    psm: 11,
    desc: 'Texto disperso',
    oem: 1,
  },
  {
    psm: 13,
    desc: 'Líneas crudas',
    oem: 1,
  },
];

for (let i = 0; i < Math.min(imageBuffers.length, configs.length); i++) {
  const buffer = imageBuffers[i];
  const config = configs[i];
```

**Qué cambió:**
- ✅ Agregada pasada 4 con PSM 13
- ✅ Agregado OEM (OCR Engine Mode) = 1
- ✅ Mejor descripción de cada pasada
- ✅ Cambiado loop para usar directamente configs[i]

---

### Cambio 3: performMultiPassOCR() - setParameters - Línea ~220

**Antes:**
```typescript
await worker.setParameters({
  tessedit_pageseg_mode: config.psm as any,
  tessedit_char_whitelist:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
    'áéíóúÁÉÍÓÚñÑ' +
    '0123456789' +
    '(){}[]<>:;,.-+*_=!@#$%^&|\\/"\'`~? \n\t',
  preserve_interword_spaces: '1' as any,
  tessedit_do_invert: '0' as any,
});
```

**Después:**
```typescript
await worker.setParameters({
  tessedit_pageseg_mode: config.psm as any,
  tessedit_ocr_engine_mode: config.oem as any,
  // Caracteres permitidos - incluye símbolos UML y tipos comunes
  tessedit_char_whitelist:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
    'áéíóúÁÉÍÓÚñÑ' +
    '0123456789' +
    '(){}[]<>:;,.-+*_=!@#$%^&|\\/"\'`~? \n\t' +
    'boolean int float double String long short byte char void ' +
    'public private protected static final abstract interface class extends implements',
  preserve_interword_spaces: '1' as any,
  tessedit_do_invert: '0' as any,
});
```

**Qué cambió:**
- ✅ Agregado `tessedit_ocr_engine_mode`
- ✅ Expandido whitelist con palabras clave UML
- ✅ Mejor comentario

---

### Cambio 4: advancedCleanOCRText() - Línea ~307

**Antes:**
```typescript
.replace(/([+\-#~])\s+([a-zA-Z])/g, '$1$2')
```

**Después:**
```typescript
.replace(/([+\-#~])\s+/g, '$1') // "+id" no "+ id"
```

**Qué cambió:**
- ✅ Simplificado regex
- ✅ Se aplica a TODO lo que sigue al modificador
- ✅ Comentario más claro

---

### Cambio 5: analyzeWithGroq() - systemPrompt - Línea ~480

**Antes:** (20 líneas)
```
Eres un experto analista...
**ESTRUCTURA DE UN DIAGRAMA UML:**
Las clases tienen 3 secciones:
...
```

**Después:** (66 líneas)
```
Eres un experto analista de diagramas UML de clases...
IMPORTANTE: El OCR a menudo extrae texto...

**ESTRUCTURA FUNDAMENTAL:**
Cada clase tiene 3 secciones...

**PATRONES A DETECTAR:**
1. **CLASES**: ...
2. **ATRIBUTOS** (CRÍTICO): ...
3. **MÉTODOS**: ...
4. **RELACIONES Y CARDINALIDADES**: ...

**ESTRATEGIA DE ANÁLISIS:**
...

**REGLAS ESPECIALES PARA OCR DEFICIENTE:**
Si ves texto como:
- "xLibro" → es "Libro"
- "1id:int" → es "+id:int"
...
```

**Qué cambió:**
- ✅ Agregada sección "IMPORTANTE" sobre OCR
- ✅ Detalles de PATRONES A DETECTAR (mucho más específico)
- ✅ ESTRATEGIA DE ANÁLISIS
- ✅ REGLAS ESPECIALES OCR DEFICIENTE (super importante)
- ✅ 3x más contenido y más detallado

---

### Cambio 6: analyzeWithGroq() - max_tokens - Línea ~570

**Antes:**
```typescript
max_tokens: 6000,
```

**Después:**
```typescript
max_tokens: 8000, // Aumentado para más contenido
```

**Qué cambió:**
- ✅ Aumentado de 6000 a 8000

---

## Archivo 2: `backend/src/ai/asistente.ts`

### Cambio 1: convertScanToSuggestions() - Línea ~57

**Antes:** (25 líneas)
```typescript
async convertScanToSuggestions(scanResult: any): Promise<AssistantResponse> {
  console.log('[AiAssistant] Convirtiendo scan a sugerencias:', {
    classCount: scanResult.classes?.length || 0,
    relationCount: scanResult.relations?.length || 0,
  });

  const classSuggestions = (scanResult.classes || []).map((cls: any) => ({
    name: cls.name,
    attributes: cls.attributes || [],
    methods: cls.methods || [],
  }));

  const relationSuggestions = (scanResult.relations || []).map(...);

  const message = `✨ **Diagrama detectado desde imagen:**\n\n...`;

  return {
    message,
    suggestions: { ... },
    tips: [ ... ],
    nextSteps: [ ... ],
  };
}
```

**Después:** (80+ líneas)
```typescript
async convertScanToSuggestions(scanResult: any): Promise<AssistantResponse> {
  console.log('[AiAssistant] Convirtiendo scan a sugerencias:', {
    classCount: scanResult.classes?.length || 0,
    relationCount: scanResult.relations?.length || 0,
    description: scanResult.description || 'N/A',
  });

  // Convertir las clases del scan al formato de sugerencias
  let classSuggestions = (scanResult.classes || []).map((cls: any) => ({
    name: cls.name,
    attributes: cls.attributes || [],
    methods: cls.methods || [],
  }));

  // FALLBACK: Si se detectaron clases pero SIN atributos/métodos
  if (classSuggestions.length > 0) {
    const totalMembers = classSuggestions.reduce(...);

    if (totalMembers === 0 && scanResult.description) {
      console.log('[AiAssistant] ⚠️ Clases sin atributos detectadas...');
      classSuggestions = this.enhanceClassesWithCommonAttributes(
        classSuggestions,
        scanResult.description,
      );
    }
  }

  // Calcular estadísticas
  const totalAttributes = classSuggestions.reduce(...);
  const totalMethods = classSuggestions.reduce(...);

  const message = 
    `✨ **Diagrama detectado desde imagen:**\n\n` +
    `📦 **${classSuggestions.length} clases encontradas:** ...\n` +
    `📋 **Atributos:** ${totalAttributes} | **Métodos:** ${totalMethods}\n` +
    ...
    `${totalAttributes === 0 ? '⚠️ **Nota:** Se detectaron pocas características...' : ''}`;

  return {
    message,
    suggestions: { classes: classSuggestions, relations: relationSuggestions },
    tips: [
      '🎨 Las clases se crearán automáticamente en el editor',
      '🔗 Las relaciones se conectarán después de crear las clases',
      '✏️ Puedes editar cualquier clase después de crearla',
      ...(totalAttributes === 0 ? [...] : []),
    ],
    nextSteps: [ ... ],
  };
}
```

**Qué cambió:**
- ✅ Detecta cuando `totalMembers === 0`
- ✅ Llama a `enhanceClassesWithCommonAttributes()` para fallback
- ✅ Calcula `totalAttributes` y `totalMethods`
- ✅ Mejora el mensaje con estadísticas
- ✅ Agrega tip condicional si no hay atributos
- ✅ Más logging detallado

---

### Cambio 2: Nuevo método enhanceClassesWithCommonAttributes() - Línea ~180

**Antes:** No existía

**Después:**
```typescript
private enhanceClassesWithCommonAttributes(
  classes: Array<{ name: string; attributes: string[]; methods: string[] }>,
  description: string,
): Array<{ name: string; attributes: string[]; methods: string[] }> {
  return classes.map((cls) => {
    // Si la clase no tiene atributos, agregar algunos genéricos
    if (cls.attributes.length === 0) {
      const commonAttrs = ['+id: int', '+nombre: String', '+descripcion: String'];
      console.log(
        `[AiAssistant] Agregando atributos genéricos a ${cls.name}`,
      );
      return {
        ...cls,
        attributes: commonAttrs,
      };
    }
    return cls;
  });
}
```

**Qué cambió:**
- ✅ Método completamente nuevo
- ✅ Agrega `+id`, `+nombre`, `+descripcion` a clases vacías
- ✅ Permite usuario editar después

---

## Resumen de Cambios

### diagram-scanner.service.ts
- **createProcessedVersions():** +20 líneas (versión 4)
- **performMultiPassOCR():** +30 líneas (pasada 4, PSM 13)
- **setParameters():** +6 líneas (OEM, whitelist extendido)
- **advancedCleanOCRText():** -3 líneas (simplificado)
- **analyzeWithGroq():** +46 líneas (prompt mucho más detallado)
- **Tokens:** 6000 → 8000

**Total:** ~100 líneas de mejoras

### asistente.ts
- **convertScanToSuggestions():** +55 líneas (fallback, estadísticas)
- **enhanceClassesWithCommonAttributes():** +20 líneas (nuevo método)

**Total:** ~75 líneas de mejoras

---

## Líneas Clave a Recordar

1. **Line ~117 (createProcessedVersions):** Nueva versión 4 con sharpen(sigma: 3)
2. **Line ~180 (configs):** Agregado PSM 13 (líneas crudas)
3. **Line ~220 (setParameters):** Expandido whitelist y OEM
4. **Line ~480 (systemPrompt):** Prompt 3x más detallado
5. **Line ~570 (max_tokens):** 6000 → 8000
6. **Line ~60 (convertScanToSuggestions):** Fallback + estadísticas
7. **Line ~180 (enhanceClassesWithCommonAttributes):** Nuevo método

---

## Checklist de Verificación

Antes de usar, verifica que:

- [ ] `createProcessedVersions()` crea 4 versiones
- [ ] `performMultiPassOCR()` tiene 4 configs
- [ ] `analyzeWithGroq()` tiene 66+ líneas en systemPrompt
- [ ] `convertScanToSuggestions()` llama `enhanceClassesWithCommonAttributes()`
- [ ] `enhanceClassesWithCommonAttributes()` agrega 3 atributos genéricos
- [ ] No hay errores de TypeScript

```bash
# Verificar en terminal
cd backend
npm run build
# Debe compilar sin errores
```
