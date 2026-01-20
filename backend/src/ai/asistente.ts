import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import Groq from 'groq-sdk';

export interface DiagramContext {
  nodes: Array<{
    id: string;
    name: string;
    attributes: string[];
    methods: string[];
    shape?: string;
  }>;
  edges: Array<{
    id: string;
    source: string; // normalmente IDs de nodos
    target: string;
    type: string; // 'assoc' | 'inherit' | 'comp' | 'aggr' | 'dep' | 'many-to-many' | ...
    labels?: string[];
  }>;
  lastAction?: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
}

// Interfaz para el historial de conversación
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    mentionedClasses?: string[];
    lastCreatedClass?: string;
    lastAction?: string;
  };
}

// Interfaz para el análisis de intención
export interface IntentAnalysis {
  intent: 'create_class' | 'edit_class' | 'create_relation' | 'delete' | 'analyze' | 'review_design' | 'suggest_improvements' | 'explain' | 'generate_system' | 'unknown';
  entities: {
    className?: string;
    targetClassName?: string;
    attributes?: string[];
    methods?: string[];
    relationType?: string;
    systemDomain?: string;
  };
  confidence: number;
  requiresIntermediateClass?: boolean;
  suggestedIntermediateClass?: string;
}

// Interfaz para problemas de diseño detectados
export interface DesignIssue {
  type: 'warning' | 'error' | 'suggestion';
  category: 'structure' | 'naming' | 'relationships' | 'completeness' | 'patterns';
  message: string;
  affectedElements: string[];
  suggestion?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AssistantSuggestion {
  action: string;
  description: string;
  shortcut?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AssistantResponse {
  message: string;
  suggestions?: {
    classes?: Array<{ name: string; attributes: string[]; methods: string[] }>;
    relations?: Array<{
      from: string;
      to: string;
      type: string;
      // multiplicity opcional para each end
      multiplicity?: {
        source?: string;
        target?: string;
      };
    }>;
  };
  tips?: string[];
  nextSteps?: string[];
  // Para que el front las muestre como "acciones rápidas"
  contextualHelp?: AssistantSuggestion[];
}

@Injectable()
export class AiAssistantService {
  private groq: Groq | null = null;
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();
  private lastMentionedClass: Map<string, string> = new Map();

  constructor(private readonly aiService: AiService) {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  // ================== ANÁLISIS DE INTENCIÓN CON IA (1A) ==================

  /**
   * Analiza la intención del usuario usando IA en lugar de palabras clave
   * Interpreta el mensaje completo para entender qué quiere hacer el usuario
   */
  async analyzeUserIntent(
    message: string,
    context: DiagramContext,
    sessionId: string = 'default'
  ): Promise<IntentAnalysis> {
    const history = this.conversationHistory.get(sessionId) || [];
    const lastClass = this.lastMentionedClass.get(sessionId);

    // Construir contexto del diagrama para el prompt
    const diagramSummary = this.buildDiagramSummary(context);
    const historyContext = this.buildHistoryContext(history.slice(-5));

    const systemPrompt = `Eres un experto analizador de intenciones para un editor de diagramas UML.
Tu trabajo es interpretar lo que el usuario quiere hacer basándote en su mensaje, el contexto del diagrama y el historial de conversación.

CONTEXTO ACTUAL DEL DIAGRAMA:
${diagramSummary}

HISTORIAL RECIENTE:
${historyContext}

${lastClass ? `ÚLTIMA CLASE MENCIONADA: ${lastClass}` : ''}

INSTRUCCIONES:
1. Analiza el mensaje del usuario para determinar su intención
2. Si el usuario dice "agrégale", "ponle", "hazlo más grande", etc. sin especificar la clase, asume que se refiere a la última clase mencionada
3. Si detectas una relación muchos-a-muchos (ej: "Estudiante tiene muchos Cursos y Curso tiene muchos Estudiantes"), sugiere una clase intermedia
4. Identifica todas las entidades mencionadas (clases, atributos, métodos, tipos de relación)

TIPOS DE INTENCIÓN:
- create_class: Crear una nueva clase
- edit_class: Modificar una clase existente (agregar atributos/métodos)
- create_relation: Crear una relación entre clases
- delete: Eliminar elementos
- analyze: Analizar el diagrama actual
- review_design: Revisar y evaluar el diseño (Doctor de Diseño)
- suggest_improvements: Pedir sugerencias de mejora
- explain: Pedir explicaciones sobre UML o el diagrama
- generate_system: Generar un sistema completo basado en un dominio
- unknown: No se puede determinar la intención

RESPONDE EN JSON ESTRICTO:
{
  "intent": "tipo_de_intención",
  "entities": {
    "className": "nombre de la clase principal (si aplica)",
    "targetClassName": "nombre de la clase destino para relaciones (si aplica)",
    "attributes": ["array de atributos en formato 'nombre: Tipo'"],
    "methods": ["array de métodos en formato 'nombre()'"],
    "relationType": "assoc|inherit|comp|aggr|dep|many-to-many (si aplica)",
    "systemDomain": "dominio del sistema si pide generar uno (farmacia, tienda, etc.)"
  },
  "confidence": 0.0-1.0,
  "requiresIntermediateClass": true/false,
  "suggestedIntermediateClass": "NombreClaseIntermedia (si requiresIntermediateClass es true)"
}`;

    if (!this.groq) {
      // Fallback sin IA: usar análisis básico mejorado
      return this.analyzeIntentFallback(message, context, lastClass);
    }

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const raw = completion.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw);

      console.log('[AiAssistant] Intención analizada:', parsed);

      return {
        intent: parsed.intent || 'unknown',
        entities: parsed.entities || {},
        confidence: parsed.confidence || 0.5,
        requiresIntermediateClass: parsed.requiresIntermediateClass || false,
        suggestedIntermediateClass: parsed.suggestedIntermediateClass
      };
    } catch (error) {
      console.error('[AiAssistant] Error analizando intención:', error);
      return this.analyzeIntentFallback(message, context, lastClass);
    }
  }

  /**
   * Fallback de análisis de intención sin IA
   */
  private analyzeIntentFallback(
    message: string,
    context: DiagramContext,
    lastClass?: string
  ): IntentAnalysis {
    const normalized = this.normalize(message);

    // Detectar intención de revisión de diseño
    if (normalized.includes('revisar') || normalized.includes('doctor') ||
        normalized.includes('evaluar') || normalized.includes('diagnostico') ||
        normalized.includes('problemas') || normalized.includes('errores')) {
      return {
        intent: 'review_design',
        entities: {},
        confidence: 0.8
      };
    }

    // Detectar creación de clase
    if (normalized.includes('crea') || normalized.includes('crear') ||
        normalized.includes('nueva clase') || normalized.includes('agregar clase')) {
      const classMatch = message.match(/clase\s+([A-Za-z][A-Za-z0-9_]*)/i);
      return {
        intent: 'create_class',
        entities: {
          className: classMatch?.[1] || undefined,
          attributes: this.extractAttributes(message),
          methods: this.extractMethods(message)
        },
        confidence: 0.7
      };
    }

    // Detectar edición de clase (agregar atributos/métodos)
    if ((normalized.includes('agrega') || normalized.includes('añade') ||
         normalized.includes('ponle') || normalized.includes('agregale')) &&
        (normalized.includes('atributo') || normalized.includes('metodo') ||
         normalized.includes('campo') || normalized.includes('propiedad'))) {

      // Buscar clase objetivo o usar la última mencionada
      let targetClass = this.findClassInMessage(message, context);
      if (!targetClass && lastClass) {
        targetClass = lastClass;
      }

      return {
        intent: 'edit_class',
        entities: {
          className: targetClass,
          attributes: this.extractAttributes(message),
          methods: this.extractMethods(message)
        },
        confidence: targetClass ? 0.8 : 0.5
      };
    }

    // Detectar creación de relación
    if (normalized.includes('relacion') || normalized.includes('conecta') ||
        normalized.includes('asocia') || normalized.includes('hereda') ||
        normalized.includes('compone') || normalized.includes('agrega')) {

      const { from, to, type, isNtoM } = this.extractRelationInfo(message, context);

      return {
        intent: 'create_relation',
        entities: {
          className: from,
          targetClassName: to,
          relationType: type
        },
        confidence: (from && to) ? 0.8 : 0.4,
        requiresIntermediateClass: isNtoM,
        suggestedIntermediateClass: (isNtoM && from && to) ? this.suggestIntermediateClassName(from, to) : undefined
      };
    }

    // Detectar generación de sistema
    const domains = ['farmacia', 'tienda', 'hospital', 'biblioteca', 'universidad',
                     'restaurante', 'inventario', 'ecommerce', 'escuela'];
    for (const domain of domains) {
      if (normalized.includes(domain)) {
        return {
          intent: 'generate_system',
          entities: { systemDomain: domain },
          confidence: 0.9
        };
      }
    }

    return {
      intent: 'unknown',
      entities: {},
      confidence: 0.3
    };
  }

  // ================== DETECCIÓN DE N:M CON CLASES INTERMEDIAS (2A) ==================

  /**
   * Detecta si una relación debería ser muchos-a-muchos y sugiere clase intermedia
   */
  detectManyToManyRelation(
    sourceClass: string,
    targetClass: string,
    context: DiagramContext
  ): { isNtoM: boolean; intermediateClass?: { name: string; attributes: string[]; methods: string[] } } {

    // Patrones conocidos que típicamente son N:M
    const nToMPatterns = [
      ['estudiante', 'curso'],
      ['estudiante', 'materia'],
      ['producto', 'pedido'],
      ['usuario', 'rol'],
      ['empleado', 'proyecto'],
      ['actor', 'pelicula'],
      ['autor', 'libro'],
      ['paciente', 'medico'],
      ['cliente', 'producto'],
      ['alumno', 'asignatura']
    ];

    const sourceLower = sourceClass.toLowerCase();
    const targetLower = targetClass.toLowerCase();

    for (const [a, b] of nToMPatterns) {
      if ((sourceLower.includes(a) && targetLower.includes(b)) ||
          (sourceLower.includes(b) && targetLower.includes(a))) {

        const intermediateName = this.suggestIntermediateClassName(sourceClass, targetClass);
        const intermediateAttrs = this.suggestIntermediateAttributes(sourceClass, targetClass, intermediateName);

        return {
          isNtoM: true,
          intermediateClass: {
            name: intermediateName,
            attributes: intermediateAttrs,
            methods: ['registrar()', 'cancelar()', 'obtenerDetalles()']
          }
        };
      }
    }

    return { isNtoM: false };
  }

  /**
   * Sugiere un nombre para la clase intermedia
   */
  private suggestIntermediateClassName(source: string, target: string): string {
    const patterns: Record<string, string> = {
      'estudiante_curso': 'Inscripcion',
      'estudiante_materia': 'Matricula',
      'producto_pedido': 'DetallePedido',
      'usuario_rol': 'UsuarioRol',
      'empleado_proyecto': 'AsignacionProyecto',
      'actor_pelicula': 'Actuacion',
      'autor_libro': 'Autoria',
      'paciente_medico': 'Cita',
      'cliente_producto': 'Compra',
      'alumno_asignatura': 'Inscripcion'
    };

    const key = `${source.toLowerCase()}_${target.toLowerCase()}`;
    const reverseKey = `${target.toLowerCase()}_${source.toLowerCase()}`;

    return patterns[key] || patterns[reverseKey] || `${source}${target}`;
  }

  /**
   * Sugiere atributos para la clase intermedia
   */
  private suggestIntermediateAttributes(source: string, target: string, intermediateName: string): string[] {
    const baseAttrs = ['id: Long', 'fechaCreacion: Date'];

    const specificAttrs: Record<string, string[]> = {
      'Inscripcion': ['calificacion: Double', 'estado: String', 'periodo: String'],
      'Matricula': ['semestre: String', 'estado: String', 'fechaMatricula: Date'],
      'DetallePedido': ['cantidad: Integer', 'precioUnitario: Double', 'subtotal: Double'],
      'Cita': ['fecha: Date', 'hora: String', 'motivo: String', 'estado: String'],
      'Compra': ['cantidad: Integer', 'precio: Double', 'fechaCompra: Date'],
      'AsignacionProyecto': ['rol: String', 'horasAsignadas: Integer', 'fechaInicio: Date']
    };

    return [...baseAttrs, ...(specificAttrs[intermediateName] || ['descripcion: String'])];
  }

  // ================== SUGERENCIAS PROACTIVAS DE RELACIONES (3B) ==================

  /**
   * Sugiere relaciones cuando se crea una nueva clase
   */
  suggestRelationsForNewClass(
    newClassName: string,
    newClassAttributes: string[],
    context: DiagramContext
  ): Array<{ from: string; to: string; type: string; explanation: string; multiplicity?: { source: string; target: string } }> {
    const suggestions: Array<{ from: string; to: string; type: string; explanation: string; multiplicity?: { source: string; target: string } }> = [];
    const newClassLower = newClassName.toLowerCase();

    // ✅ Verificar relaciones existentes para no duplicar
    const connectedClasses = this.getConnectedClasses(newClassName, context);

    for (const node of context.nodes) {
      const existingClassLower = node.name.toLowerCase();

      // 🚫 NUNCA sugerir relación si YA EXISTE
      if (connectedClasses.has(node.name)) {
        console.log(`[suggestRelations] 🚫 Relación con ${node.name} YA EXISTE, ignorando`);
        continue;
      }

      // Detectar posible herencia
      if (this.isLikelyInheritance(newClassLower, existingClassLower)) {
        if (!this.relationshipExists(newClassName, node.name, context, true)) {
          suggestions.push({
            from: newClassName,
            to: node.name,
            type: 'inherit',
            explanation: `${newClassName} podría heredar de ${node.name} (relación "es un tipo de")`
          });
        }
      }

      // Detectar posible composición
      if (this.isLikelyComposition(newClassLower, existingClassLower)) {
        if (!this.relationshipExists(node.name, newClassName, context)) {
          suggestions.push({
            from: node.name,
            to: newClassName,
            type: 'comp',
            explanation: `${newClassName} es parte esencial de ${node.name}`,
            multiplicity: { source: '1', target: '1..*' }
          });
        }
      }

      // Detectar posible asociación por atributos que referencian la otra clase
      const hasReference = newClassAttributes.some(attr =>
        attr.toLowerCase().includes(existingClassLower) ||
        attr.toLowerCase().includes(node.name.toLowerCase().slice(0, -1)) // singular
      );

      if (hasReference) {
        if (!this.relationshipExists(newClassName, node.name, context)) {
          suggestions.push({
            from: newClassName,
            to: node.name,
            type: 'assoc',
            explanation: `${newClassName} tiene una referencia a ${node.name}`,
            multiplicity: { source: '*', target: '1' }
          });
        }
      }

      // Detectar N:M potencial
      const nToMCheck = this.detectManyToManyRelation(newClassName, node.name, context);
      if (nToMCheck.isNtoM && nToMCheck.intermediateClass) {
        if (!this.relationshipExists(newClassName, node.name, context, true)) {
          suggestions.push({
            from: newClassName,
            to: node.name,
            type: 'many-to-many',
            explanation: `Relación muchos-a-muchos detectada. Sugerencia: crear clase intermedia "${nToMCheck.intermediateClass.name}"`
          });
        }
      }
    }

    return suggestions.slice(0, 3); // Máximo 3 sugerencias
  }

  private isLikelyInheritance(child: string, parent: string): boolean {
    const inheritancePairs = [
      { children: ['empleado', 'cliente', 'estudiante', 'profesor', 'admin'], parent: 'persona' },
      { children: ['perro', 'gato', 'ave'], parent: 'animal' },
      { children: ['auto', 'moto', 'camion'], parent: 'vehiculo' },
      { children: ['factura', 'recibo', 'boleta'], parent: 'documento' }
    ];

    for (const pair of inheritancePairs) {
      if (pair.children.some(c => child.includes(c)) && parent.includes(pair.parent)) {
        return true;
      }
    }
    return false;
  }

  private isLikelyComposition(part: string, whole: string): boolean {
    const compositionPairs = [
      // Español
      ['motor', 'auto'],
      ['habitacion', 'casa'],
      ['pagina', 'libro'],
      ['item', 'pedido'],
      ['detalle', 'factura'],
      ['linea', 'factura'],
      ['asiento', 'avion'],
      ['tecla', 'teclado'],
      ['pantalla', 'monitor'],
      ['celula', 'tejido'],

      // Inglés
      ['engine', 'car'],
      ['room', 'house'],
      ['page', 'book'],
      ['orderitem', 'order'],
      ['orderline', 'order'],
      ['invoiceitem', 'invoice'],
      ['invoiceline', 'invoice'],
      ['seat', 'airplane'],
      ['key', 'keyboard'],
      ['screen', 'monitor'],
      ['cell', 'tissue']
    ];

    return compositionPairs.some(([p, w]) => part.includes(p) && whole.includes(w));
  }

  /**
   * Verifica si una relación YA EXISTE en el diagrama actual
   * Considera ambas direcciones para relaciones bidireccionales
   */
  private relationshipExists(
    fromClass: string,
    toClass: string,
    context: DiagramContext,
    ignoreDirection: boolean = false
  ): boolean {
    const fromNode = context.nodes.find(n => this.normalize(n.name) === this.normalize(fromClass));
    const toNode = context.nodes.find(n => this.normalize(n.name) === this.normalize(toClass));

    if (!fromNode || !toNode) return false;

    // Verificar relación directa
    const directExists = context.edges.some(e => e.source === fromNode.id && e.target === toNode.id);
    if (directExists) return true;

    // Si ignoreDirection, también verificar la relación inversa
    if (ignoreDirection) {
      const inverseExists = context.edges.some(e => e.source === toNode.id && e.target === fromNode.id);
      if (inverseExists) return true;
    }

    return false;
  }

  /**
   * Obtiene todas las clases a las que YA está conectada una clase
   */
  private getConnectedClasses(className: string, context: DiagramContext): Set<string> {
    const classNode = context.nodes.find(n => this.normalize(n.name) === this.normalize(className));
    if (!classNode) return new Set();

    const connected = new Set<string>();
    for (const edge of context.edges) {
      if (edge.source === classNode.id) {
        const targetNode = context.nodes.find(n => n.id === edge.target);
        if (targetNode) connected.add(targetNode.name);
      }
      if (edge.target === classNode.id) {
        const sourceNode = context.nodes.find(n => n.id === edge.source);
        if (sourceNode) connected.add(sourceNode.name);
      }
    }
    return connected;
  }

  /**
   * Verifica si una clase YA EXISTE en el diagrama
   */
  private classExists(className: string, context: DiagramContext): boolean {
    return context.nodes.some(n => this.normalize(n.name) === this.normalize(className));
  }

  // ================== DOCTOR DE DISEÑO CON IA (4D) ==================

  /**
   * Analiza el diagrama completo usando IA y genera sugerencias inteligentes
   * NO crea duplicados, solo sugiere lo que FALTA
   */
  async reviewDesign(context: DiagramContext): Promise<{
    score: number;
    issues: DesignIssue[];
    summary: string;
    recommendations: string[];
  }> {

    // Si no hay Groq, usar análisis básico
    if (!this.groq) {
      return this.reviewDesignBasic(context);
    }

    // Construir descripción detallada del diagrama
    const diagramDescription = this.describeDiagramForReview(context);

    const systemPrompt = `Eres un EXPERTO en diseño UML y arquitectura de software.
Tu tarea es REVISAR un diagrama de clases y dar un diagnóstico PROFESIONAL Y RIGUROSO.

═══════════════════════════════════════════════════════════════
                    DIAGRAMA A REVISAR
═══════════════════════════════════════════════════════════════
${diagramDescription}

═══════════════════════════════════════════════════════════════
                    VERIFICACIÓN CRÍTICA
═══════════════════════════════════════════════════════════════

✅ ANTES DE SUGERIR CUALQUIER RELACIÓN:
1. Lee LÍNEA POR LÍNEA cada relación existente en la sección "🔗 RELACIONES EXISTENTES"
2. Verifica de A → B (origen → destino) para cada relación
3. NUNCA sugieras una relación que YA ESTÉ EN ESTA LISTA
4. Si es N:M, verifica si YA EXISTE una clase intermedia

⚠️ REGLA DE ORO:
- Si ves "Estudiante --[assoc]--> Curso", NO sugieras "Estudiante a Curso"
- Si ves "Empleado --[inherit]--> Persona", NO sugieras "Empleado hereda de Persona"
- Revisa EXACTAMENTE lo que ves, no lo que CREES que debería haber

═══════════════════════════════════════════════════════════════
                    TU ANÁLISIS DEBE INCLUIR
═══════════════════════════════════════════════════════════════

1. **DETECTAR EL DOMINIO**: ¿De qué trata este sistema?
   - Identifica el contexto (tienda, hospital, escuela, etc.)
   - Resume su propósito en 1 línea

2. **PROBLEMAS ENCONTRADOS** (SOLO SI EXISTEN):
   - Clases sin atributos o métodos
   - Clases que deberían estar relacionadas pero NO lo están
   - Atributos sin tipo de dato
   - Nombres que no siguen convenciones
   - Relaciones N:M que necesitan clase intermedia
   - Clases aisladas (sin ninguna conexión)

3. **CLASES QUE FALTAN** (basadas en el dominio):
   - Piensa: "¿Qué ACTORES o ENTIDADES del dominio FALTAN?"
   - Ejemplo (Tienda): si tienes Producto, Cliente, ¿dónde está Empleado? ¿Categoría?
   - NO dupliques clases existentes
   - Solo sugiere si es REALMENTE necesaria para el dominio

4. **RELACIONES QUE FALTAN** (VERIFICAR PRIMERO):
   - Antes de sugerir, verifica que NO EXISTA YA en el diagrama
   - Piensa en flujos lógicos: ¿Qué debe estar conectado?
   - Especifica el tipo: herencia, composición, agregación, asociación
   - Ejemplo: "Cliente y Pedido deberían estar conectados por asociación"

5. **PUNTUACIÓN**: 0-100 basada en:
   - ✅ Completitud (¿tiene todas las clases del dominio?)
   - ✅ Calidad de atributos y métodos (¿son realistas?)
   - ✅ Relaciones correctas (¿están bien conectadas?)
   - ✅ Coherencia (¿tiene lógica?)

═══════════════════════════════════════════════════════════════
                    REGLAS CRÍTICAS
═══════════════════════════════════════════════════════════════

🚫 NUNCA HAGAS ESTO:
- Sugerir una relación que YA EXISTE en el diagrama
- Sugerir una clase que YA EXISTE
- Ignorar las relaciones listadas en "RELACIONES EXISTENTES"
- Asumir relaciones no explícitas

✅ SIEMPRE HAZ ESTO:
- Lee y comprende cada relación existente
- Verifica por nombre exacto (mayúsculas/minúsculas)
- Compara propuestas con lo existente ANTES de sugerirlas
- Sé específico en las sugerencias

═══════════════════════════════════════════════════════════════
                    FORMATO DE RESPUESTA
═══════════════════════════════════════════════════════════════

RESPONDE EN JSON (VÁLIDO):
{
  "score": 75,
  "detectedDomain": "Sistema de farmacia",
  "summary": "Resumen del análisis en 2-3 oraciones",
  "issues": [
    {
      "type": "warning",
      "category": "completeness",
      "message": "Descripción del problema",
      "affectedElements": ["Clase1", "Clase2"],
      "suggestion": "Cómo solucionarlo",
      "priority": "high"
    }
  ],
  "missingClasses": [
    {
      "name": "ClaseQueFalta",
      "reason": "Por qué debería existir",
      "attributes": ["+ id: Long", "- nombre: String"],
      "methods": ["+ guardar(): void"]
    }
  ],
  "missingRelations": [
    {
      "from": "ClaseA",
      "to": "ClaseB",
      "type": "assoc",
      "reason": "Por qué deberían estar conectadas (verifica que NO exista ya)"
    }
  ],
  "recommendations": [
    "Recomendación 1",
    "Recomendación 2"
  ]
}`;

    try {
      console.log('[AiAssistant] 🩺 Doctor de Diseño analizando...');

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analiza este diagrama UML y dame tu diagnóstico profesional.' }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const rawResponse = completion.choices?.[0]?.message?.content ?? '';
      console.log('[AiAssistant] 🩺 Diagnóstico recibido:', rawResponse.substring(0, 300));

      const parsed = this.parseAIResponse(rawResponse);

      if (parsed) {
        // ✅ LIMPIAR sugerencias para evitar duplicados
        const cleanedParsed = this.cleanDoctorSuggestions(parsed, context);
        
        return {
          score: cleanedParsed.score || 50,
          issues: cleanedParsed.issues || [],
          summary: this.formatDoctorSummary(cleanedParsed, context),
          recommendations: cleanedParsed.recommendations || []
        };
      }

      return this.reviewDesignBasic(context);

    } catch (error) {
      console.error('[AiAssistant] ❌ Error en Doctor de Diseño:', error);
      return this.reviewDesignBasic(context);
    }
  }

  /**
   * Limpia las sugerencias del Doctor de Diseño para evitar duplicados
   * Filtra clases y relaciones que YA EXISTEN en el diagrama
   */
  private cleanDoctorSuggestions(parsed: any, context: DiagramContext): any {
    const cleaned = { ...parsed };

    // ✅ Filtrar missingClasses que YA EXISTEN
    if (Array.isArray(cleaned.missingClasses)) {
      cleaned.missingClasses = cleaned.missingClasses.filter((cls: any) => {
        const exists = this.classExists(cls.name, context);
        if (exists) {
          console.log(`[cleanDoctorSuggestions] 🚫 Clase ya existe: ${cls.name}`);
        }
        return !exists;
      });
    }

    // ✅ Filtrar missingRelations que YA EXISTEN
    if (Array.isArray(cleaned.missingRelations)) {
      cleaned.missingRelations = cleaned.missingRelations.filter((rel: any) => {
        const exists = this.relationshipExists(rel.from, rel.to, context);
        if (exists) {
          console.log(`[cleanDoctorSuggestions] 🚫 Relación ya existe: ${rel.from} → ${rel.to}`);
        }
        return !exists;
      });
    }

    return cleaned;
  }

  // Formato especial para el resumen del Doctor
  private formatDoctorSummary(parsed: any, context: DiagramContext): string {
    let summary = `🩺 **Diagnóstico del Diseño**\n\n`;

    // Puntuación con emoji
    const score = parsed.score || 50;
    let emoji = '🎉';
    let status = 'Excelente';
    if (score < 50) { emoji = '⚠️'; status = 'Necesita trabajo'; }
    else if (score < 70) { emoji = '🔧'; status = 'Aceptable'; }
    else if (score < 90) { emoji = '✅'; status = 'Bueno'; }

    summary += `${emoji} **Puntuación: ${score}/100** - ${status}\n\n`;

    // Dominio detectado
    if (parsed.detectedDomain) {
      summary += `🎯 **Dominio detectado:** ${parsed.detectedDomain}\n\n`;
    }

    // Resumen del análisis
    if (parsed.summary) {
      summary += `📋 ${parsed.summary}\n\n`;
    }

    // Clases que faltan
    if (parsed.missingClasses?.length > 0) {
      summary += `\n📦 **Clases sugeridas para agregar:**\n`;
      for (const cls of parsed.missingClasses) {
        summary += `• **${cls.name}**: ${cls.reason}\n`;
      }
    }

    // Relaciones que faltan
    if (parsed.missingRelations?.length > 0) {
      summary += `\n🔗 **Relaciones sugeridas:**\n`;
      for (const rel of parsed.missingRelations) {
        summary += `• ${rel.from} → ${rel.to} (${rel.type}): ${rel.reason}\n`;
      }
    }

    return summary;
  }

  // Descripción detallada para la revisión
  private describeDiagramForReview(context: DiagramContext): string {
    if (context.nodes.length === 0) {
      return '❌ El diagrama está VACÍO. No hay nada que revisar.';
    }

    let desc = `📊 **ESTADÍSTICAS:**\n`;
    desc += `• Total de clases: ${context.nodes.length}\n`;
    desc += `• Total de relaciones: ${context.edges.length}\n\n`;

    desc += `📦 **CLASES EN EL DIAGRAMA:**\n`;
    for (const node of context.nodes) {
      desc += `\n▸ **${node.name}**\n`;
      if (node.attributes?.length > 0) {
        desc += `  Atributos (${node.attributes.length}): ${node.attributes.join(', ')}\n`;
      } else {
        desc += `  Atributos: ⚠️ NINGUNO\n`;
      }
      if (node.methods?.length > 0) {
        desc += `  Métodos (${node.methods.length}): ${node.methods.join(', ')}\n`;
      } else {
        desc += `  Métodos: ⚠️ NINGUNO\n`;
      }
    }

    if (context.edges.length > 0) {
      desc += `\n🔗 **RELACIONES EXISTENTES:**\n`;
      for (const edge of context.edges) {
        const src = context.nodes.find(n => n.id === edge.source)?.name || '?';
        const tgt = context.nodes.find(n => n.id === edge.target)?.name || '?';
        const labels = edge.labels?.join(', ') || '';
        desc += `• ${src} --[${edge.type}${labels ? `: ${labels}` : ''}]--> ${tgt}\n`;
      }
    } else {
      desc += `\n🔗 **RELACIONES:** ⚠️ NINGUNA - Las clases no están conectadas\n`;
    }

    return desc;
  }

  // Análisis básico sin IA (fallback)
  private reviewDesignBasic(context: DiagramContext): {
    score: number;
    issues: DesignIssue[];
    summary: string;
    recommendations: string[];
  } {
    const issues: DesignIssue[] = [];
    let score = 100;

    // Verificar clases vacías
    const emptyClasses = context.nodes.filter(n =>
      (!n.attributes || n.attributes.length === 0) &&
      (!n.methods || n.methods.length === 0)
    );

    if (emptyClasses.length > 0) {
      issues.push({
        type: 'warning',
        category: 'completeness',
        message: `${emptyClasses.length} clase(s) sin atributos ni métodos`,
        affectedElements: emptyClasses.map(n => n.name),
        suggestion: 'Agrega atributos y métodos a estas clases',
        priority: 'high'
      });
      score -= emptyClasses.length * 10;
    }

    // Verificar clases aisladas
    const unconnectedClasses = context.nodes.filter(n =>
      !context.edges.some(e => e.source === n.id || e.target === n.id)
    );

    if (unconnectedClasses.length > 0 && context.nodes.length > 1) {
      issues.push({
        type: 'warning',
        category: 'relationships',
        message: `${unconnectedClasses.length} clase(s) sin relaciones`,
        affectedElements: unconnectedClasses.map(n => n.name),
        suggestion: 'Conecta estas clases con las demás',
        priority: 'medium'
      });
      score -= unconnectedClasses.length * 5;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      issues,
      summary: `Análisis básico: ${context.nodes.length} clases, ${context.edges.length} relaciones. Puntuación: ${score}/100`,
      recommendations: issues.length > 0
        ? ['Corrige los problemas detectados antes de continuar']
        : ['El diagrama se ve bien. Considera agregar más detalles.']
    };
  }

  private generateDesignSummary(context: DiagramContext, issues: DesignIssue[], score: number): string {
    const classCount = context.nodes.length;
    const relationCount = context.edges.length;
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    let emoji = '🎉';
    let status = 'Excelente';
    if (score < 50) { emoji = '⚠️'; status = 'Necesita mejoras'; }
    else if (score < 70) { emoji = '🔧'; status = 'Aceptable'; }
    else if (score < 90) { emoji = '✅'; status = 'Bueno'; }

    return `${emoji} **Diagnóstico del Diseño: ${status}** (${score}/100)\n\n` +
           `📊 **Estadísticas:**\n` +
           `• Clases: ${classCount}\n` +
           `• Relaciones: ${relationCount}\n` +
           `• Problemas encontrados: ${errorCount} errores, ${warningCount} advertencias\n\n` +
           `${issues.length === 0 ? '✨ ¡No se encontraron problemas!' : ''}`;
  }

  private generateRecommendations(context: DiagramContext, issues: DesignIssue[]): string[] {
    const recommendations: string[] = [];

    if (context.nodes.length === 0) {
      recommendations.push('Comienza creando 2-3 clases principales de tu dominio');
    } else if (context.nodes.length < 3) {
      recommendations.push('Considera agregar más clases para un modelo más completo');
    }

    if (context.edges.length === 0 && context.nodes.length >= 2) {
      recommendations.push('Conecta tus clases con relaciones (asociación, herencia, composición)');
    }

    const highPriorityIssues = issues.filter(i => i.priority === 'high');
    if (highPriorityIssues.length > 0) {
      recommendations.push('Resuelve primero los problemas de alta prioridad marcados arriba');
    }

    if (context.nodes.length >= 3 && context.edges.length >= 2) {
      recommendations.push('Tu diagrama tiene buena estructura base. Revisa las cardinalidades');
    }

    return recommendations;
  }

  // ================== HISTORIAL DE CONVERSACIÓN (5A) ==================

  /**
   * Guarda un mensaje en el historial de conversación
   */
  saveToHistory(sessionId: string, role: 'user' | 'assistant', content: string, mentionedClasses?: string[]): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }

    const history = this.conversationHistory.get(sessionId)!;
    history.push({
      role,
      content,
      timestamp: new Date(),
      context: {
        mentionedClasses,
        lastCreatedClass: mentionedClasses?.[0]
      }
    });

    // Mantener solo los últimos 20 mensajes
    if (history.length > 20) {
      history.shift();
    }

    // Actualizar última clase mencionada
    if (mentionedClasses?.length) {
      this.lastMentionedClass.set(sessionId, mentionedClasses[0]);
    }
  }

  /**
   * Obtiene el contexto del historial para referencias implícitas
   */
  getConversationContext(sessionId: string): { lastMentionedClass?: string; recentClasses: string[] } {
    const history = this.conversationHistory.get(sessionId) || [];
    const recentClasses: string[] = [];

    for (const msg of history.slice(-5)) {
      if (msg.context?.mentionedClasses) {
        recentClasses.push(...msg.context.mentionedClasses);
      }
    }

    return {
      lastMentionedClass: this.lastMentionedClass.get(sessionId),
      recentClasses: [...new Set(recentClasses)]
    };
  }

  // ================== MÉTODOS AUXILIARES ==================

  private buildDiagramSummary(context: DiagramContext): string {
    if (context.nodes.length === 0) {
      return 'El diagrama está vacío.';
    }

    const classesSummary = context.nodes.map(n =>
      `- ${n.name}: ${n.attributes?.length || 0} atributos, ${n.methods?.length || 0} métodos`
    ).join('\n');

    const relationsSummary = context.edges.map(e => {
      const source = context.nodes.find(n => n.id === e.source);
      const target = context.nodes.find(n => n.id === e.target);
      return `- ${source?.name || '?'} --[${e.type}]--> ${target?.name || '?'}`;
    }).join('\n');

    return `Clases (${context.nodes.length}):\n${classesSummary}\n\nRelaciones (${context.edges.length}):\n${relationsSummary || 'Ninguna'}`;
  }

  private buildHistoryContext(history: ConversationMessage[]): string {
    if (history.length === 0) return 'Sin historial previo.';

    return history.map(m => `${m.role}: ${m.content.substring(0, 100)}...`).join('\n');
  }

  private extractAttributes(message: string): string[] {
    const attributes: string[] = [];

    // Patrón: "con atributos X, Y, Z" o "atributos: X, Y, Z"
    const attrMatch = message.match(/(?:con\s+)?atributos?\s*[:\-]?\s*([^.;\n]+)/i);
    if (attrMatch) {
      const rawAttrs = attrMatch[1].split(/[,y]/i);
      for (const attr of rawAttrs) {
        const cleaned = attr.trim();
        if (cleaned) {
          // Si no tiene tipo, agregar String por defecto
          if (!cleaned.includes(':')) {
            attributes.push(`${this.safeId(cleaned)}: String`);
          } else {
            attributes.push(cleaned);
          }
        }
      }
    }

    return attributes;
  }

  private extractMethods(message: string): string[] {
    const methods: string[] = [];

    const methodMatch = message.match(/(?:con\s+)?m[eé]todos?\s*[:\-]?\s*([^.;\n]+)/i);
    if (methodMatch) {
      const rawMethods = methodMatch[1].split(/[,y]/i);
      for (const method of rawMethods) {
        let cleaned = method.trim();
        if (cleaned && !cleaned.includes('(')) {
          cleaned = `${cleaned}()`;
        }
        if (cleaned) {
          methods.push(cleaned);
        }
      }
    }

    return methods;
  }

  private findClassInMessage(message: string, context: DiagramContext): string | undefined {
    const normalized = this.normalize(message);

    for (const node of context.nodes) {
      if (normalized.includes(this.normalize(node.name))) {
        return node.name;
      }
    }

    // Buscar patrones como "a la clase X" o "en X"
    const classMatch = message.match(/(?:a\s+(?:la\s+)?clase|en)\s+([A-Za-z][A-Za-z0-9_]*)/i);
    if (classMatch) {
      const foundName = classMatch[1];
      const existingNode = context.nodes.find(n =>
        this.normalize(n.name) === this.normalize(foundName)
      );
      if (existingNode) return existingNode.name;
    }

    return undefined;
  }

  private extractRelationInfo(message: string, context: DiagramContext): {
    from?: string;
    to?: string;
    type: string;
    isNtoM: boolean;
  } {
    const normalized = this.normalize(message);

    // Detectar tipo de relación
    let type = 'assoc';
    if (normalized.includes('herencia') || normalized.includes('hereda') || normalized.includes('extiende')) {
      type = 'inherit';
    } else if (normalized.includes('composicion') || normalized.includes('compone') || normalized.includes('parte de')) {
      type = 'comp';
    } else if (normalized.includes('agregacion') || normalized.includes('tiene') || normalized.includes('contiene')) {
      type = 'aggr';
    } else if (normalized.includes('muchos a muchos') || normalized.includes('n a m')) {
      type = 'many-to-many';
    }

    // Extraer clases
    const pattern = /(?:de|desde)\s+([A-Za-z]\w*)\s+(?:a|hacia|con)\s+([A-Za-z]\w*)/i;
    const match = message.match(pattern);

    let from: string | undefined;
    let to: string | undefined;

    if (match) {
      from = match[1];
      to = match[2];
    } else {
      // Buscar nombres de clases existentes en el mensaje
      const foundClasses: string[] = [];
      for (const node of context.nodes) {
        if (normalized.includes(this.normalize(node.name))) {
          foundClasses.push(node.name);
        }
      }
      if (foundClasses.length >= 2) {
        from = foundClasses[0];
        to = foundClasses[1];
      }
    }

    // Detectar si es N:M
    const isNtoM = type === 'many-to-many' ||
                   (normalized.includes('muchos') && normalized.split('muchos').length > 2);

    return { from, to, type, isNtoM };
  }

  /**
   * Convierte el resultado del scan de imagen en sugerencias del asistente
   * que el frontend puede interpretar y ejecutar automáticamente
   * MEJORADO: Fallback inteligente cuando hay pocas clases/atributos
   */
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

    // FALLBACK: Si se detectaron clases pero SIN atributos/métodos,
    // intentar extraer más información del description o usar sugerencias genéricas
    if (classSuggestions.length > 0) {
      const totalMembers = classSuggestions.reduce(
        (sum, cls) => sum + (cls.attributes?.length || 0) + (cls.methods?.length || 0),
        0,
      );

      if (totalMembers === 0 && scanResult.description) {
        console.log(
          '[AiAssistant] ⚠️ Clases sin atributos detectadas. Intentando extracción mejorada...',
        );
        // Podrías intentar analizar el description para sugerir atributos comunes
        classSuggestions = this.enhanceClassesWithCommonAttributes(
          classSuggestions,
          scanResult.description,
        );
      }
    }

    // Convertir las relaciones del scan al formato de sugerencias
    const relationSuggestions = (scanResult.relations || []).map(
      (rel: any) => ({
        from: rel.from,
        to: rel.to,
        type: rel.type || 'assoc',
        label: rel.label,
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
      }),
    );

    // Mensaje informativo mejorado
    const totalAttributes = classSuggestions.reduce(
      (sum, cls) => sum + (cls.attributes?.length || 0),
      0,
    );
    const totalMethods = classSuggestions.reduce(
      (sum, cls) => sum + (cls.methods?.length || 0),
      0,
    );

    const message =
      `✨ **Diagrama detectado desde imagen:**\n\n` +
      `📦 **${classSuggestions.length} clases encontradas:** ${classSuggestions.map((c) => c.name).join(', ')}\n` +
      `📋 **Atributos:** ${totalAttributes} | **Métodos:** ${totalMethods}\n` +
      `🔗 **${relationSuggestions.length} relaciones detectadas**\n\n` +
      `${scanResult.description || 'Diagrama UML de clases'}\n\n` +
      `⭐ **Confianza:** ${scanResult.confidence || 'medium'}\n\n` +
      `${
        totalAttributes === 0
          ? '⚠️ **Nota:** Se detectaron pocas características. Puedes editarlas después de crear las clases.\n\n'
          : ''
      }` +
      `Las clases y relaciones se crearán automáticamente.`;

    console.log('[AiAssistant] Sugerencias generadas:', {
      classes: classSuggestions.length,
      attributes: totalAttributes,
      methods: totalMethods,
      relations: relationSuggestions.length,
    });

    return {
      message,
      suggestions: {
        classes: classSuggestions,
        relations: relationSuggestions,
      },
      tips: [
        '🎨 Las clases se crearán automáticamente en el editor',
        '🔗 Las relaciones se conectarán después de crear las clases',
        '✏️ Puedes editar cualquier clase después de crearla',
        ...(totalAttributes === 0
          ? [
              '💡 Si faltan atributos, edita la clase y agrega manualmente los campos que necesites',
            ]
          : []),
      ],
      nextSteps: [
        'Revisa las clases creadas',
        'Verifica las relaciones',
        'Edita o agrega más detalles si es necesario',
      ],
    };
  }

  /**
   * Intenta mejorar las clases agregando atributos comunes basados en el nombre/descripción
   * Si el OCR no detectó atributos, al menos sugiere algunos genéricos
   */
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

  async getContextualHelp(
    context: DiagramContext,
    userMessage?: string,
    sessionId: string = 'default',
  ): Promise<AssistantResponse> {
    const analysis = this.analyzeDiagramState(context);

    if (userMessage && userMessage.trim()) {
      // Guardar mensaje del usuario en el historial
      this.saveToHistory(sessionId, 'user', userMessage);

      // =====================================================
      // CEREBRO IA: Todo pasa por el LLM directamente
      // =====================================================
      const response = await this.processWithAI(userMessage, context, sessionId);

      // Guardar respuesta en el historial
      const mentionedClasses = response.suggestions?.classes?.map(c => c.name) || [];
      this.saveToHistory(sessionId, 'assistant', response.message, mentionedClasses);

      return response;
    }

    return this.generateProactiveGuidance(context, analysis);
  }

  // =====================================================
  // CEREBRO IA PRINCIPAL - Procesa CUALQUIER solicitud
  // =====================================================
  private async processWithAI(
    userMessage: string,
    context: DiagramContext,
    sessionId: string
  ): Promise<AssistantResponse> {

    // Si no hay API key de Groq, usar fallback
    if (!this.groq) {
      console.log('[AiAssistant] Sin GROQ_API_KEY, usando fallback básico');
      return this.handleUserMessage(userMessage, context, this.analyzeDiagramState(context));
    }

    // Construir descripción del diagrama actual
    const diagramDescription = this.describeDiagramForAI(context);
    const conversationHistory = this.getRecentHistory(sessionId);

    // Detectar si es una solicitud de revisión de diseño
    const normalizedMsg = userMessage.toLowerCase();
    const isReviewRequest = normalizedMsg.includes('revisar') ||
                            normalizedMsg.includes('doctor') ||
                            normalizedMsg.includes('evaluar') ||
                            normalizedMsg.includes('diagnostico') ||
                            normalizedMsg.includes('analizar diseño') ||
                            normalizedMsg.includes('que falta') ||
                            normalizedMsg.includes('problemas') ||
                            normalizedMsg.includes('esta bien');

    // Si es revisión, usar el Doctor de Diseño
    if (isReviewRequest) {
      console.log('[AiAssistant] 🩺 Detectada solicitud de revisión, usando Doctor de Diseño');
      const review = await this.reviewDesign(context);
      return {
        message: review.summary,
        tips: review.recommendations
        // NO incluir suggestions para que no se apliquen automáticamente
      };
    }

    const systemPrompt = `Eres un EXPERTO en diseño UML y arquitectura de software. Ayudas a crear diagramas de clases profesionales.

═══════════════════════════════════════════════════════════════
                    DIAGRAMA ACTUAL
═══════════════════════════════════════════════════════════════
${diagramDescription}

═══════════════════════════════════════════════════════════════
                 HISTORIAL DE CONVERSACIÓN
═══════════════════════════════════════════════════════════════
${conversationHistory}

═══════════════════════════════════════════════════════════════
                      TUS CAPACIDADES
═══════════════════════════════════════════════════════════════

1. **CREAR CLASES**: Cuando el usuario pida crear clases o un sistema:
   - Genera clases completas con atributos tipados profesionalmente.
   - Incluye métodos CRUD y de negocio relevantes.
   - Usa visibilidad UML: + público, - privado, # protegido.
   - NUNCA crees una clase que ya exista en el diagrama.

2. **CREAR RELACIONES**: Determina el tipo correcto:
   - "inherit": Herencia (A ES UN tipo de B) - Ejemplo: Empleado hereda de Persona.
   - "comp": Composición (A NO PUEDE existir sin B, la existencia de la parte depende del todo) - Ejemplo: Motor es **parte esencial e inseparable** de Auto; el Motor se destruye si el Auto se destruye.
   - "aggr": Agregación (A CONTIENE B pero pueden existir solos, la parte puede existir independientemente del todo) - Ejemplo: Universidad tiene Estudiantes; los Estudiantes existen aunque la Universidad no.
   - "assoc": Asociación simple (relación general, conexión sin fuerte dependencia) - Ejemplo: Cliente realiza Pedido.
   - "dep": Dependencia (uso temporal, un cambio en A puede afectar a B pero no viceversa) - Ejemplo: Controlador usa Servicio.
   - NUNCA crees una relación que ya exista entre dos clases.

3. **DETECTAR N:M (Muchos a Muchos)**:
   - Si la descripción del usuario implica una relación muchos-a-muchos (ej: "Estudiante **muchos** Cursos y Curso **muchos** Estudiantes", "varios Autores escriben varios Libros"), **SIEMPRE** debes sugerir la creación de una **clase intermedia**.
   - La clase intermedia debe tener un nombre relevante que refleje la acción o concepto de la relación (ej: Inscripcion, Contratacion, Asignacion, Autoria).
   - Esta clase intermedia debe tener dos asociaciones simples con multiplicidad 1 a * (uno a muchos) hacia las clases originales, en lugar de la relación N:M directa.
   - Ejemplo: Estudiante ↔ Curso → crea **"Inscripcion"** con atributos como fechaInscripcion: Date, calificacion: Double.
     Relaciones resultantes:
       - Estudiante 1 -- * Inscripcion
       - Curso 1 -- * Inscripcion

4. **GENERAR SISTEMAS COMPLETOS**: Si piden "sistema de farmacia", "tienda", etc:
   - Genera TODAS las clases necesarias (5-10 clases típicamente).
   - Incluye todas las relaciones entre ellas.
   - Agrega clases intermedias donde sea necesario, siguiendo la regla de N:M.

REGLAS CRÍTICAS:
- NUNCA dupliques clases que ya existen en el diagrama.
- NUNCA crees relaciones que ya existen.
- Revisa el DIAGRAMA ACTUAL antes de sugerir algo.
- Para la composición, busca una dependencia fuerte de existencia (la parte no vive sin el todo).

═══════════════════════════════════════════════════════════════
                    FORMATO DE RESPUESTA
═══════════════════════════════════════════════════════════════

RESPONDE SIEMPRE en JSON con esta estructura:

{
  "message": "Explicación para el usuario en español (usa **negritas** y formato markdown)",
  "suggestions": {
    "classes": [
      {
        "name": "NombreClase",
        "attributes": [
          "+ id: Long",
          "- nombre: String",
          "- email: String",
          "- fechaCreacion: Date"
        ],
        "methods": [
          "+ getNombre(): String",
          "+ setNombre(nombre: String): void",
          "+ validarEmail(): Boolean",
          "+ guardar(): void"
        ]
      }
    ],
    "relations": [
      {
        "from": "ClaseOrigen",
        "to": "ClaseDestino",
        "type": "assoc", // o comp, aggr, inherit, dep
        "multiplicity": {"source": "1", "target": "*"} // OPCIONAL: si se especifica en la solicitud
      }
    ]
  },
  "tips": ["Consejo práctico 1", "Consejo práctico 2"],
  "nextSteps": ["Siguiente paso 1", "Siguiente paso 2"]
}

IMPORTANTE:
- Si el usuario hace una pregunta simple, responde solo con "message".
- Si pide crear algo, SIEMPRE incluye "suggestions" con las clases/relaciones.
- Genera atributos y métodos REALES y ÚTILES, no genéricos.
- NUNCA incluyas clases o relaciones que YA EXISTEN en el diagrama.
- Cuando sugieras una relación de Composición, explícita que la parte se destruye con el todo.
- Asegúrate de que las multiplicidades sean coherentes con el tipo de relación (ej. para composición el lado del "todo" suele ser 1).
`;

    try {
      console.log('[AiAssistant] 🧠 Enviando a LLM:', userMessage.substring(0, 100));

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 6000,
        response_format: { type: 'json_object' }
      });

      const rawResponse = completion.choices?.[0]?.message?.content ?? '';
      console.log('[AiAssistant] 🤖 Respuesta LLM:', rawResponse.substring(0, 300));

      // Parsear respuesta JSON
      const parsed = this.parseAIResponse(rawResponse);

      if (parsed) {
        return this.normalizeAssistantResponse(parsed, context);
      }

      return { message: rawResponse || 'No pude procesar la solicitud.' };

    } catch (error) {
      console.error('[AiAssistant] ❌ Error LLM:', error);
      return this.handleUserMessage(userMessage, context, this.analyzeDiagramState(context));
    }
  }

  // Describe el diagrama para el LLM
  private describeDiagramForAI(context: DiagramContext): string {
    if (context.nodes.length === 0) {
      return '📭 El diagrama está VACÍO. No hay clases todavía.';
    }

    let desc = `📊 ${context.nodes.length} clases, ${context.edges.length} relaciones\n\n`;

    desc += '📦 CLASES:\n';
    for (const node of context.nodes) {
      desc += `\n• ${node.name}\n`;
      desc += `  Atributos: ${node.attributes?.length > 0 ? node.attributes.join(', ') : '(vacío)'}\n`;
      desc += `  Métodos: ${node.methods?.length > 0 ? node.methods.join(', ') : '(vacío)'}\n`;
    }

    if (context.edges.length > 0) {
      desc += '\n🔗 RELACIONES:\n';
      for (const edge of context.edges) {
        const src = context.nodes.find(n => n.id === edge.source)?.name || '?';
        const tgt = context.nodes.find(n => n.id === edge.target)?.name || '?';
        desc += `• ${src} --[${edge.type}]--> ${tgt}\n`;
      }
    }

    return desc;
  }

  // Historial reciente para contexto
  private getRecentHistory(sessionId: string): string {
    const history = this.conversationHistory.get(sessionId) || [];
    if (history.length === 0) return 'Primera interacción.';

    return history.slice(-4).map(m => {
      const role = m.role === 'user' ? '👤' : '🤖';
      const text = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
      return `${role}: ${text}`;
    }).join('\n');
  }

  // Parsear respuesta JSON del LLM
  private parseAIResponse(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { return null; }
      }
      return null;
    }
  }

  // Normalizar respuesta al formato AssistantResponse
  private normalizeAssistantResponse(parsed: any, context?: DiagramContext): AssistantResponse {
    const response: AssistantResponse = {
      message: parsed.message || 'Listo.'
    };

    // ✅ FILTRAR clases que YA EXISTEN
    if (parsed.suggestions?.classes?.length > 0 && context) {
      const filteredClasses = parsed.suggestions.classes.filter((c: any) => {
        const classAlreadyExists = this.classExists(c.name, context);
        if (classAlreadyExists) {
          console.log(`[normalizeAssistantResponse] 🚫 Filtrando clase existente: ${c.name}`);
          return false;
        }
        return true;
      });

      if (filteredClasses.length > 0) {
        response.suggestions = response.suggestions || {};
        response.suggestions.classes = filteredClasses.map((c: any) => ({
          name: c.name || 'Clase',
          attributes: Array.isArray(c.attributes) ? c.attributes : [],
          methods: Array.isArray(c.methods) ? c.methods : []
        }));
      }
    } else if (parsed.suggestions?.classes?.length > 0) {
      // Si no hay contexto, confiar en que el LLM no duplicó
      response.suggestions = response.suggestions || {};
      response.suggestions.classes = parsed.suggestions.classes.map((c: any) => ({
        name: c.name || 'Clase',
        attributes: Array.isArray(c.attributes) ? c.attributes : [],
        methods: Array.isArray(c.methods) ? c.methods : []
      }));
    }

    // ✅ FILTRAR relaciones que YA EXISTEN
    if (parsed.suggestions?.relations?.length > 0 && context) {
      response.suggestions = response.suggestions || {};
      // Filtrar relaciones que YA EXISTEN
      const filteredRelations = parsed.suggestions.relations.filter((r: any) => {
        const relationExists = this.relationshipExists(r.from, r.to, context);
        if (relationExists) {
          console.log(`[normalizeAssistantResponse] 🚫 Filtrando relación existente: ${r.from} → ${r.to}`);
          return false;
        }
        return true;
      });

      if (filteredRelations.length > 0) {
        response.suggestions.relations = filteredRelations.map((r: any) => ({
          from: r.from,
          to: r.to,
          type: r.type || 'assoc',
          multiplicity: r.multiplicity
        }));
      }
    } else if (parsed.suggestions?.relations?.length > 0) {
      // Si no hay contexto, confiar en que el LLM no duplicó
      response.suggestions = response.suggestions || {};
      response.suggestions.relations = parsed.suggestions.relations.map((r: any) => ({
        from: r.from,
        to: r.to,
        type: r.type || 'assoc',
        multiplicity: r.multiplicity
      }));
    }

    if (Array.isArray(parsed.tips)) response.tips = parsed.tips;
    if (Array.isArray(parsed.nextSteps)) response.nextSteps = parsed.nextSteps;

    return response;
  }

  /**
   * Maneja el mensaje del usuario basándose en la intención detectada por IA
   */
  private async handleIntentBasedMessage(
    message: string,
    context: DiagramContext,
    analysis: ReturnType<AiAssistantService['analyzeDiagramState']>,
    intent: IntentAnalysis,
    sessionId: string
  ): Promise<AssistantResponse> {

    // ================== DOCTOR DE DISEÑO ==================
    if (intent.intent === 'review_design') {
      const review = await this.reviewDesign(context);

      let issuesText = '';
      for (const issue of review.issues) {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '💡';
        const priority = issue.priority === 'high' ? '🔴' : issue.priority === 'medium' ? '🟡' : '🟢';
        issuesText += `\n${icon} ${priority} **${issue.message}**\n`;
        issuesText += `   → Afecta: ${issue.affectedElements.join(', ')}\n`;
        if (issue.suggestion) {
          issuesText += `   → Sugerencia: ${issue.suggestion}\n`;
        }
      }

      return {
        message: `🩺 **Doctor de Diseño UML**\n\n${review.summary}\n${issuesText}\n📋 **Recomendaciones:**\n${review.recommendations.map(r => '• ' + r).join('\n')}`,
        tips: [
          `📊 Puntuación: ${review.score}/100`,
          '🔧 Resuelve los problemas de alta prioridad primero',
          '💡 Pregúntame si necesitas ayuda con algún problema específico'
        ],
        contextualHelp: [
          {
            action: 'fix_issues',
            description: 'Corregir problemas detectados',
            shortcut: 'Te ayudo a resolver los problemas uno por uno',
            priority: 'high' as const
          }
        ]
      };
    }

    // ================== CREAR CLASE ==================
    if (intent.intent === 'create_class' && intent.entities.className) {
      const className = intent.entities.className;
      const attrs = intent.entities.attributes || ['id: Long', 'nombre: String'];
      const methods = intent.entities.methods || [`get${className}()`, `set${className}()`, 'save()', 'delete()'];

      // Sugerencias proactivas de relaciones (3B)
      const relationSuggestions = this.suggestRelationsForNewClass(className, attrs, context);

      let relationMessage = '';
      const suggestedRelations: Array<{ from: string; to: string; type: string; multiplicity?: { source?: string; target?: string } }> = [];

      if (relationSuggestions.length > 0) {
        relationMessage = '\n\n🔗 **Sugerencias de relaciones:**\n';
        for (const rel of relationSuggestions) {
          relationMessage += `• ${rel.explanation}\n`;
          suggestedRelations.push({
            from: rel.from,
            to: rel.to,
            type: rel.type,
            multiplicity: rel.multiplicity
          });
        }
      }

      return {
        message: `✨ **Creando clase ${className}**\n\nLa clase se creará con:\n• **${attrs.length}** atributos\n• **${methods.length}** métodos${relationMessage}`,
        suggestions: {
          classes: [{
            name: className,
            attributes: attrs,
            methods: methods
          }],
          relations: suggestedRelations.length > 0 ? suggestedRelations : undefined
        },
        tips: [
          '✏️ Puedes editar la clase después de crearla',
          '🔗 Usa los botones de relación sugeridos para conectarla'
        ],
        nextSteps: [
          '1. Haz clic en "Agregar" para crear la clase',
          '2. Revisa las relaciones sugeridas',
          '3. Personaliza atributos si es necesario'
        ]
      };
    }

    // ================== EDITAR CLASE ==================
    if (intent.intent === 'edit_class') {
      let targetClassName = intent.entities.className;

      // Si no se especificó clase, usar la última mencionada
      if (!targetClassName) {
        const convContext = this.getConversationContext(sessionId);
        targetClassName = convContext.lastMentionedClass;
      }

      if (!targetClassName) {
        return {
          message: '❓ No encontré la clase a editar. ¿Cuál clase quieres modificar?\n\n**Clases disponibles:**\n' +
                   context.nodes.map(n => `• ${n.name}`).join('\n'),
          tips: ['Especifica el nombre de la clase, ej: "agrega email a Usuario"']
        };
      }

      const targetNode = context.nodes.find(n =>
        this.normalize(n.name) === this.normalize(targetClassName)
      );

      if (!targetNode) {
        return {
          message: `❌ No encontré la clase "${targetClassName}" en el diagrama.\n\n**Clases disponibles:**\n${context.nodes.map(n => `• ${n.name}`).join('\n')}`,
          tips: ['Verifica el nombre exacto de la clase']
        };
      }

      const newAttrs = intent.entities.attributes || [];
      const newMethods = intent.entities.methods || [];

      // Combinar con existentes sin duplicar
      const currentAttrs = targetNode.attributes || [];
      const currentMethods = targetNode.methods || [];

      const existingAttrNames = new Set(currentAttrs.map(a => a.split(':')[0].trim().toLowerCase()));
      const filteredNewAttrs = newAttrs.filter(a => !existingAttrNames.has(a.split(':')[0].trim().toLowerCase()));

      const existingMethodNames = new Set(currentMethods.map(m => m.split('(')[0].trim().toLowerCase()));
      const filteredNewMethods = newMethods.filter(m => !existingMethodNames.has(m.split('(')[0].trim().toLowerCase()));

      if (filteredNewAttrs.length === 0 && filteredNewMethods.length === 0) {
        return {
          message: `⚠️ Los elementos que intentas agregar ya existen en "${targetClassName}".\n\n**Atributos actuales:**\n${currentAttrs.join('\n') || '(ninguno)'}\n\n**Métodos actuales:**\n${currentMethods.join('\n') || '(ninguno)'}`,
          tips: ['Intenta con nombres diferentes']
        };
      }

      const allAttrs = [...currentAttrs, ...filteredNewAttrs];
      const allMethods = [...currentMethods, ...filteredNewMethods];

      return {
        message: `✏️ **Actualizando clase "${targetClassName}":**\n\n` +
                 (filteredNewAttrs.length > 0 ? `➕ Atributos nuevos: ${filteredNewAttrs.join(', ')}\n` : '') +
                 (filteredNewMethods.length > 0 ? `➕ Métodos nuevos: ${filteredNewMethods.join(', ')}\n` : ''),
        suggestions: {
          classes: [{
            name: targetClassName,
            attributes: allAttrs,
            methods: allMethods
          }]
        },
        tips: [`🔧 nodeId=${targetNode.id}`]
      };
    }

    // ================== CREAR RELACIÓN ==================
    if (intent.intent === 'create_relation') {
      const from = intent.entities.className;
      const to = intent.entities.targetClassName;
      const type = intent.entities.relationType || 'assoc';

      if (!from || !to) {
        return {
          message: '❓ No pude identificar las clases para la relación.\n\n**Usa un formato como:**\n• "Conecta Usuario con Pedido"\n• "Crea herencia de Empleado a Persona"\n• "Estudiante tiene muchos Cursos"',
          tips: ['Menciona ambas clases claramente']
        };
      }

      // Verificar si existe relación N:M y sugerir clase intermedia (2A)
      if (intent.requiresIntermediateClass) {
        const suggestedIntermediate = intent.suggestedIntermediateClass || this.suggestIntermediateClassName(from, to);
        const nToMResult = {
          isNtoM: true,
          intermediateClass: {
            name: suggestedIntermediate,
            attributes: this.suggestIntermediateAttributes(from, to, suggestedIntermediate),
            methods: ['registrar()', 'cancelar()', 'obtenerDetalles()']
          }
        };

        return {
          message: `🔗 **Relación muchos-a-muchos detectada**\n\n` +
                   `${from} ↔ ${to}\n\n` +
                   `💡 **Sugerencia:** Crear clase intermedia **"${nToMResult.intermediateClass.name}"**\n\n` +
                   `Esta clase permitirá almacenar información adicional de la relación.`,
          suggestions: {
            classes: [nToMResult.intermediateClass],
            relations: [
              { from: from, to: nToMResult.intermediateClass.name, type: 'assoc', multiplicity: { source: '1', target: '*' } },
              { from: nToMResult.intermediateClass.name, to: to, type: 'assoc', multiplicity: { source: '*', target: '1' } }
            ]
          },
          tips: [
            '📊 Las relaciones N:M suelen necesitar clases intermedias',
            '💾 La clase intermedia puede guardar datos como fecha, estado, cantidad, etc.'
          ],
          nextSteps: [
            `1. Crea la clase "${nToMResult.intermediateClass.name}"`,
            '2. Conecta las tres clases con asociaciones',
            '3. Agrega atributos específicos a la clase intermedia'
          ]
        };
      }

      // Relación normal
      const relationNames: Record<string, string> = {
        'assoc': 'Asociación',
        'inherit': 'Herencia',
        'comp': 'Composición',
        'aggr': 'Agregación',
        'dep': 'Dependencia',
        'many-to-many': 'Muchos a Muchos'
      };

      return {
        message: `🔗 **Creando ${relationNames[type] || 'Asociación'}:**\n\n📍 ${from} → ${to}`,
        suggestions: {
          relations: [{
            from,
            to,
            type
          }]
        },
        tips: ['✅ La relación se aplicará automáticamente']
      };
    }

    // ================== GENERAR SISTEMA ==================
    if (intent.intent === 'generate_system' && intent.entities.systemDomain) {
      // Usar el método existente de detección de dominios
      const domainResponse = this.detectDomainAndSuggest(this.normalize(message), message);
      if (domainResponse) {
        return domainResponse;
      }
    }

    // ================== FALLBACK: usar el handler original mejorado ==================
    return this.handleUserMessage(message, context, analysis);
  }

  // -------------------- ANALISIS DEL DIAGRAMA --------------------
  private analyzeDiagramState(context: DiagramContext) {
    const { nodes, edges } = context;

    const hasClasses = nodes.length > 0;
    const hasRelations = edges.length > 0;

    // nodos sin relación (comparando por ID)
    const unconnected = nodes.filter(
      (n) => !edges.some((e) => e.source === n.id || e.target === n.id),
    );

    // clases “vacías”
    const empty = nodes.filter(
      (n) =>
        (n.attributes?.length ?? 0) === 0 && (n.methods?.length ?? 0) === 0,
    );

    const needsMoreDetail = nodes.some((n) => {
      const a = n.attributes ?? [];
      const m = n.methods ?? [];
      return a.length < 2 && m.length < 1;
    });

    const relTypes = new Set(edges.map((e) => e.type));
    const flags = {
      hasInheritance: relTypes.has('inherit'),
      hasAssociations: relTypes.has('assoc') || relTypes.has('nav'),
      hasAggregation: relTypes.has('aggr'),
      hasComposition: relTypes.has('comp'),
      hasDependency: relTypes.has('dep'),
      hasManyToMany: relTypes.has('many-to-many'),
    };

    const isWellStructured =
      nodes.length >= 3 && edges.length >= 2 && !empty.length;

    return {
      hasClasses,
      classCount: nodes.length,
      hasRelations,
      relationCount: edges.length,
      hasEmptyClasses: empty.length > 0,
      hasUnconnectedClasses: unconnected.length > 0,
      needsMoreDetail,
      isWellStructured,
      classNames: nodes.map((n) => n.name || 'Unnamed').filter(Boolean),
      ...flags,
    };
  }

  // -------------------- RESPUESTAS PROACTIVAS --------------------
  private async generateProactiveGuidance(
    context: DiagramContext,
    analysis: ReturnType<AiAssistantService['analyzeDiagramState']>,
  ): Promise<AssistantResponse> {
    if (!analysis.hasClasses) {
      return {
        message: '¡Hola! 👋 Tu diagrama está vacío. Te ayudo a empezar.',
        contextualHelp: [
          {
            action: 'create_first_class',
            description: 'Crear tu primera clase',
            shortcut: "Activa la herramienta 'Clase' y haz clic en el lienzo",
            priority: 'high',
          },
          {
            action: 'describe_system',
            description: 'Describir tu sistema para generar clases',
            shortcut: "Ej: 'Quiero un sistema de biblioteca'",
            priority: 'high',
          },
        ],
        tips: [
          '💡 Comienza con 2–3 entidades principales',
          '🎯 Piensa en sustantivos relevantes (Usuario, Producto, Pedido)',
        ],
        nextSteps: [
          '1) Crea 2–3 clases base',
          '2) Agrega atributos',
          '3) Define relaciones',
        ],
      };
    }

    if (analysis.classCount < 3) {
      return {
        message: `Tienes ${analysis.classCount} clase(s). Suele ayudar agregar 1–2 más.`,
        contextualHelp: [
          {
            action: 'create_first_class',
            description: 'Agregar otra clase',
            shortcut: "Herramienta 'Clase' en el sidebar",
            priority: 'high',
          },
        ],
        tips: ['🏗️ Un diagrama típico tiene 4–8 clases principales.'],
      };
    }

    if (analysis.hasEmptyClasses || analysis.needsMoreDetail) {
      return {
        message:
          'Veo clases con poco detalle. Completemos atributos y métodos.',
        contextualHelp: [
          {
            action: 'edit_class',
            description: 'Editar clase para agregar contenido',
            shortcut: "Clic derecho → 'Editar clase'",
            priority: 'high',
          },
        ],
        tips: [
          '📋 Añade al menos 2 atributos por clase',
          '⚙️ Incluye 1–2 métodos clave por clase',
        ],
      };
    }

    if (!analysis.hasRelations && analysis.classCount >= 2) {
      return {
        message: 'Tienes clases pero sin relaciones. ¡Conectémoslas!',
        contextualHelp: [
          {
            action: 'create_association',
            description: 'Crear asociación (relación simple)',
            shortcut: "Herramienta 'Asociación' en el sidebar",
            priority: 'high',
          },
          {
            action: 'create_inheritance',
            description: 'Crear herencia',
            shortcut: 'Clase hija → clase padre',
            priority: 'medium',
          },
          {
            action: 'create_composition',
            description: 'Crear composición',
            shortcut: 'Contenedor → contenido',
            priority: 'medium',
          },
        ],
        tips: ['🔗 Las relaciones muestran la interacción entre tus clases.'],
      };
    }

    if (analysis.isWellStructured) {
      return {
        message: '¡Excelente! Tu diagrama se ve completo. 🎉',
        contextualHelp: [
          {
            action: 'generate_code',
            description: 'Generar proyecto Spring Boot',
            shortcut: "Botón 'Generar Código' en el sidebar",
            priority: 'high',
          },
        ],
        tips: [
          '✨ Considera agregar cardinalidades visibles (*, 1..*, etc.)',
          '🚀 Ya puedes generar el backend',
        ],
      };
    }

    return {
      message: '¿En qué te ayudo con tu diagrama?',
      contextualHelp: [
        {
          action: 'ask_question',
          description: 'Hacer una pregunta específica',
          shortcut: 'Escribe tu duda en el chat',
          priority: 'medium',
        },
      ],
    };
  }

  // -------------------- MENSAJES DEL USUARIO --------------------
  private normalize(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  private parseCreateClassCommand(msg: string) {
    // patrones básicos: "crea una clase Usuario", "crear clase Producto con atributos nombre:String, precio:Decimal"
    // muy flexible y tolerante
    const nameMatch =
      msg.match(/clase\s+([a-z0-9_][\w-]*)/i) ||
      msg.match(/crea[r]?\s+([a-z0-9_][\w-]*)/i);

    if (!nameMatch) return null;

    const className =
      nameMatch[1].replace(/[^A-Za-z0-9_]/g, '').replace(/^[^A-Za-z_]/, 'C') || // asegurar inicio válido
      'Clase';

    // atributos después de "con" o "atributos"
    const attrsMatch =
      msg.match(/atributos?\s*[:\-]\s*([^.;\n]+)/i) ||
      msg.match(/con\s+([^.;\n]+)/i);

    const rawAttrs = attrsMatch?.[1] ?? '';
    // separar por coma y mapear a "nombre: Tipo" (fallback String)
    const attributes = rawAttrs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p, i) => {
        // soportar "nombre: Tipo" | "Tipo nombre" | "nombre"
        const colon = p.indexOf(':');
        if (colon !== -1) {
          const n =
            p.slice(0, colon).trim().replace(/\s+/g, '_') || `campo_${i + 1}`;
          const t = p.slice(colon + 1).trim() || 'String';
          return `${this.safeId(n)}: ${t}`;
        }
        const parts = p.split(/\s+/);
        if (parts.length === 2) {
          const [a, b] = parts;
          if (/^[A-Z]/.test(a)) return `${this.safeId(b)}: ${a}`;
          if (/^[A-Z]/.test(b)) return `${this.safeId(a)}: ${b}`;
        }
        return `${this.safeId(p)}: String`;
      });

    return {
      className,
      attributes,
      methods: [] as string[],
    };
  }

  private safeId(s: string) {
    let x = (s || 'campo').replace(/[^\p{L}\p{N}_$]/gu, '_');
    if (/^\d/.test(x)) x = '_' + x;
    return x;
  }

  private parseEditClassCommand(msg: string, context: DiagramContext) {
    // Patrones: "agrega atributo id a clase Usuario", "añade nombre:String y edad:Integer a la tabla Persona"
    // "agrega método calcular() a clase Producto"

    console.log('[parseEditClassCommand] Mensaje original:', msg);

    const normalizedMsg = this.normalize(msg);

    // Detectar si es agregar atributo o método
    const isAttribute =
      normalizedMsg.includes('atributo') || normalizedMsg.includes('atributos');
    const isMethod =
      normalizedMsg.includes('metodo') || normalizedMsg.includes('metodos');

    console.log('[parseEditClassCommand] Detección:', {
      isAttribute,
      isMethod,
      normalizedMsg,
    });

    if (!isAttribute && !isMethod) return null;

    // Extraer nombre de la clase objetivo: "a clase X", "en clase X", "de la tabla X", etc.
    const classMatch = msg.match(
      /(?:(?:a|en|de|para)\s+(?:la\s+)?(?:clase|tabla)\s+)([a-z0-9_][\w-]*)/i,
    );

    if (!classMatch) return null;

    const targetClassName = classMatch[1].trim();

    // Buscar el nodo en el contexto
    const targetNode = context.nodes.find(
      (n) => this.normalize(n.name) === this.normalize(targetClassName),
    );

    if (!targetNode) {
      return {
        error: `No encontré la clase "${targetClassName}" en el diagrama. Clases disponibles: ${context.nodes.map((n) => n.name).join(', ')}`,
        targetClassName,
      };
    }

    // Extraer atributos/métodos a agregar
    let newAttributes: string[] = [];
    let newMethods: string[] = [];

    if (isAttribute) {
      // Extraer desde "agrega" hasta " a/en/de/para clase/tabla" (más flexible)
      // El regex ahora excluye mejor los artículos y la palabra "atributo(s)"
      const attrText = msg.match(
        /(?:agrega|añade|anade)\s+(?:(?:el|la|los|las|un|una)\s+)?(?:atributo?\s+)?(.+?)(?:\s+(?:a|en|de|para)\s+(?:la\s+)?(?:clase|tabla))/i,
      );

      console.log('[parseEditClassCommand] Regex match resultado:', attrText);

      if (attrText?.[1]) {
        const rawAttrs = attrText[1].trim();

        console.log('[parseEditClassCommand] Raw attributes:', rawAttrs);

        // Separar por comas o 'y'
        const attrParts = rawAttrs.split(/\s*(?:,|y)\s*/i).filter(Boolean);

        console.log('[parseEditClassCommand] Attribute parts:', attrParts);

        newAttributes = attrParts.map((p, i) => {
          p = p.trim();

          // 🧹 LIMPIAR palabras comunes que no son parte del atributo (segunda capa de limpieza)
          // Remover artículos y palabras de relleno que puedan haber quedado
          p = p.replace(
            /^(?:el|la|los|las|un|una|unos|unas|atributo|atributos)\s+/gi,
            '',
          );
          p = p.trim();

          console.log(`[parseEditClassCommand] Atributo limpio [${i}]:`, p);

          // Soportar "id:Integer", "nombre: String", "Integer id", "id"
          const colonMatch = p.match(/^(\w+)\s*:\s*(\w+)$/);
          if (colonMatch) {
            return `${this.safeId(colonMatch[1])}: ${colonMatch[2]}`;
          }

          const spaceMatch = p.match(/^([A-Z]\w+)\s+(\w+)$/);
          if (spaceMatch) {
            return `${this.safeId(spaceMatch[2])}: ${spaceMatch[1]}`;
          }

          // Solo nombre → String por defecto
          return `${this.safeId(p)}: String`;
        });
      }
    }

    if (isMethod) {
      // Extraer desde "agrega" hasta " a/en/de/para clase/tabla" (más flexible)
      // El regex ahora excluye mejor los artículos y la palabra "método(s)"
      const methodText = msg.match(
        /(?:agrega|añade|anade)\s+(?:(?:el|la|los|las|un|una)\s+)?(?:metodos?\s+)?(.+?)(?:\s+(?:a|en|de|para)\s+(?:la\s+)?(?:clase|tabla))/i,
      );

      if (methodText?.[1]) {
        const rawMethods = methodText[1].trim();
        const methodParts = rawMethods.split(/\s*(?:,|y)\s*/i).filter(Boolean);

        newMethods = methodParts.map((m) => {
          m = m.trim();

          // 🧹 LIMPIAR palabras comunes que no son parte del método
          m = m.replace(
            /^(?:el|la|los|las|un|una|unos|unas|metodo|metodos|método|métodos)\s+/gi,
            '',
          );
          m = m.trim();

          console.log('[parseEditClassCommand] Método limpio:', m);

          // Asegurar que tenga paréntesis
          if (!m.includes('(')) {
            m = `${m}()`;
          }
          return m;
        });
      }
    }

    console.log('[parseEditClassCommand] Resultado final:', {
      targetClassName: targetNode.name,
      newAttributes,
      newMethods,
      currentAttributes: targetNode.attributes || [],
      currentMethods: targetNode.methods || [],
    });

    return {
      targetNodeId: targetNode.id,
      targetClassName: targetNode.name,
      newAttributes,
      newMethods,
      currentAttributes: targetNode.attributes || [],
      currentMethods: targetNode.methods || [],
    };
  }

  private parseAddRelationCommand(msg: string, context: DiagramContext) {
    // Patrones: "crea una relación de agregación de alumno a docente"
    // "añade una asociación entre Usuario y Producto"
    // "agrega herencia de Estudiante hacia Persona"

    console.log('[parseAddRelationCommand] Mensaje original:', msg);

    const normalizedMsg = this.normalize(msg);

    // Detectar tipo de relación
    let relationType: string | null = null;
    const relationMap = {
      asociacion: 'assoc',
      herencia: 'inherit',
      generalizacion: 'inherit',
      composicion: 'comp',
      agregacion: 'aggr',
      dependencia: 'dep',
      'muchos a muchos': 'many-to-many',
      'muchos-a-muchos': 'many-to-many',
    };

    for (const [key, value] of Object.entries(relationMap)) {
      if (normalizedMsg.includes(key)) {
        relationType = value;
        break;
      }
    }

    if (!relationType) {
      // Si no especifica tipo, asumir asociación por defecto
      relationType = 'assoc';
    }

    console.log('[parseAddRelationCommand] Tipo de relación:', relationType);

    // Extraer clases origen y destino
    // Patrones: "de X a Y", "de X hacia Y", "entre X y Y", "desde X hasta Y"
    let sourceClassName: string | null = null;
    let targetClassName: string | null = null;

    // Patrón 1: "de X a/hacia Y"
    const pattern1 = msg.match(
      /(?:de|desde)\s+(?:la\s+)?(?:clase|tabla)?\s*([a-z0-9_][\w-]*)\s+(?:a|hacia|hasta)\s+(?:la\s+)?(?:clase|tabla)?\s*([a-z0-9_][\w-]*)/i,
    );

    if (pattern1) {
      sourceClassName = pattern1[1].trim();
      targetClassName = pattern1[2].trim();
    }

    // Patrón 2: "entre X y Y"
    if (!sourceClassName || !targetClassName) {
      const pattern2 = msg.match(
        /(?:entre)\s+(?:la\s+)?(?:clase|tabla)?\s*([a-z0-9_][\w-]*)\s+y\s+(?:la\s+)?(?:clase|tabla)?\s*([a-z0-9_][\w-]*)/i,
      );

      if (pattern2) {
        sourceClassName = pattern2[1].trim();
        targetClassName = pattern2[2].trim();
      }
    }

    console.log('[parseAddRelationCommand] Clases detectadas:', {
      sourceClassName,
      targetClassName,
    });

    // Normalizar variantes de multiplicidad que usuarios o OCR pueden escribir
    // Ejemplos: '1...m', '1...N', '1..n' -> '1..*' ; '0...n' -> '0..*'
    let msgNormalized = msg.replace(/…/g, '...');
    msgNormalized = msgNormalized.replace(/\b1\.{2,}\s*[mMnN]\b/g, '1..*');
    msgNormalized = msgNormalized.replace(/\b0\.{2,}\s*[mMnN]\b/g, '0..*');
    msgNormalized = msgNormalized.replace(/\.{3,}/g, '..');
    msgNormalized = msgNormalized.replace(/\b1\.{2,}\s*\*\b/g, '1..*');
    msgNormalized = msgNormalized.replace(/\b0\.{2,}\s*\*\b/g, '0..*');

    if (!sourceClassName || !targetClassName) {
      return {
        error:
          'No pude identificar las clases para la relación. Usa el formato: "crea una [tipo] de [ClaseOrigen] a [ClaseDestino]"',
      };
    }

    // --- Detectar multiplicidades explícitas cerca de los nombres de clase ---

    let sourceMultiplicity: string | undefined = undefined;
    let targetMultiplicity: string | undefined = undefined;

    try {
      const srcRegex = new RegExp(
        sourceClassName +
          '\\\\s*\\(?\\s*(' +
          '1\\.\\.\\*|1\\.\\.1|0\\.\\.1|0\\.\\.\\*|\\*' +
          ')\\s*\\)?',
        'i',
      );
      const tgtRegex = new RegExp(
        targetClassName +
          '\\\\s*\\(?\\s*(' +
          '1\\.\\.\\*|1\\.\\.1|0\\.\\.1|0\\.\\.\\*|\\*' +
          ')\\s*\\)?',
        'i',
      );
      const srcMatch = msgNormalized.match(srcRegex);
      const tgtMatch = msgNormalized.match(tgtRegex);
      if (srcMatch && srcMatch[1]) sourceMultiplicity = srcMatch[1];
      if (tgtMatch && tgtMatch[1]) targetMultiplicity = tgtMatch[1];
    } catch (e) {
      // ignore regex errors
    }

    // Soporte frases comunes en español: "uno a muchos", "uno a uno", "cero o uno", "cero a muchos"
    const normalized = this.normalize(msg);
    if (!sourceMultiplicity && !targetMultiplicity) {
      if (
        normalized.includes('uno a muchos') ||
        normalized.includes('uno a muchos')
      ) {
        sourceMultiplicity = '1..1';
        targetMultiplicity = '1..*';
      } else if (
        normalized.includes('uno a uno') ||
        normalized.includes('uno a uno')
      ) {
        sourceMultiplicity = '1..1';
        targetMultiplicity = '1..1';
      } else if (
        normalized.includes('cero o uno') ||
        normalized.includes('cero o uno')
      ) {
        sourceMultiplicity = '0..1';
        targetMultiplicity = '0..1';
      } else if (
        normalized.includes('cero a muchos') ||
        normalized.includes('cero a muchos')
      ) {
        sourceMultiplicity = '0..1';
        targetMultiplicity = '0..*';
      }
    }
    // Buscar las clases en el contexto
    const sourceNode = context.nodes.find(
      (n) => this.normalize(n.name) === this.normalize(sourceClassName),
    );

    const targetNode = context.nodes.find(
      (n) => this.normalize(n.name) === this.normalize(targetClassName),
    );

    if (!sourceNode) {
      return {
        error: `No encontré la clase origen "${sourceClassName}". Clases disponibles: ${context.nodes.map((n) => n.name).join(', ')}`,
      };
    }

    if (!targetNode) {
      return {
        error: `No encontré la clase destino "${targetClassName}". Clases disponibles: ${context.nodes.map((n) => n.name).join(', ')}`,
      };
    }

    console.log('[parseAddRelationCommand] Resultado final:', {
      from: sourceNode.name,
      to: targetNode.name,
      type: relationType,
    });

    return {
      from: sourceNode.name,
      to: targetNode.name,
      type: relationType,
      multiplicity:
        sourceMultiplicity || targetMultiplicity
          ? {
              source: sourceMultiplicity,
              target: targetMultiplicity,
            }
          : undefined,
      sourceNode,
      targetNode,
    };
  }

  private async handleUserMessage(
    message: string,
    context: DiagramContext,
    analysis: ReturnType<AiAssistantService['analyzeDiagramState']>,
  ): Promise<AssistantResponse> {
    const normalized = this.normalize(message);

    // 🔍 DEBUG: Log para verificar contexto
    console.log('[AI Assistant] Contexto recibido:', {
      classCount: context.nodes.length,
      edgeCount: context.edges.length,
      classes: context.nodes.map((n) => n.name),
    });

    const TUTORIAL_CONTEXT = {
      appName: 'Diagramador UML UAGRM',
      interface: {
        sidebar: 'Panel izquierdo con herramientas',
        canvas: 'Área principal de trabajo (lienzo blanco)',
        tools: [
          'Clase',
          'Asociación',
          'Herencia',
          'Composición',
          'Agregación',
          'Dependencia',
          'Muchos a Muchos',
        ],
        shortcuts: {
          crear_clase:
            "1. Clic en 'Clase' en el sidebar → 2. Clic en el canvas donde quieras crearla",
          drag_clase: "Arrastra el ícono 'Clase' desde el sidebar al canvas",
          editar_clase:
            "Doble clic en la clase OR clic derecho → 'Editar clase'",
          crear_relacion:
            '1. Clic en tipo de relación (sidebar) → 2. Clic en clase origen → 3. Clic en clase destino',
          generar_codigo: "Botón 'Generar Código Spring Boot' en el sidebar",
          exportar: 'Botones de exportar en la barra superior',
        },
      },
    };

    // ✅ PREGUNTAS SOBRE TU SOFTWARE ESPECÍFICO
    if (normalized.includes('como') || normalized.includes('cómo')) {
      // ✅ CREAR CLASES
      if (
        normalized.includes('clase') &&
        (normalized.includes('creo') || normalized.includes('crear'))
      ) {
        return {
          message: `🏗️ **Para crear una clase en ${TUTORIAL_CONTEXT.appName}:**\n\n**Método 1 - Clic directo:**\n1. 🎯 Ve al **sidebar izquierdo**\n2. 🖱️ Haz **clic en "Clase"** (se activará la herramienta)\n3. ✨ Haz **clic en el canvas** donde quieras crear la clase\n\n**Método 2 - Arrastrar:**\n1. 🚀 **Arrastra** el ícono "Clase" desde el sidebar\n2. 🎯 **Suelta** en el canvas donde la quieras\n\n**Después de crear:**\n• **Doble clic** en la clase para editarla\n• **Clic derecho** → "Editar clase" para agregar atributos y métodos`,
          contextualHelp: [
            {
              action: 'create_first_class',
              description: 'Activar herramienta Clase',
              shortcut: 'Clic en "Clase" en el sidebar izquierdo',
              priority: 'high',
            },
            {
              action: 'edit_class',
              description: 'Editar clase después de crearla',
              shortcut: 'Doble clic en la clase OR clic derecho → "Editar"',
              priority: 'high',
            },
          ],
          tips: [
            '🎯 El sidebar izquierdo tiene todas las herramientas',
            '✏️ Siempre puedes editar una clase después de crearla',
            '🔄 Usa Ctrl+Z para deshacer si te equivocas',
          ],
          nextSteps: [
            '1. Crea tu primera clase siguiendo los pasos',
            '2. Edítala para agregar atributos (nombre: String, id: Long)',
            '3. Agrega métodos (getter(), setter())',
            '4. Crea una segunda clase para conectarlas',
          ],
        };
      }

      // ✅ AGREGAR ATRIBUTOS
      if (
        normalized.includes('atributo') &&
        (normalized.includes('agregar') ||
          normalized.includes('añadir') ||
          normalized.includes('agrego'))
      ) {
        return {
          message: `📝 **Para agregar atributos a una clase:**\n\n**Paso a paso:**\n1. 🖱️ **Doble clic** en la clase que quieres editar\n2. 📋 Se abre el **editor de clase**\n3. ✍️ En la sección **"Atributos"**, escribe cada atributo en una línea:\n   • \`nombre: String\`\n   • \`edad: Integer\`\n   • \`email: String\`\n   • \`activo: Boolean\`\n4. ✅ Haz clic en **"Guardar"**\n\n**Formato correcto:**\n\`nombreAtributo: TipoDato\`\n\n**Ejemplos:**\n• \`id: Long\`\n• \`fechaNacimiento: Date\`\n• \`precio: Double\``,
          contextualHelp: [
            {
              action: 'edit_class',
              description: 'Abrir editor de clase',
              shortcut: 'Doble clic en cualquier clase del canvas',
              priority: 'high',
            },
          ],
          tips: [
            '📝 Un atributo por línea en el formato: nombre: Tipo',
            '🔄 Los tipos comunes: String, Integer, Long, Double, Boolean, Date',
            '✨ Los cambios se ven inmediatamente en el diagrama',
          ],
        };
      }

      // ✅ CREAR RELACIONES
      if (
        normalized.includes('relacion') &&
        (normalized.includes('creo') ||
          normalized.includes('crear') ||
          normalized.includes('conectar'))
      ) {
        return {
          message: `🔗 **Para crear relaciones entre clases:**\n\n**Paso a paso:**\n1. 🎯 Ve al **sidebar izquierdo** → sección "Relaciones"\n2. 🖱️ **Selecciona el tipo** de relación que necesitas:\n   • **Asociación**: Relación general\n   • **Herencia**: "es un tipo de" (clase hija → padre)\n   • **Composición**: "contiene a" (rombo negro)\n   • **Agregación**: "tiene un" (rombo blanco)\n   • **Dependencia**: "usa a" (línea punteada)\n3. 🎯 Haz **clic en la clase origen**\n4. 🎯 Haz **clic en la clase destino**\n5. ✨ ¡La relación se crea automáticamente!\n\n**Editar relación:**\n• **Clic derecho** en la línea → "Editar relación"`,
          contextualHelp: [
            {
              action: 'create_association',
              description: 'Crear asociación simple',
              shortcut: 'Sidebar → "Asociación" → clic origen → clic destino',
              priority: 'high',
            },
            {
              action: 'create_inheritance',
              description: 'Crear herencia',
              shortcut: 'Sidebar → "Generalización" → clase hija → clase padre',
              priority: 'medium',
            },
          ],
          tips: [
            '🔗 Primero selecciona el tipo de relación, después las clases',
            '⚡ Asociación es la relación más común',
            '🏗️ Herencia: la flecha apunta al padre',
          ],
        };
      }

      // ✅ GENERAR CÓDIGO
      if (
        normalized.includes('codigo') ||
        normalized.includes('spring') ||
        normalized.includes('generar')
      ) {
        return {
          message: `🚀 **Para generar código Spring Boot:**\n\n**Requisitos:**\n✅ Tener al menos 2-3 clases creadas\n✅ Clases con atributos definidos\n✅ Relaciones entre clases (opcional pero recomendado)\n\n**Paso a paso:**\n1. 🏗️ Completa tu diagrama con clases y relaciones\n2. 📍 Ve al **sidebar izquierdo** → sección "Code Generation"\n3. 🖱️ Haz clic en **"Generar Código Spring Boot"**\n4. ⏳ Espera unos segundos...\n5. 📦 Se descarga un **archivo ZIP** con todo el proyecto\n6. 📂 Extrae el ZIP y ábrelo en tu IDE favorito\n7. ▶️ Ejecuta: \`mvn spring-boot:run\`\n\n**¡Tu API REST estará corriendo en http://localhost:8080!**`,
          contextualHelp: [
            {
              action: 'generate_code',
              description: 'Generar proyecto Spring Boot completo',
              shortcut: 'Sidebar → "Generar Código Spring Boot"',
              priority: 'high',
            },
          ],
          tips: [
            '🎯 Mientras más completo tu diagrama, mejor el código generado',
            '📊 Incluye entidades JPA, DTOs, controladores y servicios',
            '🗄️ Usa H2 Database (perfecto para pruebas)',
          ],
        };
      }

      // ✅ EDITAR CLASES
      if (normalized.includes('editar') || normalized.includes('modificar')) {
        return {
          message: `✏️ **Para editar una clase existente:**\n\n**Método 1 - Doble clic:**\n1. 🖱️ **Doble clic** en cualquier clase del canvas\n2. 📋 Se abre el **Editor de Clase**\n3. ✍️ Modifica lo que necesites\n4. ✅ Clic en **"Guardar"**\n\n**Método 2 - Menú contextual:**\n1. 🖱️ **Clic derecho** en la clase\n2. 📋 Selecciona **"Editar clase"**\n3. ✍️ Haz tus cambios\n4. ✅ Guarda\n\n**Puedes editar:**\n• 📝 **Nombre** de la clase\n• 📊 **Atributos** (agregar, quitar, modificar)\n• ⚙️ **Métodos** (agregar, quitar, modificar)`,
          contextualHelp: [
            {
              action: 'edit_class',
              description: 'Abrir editor de clase',
              shortcut: 'Doble clic en la clase',
              priority: 'high',
            },
          ],
          tips: [
            '🔄 Los cambios se reflejan inmediatamente en el diagrama',
            '📏 La clase se redimensiona automáticamente',
            '💾 Los cambios se guardan automáticamente',
          ],
        };
      }
    }

    // ✅ ANÁLISIS CONTEXTUALIZADO
    if (normalized.includes('analiza') && normalized.includes('diagrama')) {
      const tutorialAnalysis = this.getTutorialAnalysis(analysis);
      return {
        message: `📊 **Análisis de tu diagrama en ${TUTORIAL_CONTEXT.appName}:**\n\n${tutorialAnalysis.message}`,
        contextualHelp: tutorialAnalysis.contextualHelp,
        tips: tutorialAnalysis.tips,
        nextSteps: tutorialAnalysis.nextSteps,
      };
    }

    // ✅ AYUDA GENERAL CONTEXTUALIZADA
    if (
      normalized.includes('ayuda') ||
      normalized.includes('help') ||
      normalized.includes('tutorial')
    ) {
      return {
        message: `🎓 **Tutorial de ${TUTORIAL_CONTEXT.appName}:**\n\n**Interfaz principal:**\n• 📋 **Sidebar izquierdo**: Todas las herramientas (Clase, Relaciones, Generar Código)\n• 🎨 **Canvas blanco**: Área de trabajo donde creates tu diagrama\n• 🔧 **Barra superior**: Controles de zoom, exportar, importar\n\n**Flujo básico:**\n1. **Crear clases** → Sidebar → "Clase" → Clic en canvas\n2. **Editar clases** → Doble clic → Agregar atributos/métodos\n3. **Conectar clases** → Sidebar → Tipo relación → Origen → Destino\n4. **Generar código** → Sidebar → "Generar Código Spring Boot"`,
        contextualHelp: [
          {
            action: 'create_first_class',
            description: 'Empezar con tu primera clase',
            shortcut: 'Sidebar → "Clase" → Clic en canvas',
            priority: 'high',
          },
          {
            action: 'tutorial_mode',
            description: 'Ver tutorial interactivo',
            shortcut: 'Pregúntame: "¿Cómo creo una clase?"',
            priority: 'medium',
          },
        ],
        tips: [
          '🎯 Empieza creando 2-3 clases básicas',
          '📝 Agrega atributos a cada clase',
          '🔗 Conecta las clases con relaciones',
          '🚀 Genera tu código Spring Boot',
        ],
      };
    }

    // 🔍 PREGUNTAS SOBRE CLASES EXISTENTES
    if (
      (normalized.includes('que') ||
        normalized.includes('cuales') ||
        normalized.includes('cuántas')) &&
      (normalized.includes('clase') || normalized.includes('tabla'))
    ) {
      if (context.nodes.length === 0) {
        return {
          message:
            '❌ **No hay clases en el diagrama actualmente.**\n\n¿Quieres que te ayude a crear una?',
          contextualHelp: [
            {
              action: 'create_first_class',
              description: 'Crear tu primera clase',
              shortcut: 'Dime: "Crea una clase Usuario"',
              priority: 'high',
            },
          ],
          tips: [
            '💡 Empieza con clases básicas como Usuario, Producto, Pedido',
          ],
        };
      }

      const classList = context.nodes
        .map((n, i) => {
          const attrs = n.attributes || [];
          const methods = n.methods || [];
          return `**${i + 1}. ${n.name}**\n   • Atributos: ${attrs.length > 0 ? attrs.join(', ') : '(ninguno)'}\n   • Métodos: ${methods.length > 0 ? methods.join(', ') : '(ninguno)'}`;
        })
        .join('\n\n');

      return {
        message: `📊 **Tienes ${context.nodes.length} clase(s) en el diagrama:**\n\n${classList}\n\n**Relaciones:** ${context.edges.length}\n\n¿Quieres agregar más atributos o crear nuevas clases?`,
        contextualHelp: [
          {
            action: 'edit_class',
            description: 'Editar una clase existente',
            shortcut: 'Doble clic en la clase',
            priority: 'high',
          },
          {
            action: 'add_attributes',
            description: 'Agregar atributos con IA',
            shortcut: 'Dime: "agrega email a la clase Usuario"',
            priority: 'high',
          },
        ],
        tips: [
          '✏️ Puedes editar cualquier clase con doble clic',
          '🤖 O pedirme que agregue atributos: "agrega id:Long a Usuario"',
        ],
      };
    }

    // 🔍 INFORMACIÓN SOBRE CLASE ESPECÍFICA
    const classNameMatch = message.match(
      /(?:clase|tabla)\s+([a-z0-9_][\w-]*)/i,
    );
    if (
      classNameMatch &&
      (normalized.includes('que tiene') ||
        normalized.includes('info') ||
        normalized.includes('muestra'))
    ) {
      const targetName = classNameMatch[1].trim();
      const targetNode = context.nodes.find(
        (n) => this.normalize(n.name) === this.normalize(targetName),
      );

      if (!targetNode) {
        return {
          message: `❌ No encontré la clase "${targetName}".\n\n**Clases disponibles:**\n${context.nodes.map((n) => `• ${n.name}`).join('\n') || '(ninguna)'}`,
          tips: ['Verifica el nombre exacto de la clase'],
        };
      }

      const attrs = targetNode.attributes || [];
      const methods = targetNode.methods || [];

      return {
        message: `📋 **Información de la clase "${targetNode.name}":**\n\n**Atributos (${attrs.length}):**\n${attrs.length > 0 ? attrs.map((a) => `  • ${a}`).join('\n') : '  (ninguno)'}\n\n**Métodos (${methods.length}):**\n${methods.length > 0 ? methods.map((m) => `  • ${m}`).join('\n') : '  (ninguno)'}\n\n¿Quieres agregar más atributos o métodos?`,
        contextualHelp: [
          {
            action: 'edit_class',
            description: `Editar ${targetNode.name}`,
            shortcut: 'Doble clic en la clase',
            priority: 'high',
          },
          {
            action: 'add_attributes',
            description: 'Agregar con IA',
            shortcut: `"agrega email:String a ${targetNode.name}"`,
            priority: 'high',
          },
        ],
      };
    }

    // ----- comandos de creación de clase -----
    if (normalized.includes('crear') || normalized.includes('crea')) {
      const parsed = this.parseCreateClassCommand(message);

      // ✅ NUEVO código contextualizado
      if (parsed) {
        return {
          message: `🎯 **¡Perfecto! Vamos a crear la clase ${parsed.className}:**\n\n**Opción 1 - Usar el botón de abajo:**\n✅ Haz clic en "Agregar" y la clase aparecerá automáticamente\n\n**Opción 2 - Hacerlo manualmente:**\n1. 📍 Ve al **sidebar izquierdo**\n2. 🖱️ Clic en **"Clase"**\n3. ✨ Clic en el **canvas** donde la quieras\n4. ✏️ **Doble clic** en la clase para editarla\n\n**Después de crear:**\n• Agrega atributos como: id: Long, nombre: String\n• Agrega métodos como: getNombre(), setNombre()`,
          suggestions: {
            classes: [
              {
                name: parsed.className,
                attributes: parsed.attributes.length
                  ? parsed.attributes
                  : ['id: Long', 'nombre: String', 'fechaCreacion: Date'],
                methods: parsed.methods.length
                  ? parsed.methods
                  : [
                      `get${parsed.className}()`,
                      `set${parsed.className}()`,
                      'save()',
                      'delete()',
                    ],
              },
            ],
          },
          contextualHelp: [
            {
              action: 'create_first_class',
              description: 'Crear clase manualmente',
              shortcut: 'Sidebar → "Clase" → Clic en canvas',
              priority: 'medium',
            },
          ],
          tips: [
            '🚀 El botón "Agregar" es la forma más rápida',
            '✏️ Siempre puedes editar la clase después',
            '📝 Formato de atributos: nombre: Tipo',
          ],
          nextSteps: [
            '1. Haz clic en "Agregar" abajo',
            '2. Doble clic en la clase para editarla',
            '3. Personaliza atributos y métodos',
            '4. Crea otra clase para relacionarlas',
          ],
        };
      }
    }

    // ----- comandos de edición de clase existente -----
    if (
      normalized.includes('agrega') ||
      normalized.includes('añade') ||
      normalized.includes('anade')
    ) {
      const editParsed = this.parseEditClassCommand(message, context);

      if (editParsed?.error) {
        return {
          message: `❌ ${editParsed.error}`,
          tips: [
            'Verifica que la clase exista en el diagrama',
            'Usa el nombre exacto de la clase',
          ],
        };
      }

      if (editParsed) {
        const {
          targetNodeId,
          targetClassName,
          newAttributes,
          newMethods,
          currentAttributes,
          currentMethods,
        } = editParsed;

        // Garantizar arrays
        const currAttrs = currentAttributes || [];
        const currMethods = currentMethods || [];
        const newAttrs = newAttributes || [];
        const newMeths = newMethods || [];

        // Combinar atributos/métodos existentes con nuevos (sin duplicar)
        const existingAttrNames = new Set(
          currAttrs.map((a) => a.split(':')[0].trim().toLowerCase()),
        );
        const filteredNewAttrs = newAttrs.filter(
          (a) => !existingAttrNames.has(a.split(':')[0].trim().toLowerCase()),
        );

        const existingMethodNames = new Set(
          currMethods.map((m) => m.split('(')[0].trim().toLowerCase()),
        );
        const filteredNewMethods = newMeths.filter(
          (m) => !existingMethodNames.has(m.split('(')[0].trim().toLowerCase()),
        );

        const allAttributes = [...currAttrs, ...filteredNewAttrs];
        const allMethods = [...currMethods, ...filteredNewMethods];

        if (filteredNewAttrs.length === 0 && filteredNewMethods.length === 0) {
          return {
            message: `⚠️ Los atributos/métodos que intentas agregar ya existen en la clase "${targetClassName}".\n\n**Atributos actuales:**\n${currAttrs.join('\n') || '(ninguno)'}\n\n**Métodos actuales:**\n${currMethods.join('\n') || '(ninguno)'}`,
            tips: [
              'Los elementos ya existen',
              'Intenta con nombres diferentes',
            ],
          };
        }

        const addedItems: string[] = [];
        if (filteredNewAttrs.length > 0) {
          addedItems.push(
            `✅ **${filteredNewAttrs.length} atributo(s):** ${filteredNewAttrs.join(', ')}`,
          );
        }
        if (filteredNewMethods.length > 0) {
          addedItems.push(
            `✅ **${filteredNewMethods.length} método(s):** ${filteredNewMethods.join(', ')}`,
          );
        }

        return {
          message: `✨ **¡Perfecto! Voy a actualizar la clase "${targetClassName}":**\n\n${addedItems.join('\n')}\n\n**Haz clic en "Aplicar cambios" abajo para actualizar el diagrama.**`,
          suggestions: {
            classes: [
              {
                name: targetClassName,
                attributes: allAttributes,
                methods: allMethods,
              },
            ],
          },
          // Añadir metadata custom para el frontend
          contextualHelp: [
            {
              action: 'apply_edit',
              description: 'Aplicar cambios a la clase',
              shortcut: 'Botón "Aplicar cambios" abajo',
              priority: 'high',
            },
          ],
          tips: [
            '🎯 Los cambios se aplicarán automáticamente al hacer clic',
            '📝 Se agregaron solo los elementos nuevos',
            '✏️ Siempre puedes editar manualmente con doble clic',
            `🔧 nodeId=${targetNodeId}`, // Metadata para el frontend
          ],
          nextSteps: [
            '1. Haz clic en "Aplicar cambios"',
            '2. Verifica la clase actualizada en el diagrama',
            '3. Agrega más elementos si lo necesitas',
          ],
        };
      }
    }

    // ----- comandos de agregar relación -----
    if (
      (normalized.includes('crea') ||
        normalized.includes('agrega') ||
        normalized.includes('añade')) &&
      (normalized.includes('relacion') ||
        normalized.includes('asociacion') ||
        normalized.includes('herencia') ||
        normalized.includes('composicion') ||
        normalized.includes('agregacion') ||
        normalized.includes('dependencia'))
    ) {
      const relationParsed = this.parseAddRelationCommand(message, context);

      if (relationParsed?.error) {
        return {
          message: `❌ ${relationParsed.error}`,
          tips: [
            'Usa el formato: "crea una [tipo] de [ClaseOrigen] a [ClaseDestino]"',
            'Tipos: asociación, herencia, composición, agregación, dependencia',
          ],
        };
      }

      if (
        relationParsed &&
        relationParsed.from &&
        relationParsed.to &&
        relationParsed.type
      ) {
        const { from, to, type } = relationParsed;

        // Mapear el tipo a nombre legible
        const relationNames: Record<string, string> = {
          assoc: 'Asociación',
          inherit: 'Herencia',
          comp: 'Composición',
          aggr: 'Agregación',
          dep: 'Dependencia',
          'many-to-many': 'Muchos a Muchos',
        };

        const relationName = relationNames[type] || 'Asociación';

        return {
          message: `✨ **¡Perfecto! Voy a crear una relación de ${relationName}:**\n\n📍 **Origen:** ${from}\n📍 **Destino:** ${to}\n🔗 **Tipo:** ${relationName}\n\n**La relación se aplicará automáticamente.**`,
          suggestions: {
            relations: [
              {
                from,
                to,
                type,
                multiplicity: relationParsed.multiplicity
                  ? {
                      source: relationParsed.multiplicity.source,
                      target: relationParsed.multiplicity.target,
                    }
                  : undefined,
              },
            ],
          },
          contextualHelp: [
            {
              action: 'view_relation',
              description: 'Ver la relación en el diagrama',
              shortcut: 'La relación aparecerá automáticamente',
              priority: 'high',
            },
          ],
          tips: [
            '✅ La relación se creó automáticamente',
            '📝 Puedes editarla haciendo clic derecho en la línea',
            '🔄 Tipos disponibles: asociación, herencia, composición, agregación, dependencia',
          ],
          nextSteps: [
            '1. Verifica la relación en el diagrama',
            '2. Agrega más relaciones si lo necesitas',
            '3. Ajusta las cardinalidades si es necesario',
          ],
        };
      }
    }

    // ----- preguntas guías -----
    if (normalized.includes('relacion') || normalized.includes('conectar')) {
      if (analysis.classCount < 2) {
        return {
          message:
            'Necesitas al menos 2 clases para crear relaciones. Crea otra clase primero.',
          tips: ['Crea una clase adicional y vuelve a conectar.'],
        };
      }
      const from = context.nodes[0]?.name ?? 'Clase1';
      const to = context.nodes[1]?.name ?? 'Clase2';
      return {
        message:
          'Para conectar dos clases: selecciona la herramienta de relación y haz clic en clase origen → clase destino.',
        suggestions: {
          relations: [{ from, to, type: 'assoc' }], // usar key del editor
        },
        tips: [
          'Asociación: relación general',
          'Herencia: “es un tipo de”',
          'Composición: “contiene a”',
        ],
      };
    }

    if (normalized.includes('analiza') && normalized.includes('diagrama')) {
      if (analysis.classCount === 0) {
        return {
          message:
            'Tu diagrama está vacío. Te sugiero crear 2–3 clases base y luego conectarlas.',
          nextSteps: [
            'Crea 2–3 clases (Usuario, Producto, Pedido)',
            'Agrega 2 atributos por clase',
            'Conéctalas con asociación',
          ],
        };
      }
      const names = analysis.classNames.join(', ');
      return {
        message: `Tienes ${analysis.classCount} clases (${names}) y ${analysis.relationCount} relación(es).`,
        tips: analysis.isWellStructured
          ? ['¡Se ve bien! Ya puedes generar código.']
          : ['Considera agregar más relaciones o atributos.'],
      };
    }

    // ----- Detección de descripciones de sistemas/dominios -----
    const domainResponse = this.detectDomainAndSuggest(normalized, message);
    if (domainResponse) {
      return domainResponse;
    }

    // ----- fallback IA externa (opcional) -----
    try {
      const ai = await this.aiService.analyzeUmlRequest(message);
      return {
        message: ai.content,
        suggestions: ai.suggestions,
        tips: ai.tips,
        nextSteps: ai.nextSteps,
      };
    } catch {
      return {
        message:
          'No pude procesar tu pregunta ahora. Intenta ser más específico (por ejemplo: “Crea una clase Usuario con atributos nombre, email”).',
      };
    }
  }

  // ✅ CORREGIR el método getTutorialAnalysis (línea ~625 aproximadamente)
  private getTutorialAnalysis(analysis: any) {
    if (analysis.classCount === 0) {
      return {
        message:
          '🏗️ **Tu canvas está vacío. ¡Empecemos!**\n\n**Siguiente paso:** Crear tu primera clase',
        contextualHelp: [
          {
            action: 'create_first_class',
            description: 'Crear primera clase',
            shortcut: 'Sidebar → "Clase" → Clic en canvas',
            priority: 'high' as const, // ✅ AGREGAR "as const"
          },
        ],
        tips: [
          '🎯 Ve al sidebar izquierdo y busca el botón "Clase"',
          '🖱️ Después haz clic donde quieras crear la clase',
        ],
        nextSteps: [
          '1. Clic en "Clase" en el sidebar',
          '2. Clic en el canvas',
          '3. Doble clic en la clase para editarla',
        ],
      };
    }

    if (analysis.classCount >= 1 && analysis.hasEmptyClasses) {
      return {
        message: `📝 **Tienes ${analysis.classCount} clase(s) pero están vacías.**\n\n**Siguiente paso:** Agregar atributos y métodos`,
        contextualHelp: [
          {
            action: 'edit_class',
            description: 'Editar clase para agregar contenido',
            shortcut: 'Doble clic en cualquier clase',
            priority: 'high' as const, // ✅ AGREGAR "as const"
          },
        ],
        tips: [
          '📝 Doble clic en una clase para abrír el editor',
          '✍️ Agrega atributos como: id: Long, nombre: String',
          '⚙️ Agrega métodos como: getNombre(), setNombre()',
        ],
        nextSteps: [
          '1. Doble clic en una clase',
          '2. Agrega 2-3 atributos',
          '3. Agrega algunos métodos',
          '4. Clic "Guardar"',
        ],
      };
    }

    if (analysis.classCount >= 2 && !analysis.hasRelations) {
      return {
        message: `🔗 **Tienes ${analysis.classCount} clases pero no están conectadas.**\n\n**Siguiente paso:** Crear relaciones entre clases`,
        contextualHelp: [
          {
            action: 'create_association',
            description: 'Conectar clases con asociación',
            shortcut: 'Sidebar → "Asociación" → Clase origen → Clase destino',
            priority: 'high' as const,
          },
        ],
        tips: [
          '🔗 Ve al sidebar → sección "Relaciones"',
          '🎯 Empieza con "Asociación" (la más común)',
          '🖱️ Clic en clase origen, después en clase destino',
        ],
        nextSteps: [
          '1. Sidebar → "Asociación"',
          '2. Clic en primera clase',
          '3. Clic en segunda clase',
          '4. ¡Relación creada!',
        ],
      };
    }

    if (analysis.isWellStructured) {
      return {
        message: `🎉 **¡Excelente! Tu diagrama está completo.**\n\n**Siguiente paso:** Generar tu código Spring Boot`,
        contextualHelp: [
          {
            action: 'generate_code',
            description: 'Generar código Spring Boot',
            shortcut: 'Sidebar → "Generar Código Spring Boot"',
            priority: 'high' as const,
          },
        ],
        tips: [
          '🚀 Tu diagrama está listo para generar código',
          '📦 Se descargará un proyecto Maven completo',
          '▶️ Podrás ejecutarlo con: mvn spring-boot:run',
        ],
        nextSteps: [
          '1. Sidebar → "Generar Código Spring Boot"',
          '2. Descargar el ZIP',
          '3. Extraer y abrir en tu IDE',
          '4. Ejecutar el proyecto',
        ],
      };
    }

    return {
      message: `📊 **Estado actual:** ${analysis.classCount} clases, ${analysis.relationCount} relaciones`,
      contextualHelp: [
        {
          action: 'improve_diagram',
          description: 'Mejorar el diagrama',
          shortcut: 'Pregúntame qué hacer siguiente',
          priority: 'medium' as const, // ✅ AGREGAR "as const"
        },
      ],
      tips: [
        '🎯 Continúa agregando más detalles a tus clases',
        '🔗 Asegúrate de que las relaciones sean correctas',
      ],
      nextSteps: [
        'Completa atributos y métodos',
        'Revisa las relaciones',
        'Prepárate para generar código',
      ],
    };
  }

  /**
   * Detecta si el mensaje describe un dominio/sistema y genera sugerencias de clases apropiadas
   */
  private detectDomainAndSuggest(normalized: string, originalMessage: string): AssistantResponse | null {
    // Detectar sistema de farmacia / inventario de medicamentos
    if (
      normalized.includes('farmacia') ||
      normalized.includes('medicamento') ||
      normalized.includes('medicina') ||
      normalized.includes('drogueria') ||
      (normalized.includes('inventario') && (normalized.includes('farmac') || normalized.includes('medic')))
    ) {
      return {
        message: `🏥 **¡Excelente! Voy a sugerirte clases para un Sistema de Farmacia:**\n\nHe identificado las entidades principales para tu sistema. Haz clic en "Agregar" en cada clase para añadirla al diagrama.\n\n**Clases sugeridas:**\n• **Medicamento** - Gestión de productos farmacéuticos\n• **Proveedor** - Gestión de proveedores\n• **Venta** - Registro de ventas\n• **Cliente** - Información de clientes\n• **DetalleVenta** - Líneas de cada venta`,
        suggestions: {
          classes: [
            {
              name: 'Medicamento',
              attributes: [
                'codigo: String',
                'nombre: String',
                'descripcion: String',
                'precio: Double',
                'stock: Integer',
                'fechaVencimiento: Date',
                'categoria: String',
                'requiereReceta: Boolean',
              ],
              methods: [
                'actualizarStock()',
                'verificarVencimiento()',
                'aplicarDescuento()',
              ],
            },
            {
              name: 'Proveedor',
              attributes: [
                'nombre: String',
                'nit: String',
                'telefono: String',
                'email: String',
                'direccion: String',
              ],
              methods: [
                'registrarPedido()',
                'consultarHistorial()',
              ],
            },
            {
              name: 'Venta',
              attributes: [
                'fecha: Date',
                'total: Double',
                'estado: String',
                'metodoPago: String',
              ],
              methods: [
                'calcularTotal()',
                'generarFactura()',
                'procesarPago()',
              ],
            },
            {
              name: 'Cliente',
              attributes: [
                'nombre: String',
                'documento: String',
                'telefono: String',
                'email: String',
              ],
              methods: [
                'registrar()',
                'consultarHistorial()',
              ],
            },
            {
              name: 'DetalleVenta',
              attributes: [
                'cantidad: Integer',
                'precioUnitario: Double',
                'subtotal: Double',
              ],
              methods: ['calcularSubtotal()'],
            },
          ],
          relations: [
            { from: 'Cliente', to: 'Venta', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Venta', to: 'DetalleVenta', type: 'comp', multiplicity: { source: '1', target: '*' } },
            { from: 'Medicamento', to: 'DetalleVenta', type: 'assoc', multiplicity: { source: '*', target: '1' } },
            { from: 'Proveedor', to: 'Medicamento', type: 'assoc', multiplicity: { source: '1', target: '*' } },
          ],
        },
        tips: [
          '💡 Haz clic en "Agregar" para cada clase',
          '🔗 Las relaciones se crearán automáticamente',
          '✏️ Puedes editar cada clase con doble clic',
        ],
        nextSteps: [
          '1. Agrega las clases sugeridas',
          '2. Conecta las clases con relaciones',
          '3. Personaliza atributos según tu necesidad',
          '4. Genera el código Spring Boot',
        ],
      };
    }

    // Detectar sistema de inventario genérico
    if (
      normalized.includes('inventario') ||
      normalized.includes('almacen') ||
      normalized.includes('bodega') ||
      normalized.includes('stock')
    ) {
      return {
        message: `📦 **¡Perfecto! Voy a sugerirte clases para un Sistema de Inventario:**\n\nHe identificado las entidades principales. Haz clic en "Agregar" para cada clase.\n\n**Clases sugeridas:**\n• **Producto** - Gestión de productos\n• **Categoria** - Clasificación de productos\n• **Proveedor** - Gestión de proveedores\n• **MovimientoInventario** - Entradas y salidas`,
        suggestions: {
          classes: [
            {
              name: 'Producto',
              attributes: [
                'codigo: String',
                'nombre: String',
                'descripcion: String',
                'precio: Double',
                'stockActual: Integer',
                'stockMinimo: Integer',
              ],
              methods: [
                'actualizarStock()',
                'verificarStockMinimo()',
                'calcularValorInventario()',
              ],
            },
            {
              name: 'Categoria',
              attributes: [
                'nombre: String',
                'descripcion: String',
              ],
              methods: ['listarProductos()', 'obtenerEstadisticas()'],
            },
            {
              name: 'Proveedor',
              attributes: [
                'nombre: String',
                'contacto: String',
                'telefono: String',
                'email: String',
              ],
              methods: ['realizarPedido()', 'consultarHistorial()'],
            },
            {
              name: 'MovimientoInventario',
              attributes: [
                'fecha: Date',
                'tipo: String',
                'cantidad: Integer',
                'motivo: String',
              ],
              methods: ['registrar()', 'generarReporte()'],
            },
          ],
          relations: [
            { from: 'Categoria', to: 'Producto', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Proveedor', to: 'Producto', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Producto', to: 'MovimientoInventario', type: 'assoc', multiplicity: { source: '1', target: '*' } },
          ],
        },
        tips: [
          '💡 Haz clic en "Agregar" para cada clase',
          '🔗 Conecta las clases según las relaciones sugeridas',
        ],
        nextSteps: [
          '1. Agrega las clases sugeridas',
          '2. Personaliza los atributos',
          '3. Crea las relaciones',
        ],
      };
    }

    // Detectar sistema hospitalario
    if (
      normalized.includes('hospital') ||
      normalized.includes('clinica') ||
      normalized.includes('paciente') ||
      normalized.includes('medico') ||
      normalized.includes('cita') ||
      normalized.includes('salud')
    ) {
      return {
        message: `🏥 **¡Perfecto! Voy a sugerirte clases para un Sistema Hospitalario:**\n\n**Clases sugeridas:**\n• **Paciente** - Información de pacientes\n• **Medico** - Personal médico\n• **Cita** - Gestión de citas\n• **HistorialMedico** - Historial clínico`,
        suggestions: {
          classes: [
            {
              name: 'Paciente',
              attributes: [
                'nombre: String',
                'documento: String',
                'fechaNacimiento: Date',
                'telefono: String',
                'direccion: String',
              ],
              methods: [
                'agendarCita()',
                'consultarHistorial()',
              ],
            },
            {
              name: 'Medico',
              attributes: [
                'nombre: String',
                'especialidad: String',
                'numeroLicencia: String',
                'telefono: String',
              ],
              methods: [
                'atenderPaciente()',
                'consultarAgenda()',
                'emitirReceta()',
              ],
            },
            {
              name: 'Cita',
              attributes: [
                'fecha: Date',
                'hora: String',
                'motivo: String',
                'estado: String',
              ],
              methods: ['confirmar()', 'cancelar()', 'reprogramar()'],
            },
            {
              name: 'HistorialMedico',
              attributes: [
                'fecha: Date',
                'diagnostico: String',
                'tratamiento: String',
                'observaciones: String',
              ],
              methods: ['agregar()', 'consultar()'],
            },
          ],
          relations: [
            { from: 'Paciente', to: 'Cita', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Medico', to: 'Cita', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Paciente', to: 'HistorialMedico', type: 'assoc', multiplicity: { source: '1', target: '*' } },
          ],
        },
      };
    }

    // Detectar sistema de tienda/e-commerce
    if (
      normalized.includes('tienda') ||
      normalized.includes('ecommerce') ||
      normalized.includes('comercio') ||
      normalized.includes('venta') ||
      normalized.includes('compra')
    ) {
      return {
        message: `🛒 **¡Perfecto! Voy a sugerirte clases para un Sistema de Tienda/E-commerce:**\n\n**Clases sugeridas:**\n• **Cliente** - Información de clientes\n• **Producto** - Catálogo de productos\n• **Pedido** - Gestión de pedidos\n• **DetallePedido** - Líneas de pedido`,
        suggestions: {
          classes: [
            {
              name: 'Cliente',
              attributes: [
                'nombre: String',
                'email: String',
                'telefono: String',
                'direccion: String',
              ],
              methods: [
                'realizarCompra()',
                'consultarPedidos()',
              ],
            },
            {
              name: 'Producto',
              attributes: [
                'nombre: String',
                'descripcion: String',
                'precio: Double',
                'stock: Integer',
                'categoria: String',
              ],
              methods: [
                'actualizarStock()',
                'calcularDescuento()',
              ],
            },
            {
              name: 'Pedido',
              attributes: [
                'fecha: Date',
                'total: Double',
                'estado: String',
              ],
              methods: [
                'calcularTotal()',
                'actualizarEstado()',
                'generarFactura()',
              ],
            },
            {
              name: 'DetallePedido',
              attributes: [
                'cantidad: Integer',
                'precioUnitario: Double',
                'subtotal: Double',
              ],
              methods: ['calcularSubtotal()'],
            },
          ],
          relations: [
            { from: 'Cliente', to: 'Pedido', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Pedido', to: 'DetallePedido', type: 'comp', multiplicity: { source: '1', target: '*' } },
            { from: 'Producto', to: 'DetallePedido', type: 'assoc', multiplicity: { source: '*', target: '1' } },
          ],
        },
      };
    }

    // Detectar sistema educativo
    if (
      normalized.includes('universidad') ||
      normalized.includes('escuela') ||
      normalized.includes('colegio') ||
      normalized.includes('estudiante') ||
      normalized.includes('curso') ||
      normalized.includes('materia') ||
      normalized.includes('educativo') ||
      normalized.includes('academico')
    ) {
      return {
        message: `🎓 **¡Perfecto! Voy a sugerirte clases para un Sistema Educativo:**\n\n**Clases sugeridas:**\n• **Estudiante** - Información de estudiantes\n• **Profesor** - Personal docente\n• **Curso** - Gestión de cursos\n• **Inscripcion** - Matrículas`,
        suggestions: {
          classes: [
            {
              name: 'Estudiante',
              attributes: [
                'nombre: String',
                'matricula: String',
                'email: String',
                'fechaIngreso: Date',
              ],
              methods: [
                'inscribirCurso()',
                'consultarCalificaciones()',
              ],
            },
            {
              name: 'Profesor',
              attributes: [
                'nombre: String',
                'especialidad: String',
                'email: String',
              ],
              methods: [
                'asignarCalificacion()',
                'consultarCursos()',
              ],
            },
            {
              name: 'Curso',
              attributes: [
                'codigo: String',
                'nombre: String',
                'creditos: Integer',
                'horario: String',
              ],
              methods: [
                'agregarEstudiante()',
                'publicarCalificaciones()',
              ],
            },
            {
              name: 'Inscripcion',
              attributes: [
                'fecha: Date',
                'calificacion: Double',
                'estado: String',
              ],
              methods: ['calcularPromedio()', 'actualizarEstado()'],
            },
          ],
          relations: [
            { from: 'Estudiante', to: 'Inscripcion', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Curso', to: 'Inscripcion', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Profesor', to: 'Curso', type: 'assoc', multiplicity: { source: '1', target: '*' } },
          ],
        },
      };
    }

    // Detectar sistema de restaurante
    if (
      normalized.includes('restaurante') ||
      normalized.includes('menu') ||
      normalized.includes('comida') ||
      normalized.includes('plato') ||
      normalized.includes('cocina')
    ) {
      return {
        message: `🍽️ **¡Perfecto! Voy a sugerirte clases para un Sistema de Restaurante:**\n\n**Clases sugeridas:**\n• **Mesa** - Gestión de mesas\n• **Plato** - Menú del restaurante\n• **Pedido** - Pedidos de clientes\n• **Cliente** - Información de clientes`,
        suggestions: {
          classes: [
            {
              name: 'Mesa',
              attributes: [
                'numero: Integer',
                'capacidad: Integer',
                'estado: String',
              ],
              methods: ['ocupar()', 'liberar()', 'reservar()'],
            },
            {
              name: 'Plato',
              attributes: [
                'nombre: String',
                'descripcion: String',
                'precio: Double',
                'categoria: String',
                'disponible: Boolean',
              ],
              methods: ['actualizarDisponibilidad()', 'obtenerDetalles()'],
            },
            {
              name: 'Pedido',
              attributes: [
                'fecha: Date',
                'total: Double',
                'estado: String',
              ],
              methods: [
                'calcularTotal()',
                'agregarPlato()',
                'cerrarPedido()',
              ],
            },
            {
              name: 'Cliente',
              attributes: [
                'nombre: String',
                'telefono: String',
              ],
              methods: ['hacerReserva()', 'consultarHistorial()'],
            },
          ],
          relations: [
            { from: 'Mesa', to: 'Pedido', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Cliente', to: 'Pedido', type: 'assoc', multiplicity: { source: '1', target: '*' } },
          ],
        },
      };
    }

    // Detectar sistema de biblioteca
    if (
      normalized.includes('biblioteca') ||
      normalized.includes('libro') ||
      normalized.includes('prestamo') ||
      normalized.includes('lectura')
    ) {
      return {
        message: `📚 **¡Perfecto! Voy a sugerirte clases para un Sistema de Biblioteca:**\n\n**Clases sugeridas:**\n• **Usuario** - Usuarios de la biblioteca\n• **Libro** - Catálogo de libros\n• **Prestamo** - Gestión de préstamos`,
        suggestions: {
          classes: [
            {
              name: 'Usuario',
              attributes: [
                'nombre: String',
                'email: String',
                'fechaRegistro: Date',
              ],
              methods: [
                'prestarLibro()',
                'devolverLibro()',
                'consultarHistorial()',
              ],
            },
            {
              name: 'Libro',
              attributes: [
                'titulo: String',
                'autor: String',
                'isbn: String',
                'disponible: Boolean',
              ],
              methods: [
                'marcarDisponible()',
                'marcarPrestado()',
              ],
            },
            {
              name: 'Prestamo',
              attributes: [
                'fechaPrestamo: Date',
                'fechaVencimiento: Date',
                'devuelto: Boolean',
              ],
              methods: [
                'calcularMulta()',
                'marcarDevuelto()',
                'extenderPrestamo()',
              ],
            },
          ],
          relations: [
            { from: 'Usuario', to: 'Prestamo', type: 'assoc', multiplicity: { source: '1', target: '*' } },
            { from: 'Libro', to: 'Prestamo', type: 'assoc', multiplicity: { source: '1', target: '*' } },
          ],
        },
      };
    }

    // No se detectó ningún dominio conocido
    return null;
  }
}
