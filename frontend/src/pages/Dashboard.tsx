// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getAuthToken, applyAxiosAuthHeader } from "../lib/auth";
import { useAuth } from "../state/AuthContext";
import { io, Socket } from "socket.io-client";
import { useTheme } from "../state/ThemeContext";

/* ===================== Types ===================== */
type Project = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | string;
};

type EditRequestNotif = {
  requestId: string;
  projectId: string;
  projectName?: string | null;
  requesterId: string;
  requesterName?: string | null;
  message?: string | null;
  createdAt?: string | null;
};

/* ===================== UI Icons ===================== */
function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
    </svg>
  );
}

function IconFolder(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h5l2 3h11v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
    </svg>
  );
}

function IconSparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zm14 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    </svg>
  );
}

function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 0 1-6 0" />
    </svg>
  );
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconSun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconMoon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconLogout(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* ===================== Role Badge ===================== */
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300",
    ADMIN: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    EDITOR: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    VIEWER: "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400",
  };
  return (
    <span className={`badge ${styles[role] || styles.VIEWER}`}>
      {role}
    </span>
  );
}

/* ===================== Create Project Modal ===================== */
function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponle un nombre al proyecto");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<Project>("/projects", { name, description });
      onCreated(data);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "No se pudo crear";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-surface-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 card glass p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100">Nuevo proyecto</h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Crea un canvas para tu diagrama UML colaborativo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Nombre del proyecto
            </label>
            <input
              className="input"
              placeholder="Ej. Sistema de Ventas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Descripción (opcional)
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              rows={3}
              placeholder="Breve descripción del proyecto…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creando…
                </>
              ) : (
                <>
                  <IconPlus className="h-4 w-4" />
                  Crear proyecto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Import Model Modal ===================== */
function ImportModelModal({
  open,
  onClose,
  onImported,
  token,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (p: Project) => void;
  token: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"image" | "json">("image");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setActiveTab("image");
      setName("");
      setDescription("");
      setFile(null);
      setError(null);
      setLoading(false);
      setPreview(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);

    if (activeTab === "image" && f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del proyecto es requerido");
      return;
    }
    if (!file) {
      setError(`Selecciona un archivo ${activeTab === "image" ? "de imagen" : "JSON"}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Crear el proyecto
      const { data: project } = await api.post<Project>("/projects", { name, description }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (activeTab === "image") {
        // 2a. Escanear imagen con IA
        const formData = new FormData();
        formData.append("image", file);

        const scanRes = await fetch("/api/ai/scan-diagram", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });

        if (!scanRes.ok) {
          throw new Error("Error al escanear la imagen. Intenta con otra imagen más clara.");
        }

        const scanData = await scanRes.json();
        const classes = scanData.suggestions?.classes || [];
        const relations = scanData.suggestions?.relations || [];

        if (classes.length === 0) {
          throw new Error("No se detectaron clases en la imagen. Intenta con otra imagen.");
        }

        // Guardar las clases pendientes en localStorage para que el editor las cree
        localStorage.setItem(`pendingImport_${project.id}`, JSON.stringify({
          classes,
          relations,
          timestamp: Date.now(),
        }));

      } else {
        // 2b. Importar desde JSON
        const text = await file.text();
        let jsonData: any;

        try {
          jsonData = JSON.parse(text);
        } catch {
          throw new Error("El archivo no es un JSON válido");
        }

        // Validar estructura
        const nodes = jsonData.nodes || jsonData.cells?.filter((c: any) => c.shape) || [];
        const edges = jsonData.edges || jsonData.cells?.filter((c: any) => c.source && c.target) || [];

        if (!Array.isArray(nodes)) {
          throw new Error("El JSON no tiene una estructura de diagrama válida");
        }

        // Guardar el diagrama
        await api.put(`/projects/${project.id}/diagram`, {
          nodes,
          edges,
          updatedAt: new Date().toISOString(),
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      }

      onImported(project);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Error al importar";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-surface-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 card glass p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100">Importar modelo</h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Importa un diagrama desde imagen o archivo JSON.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 mb-5 rounded-xl bg-surface-100 dark:bg-surface-800">
          <button
            type="button"
            onClick={() => { setActiveTab("image"); setFile(null); setPreview(null); setError(null); }}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "image"
                ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200"
            }`}
          >
            📷 Desde imagen
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("json"); setFile(null); setPreview(null); setError(null); }}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "json"
                ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200"
            }`}
          >
            📄 Desde JSON
          </button>
        </div>

        <form onSubmit={handleImport} className="space-y-5">
          {/* Nombre del proyecto */}
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Nombre del proyecto
            </label>
            <input
              className="input"
              placeholder="Ej. Diagrama Importado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Descripción (opcional)
            </label>
            <input
              className="input"
              placeholder="Breve descripción…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* File input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
              {activeTab === "image" ? "Imagen del diagrama" : "Archivo JSON"}
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 p-6 text-center transition-colors"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
              ) : file ? (
                <div className="text-surface-600 dark:text-surface-400">
                  <span className="text-2xl">📄</span>
                  <p className="mt-2 text-sm font-medium">{file.name}</p>
                </div>
              ) : (
                <div className="text-surface-500 dark:text-surface-400">
                  <span className="text-3xl">{activeTab === "image" ? "📷" : "📁"}</span>
                  <p className="mt-2 text-sm">
                    {activeTab === "image"
                      ? "Haz clic para subir una imagen (PNG, JPG)"
                      : "Haz clic para subir un archivo JSON"}
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={activeTab === "image" ? "image/*" : ".json,application/json"}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Info text */}
          <p className="text-xs text-surface-500 dark:text-surface-400">
            {activeTab === "image"
              ? "💡 La IA detectará automáticamente las clases y relaciones del diagrama."
              : "💡 El JSON debe contener un array de nodos con la estructura del diagrama."}
          </p>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importando…
                </>
              ) : (
                <>
                  <IconPlus className="h-4 w-4" />
                  Importar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Project Card ===================== */
function ProjectCard({
  p,
  onOpen,
  onDelete,
}: {
  p: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card-hover p-5 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl bg-primary-100 dark:bg-primary-900/50 p-2.5 text-primary-600 dark:text-primary-400 flex-shrink-0">
            <IconFolder className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="line-clamp-1 text-base font-semibold text-surface-900 dark:text-surface-100">
              {p.name}
            </h4>
            <p className="mt-0.5 line-clamp-2 text-sm text-surface-500 dark:text-surface-400">
              {p.description || "Sin descripción"}
            </p>
          </div>
        </div>
        {p.role && <RoleBadge role={p.role} />}
      </div>

      <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
        <span className="text-xs text-surface-400 dark:text-surface-500">
          {new Date(p.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onOpen(p.id)}
            className="btn-primary !py-1.5 !px-3 !text-xs !rounded-lg"
          >
            Abrir
          </button>
          <button
            onClick={() => onDelete(p.id)}
            title="Eliminar proyecto"
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Empty State ===================== */
function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-12 text-center">
      <div className="rounded-2xl bg-primary-100 dark:bg-primary-900/50 p-4 text-primary-600 dark:text-primary-400">
        <IconSparkles className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-surface-900 dark:text-surface-100">
        Aún no tienes proyectos
      </h3>
      <p className="mt-2 max-w-md text-sm text-surface-500 dark:text-surface-400">
        Crea tu primer proyecto para empezar a diagramar clases UML y colaborar en tiempo real.
      </p>
      <button onClick={onCreate} className="btn-primary mt-6">
        <IconPlus className="h-4 w-4" /> Nuevo proyecto
      </button>
    </div>
  );
}

/* ===================== Notification Dropdown ===================== */
function NotificationDropdown({
  requests,
  onApprove,
  onReject,
  onClear,
}: {
  requests: EditRequestNotif[];
  onApprove: (projectId: string, requesterId: string) => void;
  onReject: (projectId: string, requesterId: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] card glass p-4 shadow-2xl animate-slide-down">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
          Solicitudes de edición
        </h4>
        {requests.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-4 text-center">
          <IconBell className="h-8 w-8 mx-auto text-surface-300 dark:text-surface-600" />
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            No hay solicitudes pendientes
          </p>
        </div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-auto">
          {requests.map((r) => (
            <div
              key={r.requestId}
              className="rounded-xl border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                    {r.requesterName || "Usuario desconocido"}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                    Proyecto: {r.projectName || r.projectId.slice(0, 8) + "..."}
                  </p>
                  {r.message && (
                    <p className="mt-1.5 text-xs italic text-surface-600 dark:text-surface-400 line-clamp-2">
                      "{r.message}"
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onApprove(r.projectId, r.requesterId)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  <IconCheck className="h-3.5 w-3.5" /> Aprobar
                </button>
                <button
                  onClick={() => onReject(r.projectId, r.requesterId)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-surface-200 dark:bg-surface-700 px-3 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
                >
                  <IconX className="h-3.5 w-3.5" /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Main Dashboard ===================== */
export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [requests, setRequests] = useState<EditRequestNotif[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const createdSocketOnce = useRef(false);

  const effectiveToken = useMemo(() => getAuthToken(token), [token]);

  useEffect(() => {
    applyAxiosAuthHeader(effectiveToken);
  }, [effectiveToken]);

  const filtered = useMemo(() => {
    if (!projects) return [] as Project[];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  async function loadProjects() {
    setError(null);
    try {
      const { data } = await api.get<Project[]>("/projects", {
        headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : undefined,
      });
      setProjects(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setError("No pudimos validar tu sesión. Reintenta actualizar.");
      } else {
        const msg = err?.response?.data?.message || err?.message || "No se pudieron cargar los proyectos";
        setError(msg);
      }
      setProjects([]);
    }
  }

  // Cargar solicitudes pendientes desde el servidor
  async function loadPendingRequests() {
    if (!effectiveToken) return;
    try {
      console.log("[Dashboard] Cargando solicitudes pendientes...");
      const { data } = await api.get<EditRequestNotif[]>("/projects/pending-requests", {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      console.log("[Dashboard] Solicitudes pendientes recibidas:", data);
      setRequests(data);
    } catch (err) {
      // Silenciar errores de carga de solicitudes
      console.warn("[Dashboard] Error al cargar solicitudes pendientes:", err);
    }
  }

  useEffect(() => {
    if (!effectiveToken) {
      setProjects([]);
      setError("No estás autenticado. Por favor inicia sesión.");
      return;
    }
    loadProjects();
    loadPendingRequests(); // Cargar solicitudes pendientes al iniciar
  }, [effectiveToken]);

  const openProject = (id: string) => {
    const ts = Date.now();
    navigate(`/app/projects/${id}?t=${ts}`);
  };

  const handleDeleteProject = async (id: string) => {
    const ok = window.confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      await api.delete(`/projects/${id}`, {
        headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : undefined,
      });
      setProjects((prev) => (prev ? prev.filter((x) => x.id !== id) : []));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "No se pudo eliminar el proyecto";
      window.alert(msg);
    }
  };

  // Socket: notifications
  useEffect(() => {
    if (!effectiveToken) return;
    if (createdSocketOnce.current) return;
    createdSocketOnce.current = true;

    const raw = (import.meta as any).env?.VITE_SOCKET_URL ?? (import.meta as any).env?.VITE_API_URL ?? "";
    let socketBase = (raw || window.location.origin).replace(/\/api\/?$/, "").replace(/\/$/, "");
    const socketPath = (import.meta as any).env?.VITE_SOCKET_PATH ?? "/socket.io";

    const s = io(`${socketBase}/diagram`, {
      path: socketPath,
      transports: ["polling", "websocket"],
      withCredentials: true,
      auth: { token: effectiveToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 600,
      timeout: 8000,
      extraHeaders: { Authorization: `Bearer ${effectiveToken}` },
    });

    socketRef.current = s;

    s.on("connect", () => {
      console.log("[Dashboard Socket] Conectado, uniéndose a sala de owner...");
      s.emit("joinOwner", { authToken: effectiveToken });
    });

    s.on("editRequest", (payload: EditRequestNotif) => {
      console.log("[Dashboard Socket] Recibido editRequest:", payload);
      setRequests((prev) => {
        if (prev.some((r) => r.requestId === payload.requestId)) return prev;
        return [payload, ...prev];
      });
    });

    s.on("memberUpdated", ({ userId, requesterId }: any) => {
      const uid = userId ?? requesterId;
      setRequests((prev) => prev.filter((r) => r.requesterId !== uid));
    });

    return () => {
      try {
        s.removeAllListeners();
        s.disconnect();
      } catch {}
      socketRef.current = null;
      createdSocketOnce.current = false;
    };
  }, [effectiveToken]);

  // Click outside to close dropdown
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!notifRef.current) return;
      if (!notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const approveRequest = async (projectId: string, requesterId: string) => {
    const s = socketRef.current;
    if (s) {
      s.emit("approveEdit", { projectId, userId: requesterId, role: "EDITOR" });
    }
    setRequests((prev) =>
      prev.filter((r) => !(r.projectId === projectId && r.requesterId === requesterId))
    );
  };

  const rejectRequest = async (projectId: string, requesterId: string) => {
    try {
      await api.post(`/projects/${projectId}/reject-edit`, { targetUserId: requesterId });
    } catch {}
    setRequests((prev) =>
      prev.filter((r) => !(r.projectId === projectId && r.requesterId === requesterId))
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 gradient-mesh transition-colors duration-300">
      {/* Topbar */}
      <header className="sticky top-0 z-40 glass border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl gradient-primary p-2.5 text-white shadow-glow">
              <IconFolder className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100 leading-tight">
                UML Collaborator
              </h1>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {user?.name ? `Hola, ${user.name}` : "Dashboard"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                title="Notificaciones"
              >
                <IconBell className="h-5 w-5" />
                {requests.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white animate-pulse-slow">
                    {requests.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <NotificationDropdown
                  requests={requests}
                  onApprove={approveRequest}
                  onReject={rejectRequest}
                  onClear={() => setRequests([])}
                />
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors"
              title="Cerrar sesión"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Quick actions & Search */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setCreating(true)} className="btn-primary">
              <IconPlus className="h-4 w-4" /> Nuevo proyecto
            </button>
            <button onClick={() => setImporting(true)} className="btn-secondary">
              Importar modelo
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-10"
              placeholder="Buscar proyecto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Projects list */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
              Tus proyectos
              {projects && projects.length > 0 && (
                <span className="ml-2 text-surface-400 dark:text-surface-500">({projects.length})</span>
              )}
            </h2>
            <button
              onClick={loadProjects}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Actualizar
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4 text-sm text-amber-800 dark:text-amber-300">
              {error}
            </div>
          )}

          {projects === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-32 animate-pulse">
                  <div className="h-full w-full rounded-2xl bg-gradient-to-br from-surface-100 to-surface-50 dark:from-surface-800 dark:to-surface-900" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            query ? (
              <div className="text-center py-12">
                <IconSearch className="h-12 w-12 mx-auto text-surface-300 dark:text-surface-600" />
                <p className="mt-4 text-surface-600 dark:text-surface-400">
                  No se encontraron proyectos para "{query}"
                </p>
              </div>
            ) : (
              <EmptyProjects onCreate={() => setCreating(true)} />
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProjectCard key={p.id} p={p} onOpen={openProject} onDelete={handleDeleteProject} />
              ))}
            </div>
          )}
        </section>
      </main>

      <CreateProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(p) => {
          setProjects((prev) => (prev ? [p, ...prev] : [p]));
          setCreating(false);
          const ts = Date.now();
          navigate(`/app/projects/${p.id}?t=${ts}`);
        }}
      />

      <ImportModelModal
        open={importing}
        onClose={() => setImporting(false)}
        token={effectiveToken}
        onImported={(p) => {
          setProjects((prev) => (prev ? [p, ...prev] : [p]));
          setImporting(false);
          const ts = Date.now();
          navigate(`/app/projects/${p.id}?t=${ts}`);
        }}
      />
    </div>
  );
}
