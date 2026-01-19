import React from "react";
import { IconBack } from "../icons";
import { JavaSpringGenerator } from "../codegen/JavaSpringGenerator";
import type { Graph } from "@antv/x6";
import toast from "react-hot-toast";
import JSZip from "jszip";
import { startEdgeMode } from "../actions/edges";
import type { EdgeShape } from "../actions/edges";
import { FlutterCrudGenerator } from "../codegen/FlutterCrudGenerator";

export type Tool =
  | "cursor"
  | "class"
  | "interface"
  | "abstract"
  // Relaciones:
  | "assoc" // Asociación
  | "nav" // Asociación directa (flecha)
  | "aggr" // Agregación (rombo vacío)
  | "comp" // Composición (rombo sólido)
  | "dep" // Dependencia (punteada + flecha)
  | "inherit"
  | "many-to-many"; // Generalización (triángulo vacío)

type Props = {
  tool: Tool;
  onToolClick: (t: Tool) => void;
  onBack: () => void;
  graph?: Graph | null;

  // Drag para crear clase
  onClassDragStart?: (e: React.DragEvent) => void;
};

function IconAssociation({ className = "h-4 w-4" }: { className?: string }) {
  // Línea en L
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 18V6M4 6H16" />
    </svg>
  );
}

function IconDirectedAssociation({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  // Línea con flecha al final
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 12H18" />
      <path d="M18 12l-4-3m4 3l-4 3" fill="currentColor" />
    </svg>
  );
}

function IconAggregation({ className = "h-4 w-4" }: { className?: string }) {
  // Rombo vacío
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 12l4-4 4 4-4 4-4-4z" />
      <path d="M14 12H20" />
    </svg>
  );
}

function IconComposition({ className = "h-4 w-4" }: { className?: string }) {
  // Rombo sólido
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 12l4-4 4 4-4 4-4-4z" />
      <path d="M14 12H20" fill="none" />
    </svg>
  );
}

function IconDependency({ className = "h-4 w-4" }: { className?: string }) {
  // Línea punteada + flecha
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 12h10" strokeDasharray="4 3" />
      <path d="M18 12l-4-3m4 3l-4 3" />
    </svg>
  );
}

function IconGeneralization({ className = "h-4 w-4" }: { className?: string }) {
  // Triángulo vacío (hollow)
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 12l-6-4-6 4 6 4 6-4z" fill="white" />
      <path d="M6 12H4" />
    </svg>
  );
}

function IconManyToMany({ className = "h-4 w-4" }: { className?: string }) {
  // Dos líneas con una clase intermedia
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* Línea izquierda */}
      <path d="M2 12H8" />
      {/* Clase intermedia (rectángulo pequeño) */}
      <rect
        x="8"
        y="9"
        width="8"
        height="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      {/* Línea derecha */}
      <path d="M16 12H22" />
      {/* Multiplicidades */}
      <circle cx="4" cy="10" r="1" fill="currentColor" />
      <text x="4" y="15" fontSize="8" textAnchor="middle" fill="currentColor">
        *
      </text>
      <circle cx="20" cy="10" r="1" fill="currentColor" />
      <text x="20" y="15" fontSize="8" textAnchor="middle" fill="currentColor">
        *
      </text>
    </svg>
  );
}

/* ========= Auxiliares de saneamiento / normalización ========= */
function sanitizeIdentifier(raw: unknown, fallback: string): string {
  let s = String(raw ?? "").trim();
  if (!s) return fallback;
  // Reemplaza espacios y caracteres no válidos por '_'
  s = s.replace(/[^\p{L}\p{N}_$]/gu, "_");
  // No iniciar con dígito
  if (/^\d/.test(s)) s = "_" + s;
  return s;
}

function coerceArrayOfLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  return String(value ?? "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

/* ======= Parseo de métodos (lo mantengo) ======= */
function parseMethod(methodStr: string) {
  const regex =
    /([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*:\s*([a-zA-Z_][a-zA-Z0-9_<>]*)/;
  const match = methodStr.match(regex);
  if (match) {
    return {
      nombre: match[1],
      parametros: match[2].split(",").map((p) => p.trim()),
      tipoRetorno: match[3],
    };
  }
  return null;
}

/* ======= Mapeo tipos de relación UML -> JPA ======= */
function mapearTipoRelacion(
  tipo: string
): "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY" {
  switch (tipo) {
    case "comp":
      return "ONE_TO_ONE";
    case "aggr":
      return "ONE_TO_MANY";
    case "assoc":
      return "MANY_TO_MANY";
    case "dep":
      return "MANY_TO_ONE";
    case "inherit":
      return "ONE_TO_ONE"; // la herencia se maneja aparte
    default:
      return "MANY_TO_ONE";
  }
}

export default function Sidebar({
  tool,
  onToolClick,
  onBack,
  graph,
  onClassDragStart,
}: Props) {
  const handleRelationTool = (relationTool: Tool) => {
    if (!graph) return;

    // Manejar many-to-many de forma especial
    if (relationTool === "many-to-many") {
      // Activar modo especial para muchos a muchos
      startManyToManyMode(graph, () => {
        onToolClick("cursor"); // Volver al cursor
      });
      onToolClick(relationTool);
      return;
    }

    const toolToEdgeShape: Record<string, EdgeShape> = {
      assoc: "assoc",
      nav: "nav",
      aggr: "aggr",
      comp: "comp",
      dep: "dep",
      inherit: "inherit",
    };

    const edgeShape = toolToEdgeShape[relationTool];
    if (edgeShape) {
      // Usar startEdgeMode SOLO cuando se presiona el botón
      startEdgeMode(graph, edgeShape, () => {
        onToolClick("cursor"); // Volver al cursor
      });

      // Actualizar UI
      onToolClick(relationTool);
    }
  };

  function startManyToManyMode(graph: Graph, onComplete: () => void) {
    let selectedNodes: any[] = [];

    const handleNodeClick = ({ node }: { node: any }) => {
      selectedNodes.push(node);

      // Resaltar nodo seleccionado
      graph.cleanSelection();
      selectedNodes.forEach((n) => graph.select(n));

      if (selectedNodes.length === 2) {
        // Crear relación muchos a muchos
        createManyToManyRelation(graph, selectedNodes[0], selectedNodes[1]);

        // Limpiar y terminar
        graph.cleanSelection();
        graph.off("node:click", handleNodeClick);
        selectedNodes = [];
        onComplete();
      }
    };

    graph.on("node:click", handleNodeClick);
  }

  function createManyToManyRelation(graph: Graph, node1: any, node2: any) {
    // Obtener centros de los nodos
    const center1 = node1.getBBox().center;
    const center2 = node2.getBBox().center;

    // Calcular posición de la clase intermedia
    const midX = (center1.x + center2.x) / 2;
    const midY = (center1.y + center2.y) / 2;

    // Calcular vector perpendicular para posicionar la clase intermedia
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Vector perpendicular normalizado
    const perpX = length > 0 ? -dy / length : 0;
    const perpY = length > 0 ? dx / length : 1;

    // Distancia de separación de la clase intermedia
    const offset = 100;
    const intermediateX = midX + perpX * offset;
    const intermediateY = midY + perpY * offset;

    // Crear clase intermedia
    const intermediateName = `${node1.getData()?.name || "Class1"}${
      node2.getData()?.name || "Class2"
    }`;

    const intermediateNode = graph.addNode({
      shape: "uml-class",
      x: intermediateX - 90,
      y: intermediateY - 60,
      width: 180,
      height: 120,
      attrs: {
        name: { text: intermediateName },
        attrs: {
          text: `id: Long\n${
            node1.getData()?.name?.toLowerCase() || "class1"
          }Id: Long\n${
            node2.getData()?.name?.toLowerCase() || "class2"
          }Id: Long`,
        },
        methods: { text: "" },
      },
      zIndex: 2,
      data: {
        name: intermediateName,
        attributes: [
          "id: Long",
          `${node1.getData()?.name?.toLowerCase() || "class1"}Id: Long`,
          `${node2.getData()?.name?.toLowerCase() || "class2"}Id: Long`,
        ],
        methods: [],
        // *** MARCAR COMO RELACIÓN MUCHOS A MUCHOS ***
        isManyToManyTable: true,
        relatedNodes: [node1.id, node2.id],
      },
    });

    // 1. Crear relación principal directa entre node1 y node2
    const mainEdge = graph.addEdge({
      attrs: {
        line: {
          stroke: "#7C3AED",
          strokeWidth: 2,
          targetMarker: null,
          sourceMarker: null,
        },
      },
      zIndex: 1000,
      router: { name: "normal" },
      connector: { name: "normal" },
      source: { cell: node1.id },
      target: { cell: node2.id },
      data: {
        name: "many-to-many",
        multSource: "*",
        multTarget: "*",
        // *** DATOS PARA PERSISTENCIA ***
        intermediateNodeId: intermediateNode.id,
        isManyToManyRelation: true,
      },
    });

    // 2. Crear nodos de conexión INVISIBLES en cada arista de la clase intermedia
    const bbox = intermediateNode.getBBox();

    // Nodo superior (INVISIBLE)
    const topConnectionNode = graph.addNode({
      shape: "circle",
      x: bbox.x + bbox.width / 2 - 1,
      y: bbox.y - 1,
      width: 2,
      height: 2,
      attrs: {
        body: {
          fill: "transparent", // *** INVISIBLE ***
          stroke: "transparent",
          strokeWidth: 0,
        },
      },
      zIndex: 1003,
      data: { isConnectionNode: true, parentId: intermediateNode.id },
    });

    // Nodo inferior (INVISIBLE)
    const bottomConnectionNode = graph.addNode({
      shape: "circle",
      x: bbox.x + bbox.width / 2 - 1,
      y: bbox.y + bbox.height - 1,
      width: 2,
      height: 2,
      attrs: {
        body: {
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
        },
      },
      zIndex: 1003,
      data: { isConnectionNode: true, parentId: intermediateNode.id },
    });

    // Nodo izquierdo (INVISIBLE)
    const leftConnectionNode = graph.addNode({
      shape: "circle",
      x: bbox.x - 1,
      y: bbox.y + bbox.height / 2 - 1,
      width: 2,
      height: 2,
      attrs: {
        body: {
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
        },
      },
      zIndex: 1003,
      data: { isConnectionNode: true, parentId: intermediateNode.id },
    });

    // Nodo derecho (INVISIBLE)
    const rightConnectionNode = graph.addNode({
      shape: "circle",
      x: bbox.x + bbox.width - 1,
      y: bbox.y + bbox.height / 2 - 1,
      width: 2,
      height: 2,
      attrs: {
        body: {
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
        },
      },
      zIndex: 1003,
      data: { isConnectionNode: true, parentId: intermediateNode.id },
    });

    const connectionNodes = [
      topConnectionNode,
      bottomConnectionNode,
      leftConnectionNode,
      rightConnectionNode,
    ];

    // 3. Crear punto visual en el punto medio de la línea principal (INVISIBLE)
    const midPointMarker = graph.addNode({
      shape: "circle",
      x: midX - 1,
      y: midY - 1,
      width: 2,
      height: 2,
      attrs: {
        body: {
          fill: "transparent", // *** INVISIBLE ***
          stroke: "transparent",
          strokeWidth: 0,
        },
      },
      zIndex: 1002,
      data: {
        isMidPointMarker: true,
        mainEdgeId: mainEdge.id,
        relatedNodes: [node1.id, node2.id],
      },
    });

    // 4. Función para encontrar el nodo de conexión más cercano
    function getClosestConnectionNode(fromX: number, fromY: number) {
      let closestNode = connectionNodes[0];
      let minDistance = Number.MAX_VALUE;

      connectionNodes.forEach((node) => {
        const nodePos = node.getPosition();
        const distance = Math.sqrt(
          Math.pow(nodePos.x + 1 - fromX, 2) +
            Math.pow(nodePos.y + 1 - fromY, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestNode = node;
        }
      });

      return closestNode;
    }

    // 5. Crear línea perpendicular inicial
    const initialClosestNode = getClosestConnectionNode(midX, midY);
    let perpendicularEdge = graph.addEdge({
      attrs: {
        line: {
          stroke: "#7C3AED",
          strokeWidth: 2,
          targetMarker: null,
          sourceMarker: null,
          strokeDasharray: "5,5",
        },
      },
      zIndex: 1000,
      router: { name: "normal" },
      connector: { name: "normal" },
      source: { cell: midPointMarker.id },
      target: { cell: initialClosestNode.id },
      data: {
        name: "",
        multSource: "",
        multTarget: "",
        // *** DATOS PARA PERSISTENCIA ***
        isPerpendicularEdge: true,
        mainEdgeId: mainEdge.id,
        intermediateNodeId: intermediateNode.id,
      },
    });

    // 6. Función mejorada para actualizar posiciones
    const updatePositions = () => {
      try {
        // Verificar que los nodos aún existen
        const currentNode1 = graph.getCellById(node1.id);
        const currentNode2 = graph.getCellById(node2.id);

        if (!currentNode1 || !currentNode2) return;

        // Recalcular centros
        const newCenter1 = currentNode1.getBBox().center;
        const newCenter2 = currentNode2.getBBox().center;
        const newMidX = (newCenter1.x + newCenter2.x) / 2;
        const newMidY = (newCenter1.y + newCenter2.y) / 2;

        // Actualizar posición del marcador del punto medio
        if (graph.getCellById(midPointMarker.id)) {
          midPointMarker.setPosition(newMidX - 1, newMidY - 1);
        }

        // Recalcular posición perpendicular de la clase intermedia
        const newDx = newCenter2.x - newCenter1.x;
        const newDy = newCenter2.y - newCenter1.y;
        const newLength = Math.sqrt(newDx * newDx + newDy * newDy);

        if (newLength > 0) {
          const newPerpX = -newDy / newLength;
          const newPerpY = newDx / newLength;

          const newIntermediateX = newMidX + newPerpX * offset;
          const newIntermediateY = newMidY + newPerpY * offset;

          // Actualizar posición de la clase intermedia
          if (graph.getCellById(intermediateNode.id)) {
            intermediateNode.setPosition(
              newIntermediateX - 90,
              newIntermediateY - 60
            );
            updateConnectionNodesPositions();
          }

          // Encontrar el nodo de conexión más cercano al punto medio
          const closestNode = getClosestConnectionNode(newMidX, newMidY);

          // Si cambió el nodo más cercano, actualizar la conexión
          if (graph.getCellById(perpendicularEdge.id)) {
            const currentTarget = perpendicularEdge.getTargetCell();
            if (currentTarget && currentTarget.id !== closestNode.id) {
              perpendicularEdge.setTarget({ cell: closestNode.id });
            }
          }
        }
      } catch (error) {
        console.log("Error updating positions:", error);
      }
    };

    // 7. Función para actualizar posiciones de nodos de conexión
    const updateConnectionNodesPositions = () => {
      try {
        const newBbox = intermediateNode.getBBox();

        if (graph.getCellById(topConnectionNode.id)) {
          topConnectionNode.setPosition(
            newBbox.x + newBbox.width / 2 - 1,
            newBbox.y - 1
          );
        }
        if (graph.getCellById(bottomConnectionNode.id)) {
          bottomConnectionNode.setPosition(
            newBbox.x + newBbox.width / 2 - 1,
            newBbox.y + newBbox.height - 1
          );
        }
        if (graph.getCellById(leftConnectionNode.id)) {
          leftConnectionNode.setPosition(
            newBbox.x - 1,
            newBbox.y + newBbox.height / 2 - 1
          );
        }
        if (graph.getCellById(rightConnectionNode.id)) {
          rightConnectionNode.setPosition(
            newBbox.x + newBbox.width - 1,
            newBbox.y + newBbox.height / 2 - 1
          );
        }
      } catch (error) {
        console.log("Error updating connection nodes:", error);
      }
    };

    // 8. Función para actualizar cuando se mueva la clase intermedia manualmente
    const updateConnectionNodesOnIntermediateMove = () => {
      updateConnectionNodesPositions();

      // Actualizar conexión al nodo más cercano
      try {
        const midPos = midPointMarker.getPosition();
        const closestNode = getClosestConnectionNode(
          midPos.x + 1,
          midPos.y + 1
        );
        if (graph.getCellById(perpendicularEdge.id)) {
          perpendicularEdge.setTarget({ cell: closestNode.id });
        }
      } catch (error) {
        console.log("Error updating intermediate move:", error);
      }
    };

    // 9. Event listeners con verificación de existencia
    const setupEventListeners = () => {
      try {
        if (graph.getCellById(node1.id)) {
          node1.on("change:position", updatePositions);
        }
        if (graph.getCellById(node2.id)) {
          node2.on("change:position", updatePositions);
        }
        if (graph.getCellById(intermediateNode.id)) {
          intermediateNode.on(
            "change:position",
            updateConnectionNodesOnIntermediateMove
          );
        }
      } catch (error) {
        console.log("Error setting up event listeners:", error);
      }
    };

    // Configurar event listeners después de un pequeño delay
    setTimeout(setupEventListeners, 100);

    // Aplicar estilos y etiquetas
    [mainEdge, perpendicularEdge].forEach((edge) => {
      edge.setZIndex(1000);
      edge.toFront();
    });

    // Aplicar etiquetas solo a la relación principal
    mainEdge.setLabels([
      {
        position: 0.1,
        attrs: {
          text: {
            text: "*",
            fontSize: 12,
            fill: "#7C3AED",
            fontWeight: "bold",
          },
        },
      },
      {
        position: 0.9,
        attrs: {
          text: {
            text: "*",
            fontSize: 12,
            fill: "#7C3AED",
            fontWeight: "bold",
          },
        },
      },
    ]);

    toast.success(`Relación muchos a muchos creada: ${intermediateName}`);
  }

  const handleGenerateCode = async () => {
    try {
      if (!graph) {
        toast.error("Error: No se pudo acceder al diagrama");
        return;
      }

      // ===== SOLO extraer datos del diagrama =====
      const clases = graph.getNodes().map((nodo: any, idx: number) => {
        const data = nodo.getData?.() ?? {};
        const rawName = data.name || `Clase_${idx + 1}`;
        const className = sanitizeIdentifier(rawName, `Clase_${idx + 1}`);

        const rawAttrs = coerceArrayOfLines(data.attributes);
        const attributes = rawAttrs
          .map((line, i) => {
            const [n, t] = String(line).split(":");
            const nombre = sanitizeIdentifier(n, `campo_${i + 1}`);
            const tipo = String(t ?? "String").trim() || "String";
            return `${nombre}: ${tipo}`;
          })
          .filter(Boolean);

        const rawMethods = coerceArrayOfLines(data.methods);
        const methods = rawMethods
          .map((m) => {
            const parsed = parseMethod(m);
            if (parsed) {
              const metodo = sanitizeIdentifier(parsed.nombre, "metodo");
              const params = parsed.parametros
                .map((p, k) => {
                  const [pn, pt] = p.split(":");
                  const pName = sanitizeIdentifier(pn, `p${k + 1}`);
                  const pType = String(pt ?? "String").trim() || "String";
                  return `${pName}: ${pType}`;
                })
                .join(", ");
              const ret = String(parsed.tipoRetorno || "void").trim();
              return `${metodo}(${params}): ${ret}`;
            }
            return m;
          })
          .filter(Boolean);

        return {
          name: String(className),
          attributes,
          methods,
          isAbstract: !!data.isAbstract,
          isInterface: !!data.isInterface,
        };
      });

      if (!clases.length) {
        toast.error("No hay clases en el diagrama");
        return;
      }

      const relaciones = graph.getEdges().map((edge: any) => {
        const data = edge.getData?.() ?? {};
        const source =
          sanitizeIdentifier(
            edge.getSourceCell?.()?.getData?.()?.name,
            "Source"
          ) || "Source";
        const target =
          sanitizeIdentifier(
            edge.getTargetCell?.()?.getData?.()?.name,
            "Target"
          ) || "Target";

        const edgeType = mapearTipoRelacion(edge.shape || data.type);

        // ✅ LEER multSource y multTarget (nombres usados en el Editor)
        const srcMult = String(
          data.multSource || data.sourceMultiplicity || ""
        ).trim();
        const tgtMult = String(
          data.multTarget || data.targetMultiplicity || ""
        ).trim();

        return {
          source,
          target,
          type: edgeType,
          bidirectional: !!data.bidirectional,
          sourceMultiplicity: srcMult,
          targetMultiplicity: tgtMult,
          name: String(data.name || "").trim(),
          navigationProperty: String(data.navigationProperty || "").trim(),
        };
      });

      // ===== USAR SOLO JavaSpringGenerator =====
      const generator = new JavaSpringGenerator("com.example");
      clases.forEach((cls) => generator.addClass(cls));
      relaciones.forEach((rel) => generator.addRelation(rel));

      // ✅ Obtener TODOS los archivos del generador
      const files = generator.generateAll();

      // ===== Crear ZIP con estructura correcta =====
      const zip = new JSZip();

      Object.entries(files).forEach(([filename, content]) => {
        const text = String(content ?? "");

        // Los archivos del generador ya vienen con rutas completas
        zip.file(filename, text);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spring-boot-project.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("¡Proyecto Spring Boot generado exitosamente!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar el proyecto");
    }
  };

  const handleGenerateFlutter = async () => {
    try {
      if (!graph) {
        toast.error("Error: No se pudo acceder al diagrama");
        return;
      }

      // ===== Extraer clases del diagrama =====
      const clases = graph.getNodes().map((nodo: any, idx: number) => {
        const data = nodo.getData?.() ?? {};
        const rawName = data.name || `Clase_${idx + 1}`;
        const className = sanitizeIdentifier(rawName, `Clase_${idx + 1}`);

        const rawAttrs = coerceArrayOfLines(data.attributes);
        const attributes = rawAttrs
          .map((line, i) => {
            const [n, t] = String(line).split(":");
            const nombre = sanitizeIdentifier(n, `campo_${i + 1}`);
            const tipo = String(t ?? "String").trim() || "String";
            return `${nombre}: ${tipo}`;
          })
          .filter(Boolean);

        const rawMethods = coerceArrayOfLines(data.methods);
        const methods = rawMethods
          .map((m) => {
            const parsed = parseMethod(m);
            if (parsed) {
              const metodo = sanitizeIdentifier(parsed.nombre, "metodo");
              const params = parsed.parametros
                .map((p, k) => {
                  const [pn, pt] = p.split(":");
                  const pName = sanitizeIdentifier(pn, `p${k + 1}`);
                  const pType = String(pt ?? "String").trim() || "String";
                  return `${pName}: ${pType}`;
                })
                .join(", ");
              const ret = String(parsed.tipoRetorno || "void").trim();
              return `${metodo}(${params}): ${ret}`;
            }
            return m;
          })
          .filter(Boolean);

        return {
          name: String(className),
          attributes,
          methods,
        };
      });

      if (!clases.length) {
        toast.error("No hay clases en el diagrama");
        return;
      }

      // ===== Extraer relaciones =====
      const relaciones = graph.getEdges().map((edge: any) => {
        const data = edge.getData?.() ?? {};
        const source =
          sanitizeIdentifier(
            edge.getSourceCell?.()?.getData?.()?.name,
            "Source"
          ) || "Source";
        const target =
          sanitizeIdentifier(
            edge.getTargetCell?.()?.getData?.()?.name,
            "Target"
          ) || "Target";

        const edgeType = mapearTipoRelacion(edge.shape || data.type);

        // ✅ LEER multSource y multTarget (nombres usados en el Editor)
        const srcMult = String(
          data.multSource || data.sourceMultiplicity || ""
        ).trim();
        const tgtMult = String(
          data.multTarget || data.targetMultiplicity || ""
        ).trim();

        return {
          source,
          target,
          type: edgeType,
          bidirectional: !!data.bidirectional,
          sourceMultiplicity: srcMult,
          targetMultiplicity: tgtMult,
          name: String(data.name || "").trim(),
          navigationProperty: String(data.navigationProperty || "").trim(),
        };
      });

      // ===== Crear generador Flutter =====
      // Nota: 10.0.2.2 es el host de tu máquina desde el emulador Android;
      // cámbialo por tu IP/puerto si vas a usar dispositivo físico o iOS.
      const flutterGen = new FlutterCrudGenerator({
        appName: "UmlCrudApp",
        packageName: "com.example.umlcrud",
        apiBaseUrl: "http://10.0.2.2:8080",
      });

      clases.forEach((cls) => flutterGen.addClass(cls));
      relaciones.forEach((rel) => flutterGen.addRelation(rel));

      const files = flutterGen.generateAll();

      // ===== Zip & download =====
      const zip = new JSZip();
      Object.entries(files).forEach(([filename, content]) => {
        zip.file(filename, String(content ?? ""));
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flutter-app.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("¡App Flutter CRUD generada!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar la app Flutter");
    }
  };

  // ======= Auxiliares POM / properties / Application.java =======

  const relationButtons: Array<{
    key: Tool;
    label: string;
    Icon: React.FC<{ className?: string }>;
  }> = [
    { key: "assoc", label: "Asociación", Icon: IconAssociation },
    { key: "nav", label: "Asociación directa", Icon: IconDirectedAssociation },
    { key: "aggr", label: "Agregación", Icon: IconAggregation },
    { key: "comp", label: "Composición", Icon: IconComposition },
    { key: "dep", label: "Dependencia", Icon: IconDependency },
    { key: "inherit", label: "Generalización", Icon: IconGeneralization },
    { key: "many-to-many", label: "Muchos a Muchos", Icon: IconManyToMany },
  ];

  return (
    <aside className="w-80 border-r border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-900/50 p-6 hidden md:flex md:flex-col glass">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors"
          title="Volver al dashboard"
        >
          <IconBack className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-bold leading-tight text-surface-900 dark:text-surface-100">
            Editor de Diagramas
          </h2>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
            UML
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-2 flex-1 space-y-6 overflow-y-auto -mr-3 pr-5">
        {/* Elements */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-2">
            <span className="w-4 h-4 rounded border-2 border-current" />
            Elementos
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onToolClick("class")}
              aria-pressed={tool === "class"}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                tool === "class"
                  ? "border-primary-300 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 shadow-sm"
                  : "border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-200 hover:bg-surface-200/60 dark:hover:bg-surface-800/60 hover:border-surface-300 dark:hover:border-surface-600"
              }`}
              title="Clic para colocar o arrastrar"
            >
              <div className="flex items-center justify-between">
                <span>Clase</span>
                <div
                  role="button"
                  aria-label="Arrastrar Clase"
                  draggable
                  onDragStart={onClassDragStart}
                  className="cursor-grab select-none rounded-md border border-dashed border-surface-300 dark:border-surface-600 px-2 py-1 text-xs text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                  title="Arrastra desde aquí"
                >
                  <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/></svg>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Relationships */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current stroke-2"><path d="M2 12 L14 4" /></svg>
            Relaciones
          </h3>
          <div className="space-y-2">
            {relationButtons.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => handleRelationTool(key)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all flex items-center gap-3 ${
                  tool === key
                    ? "border-primary-300 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 shadow-sm"
                    : "border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-200 hover:bg-surface-200/60 dark:hover:bg-surface-800/60 hover:border-surface-300 dark:hover:border-surface-600"
                }`}
              >
                <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Code Generation */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current stroke-2"><path d="M4 6L2 8L4 10"/><path d="M12 6L14 8L12 10"/><path d="M10 4L6 12"/></svg>
            Generación de Código
          </h3>
          <div className="space-y-2">
             <button
              onClick={handleGenerateCode}
              className="w-full btn-secondary justify-center !py-3"
              title="Generar código Spring Boot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M11.643 3.043A2.875 2.875 0 0 0 9.018 2.5a2.88 2.88 0 0 0-2.81 2.257 6.88 6.88 0 0 0-.233 1.834c0 .92.149 1.769.433 2.528.21.56.492 1.07.822 1.502.261.342.55.626.83.841.226.175.44.29.612.336.179.048.33.041.439-.011l.001-.001c.148-.07.252-.182.316-.321a.99.99 0 0 0-.012-.91c-.004-.007-.008-.014-.012-.021-.06-.11-.157-.2-.276-.263a.85.85 0 0 1-.365-.138c-.856-.474-1.33-1.432-1.33-2.428a4.83 4.83 0 0 1 1.284-3.414c.16-.19.348-.363.556-.51.4-.28.847-.466 1.314-.54a.75.75 0 0 0 .637-.738l.01-.133a.75.75 0 0 0-.585-.729c-.363-.075-.744-.117-1.13-.117-.113 0-.225.003-.335.008.002 0 .003-.001.005-.001Zm6.107.25a.75.75 0 0 0-.585.73l.01.132a.75.75 0 0 0 .637.738c.467.073.914.26 1.313.54.208.147.395.32.556.51a4.83 4.83 0 0 1 1.283 3.414c0 .996-.474 1.954-1.33 2.428a.85.85 0 0 1-.366.138c-.12.063-.217.153-.276.263a.62.62 0 0 0-.012.021.99.99 0 0 0-.012.91c.064.14.168.25.316.32l.001.002c.108.05.26.057.44.01.171-.045.385-.16.611-.335.28-.215.57-.499.831-.84.33-.433.612-.943.822-1.503.284-.759.433-1.608.433-2.528a6.88 6.88 0 0 0-.232-1.834A2.88 2.88 0 0 0 18.98 2.5a2.875 2.875 0 0 0-2.625.543l-.002.001-.003.002-.002.001ZM8.01 12.112a5.55 5.55 0 0 0-2.886.63c-1.34.66-2.268 1.94-2.268 3.391 0 .868.29 1.67.828 2.362.532.684 1.28 1.213 2.15 1.527a.75.75 0 0 0 .445-1.393.84.84 0 0 1-.295-.145c-.31-.149-.55-.35-.712-.587a3.89 3.89 0 0 1-.416-1.164c0-.986.6-1.864 1.545-2.345a.75.75 0 0 0 .506-1.276Zm8.425.435a.75.75 0 0 0-1.012-.506c-1.04.48-1.545 1.36-1.545 2.345a3.89 3.89 0 0 1-.416 1.164c-.162.237-.402.438-.712.587a.84.84 0 0 1-.295.145.75.75 0 0 0 .445 1.393c.87-.314 1.618-.843 2.15-1.527.539-.692.828-1.494.828-2.362 0-1.45-.928-2.73-2.268-3.391a5.55 5.55 0 0 0-1.374-.47Z" /></svg>
              Generar Código Spring
            </button>

            <button
              onClick={handleGenerateFlutter}
              className="w-full btn-secondary justify-center !py-3"
              title="Generar App Flutter (CRUD)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.9 2.6l8.8 8.8-10.4 10.4-8.8-8.8L12.9 2.6zM7.5 13.3l4.4 4.4 4.4-4.4-4.4-4.4-4.4 4.4z"/>
              </svg>
              Generar App Flutter
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}


// Agregar al final del archivo, ANTES del export default:

export function reconnectManyToManyRelations(graph: Graph) {
  // Buscar todas las relaciones muchos a muchos al cargar
  const manyToManyEdges = graph
    .getEdges()
    .filter((edge) => edge.getData()?.isManyToManyRelation);

  manyToManyEdges.forEach((mainEdge) => {
    const edgeData = mainEdge.getData();
    const intermediateNodeId = edgeData?.intermediateNodeId;

    if (intermediateNodeId) {
      const intermediateNode = graph.getCellById(intermediateNodeId);
      const sourceNode = mainEdge.getSourceCell();
      const targetNode = mainEdge.getTargetCell();

      if (intermediateNode && sourceNode && targetNode) {
        // Buscar la línea perpendicular
        const perpendicularEdge = graph
          .getEdges()
          .find(
            (edge) =>
              edge.getData()?.isPerpendicularEdge &&
              edge.getData()?.mainEdgeId === mainEdge.id
          );

        if (perpendicularEdge) {
          // Buscar el marcador del punto medio
          const midPointMarker = graph
            .getNodes()
            .find(
              (node) =>
                node.getData()?.isMidPointMarker &&
                node.getData()?.mainEdgeId === mainEdge.id
            );

          if (midPointMarker) {
            // Reconfigurar event listeners
            const updatePositions = () => {
              const center1 = sourceNode.getBBox().center;
              const center2 = targetNode.getBBox().center;
              const newMidX = (center1.x + center2.x) / 2;
              const newMidY = (center1.y + center2.y) / 2;

              (midPointMarker as any).setPosition(newMidX - 1, newMidY - 1);

              // Actualizar posición de la clase intermedia
              const dx = center2.x - center1.x;
              const dy = center2.y - center1.y;
              const length = Math.sqrt(dx * dx + dy * dy);

              if (length > 0) {
                const perpX = -dy / length;
                const perpY = dx / length;
                const offset = 100;

                const newIntermediateX = newMidX + perpX * offset;
                const newIntermediateY = newMidY + perpY * offset;

                (intermediateNode as any).setPosition(
                  newIntermediateX - 90,
                  newIntermediateY - 60
                );
              }
            };

            (sourceNode as any).on("change:position", updatePositions);
            (targetNode as any).on("change:position", updatePositions);
          }
        }
      }
    }
  });
}
