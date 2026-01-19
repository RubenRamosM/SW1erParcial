import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { Graph } from "@antv/x6";
import { MiniMap as X6MiniMap } from "@antv/x6-plugin-minimap";
import { Export } from "@antv/x6-plugin-export";
import type { Tool } from "./Sidebar";
import { IconCenter, IconCursor, IconZoomIn, IconZoomOut } from "../icons";
import { Save, Share2, Download, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

type Props = {
  graph: Graph | null;
  tool: Tool;
  onToolClick: (t: Tool) => void;
  onSave?: () => Promise<void>;
  disabled?: boolean;
  exportName?: string;
  onGetShareLink?: () => Promise<string>;
  canShare?: boolean;
  theme?: "light" | "dark";
};

/** Crea u obtiene un div persistente en body (no se remueve nunca) */
function ensureRoot(id: string, style?: Partial<CSSStyleDeclaration>) {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
  if (style) Object.assign(el.style, style);
  return el;
}

export default function DiagramControls({
  graph,
  tool,
  onToolClick,
  onSave,
  disabled = false,
  exportName = "diagram",
  onGetShareLink,
  theme = "light",
}: Props) {
  // ---- Estado mínimo de UI ----
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ top: 16, left: "50%" });

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Cerrar menú al click afuera (seguro)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ===== DRAG HANDLERS =====
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!toolbarRef.current) return;
    const rect = toolbarRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        top: e.clientY - dragOffset.current.y,
        left: e.clientX - dragOffset.current.x + "px",
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Instalar Export una sola vez por graph
  useLayoutEffect(() => {
    if (!graph) return;
    if (!(graph as any).__exportInstalled) {
      graph.use(new Export());
      (graph as any).__exportInstalled = true;
    }
  }, [graph]);

  // ========= Raíz persistente para TOOLBAR en <body> =========
  const toolbarRoot = useMemo(() => {
    if (typeof document === "undefined") return null;
    return ensureRoot("diagram-toolbar-root", {
      position: "fixed",
      left: position.left as string,
      top: position.top + "px",
      transform: typeof position.left === "string" && position.left.includes("%") ? "translateX(-50%)" : "none",
      zIndex: "60",
      pointerEvents: "none",
    });
  }, [position]);

  // ========= MiniMap FUERA de React en raíz persistente =========
  const minimapRoot = useMemo(() => {
    if (typeof document === "undefined") return null;
    const isDark = theme === "dark";
    return ensureRoot("x6-minimap-root", {
      position: "fixed",
      right: "1rem",
      bottom: "1rem",
      zIndex: "50",
      background: isDark ? "rgba(24, 24, 27, 0.8)" : "rgba(250, 250, 250, 0.8)",
      border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
      borderRadius: "0.75rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      padding: "0.5rem",
      pointerEvents: "auto",
      backdropFilter: "blur(8px)",
    });
  }, [theme]);

  const minimapInstanceRef = useRef<X6MiniMap | null>(null);

  useLayoutEffect(() => {
    if (!graph || !minimapRoot) return;

    // Limpia contenido (NO remover root)
    minimapRoot.innerHTML = "";

    // Contenedor no-React para el plugin
    const inner = document.createElement("div");
    Object.assign(inner.style, {
      width: "200px",
      height: "140px",
      padding: "8px",
    } as CSSStyleDeclaration);
    minimapRoot.appendChild(inner);

    const mm = new X6MiniMap({
      container: inner,
      width: 200,
      height: 140,
      padding: 8,
    });
    graph.use(mm);
    minimapInstanceRef.current = mm;

    // Cleanup: dispose plugin, limpiar contenido (root persiste)
    return () => {
      try {
        minimapInstanceRef.current?.dispose?.();
      } catch {}
      minimapInstanceRef.current = null;
      minimapRoot.innerHTML = "";
    };
  }, [graph, minimapRoot]);

  // ===== Acciones =====
  const toolbarDisabled = disabled || !graph;
  const zoomIn = () => graph?.zoom(0.1);
  const zoomOut = () => graph?.zoom(-0.1);
  const center = () => graph?.centerContent();

  const exportPNG = async () => {
    setShowExportMenu(false);
    if (!graph) return;
    try {
      const nodes = graph.getNodes();
      if (nodes.length === 0) {
        toast.error("No hay contenido para exportar");
        return;
      }
      toast.loading("Generando PNG...", { id: "export-png" });
      const { default: html2canvas } = await import("html2canvas");
      const container = graph.container as HTMLElement;
      const canvas = await html2canvas(container, {
        background: theme === "dark" ? "#18181b" : "#fafafa",
        useCORS: true,
        allowTaint: true,
      });
      canvas.toBlob(
        (blob) => {
          if (!blob)
            return toast.error("Error al generar PNG", { id: "export-png" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `${exportName}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("PNG exportado correctamente ✅", { id: "export-png" });
        },
        "image/png",
        1.0
      );
    } catch (err) {
      console.error("Error al exportar PNG:", err);
      toast.error("Error al exportar PNG", { id: "export-png" });
    }
  };

  const exportPDF = async () => {
    setShowExportMenu(false);
    if (!graph) return;
    try {
      const nodes = graph.getNodes();
      if (nodes.length === 0) {
        toast.error("No hay contenido para exportar");
        return;
      }
      toast.loading("Generando PDF...", { id: "export-pdf" });
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const container = graph.container as HTMLElement;
      const canvas = await html2canvas(container, {
        background: theme === "dark" ? "#18181b" : "#fafafa",
        useCORS: true,
        allowTaint: true,
      });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdfWidth = 297;
      const pdfHeight = 210;
      const canvasAspect = canvas.width / canvas.height;
      const pdfAspect = pdfWidth / pdfHeight;
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      if (canvasAspect > pdfAspect) finalHeight = pdfWidth / canvasAspect;
      else finalWidth = pdfHeight * canvasAspect;
      const offsetX = (pdfWidth - finalWidth) / 2;
      const offsetY = (pdfHeight - finalHeight) / 2;
      pdf.addImage(imgData, "PNG", offsetX, offsetY, finalWidth, finalHeight);
      pdf.save(`${exportName}.pdf`);
      toast.success("PDF exportado correctamente ✅", { id: "export-pdf" });
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      toast.error("Error al exportar PDF", { id: "export-pdf" });
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      await onSave();
      toast.success("Diagrama guardado correctamente");
    } catch (e) {
      console.error("Error al guardar", e);
      toast.error("Error al guardar");
    }
  };

  const handleShare = async () => {
    if (sharing || !onGetShareLink) return;
    try {
      setSharing(true);
      const url = await onGetShareLink();
      if (typeof url === "string" && url.length > 0) {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Enlace copiado al portapapeles 🔗");
        } catch {
          window.prompt("Copia el enlace:", url);
          toast.success("Enlace generado. Cópialo desde el cuadro.");
        }
      } else {
        toast.error("No se pudo generar el enlace de compartir.");
      }
    } catch (err) {
      console.error("Compartir enlace error:", err);
      toast.error("Error al generar el enlace de compartir.");
    } finally {
      setSharing(false);
    }
  };

  // ===== Toolbar UI (portal) =====
  const toolbar = (
    <div
      ref={toolbarRef}
      role="toolbar"
      key="diagram-toolbar"
      style={{ 
        pointerEvents: "auto",
        cursor: isDragging ? "grabbing" : "grab"
      }}
      className="card glass flex flex-col gap-1 p-1.5"
    >
      {/* Header con botón de minimizar/maximizar */}
      <div 
        className="flex items-center justify-between px-2 py-1 border-b border-surface-200 dark:border-surface-700"
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
          Herramientas
        </span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn-ghost !p-1 !rounded"
          title={isCollapsed ? "Expandir" : "Minimizar"}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Contenido colapsable */}
      {!isCollapsed && (
        <div className="flex items-center gap-1">
          {/* Cursor */}
          <button
            onClick={() => onToolClick("cursor")}
            disabled={toolbarDisabled}
            className={`btn-ghost !rounded-lg !px-3 !py-2 ${tool === "cursor" ? "!bg-surface-200 dark:!bg-surface-700" : ""}`}
            title="Cursor"
          >
            <IconCursor className="mr-1 inline h-4 w-4" />
            Cursor
          </button>

          <span className="mx-1 h-6 w-px bg-surface-200 dark:bg-surface-700" />

          {/* Zoom */}
          <button
            onClick={zoomOut}
            disabled={toolbarDisabled}
            title="Zoom out"
            className="btn-ghost !rounded-lg !p-2"
          >
            <IconZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={zoomIn}
            disabled={toolbarDisabled}
            title="Zoom in"
            className="btn-ghost !rounded-lg !p-2"
          >
            <IconZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={center}
            disabled={toolbarDisabled}
            title="Center"
            className="btn-ghost !rounded-lg !p-2"
          >
            <IconCenter className="h-5 w-5" />
          </button>

          {/* Guardar */}
          {onSave && (
            <>
              <span className="mx-1 h-6 w-px bg-surface-200 dark:bg-surface-700" />
              <button
                onClick={handleSave}
                disabled={toolbarDisabled}
                title="Guardar diagrama"
                className="btn-ghost !rounded-lg !p-2"
              >
                <Save className="h-5 w-5" />
              </button>
            </>
          )}

          <span className="mx-1 h-6 w-px bg-surface-200 dark:bg-surface-700" />

          {/* Exportar */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={toolbarDisabled}
              className="btn-ghost !rounded-lg !px-3 !py-2"
            >
              <Download className="h-4 w-4" />
              Exportar
              <ChevronDown className="h-3 w-3 ml-1" />
            </button>

            {showExportMenu && !toolbarDisabled && (
              <div className="absolute top-full mt-1 right-0 card glass p-1 min-w-[160px] z-20">
                <button
                  onClick={exportPNG}
                  className="w-full text-left rounded-md px-3 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center gap-2"
                >
                  <span aria-hidden>🖼️</span>
                  Exportar PNG
                </button>
                <button
                  onClick={exportPDF}
                  className="w-full text-left rounded-md px-3 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center gap-2"
                >
                  <span aria-hidden>📄</span>
                  Exportar PDF
                </button>
              </div>
            )}
          </div>

          {/* Compartir */}
          {onGetShareLink && (
            <>
              <span className="mx-1 h-6 w-px bg-surface-200 dark:bg-surface-700" />
              <button
                onClick={handleShare}
                disabled={sharing}
                title="Compartir enlace del proyecto"
                className="btn-ghost !rounded-lg !px-3 !py-2"
              >
                <Share2 className="h-5 w-5 mr-1" />
                {sharing ? "Generando..." : "Compartir"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (!toolbarRoot) return null;
  return ReactDOM.createPortal(toolbar, toolbarRoot);
}
