import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

export interface ScannedClass {
  name: string;
  attributes: string[];
  methods: string[];
  position?: { x: number; y: number };
}

export interface ScannedRelation {
  from: string;
  to: string;
  type: 'assoc' | 'inherit' | 'comp' | 'aggr' | 'dep' | 'many-to-many';
  label?: string;
  multiplicity?: {
    source?: string;
    target?: string;
  };
}

export interface DiagramScanResult {
  classes: ScannedClass[];
  relations: ScannedRelation[];
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class DiagramScannerService {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no está configurada');
    }
    this.groq = new Groq({ apiKey });
  }

  /**
   * Escanea una imagen de diagrama UML usando OCR + IA de texto
   * con múltiples pasadas para máxima precisión
   */
  async scanDiagramImage(imageBuffer: Buffer): Promise<DiagramScanResult> {
    try {
      console.log(
        '[DiagramScanner] 🔍 Iniciando análisis avanzado de imagen...',
      );

      // PASO 1: Análisis de metadata
      const metadata = await sharp(imageBuffer).metadata();
      console.log('[DiagramScanner] 📊 Imagen original:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
      });

      // PASO 2: Crear múltiples versiones procesadas para OCR robusto
      console.log('[DiagramScanner] 🔧 Generando versiones optimizadas...');
      const processedVersions = await this.createProcessedVersions(imageBuffer);

      // PASO 3: OCR en paralelo con múltiples configuraciones
      console.log('[DiagramScanner] 📝 Ejecutando OCR multinivel...');
      const ocrResults = await this.performMultiPassOCR(processedVersions);

      // PASO 4: Fusionar y limpiar resultados de OCR
      const mergedText = this.mergeOCRResults(ocrResults);
      console.log(
        '[DiagramScanner] ✅ Texto extraído combinado (primeros 1000 chars):\n',
        mergedText.substring(0, 1000),
      );

      if (!mergedText || mergedText.trim().length < 15) {
        throw new Error(
          'No se pudo extraer texto suficiente de la imagen. Verifica que el diagrama sea claro y legible.',
        );
      }

      // PASO 5: Análisis con IA usando prompts ultra-específicos
      console.log('[DiagramScanner] 🤖 Analizando con IA (Groq)...');
      const aiResult = await this.analyzeWithGroq(mergedText);

      // PASO 6: Post-procesamiento y validación exhaustiva
      console.log('[DiagramScanner] 🔍 Validando y refinando resultados...');
      const result = this.postProcessResults(aiResult, mergedText);

      console.log('[DiagramScanner] ✨ Análisis completado exitosamente:', {
        clases: result.classes.length,
        relaciones: result.relations.length,
        confianza: result.confidence,
      });

      return result;
    } catch (error) {
      console.error('[DiagramScanner] ❌ Error:', error);
      throw new Error(
        `Error al analizar el diagrama: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  /**
   * Crea múltiples versiones procesadas de la imagen para OCR robusto
   * MEJORADO: Ahora detecta cajas de clases y las procesa por separado
   */
  private async createProcessedVersions(
    imageBuffer: Buffer,
  ): Promise<Buffer[]> {
    const versions: Buffer[] = [];

    // VERSIÓN 1: Alta resolución con binarización adaptativa
    const version1 = await sharp(imageBuffer)
      .resize(4000, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
      .greyscale()
      .normalize()
      .threshold(127, { greyscale: false })
      .sharpen({ sigma: 2, m1: 1, m2: 0.5 })
      .png({ compressionLevel: 0 })
      .toBuffer();
    versions.push(version1);

    // VERSIÓN 2: Contraste extremo para texto débil
    const version2 = await sharp(imageBuffer)
      .resize(3500, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
      .greyscale()
      .normalize()
      .linear(2.0, -(128 * 1.0)) // Contraste muy alto
      .threshold(140, { greyscale: false })
      .median(2)
      .png({ compressionLevel: 0 })
      .toBuffer();
    versions.push(version2);

    // VERSIÓN 3: Suavizado para reducir ruido
    const version3 = await sharp(imageBuffer)
      .resize(3000, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
      .greyscale()
      .blur(0.5) // Ligero blur antes de threshold
      .normalize()
      .threshold(120, { greyscale: false })
      .sharpen({ sigma: 1.5, m1: 1, m2: 0.7 })
      .png({ compressionLevel: 0 })
      .toBuffer();
    versions.push(version3);

    // VERSIÓN 4: NUEVA - Enfoque en líneas/bordes para detectar cajas
    // Esto ayuda a encontrar dónde están los rectángulos (límites de clases)
    try {
      const version4 = await sharp(imageBuffer)
        .resize(3000, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
        .greyscale()
        .normalize()
        .threshold(100, { greyscale: false })
        .sharpen({ sigma: 3, m1: 2, m2: 0.3 }) // Más nitidez para líneas
        .png({ compressionLevel: 0 })
        .toBuffer();
      versions.push(version4);
      console.log('[DiagramScanner] ✅ Generadas 4 versiones optimizadas');
    } catch (e) {
      console.warn('[DiagramScanner] ⚠️ Error en versión 4, continuando con 3');
      console.log('[DiagramScanner] ✅ Generadas 3 versiones optimizadas');
    }

    return versions;
  }

  /**
   * Ejecuta OCR con múltiples configuraciones y combina resultados
   * MEJORADO: Mejores parámetros de Tesseract para diagrama UML
   */
  private async performMultiPassOCR(imageBuffers: Buffer[]): Promise<string[]> {
    const results: string[] = [];

    // Configuraciones de Tesseract optimizadas para UML
    // PSM (Page Segmentation Mode):
    // 1 = Auto + OSD, 3 = Auto, 6 = Uniform block, 11 = Sparse text, 13 = Raw line
    const configs = [
      {
        psm: 3, // Automatic page segmentation
        desc: 'Segmentación automática',
        oem: 1, // Use legacy OCR
      },
      {
        psm: 6, // Uniform block of text - MEJOR para cajas UML
        desc: 'Bloques uniformes (óptimo para clases)',
        oem: 1,
      },
      {
        psm: 11, // Sparse text
        desc: 'Texto disperso',
        oem: 1,
      },
      {
        psm: 13, // Raw line - para líneas individuales
        desc: 'Líneas crudas',
        oem: 1,
      },
    ];

    for (let i = 0; i < Math.min(imageBuffers.length, configs.length); i++) {
      const buffer = imageBuffers[i];
      const config = configs[i];

      try {
        console.log(`[OCR] Pasada ${i + 1}: ${config.desc}...`);

        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              if (progress % 25 === 0 || progress === 100) {
                console.log(`[OCR] Pasada ${i + 1} - Progreso: ${progress}%`);
              }
            }
          },
        });

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

        const {
          data: { text },
        } = await worker.recognize(buffer);
        await worker.terminate();

        const cleaned = this.advancedCleanOCRText(text);
        if (cleaned && cleaned.length > 15) {
          results.push(cleaned);
          console.log(
            `[OCR] ✅ Pasada ${i + 1} completada: ${cleaned.length} caracteres`,
          );
        }
      } catch (error) {
        console.warn(`[OCR] ⚠️ Pasada ${i + 1} falló:`, error.message);
      }
    }

    if (results.length === 0) {
      throw new Error('Todas las pasadas de OCR fallaron');
    }

    console.log(`[OCR] ✅ Completadas ${results.length} pasadas exitosas`);
    return results;
  }

  /**
   * Fusiona resultados de múltiples pasadas de OCR
   * MEJORADO: Usa mejor heurística para combinación inteligente
   */
  private mergeOCRResults(results: string[]): string {
    if (results.length === 0) return '';
    if (results.length === 1) return results[0];

    // Seleccionar el texto más largo y completo como base
    const sortedByLength = [...results].sort((a, b) => b.length - a.length);
    let mergedText = sortedByLength[0];

    // Detectar líneas únicas en otras pasadas y agregarlas
    const baseLines = new Set(
      mergedText
        .split('\n')
        .map((l) => l.trim().toLowerCase())
        .filter((l) => l),
    );

    console.log(
      `[OCR-Merge] Líneas base detectadas: ${baseLines.size} líneas únicas`,
    );

    for (let i = 1; i < results.length; i++) {
      const lines = results[i].split('\n');
      let addedFromThisPass = 0;

      for (const line of lines) {
        const normalized = line.trim().toLowerCase();
        // Si es una línea significativa que no está en la base, agregarla
        if (normalized.length > 2 && !baseLines.has(normalized)) {
          // Verificar si contiene información valiosa (atributos, métodos, clases)
          if (this.looksLikeUMLContent(line)) {
            mergedText += '\n' + line.trim();
            baseLines.add(normalized);
            addedFromThisPass++;
          }
        }
      }

      console.log(
        `[OCR-Merge] Pasada ${i + 1}: Agregadas ${addedFromThisPass} líneas nuevas`,
      );
    }

    const cleaned = this.advancedCleanOCRText(mergedText);
    console.log(
      `[OCR-Merge] Texto final mergeado: ${cleaned.length} caracteres`,
    );
    return cleaned;
  }

  /**
   * Determina si una línea parece contener información UML valiosa
   * MEJORADO: Detecta más patrones de atributos y métodos
   */
  private looksLikeUMLContent(line: string): boolean {
    const trimmed = line.trim();

    // Patrones de UML:
    return (
      /^[+\-#~]/.test(trimmed) || // Modificadores de visibilidad (atributos/métodos)
      /\w+\s*\(.*\)/.test(trimmed) || // Métodos con paréntesis
      /\w+\s*:\s*\w+/.test(trimmed) || // Atributos con tipo (name: type)
      /^[A-Z][a-zA-Z0-9_]*$/.test(trimmed) || // Nombres de clase (PascalCase)
      /\d+\.\.\*|\*\.\.1|1\.\.1|0\.\.1/.test(trimmed) || // Cardinalidades estándar
      /1\.{2,}\s*[mMnN\*]?|0\.{2,}\s*[mMnN\*]?/.test(trimmed) || // Cardinalidades con variantes
      // Palabras clave de relación
      /\b(hereda|implementa|tiene|posee|contiene|agrega|depende|es\s+un|se\s+inscribe)\b/i.test(
        trimmed,
      )
    );
  }

  /**
   * Limpieza avanzada de texto OCR con correcciones contextuales
   * MEJORADO: Mejor detección de atributos y métodos en UML
   */
  private advancedCleanOCRText(text: string): string {
    return (
      text
        // Normalizar saltos de línea
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')

        // Corregir espacios después de modificadores (+ - # ~)
        // Estos espacios pueden romper la estructura UML
        .replace(/([+\-#~])\s+/g, '$1') // "+id" no "+ id"

        // Corregir dos puntos para tipos
        .replace(/\s*:\s*/g, ':')
        // Normalizar espacio después de tipos
        .replace(/:\s*([a-zA-Z0-9])/g, ': $1')

        // Corregir paréntesis de métodos
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s+\(/g, '(')

        // Corregir modificadores de visibilidad mal reconocidos
        .replace(/[|Il1!¡]+\s*([+\-#~])/g, '$1')
        .replace(/^[|Il1!¡]+([+\-#~])/gm, '$1')

        // Corregir confusiones comunes OCR para cardinalidades
        .replace(/\b0\s*\.\s*\.\s*\*/g, '0..*')
        .replace(/\b1\s*\.\s*\.\s*\*/g, '1..*')
        .replace(/\b1\s*\.\s*\.\s*1/g, '1..1')
        .replace(/\*\s*\.\s*\.\s*1/g, '*..1')
        .replace(/\b1\.{2,}\s*[mMnN]\b/g, '1..*')
        .replace(/\b0\.{2,}\s*[mMnN]\b/g, '0..*')
        .replace(/\b1\s*\.\s*\.\s*\.?\s*[mMnN]\b/g, '1..*')
        .replace(/\b0\s*\.\s*\.\s*\.?\s*[mMnN]\b/g, '0..*')
        .replace(/\.{3,}/g, '..')

        // Corregir confusión entre números y letras que aparecen en atributos
        // Algunos OCRs confunden 'I' con '1', 'O' con '0', etc
        .replace(/\+0id:/g, '+id:') // Evitar "0id:" cuando debería ser "id:"
        .replace(/\+1id:/g, '+id:')

        // Corregir brackets
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']')

        // Normalizar espacios múltiples
        .replace(/ {2,}/g, ' ')

        // Limpiar líneas individuales
        .split('\n')
        .map((line) => {
          // Limpiar caracteres raros al inicio
          line = line.replace(/^[^\w+\-#~\n]*/, '');
          // Limpiar caracteres raros al final
          line = line.replace(/[^\w+\-#~\)\]\n]*$/, '');
          return line.trim();
        })
        .filter((line) => line.length > 0)
        .join('\n')

        // Remover líneas vacías múltiples
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
  }

  /**
   * Analiza el texto con Groq usando prompts ultra-específicos
   * MEJORADO: Prompts más precisos para detectar atributos de clases
   */
  private async analyzeWithGroq(extractedText: string): Promise<any> {
    const systemPrompt = `Eres un experto analista de diagramas UML de clases. Tu misión es interpretar texto extraído por OCR y reconstruir el diagrama con MÁXIMA PRECISIÓN.

IMPORTANTE: El OCR a menudo extrae texto de manera incompleta o con errores. Tu trabajo es INTERPRETAR el contenido y reconstruirlo correctamente.

**ESTRUCTURA FUNDAMENTAL DE UN DIAGRAMA UML:**
Cada clase tiene 3 secciones separadas por líneas:
┌─────────────┐
│ NombreClase │  ← NOMBRE (mayúscula inicial)
├─────────────┤
│ +attr1:int  │  ← ATRIBUTOS (con modificador +/-/#/~)
│ +attr2:str  │
├─────────────┤
│ +metodo()   │  ← MÉTODOS (con paréntesis)
│ +getter()   │
└─────────────┘

**PATRONES A DETECTAR:**

1. **CLASES**: 
   - Línea aislada con SOLO letras/números/_ (sin símbolos especiales)
   - Primera letra MAYÚSCULA: "Usuario", "Alumno", "Libro"
   - Marcan inicio de una nueva clase

2. **ATRIBUTOS** (CRÍTICO - Tu tarea principal):
   - SIEMPRE empiezan con modificador: +id: int, -nombre: str, #edad: int
   - Formato: [modificador][nombre]:[tipo]
   - Ejemplos válidos:
     * "+id: int"
     * "+nombre: String"  
     * "+email: String"
     * "-saldo: float"
     * "#edad: int"
   - El OCR puede haber extraído mal: "1id:int" → "+id:int", "Oname:str" → "+name:str"
   - Pueden aparecer sin tipos: "+id", "+nombre"
   - NO confundir con métodos (que tienen paréntesis)

3. **MÉTODOS**:
   - Siempre tienen paréntesis: metodo(), getter(): int
   - Formato: [modificador][nombre]([params])[:tipoRetorno]
   - Ejemplos: "+inscribir()", "+calcular(): int", "-toString(): String"

4. **RELACIONES Y CARDINALIDADES**:
   - Texto que indica conexiones entre clases
   - Cardinalidades: "1..*", "0..1", "1..1", "*", "0..*"
   - Palabras: "hereda", "implementa", "tiene", "posee", "contiene", "agrega"

**ESTRATEGIA DE ANÁLISIS:**

1. Primero, identifica TODAS las clases (nombres aislados con mayúscula)
2. Para cada clase, agrupa los atributos y métodos que le pertenecen
3. Reconstruye relaciones desde palabras clave o patrones de texto
4. Si falta información, usa CONFIANZA BAJA, no inventes

**REGLAS ESPECIALES PARA OCR DEFICIENTE:**

Si ves texto como:
- "xLibro" → es "Libro" (la 'x' es ruido)
- "Usuario J" → es "Usuario" (la 'J' es ruido)
- "1id:int" o "0id:int" → es "+id:int" (OCR confundió + con número)
- "1inscribir()" → es "+inscribir()" (OCR confundió + con número)
- Líneas separadas por espacios amplios → pertenecen a clases diferentes

**SALIDA REQUERIDA:**
JSON válido ÚNICO, sin comentarios, sin markdown. Estructura exacta.`;

    const userPrompt = `Analiza este texto extraído por OCR de un diagrama UML. 
RECONSTRUYE las clases con TODOS sus atributos, métodos, y relaciones.

El OCR puede haber fallado - tu trabajo es INTERPRETAR y corregir.

═══════════════════════════════════════════════════════════
TEXTO OCR EXTRAÍDO:
═══════════════════════════════════════════════════════════

${extractedText}

═══════════════════════════════════════════════════════════

**INSTRUCCIONES FINALES:**

1. Lee TODO el texto primero
2. Identifica qué es clase, atributo, método o relación
3. Si hay texto ambiguo:
   - ¿Tiene paréntesis? → Es un MÉTODO
   - ¿Tiene ":" pero no paréntesis? → Es un ATRIBUTO
   - ¿Es palabra aislada en mayúscula? → Es una CLASE
4. Agrupa atributos/métodos por clase
5. Extrae relaciones entre clases

**RESPONDE CON ESTE JSON (y SOLO esto):**

{
  "classes": [
    {
      "name": "string (nombre de clase)",
      "attributes": ["string array con +/-/#/~nombre:tipo"],
      "methods": ["string array con métodos"]
    }
  ],
  "relations": [
    {
      "from": "nombre clase origen",
      "to": "nombre clase destino",
      "type": "assoc|inherit|comp|aggr|dep|many-to-many",
      "label": "string opcional (nombre de relación)",
      "multiplicity": {
        "source": "string opcional (1, *, 1..*, 0..1, etc)",
        "target": "string opcional"
      }
    }
  ],
  "description": "breve descripción del diagrama",
  "confidence": "high|medium|low"
}`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.05, // Muy bajo para máxima consistencia
      max_tokens: 8000, // Aumentado para más contenido
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No se recibió respuesta de Groq');
    }

    console.log(
      '[Groq] Respuesta recibida (primeros 500 chars):',
      responseText.substring(0, 500),
    );

    return JSON.parse(responseText);
  }

  /**
   * Post-procesa y valida exhaustivamente los resultados
   */
  private postProcessResults(
    aiResult: any,
    originalText: string,
  ): DiagramScanResult {
    // Validar clases
    let classes = this.validateClasses(aiResult.classes || []);

    // Si no se detectaron clases, intentar extracción de emergencia
    if (classes.length === 0) {
      console.warn(
        '[PostProcess] ⚠️ No se detectaron clases, intentando extracción de emergencia...',
      );
      classes = this.emergencyClassExtraction(originalText);
    }

    if (classes.length === 0) {
      throw new Error(
        'No se pudieron detectar clases en el diagrama. Verifica que la imagen sea clara y contenga un diagrama UML válido.',
      );
    }

    // Validar relaciones
    const relations = this.validateRelations(aiResult.relations || [], classes);

    // Inferir relaciones faltantes del texto si es necesario
    const inferredRelations = this.inferRelationsFromText(
      originalText,
      classes,
    );
    const allRelations = this.mergeRelations(relations, inferredRelations);

    // Calcular confianza basado en múltiples factores
    const confidence = this.calculateConfidence(
      classes,
      allRelations,
      originalText,
    );

    return {
      classes,
      relations: allRelations,
      description: aiResult.description || 'Diagrama UML de clases',
      confidence,
    };
  }

  /**
   * Extracción de emergencia cuando la IA falla
   */
  private emergencyClassExtraction(text: string): ScannedClass[] {
    const classes: ScannedClass[] = [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    let currentClass: ScannedClass | null = null;

    for (const line of lines) {
      // Detectar nombre de clase (línea que empieza con mayúscula, sin modificadores)
      if (
        /^[A-Z][a-zA-Z0-9_]*$/.test(line) &&
        !line.includes(':') &&
        !line.includes('(')
      ) {
        if (currentClass) {
          classes.push(currentClass);
        }
        currentClass = {
          name: line,
          attributes: [],
          methods: [],
        };
      }
      // Detectar atributo
      else if (
        currentClass &&
        /^[+\-#~].*:/.test(line) &&
        !line.includes('(')
      ) {
        currentClass.attributes.push(line);
      }
      // Detectar método
      else if (currentClass && /^[+\-#~].*\(.*\)/.test(line)) {
        currentClass.methods.push(line);
      }
    }

    if (currentClass) {
      classes.push(currentClass);
    }

    console.log(`[Emergency] Extraídas ${classes.length} clases`);
    return classes;
  }

  /**
   * Infiere relaciones del texto cuando no son detectadas por la IA
   */
  private inferRelationsFromText(
    text: string,
    classes: ScannedClass[],
  ): ScannedRelation[] {
    const relations: ScannedRelation[] = [];
    const classNames = classes.map((c) => c.name.toLowerCase());
    const lines = text.toLowerCase().split('\n');

    // Palabras clave de relación
    const keywords: { [key: string]: ScannedRelation['type'] } = {
      inscribe: 'assoc',
      'se inscribe': 'assoc',
      imparte: 'assoc',
      tiene: 'assoc',
      posee: 'assoc',
      contiene: 'comp',
      agrega: 'aggr',
      hereda: 'inherit',
      'es un': 'inherit',
      depende: 'dep',
    };

    for (const line of lines) {
      for (const [keyword, type] of Object.entries(keywords)) {
        if (line.includes(keyword)) {
          // Buscar clases mencionadas en la línea
          const mentionedClasses = classNames.filter((cn) => line.includes(cn));
          if (mentionedClasses.length >= 2) {
            relations.push({
              from: classes.find(
                (c) => c.name.toLowerCase() === mentionedClasses[0],
              )!.name,
              to: classes.find(
                (c) => c.name.toLowerCase() === mentionedClasses[1],
              )!.name,
              type,
              label: keyword,
            });
          }
        }
      }
    }

    return relations;
  }

  /**
   * Fusiona relaciones eliminando duplicados
   */
  private mergeRelations(
    primary: ScannedRelation[],
    secondary: ScannedRelation[],
  ): ScannedRelation[] {
    const merged = [...primary];
    const existing = new Set(primary.map((r) => `${r.from}-${r.to}-${r.type}`));

    for (const rel of secondary) {
      const key = `${rel.from}-${rel.to}-${rel.type}`;
      if (!existing.has(key)) {
        merged.push(rel);
        existing.add(key);
      }
    }

    return merged;
  }

  /**
   * Calcula la confianza del análisis
   */
  private calculateConfidence(
    classes: ScannedClass[],
    relations: ScannedRelation[],
    text: string,
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Factor 1: Cantidad de clases (20 puntos)
    if (classes.length >= 3) score += 20;
    else if (classes.length >= 2) score += 15;
    else score += 10;

    // Factor 2: Atributos/métodos detectados (30 puntos)
    const totalMembers = classes.reduce(
      (sum, c) => sum + c.attributes.length + c.methods.length,
      0,
    );
    if (totalMembers >= 10) score += 30;
    else if (totalMembers >= 5) score += 20;
    else score += 10;

    // Factor 3: Relaciones detectadas (25 puntos)
    if (relations.length >= 2) score += 25;
    else if (relations.length >= 1) score += 15;
    else score += 5;

    // Factor 4: Cardinalidades presentes (15 puntos)
    const withMultiplicity = relations.filter((r) => r.multiplicity).length;
    if (withMultiplicity >= relations.length * 0.8) score += 15;
    else if (withMultiplicity >= relations.length * 0.5) score += 10;
    else score += 5;

    // Factor 5: Calidad del texto OCR (10 puntos)
    const textQuality = text.length / (text.match(/[^\w\s]/g)?.length || 1);
    if (textQuality > 5) score += 10;
    else if (textQuality > 3) score += 7;
    else score += 3;

    // Clasificar
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Valida y normaliza clases
   */
  private validateClasses(classes: any[]): ScannedClass[] {
    return classes
      .filter((cls) => cls && typeof cls.name === 'string' && cls.name.trim())
      .map((cls) => ({
        name: this.cleanClassName(cls.name),
        attributes: this.cleanStringArray(cls.attributes || []),
        methods: this.cleanStringArray(cls.methods || []),
        position: cls.position,
      }))
      .filter((cls) => cls.name.length > 0);
  }

  /**
   * Valida relaciones asegurando que las clases existen
   */
  private validateRelations(
    relations: any[],
    classes: ScannedClass[],
  ): ScannedRelation[] {
    const validTypes = new Set([
      'assoc',
      'inherit',
      'comp',
      'aggr',
      'dep',
      'many-to-many',
    ]);

    const classNames = new Set(classes.map((c) => c.name));

    return relations
      .filter(
        (rel) =>
          rel &&
          typeof rel.from === 'string' &&
          typeof rel.to === 'string' &&
          rel.from.trim() &&
          rel.to.trim(),
      )
      .map((rel) => {
        let type = (rel.type || 'assoc').toLowerCase();

        const typeMap: { [key: string]: string } = {
          association: 'assoc',
          generalization: 'inherit',
          inheritance: 'inherit',
          composition: 'comp',
          aggregation: 'aggr',
          dependency: 'dep',
          'many-to-many': 'many-to-many',
        };

        type = typeMap[type] || type;
        if (!validTypes.has(type)) type = 'assoc';

        return {
          from: this.cleanClassName(rel.from),
          to: this.cleanClassName(rel.to),
          type: type as ScannedRelation['type'],
          label: rel.label ? String(rel.label).trim() : undefined,
          multiplicity: rel.multiplicity
            ? {
                source: rel.multiplicity.source
                  ? String(rel.multiplicity.source).trim()
                  : undefined,
                target: rel.multiplicity.target
                  ? String(rel.multiplicity.target).trim()
                  : undefined,
              }
            : undefined,
        };
      })
      .filter((rel) => classNames.has(rel.from) && classNames.has(rel.to));
  }

  /**
   * Limpia nombre de clase
   */
  private cleanClassName(name: string): string {
    return String(name)
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Limpia array de strings
   */
  private cleanStringArray(arr: any[]): string[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item && typeof item === 'string')
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
}
