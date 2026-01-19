# 📚 DOCUMENTACIÓN COMPLETA DEL PROYECTO
## Editor de Diagramas UML con Generación de Código Automático
### Versión 1.0 - Enero 2026

---

## 📋 TABLA DE CONTENIDOS

1. [¿Qué es este proyecto?](#qué-es-este-proyecto)
2. [¿Para qué sirve?](#para-qué-sirve)
3. [Arquitectura General](#arquitectura-general)
4. [Tecnologías Utilizadas](#tecnologías-utilizadas)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Backend - Servidor](#backend---servidor)
7. [Frontend - Interfaz de Usuario](#frontend---interfaz-de-usuario)
8. [Base de Datos](#base-de-datos)
9. [Características Principales](#características-principales)
10. [Colaboración en Tiempo Real](#colaboración-en-tiempo-real)
11. [Inteligencia Artificial](#inteligencia-artificial)
12. [Generación de Código](#generación-de-código)
13. [Cómo Funciona](#cómo-funciona)
14. [Instalación y Configuración](#instalación-y-configuración)
15. [Endpoints de API](#endpoints-de-api)
16. [Flujos de Usuario](#flujos-de-usuario)
17. [Seguridad](#seguridad)
18. [Testing y Calidad](#testing-y-calidad)
19. [Despliegue](#despliegue)
20. [Glosario de Términos](#glosario-de-términos)

---

## 🎯 ¿QUÉ ES ESTE PROYECTO?

Este es un **Editor de Diagramas UML** (Unified Modeling Language - Lenguaje de Modelado Unificado) en línea que permite a los desarrolladores:

- **Crear diagramas de clases** de manera visual
- **Colaborar en tiempo real** con otros usuarios
- **Generar código automáticamente** en Java Spring Boot
- **Usar Inteligencia Artificial** para asistencia y sugerencias
- **Compartir y exportar** diagramas en múltiples formatos

### Analogía Simple
Piensa en este proyecto como "Google Docs pero para dibujar diagramas de programación". Varios usuarios pueden trabajar al mismo tiempo, hay un asistente inteligente que ayuda, y al final el sistema puede convertir esos dibujos en código real que funciona.

---

## 💡 ¿PARA QUÉ SIRVE?

### Problema que Resuelve
Cuando los programadores diseñan sistemas, necesitan:
1. **Planificar** cómo se relacionan las diferentes partes
2. **Comunicar** el diseño al equipo
3. **Generar código base** repetitivo

Tradicionalmente esto toma mucho tiempo y es propenso a errores.

### Solución
Este proyecto automatiza y simplifica todo el proceso:
- **Diseño Visual**: Arrastra, suelta y conecta clases
- **Colaboración**: Todo el equipo trabaja simultáneamente
- **IA Asistente**: Sugiere mejoras y genera elementos
- **Código Automático**: Genera Java Spring Boot listo para usar

---

## 🏗️ ARQUITECTURA GENERAL

El proyecto sigue una arquitectura **Cliente-Servidor** con **3 capas principales**:

```
┌─────────────────────────────────────────────────────────┐
│                      NAVEGADOR WEB                       │
│                  (Frontend - React)                      │
│  - Interfaz visual                                       │
│  - Editor de diagramas                                   │
│  - Chat con IA                                          │
└───────────────┬────────────────────────────────────────┘
                │ HTTP/WebSocket
                │ (Internet)
                ▼
┌─────────────────────────────────────────────────────────┐
│                   SERVIDOR BACKEND                       │
│                  (NestJS + Node.js)                      │
│  - API REST                                             │
│  - WebSockets (tiempo real)                             │
│  - Autenticación                                        │
│  - IA (Groq API)                                        │
│  - Generación de código                                 │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│                  BASE DE DATOS                           │
│                   (PostgreSQL)                           │
│  - Usuarios                                              │
│  - Proyectos                                             │
│  - Diagramas                                            │
│  - Permisos                                              │
└──────────────────────────────────────────────────────────┘
```

### Flujo de Datos Simplificado:
1. **Usuario** dibuja en el navegador → 
2. **Frontend** envía datos al servidor →
3. **Backend** procesa y guarda en **Base de Datos** →
4. **Backend** notifica a otros usuarios conectados →
5. **Frontend** de otros usuarios se actualiza automáticamente

---

## 🛠️ TECNOLOGÍAS UTILIZADAS

### Backend (Servidor)

#### 1. **NestJS** - Framework Principal
- **¿Qué es?**: Un framework (estructura) para construir aplicaciones de servidor con Node.js
- **¿Por qué?**: Organizado, escalable, fácil de mantener
- **Ubicación**: `backend/`
- **Versión**: 11.0.1

#### 2. **Node.js** - Entorno de Ejecución
- **¿Qué es?**: Permite ejecutar JavaScript en el servidor (fuera del navegador)
- **¿Por qué?**: Rápido, asíncrono, ideal para aplicaciones en tiempo real
- **Versión requerida**: 18+

#### 3. **TypeScript** - Lenguaje de Programación
- **¿Qué es?**: JavaScript con tipos (más seguro y predecible)
- **¿Por qué?**: Detecta errores antes de ejecutar, mejor autocompletado
- **Ubicación**: Todos los archivos `.ts`

#### 4. **Prisma** - ORM (Object-Relational Mapping)
- **¿Qué es?**: Traductor entre código y base de datos
- **¿Por qué?**: Escribes código en lugar de SQL, más seguro
- **Ubicación**: `backend/prisma/schema.prisma`
- **Versión**: 6.16.2

#### 5. **PostgreSQL** - Base de Datos
- **¿Qué es?**: Sistema para guardar información de forma estructurada
- **¿Por qué?**: Confiable, potente, soporta relaciones complejas
- **Conexión**: Variable de entorno `DATABASE_URL`

#### 6. **Socket.IO** - Comunicación en Tiempo Real
- **¿Qué es?**: Permite comunicación bidireccional instantánea
- **¿Por qué?**: Múltiples usuarios ven cambios al instante
- **Ubicación**: `backend/src/diagram-realtime/`
- **Versión**: 4.8.1

#### 7. **Yjs** - CRDT para Colaboración
- **¿Qué es?**: Conflict-free Replicated Data Type - maneja ediciones simultáneas
- **¿Por qué?**: Evita conflictos cuando varios usuarios editan al mismo tiempo
- **Ubicación**: Integrado en WebSocket gateway
- **Versión**: 13.6.27

#### 8. **JWT (JSON Web Tokens)** - Autenticación
- **¿Qué es?**: Tokens seguros para identificar usuarios
- **¿Por qué?**: No necesitas iniciar sesión cada vez
- **Ubicación**: `backend/src/auth/`
- **Paquete**: `@nestjs/jwt` 11.0.0

#### 9. **Bcrypt** - Encriptación de Contraseñas
- **¿Qué es?**: Convierte contraseñas en texto ilegible
- **¿Por qué?**: Seguridad - nadie puede leer las contraseñas
- **Versión**: 6.0.0

#### 10. **Groq SDK** - Inteligencia Artificial
- **¿Qué es?**: Cliente para API de IA (LLaMA modelos)
- **¿Por qué?**: Asistente inteligente que ayuda a diseñar
- **Ubicación**: `backend/src/ai/`
- **Versión**: 0.32.0

#### 11. **Tesseract.js** - OCR (Reconocimiento de Texto)
- **¿Qué es?**: Lee texto de imágenes
- **¿Por qué?**: Importar diagramas desde fotos/capturas
- **Ubicación**: `backend/src/ai/`
- **Versión**: 6.0.1

#### 12. **Sharp** - Procesamiento de Imágenes
- **¿Qué es?**: Manipula imágenes (resize, formato, etc.)
- **¿Por qué?**: Optimiza imágenes subidas por usuarios
- **Versión**: 0.34.4


### Frontend (Cliente / Interfaz)

#### 1. **React** - Librería de UI
- **¿Qué es?**: Librería para crear interfaces interactivas
- **¿Por qué?**: Componentes reutilizables, actualización eficiente
- **Ubicación**: `frontend/src/`
- **Versión**: 19.1.1

#### 2. **TypeScript** - Lenguaje
- **¿Qué es?**: Mismo que en backend
- **¿Por qué?**: Consistencia, seguridad de tipos
- **Ubicación**: Todos los archivos `.tsx` y `.ts`

#### 3. **Vite** - Build Tool (Herramienta de Construcción)
- **¿Qué es?**: Empaqueta y optimiza el código frontend
- **¿Por qué?**: Muy rápido, hot-reload instantáneo
- **Configuración**: `frontend/vite.config.ts`

#### 4. **TailwindCSS** - Framework de Estilos
- **¿Qué es?**: Utilidades CSS para diseño rápido
- **¿Por qué?**: Diseño consistente, responsive automático
- **Configuración**: `frontend/tailwind.config.js`

#### 5. **AntV X6** - Librería de Diagramas
- **¿Qué es?**: Motor de renderizado de grafos
- **¿Por qué?**: Potente, flexible, soporta formas custom
- **Ubicación**: `frontend/src/uml/`
- **Versión**: 2.18.1
- **Plugins**:
  - `@antv/x6-plugin-selection`: Selección múltiple
  - `@antv/x6-plugin-minimap`: Minimapa de navegación
  - `@antv/x6-plugin-export`: Exportar PNG/SVG

#### 6. **React Router** - Navegación
- **¿Qué es?**: Maneja rutas/páginas en la aplicación
- **¿Por qué?**: SPA (Single Page Application) fluida
- **Ubicación**: `frontend/src/app/routes.tsx`
- **Versión**: 7.9.1

#### 7. **Axios** - Cliente HTTP
- **¿Qué es?**: Hace peticiones al servidor (GET, POST, etc.)
- **¿Por qué?**: Más fácil que fetch nativo, interceptores
- **Ubicación**: `frontend/src/lib/api.ts`
- **Versión**: 1.12.2

#### 8. **Socket.IO Client** - WebSockets
- **¿Qué es?**: Cliente para comunicación en tiempo real
- **¿Por qué?**: Sincronización instantánea entre usuarios
- **Ubicación**: Integrado en `Editor.tsx`
- **Versión**: 4.8.1

#### 9. **Yjs** - CRDT Client
- **¿Qué es?**: Sincronización de datos sin conflictos
- **¿Por qué?**: Edición colaborativa sin pérdida de datos
- **Versión**: 13.6.27

#### 10. **React Hook Form** - Formularios
- **¿Qué es?**: Manejo de formularios con validación
- **¿Por qué?**: Performance, validación fácil
- **Ubicación**: Modales de edición
- **Versión**: 7.62.0

#### 11. **Zod** - Validación de Esquemas
- **¿Qué es?**: Valida estructura de datos
- **¿Por qué?**: Seguridad, tipos TypeScript automáticos
- **Versión**: 4.1.8

#### 12. **Lucide React** - Iconos
- **¿Qué es?**: Librería de iconos SVG
- **¿Por qué?**: Bonitos, consistentes, tree-shakeable
- **Versión**: 0.544.0

#### 13. **JSZip** - Manejo de Archivos ZIP
- **¿Qué es?**: Crea archivos .zip en el navegador
- **¿Por qué?**: Exportar proyectos de código
- **Versión**: 3.10.1

#### 14. **jsPDF** - Generación de PDFs
- **¿Qué es?**: Crea PDFs en el navegador
- **¿Por qué?**: Exportar diagramas a PDF
- **Versión**: 3.0.3

#### 15. **html2canvas** - Screenshot de HTML
- **¿Qué es?**: Convierte HTML a imagen
- **¿Por qué?**: Exportar diagramas como PNG
- **Versión**: 1.4.1

#### 16. **React Hot Toast** - Notificaciones
- **¿Qué es?**: Mensajes emergentes (toasts)
- **¿Por qué?**: Feedback visual al usuario
- **Versión**: 2.6.0

---

## 📁 ESTRUCTURA DEL PROYECTO

```
SW1erParcial/
├── backend/                    # Servidor (API + WebSockets)
│   ├── prisma/                # Esquema de base de datos
│   │   └── schema.prisma     # Define tablas y relaciones
│   │
│   ├── src/                   # Código fuente
│   │   ├── main.ts           # Punto de entrada
│   │   ├── app.module.ts     # Módulo principal
│   │   │
│   │   ├── auth/             # Autenticación y autorización
│   │   │   ├── auth.controller.ts    # Rutas de login/registro
│   │   │   ├── auth.service.ts       # Lógica de autenticación
│   │   │   ├── jwt.strategy.ts       # Estrategia JWT
│   │   │   └── guards/               # Protección de rutas
│   │   │
│   │   ├── users/            # Gestión de usuarios
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/                  # Data Transfer Objects
│   │   │
│   │   ├── projects/         # Gestión de proyectos
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── project-members.controller.ts
│   │   │   ├── edit-requests.controller.ts  # Solicitudes de edición
│   │   │   └── dto/
│   │   │
│   │   ├── diagrams/         # Gestión de diagramas
│   │   │   ├── diagrams.controller.ts
│   │   │   ├── diagrams.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── diagram-realtime/ # Colaboración en tiempo real
│   │   │   ├── diagram.gateway.ts    # WebSocket handler
│   │   │   ├── diagram-sync.service.ts
│   │   │   └── awareness.service.ts  # Cursores usuarios
│   │   │
│   │   ├── ai/               # Inteligencia Artificial
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts         # IA principal
│   │   │   ├── asistente.ts          # Asistente UML
│   │   │   └── scan-diagram.ts       # OCR de imágenes
│   │   │
│   │   ├── share/            # Enlaces compartidos
│   │   │   ├── share.controller.ts
│   │   │   └── share.service.ts
│   │   │
│   │   ├── redis/            # Cache (opcional)
│   │   │   └── redis.service.ts
│   │   │
│   │   └── common/           # Utilidades compartidas
│   │       ├── decorators/
│   │       ├── filters/
│   │       └── pipes/
│   │
│   ├── .env                  # Variables de entorno (secreto)
│   ├── package.json          # Dependencias Node
│   └── tsconfig.json         # Configuración TypeScript
│
├── frontend/                  # Cliente (Interfaz Web)
│   ├── public/               # Archivos estáticos
│   │   └── index.html
│   │
│   ├── src/                  # Código fuente
│   │   ├── main.tsx          # Punto de entrada React
│   │   ├── App.tsx           # Componente raíz
│   │   │
│   │   ├── app/              # Configuración de la app
│   │   │   └── routes.tsx    # Definición de rutas
│   │   │
│   │   ├── pages/            # Páginas principales
│   │   │   ├── Login.tsx     # Página de inicio de sesión
│   │   │   ├── Register.tsx  # Página de registro
│   │   │   ├── Dashboard.tsx # Lista de proyectos
│   │   │   └── Editor.tsx    # Editor de diagramas ⭐
│   │   │
│   │   ├── uml/              # Lógica de diagramas UML
│   │   │   ├── shapes.ts     # Definición de formas (clases)
│   │   │   ├── snapshot.ts   # Serialización/deserialización
│   │   │   ├── tokens.ts     # Constantes de diseño
│   │   │   │
│   │   │   ├── actions/      # Acciones sobre diagramas
│   │   │   │   ├── nodes.ts  # Crear/editar nodos
│   │   │   │   └── edges.ts  # Crear/editar relaciones
│   │   │   │
│   │   │   ├── codegen/      # Generación de código
│   │   │   │   ├── JavaSpringGenerator.ts  # Java Spring Boot
│   │   │   │   └── FlutterCrudGenerator.ts # Flutter (comentado)
│   │   │   │
│   │   │   └── ui/           # Componentes de UI
│   │   │       ├── Sidebar.tsx           # Barra lateral de herramientas
│   │   │       ├── DiagramControls.tsx   # Toolbar movible
│   │   │       ├── ClassEditorModal.tsx  # Editor de clases
│   │   │       └── AIAssistant.tsx       # Chat con IA
│   │   │
│   │   ├── state/            # Estado global
│   │   │   ├── AuthContext.tsx   # Contexto de autenticación
│   │   │   └── ThemeContext.tsx  # Modo claro/oscuro
│   │   │
│   │   ├── lib/              # Utilidades
│   │   │   ├── api.ts        # Cliente Axios configurado
│   │   │   └── auth.ts       # Helpers de autenticación
│   │   │
│   │   └── assets/           # Recursos (imágenes, etc.)
│   │
│   ├── package.json          # Dependencias npm
│   ├── vite.config.ts        # Configuración Vite
│   ├── tailwind.config.js    # Configuración Tailwind
│   └── tsconfig.json         # Configuración TypeScript
│
└── DOCUMENTACION_COMPLETA_PROYECTO.md  # Este archivo
```

---


## 🔧 BACKEND - SERVIDOR (Explicación Detallada)

### ¿Qué hace el Backend?

El backend es el "cerebro" del proyecto. Maneja:
- **Autenticación**: Verifica quién eres
- **Autorización**: Verifica qué puedes hacer
- **Persistencia**: Guarda datos en la base de datos
- **Lógica de negocio**: Reglas y validaciones
- **Comunicación en tiempo real**: Sincroniza usuarios

### Módulos Principales

#### 1. **Auth Module** (`src/auth/`)

**Propósito**: Registro e inicio de sesión de usuarios

**Archivos clave**:
- `auth.controller.ts`: Endpoints `/auth/register` y `/auth/login`
- `auth.service.ts`: Lógica de creación de usuarios y verificación
- `jwt.strategy.ts`: Validación de tokens JWT
- `jwt.guard.ts`: Protege rutas privadas

**Flujo de Autenticación**:
```
1. Usuario envía email + password
   ↓
2. Backend verifica en base de datos
   ↓
3. Si es correcto: genera JWT token
   ↓
4. Cliente guarda token en localStorage
   ↓
5. Cliente envía token en cada petición
   ↓
6. Backend valida token y permite acceso
```

**Endpoints**:
- `POST /auth/register` - Crear cuenta
  - Body: `{ email, name, password }`
  - Response: `{ user, token }`

- `POST /auth/login` - Iniciar sesión
  - Body: `{ email, password }`
  - Response: `{ user, token }`

**Seguridad**:
- Contraseñas hasheadas con bcrypt (12 rounds)
- Tokens JWT con expiración de 7 días
- Validación de email único

---

#### 2. **Users Module** (`src/users/`)

**Propósito**: Gestión de perfiles de usuario

**Archivos clave**:
- `users.controller.ts`: CRUD de usuarios
- `users.service.ts`: Lógica de usuarios
- `dto/update-user.dto.ts`: Validación de datos

**Endpoints**:
- `GET /users/me` - Perfil del usuario actual
- `PATCH /users/me` - Actualizar perfil
- `GET /users/:id` - Ver usuario por ID

**Funcionalidades**:
- Ver perfil propio
- Actualizar nombre/email
- Cambiar contraseña (requiere actual)
- Ver proyectos del usuario

---

#### 3. **Projects Module** (`src/projects/`)

**Propósito**: Gestión de proyectos y permisos

**Archivos clave**:
- `projects.controller.ts`: CRUD de proyectos
- `projects.service.ts`: Lógica de proyectos
- `project-members.controller.ts`: Gestión de miembros
- `edit-requests.controller.ts`: Solicitudes de permisos

**Modelo de Datos**:
```typescript
Project {
  id: string (UUID)
  name: string
  description: string?
  ownerId: string       // Dueño del proyecto
  members: ProjectMember[]
  diagram: Diagram?
  shareLinks: ProjectShareLink[]
  createdAt: DateTime
  updatedAt: DateTime
}

ProjectMember {
  id: string
  projectId: string
  userId: string
  role: OWNER | ADMIN | EDITOR | VIEWER
  createdAt: DateTime
}
```

**Roles y Permisos**:
- **OWNER**: Control total, puede eliminar proyecto
- **ADMIN**: Gestiona miembros, puede editar
- **EDITOR**: Puede editar el diagrama
- **VIEWER**: Solo puede ver (read-only)

**Endpoints Principales**:
- `GET /projects` - Listar proyectos del usuario
- `POST /projects` - Crear proyecto nuevo
- `GET /projects/:id` - Ver proyecto específico
- `PATCH /projects/:id` - Actualizar proyecto
- `DELETE /projects/:id` - Eliminar proyecto
- `POST /projects/:id/members` - Agregar miembro
- `PATCH /projects/:id/members/:userId` - Cambiar rol
- `DELETE /projects/:id/members/:userId` - Remover miembro
- `POST /projects/:id/request-edit` - Solicitar permisos
- `POST /projects/:id/approve-edit/:requestId` - Aprobar solicitud

**Flujo de Solicitud de Edición**:
```
1. Usuario VIEWER hace clic en "Solicitar Edición"
   ↓
2. Frontend: POST /projects/:id/request-edit
   ↓
3. Backend crea EditRequest en DB
   ↓
4. Backend notifica al OWNER vía WebSocket
   ↓
5. OWNER ve notificación en Dashboard
   ↓
6. OWNER aprueba: POST /projects/:id/approve-edit/:requestId
   ↓
7. Backend actualiza rol a EDITOR
   ↓
8. Backend notifica al solicitante vía WebSocket
   ↓
9. Frontend actualiza permisos automáticamente
```

---

#### 4. **Diagrams Module** (`src/diagrams/`)

**Propósito**: Guardar y recuperar diagramas UML

**Archivos clave**:
- `diagrams.controller.ts`: Endpoints de diagramas
- `diagrams.service.ts`: Lógica de persistencia

**Modelo de Datos**:
```typescript
Diagram {
  id: string
  projectId: string     // 1-to-1 con Project
  snapshot: JSON        // Estructura del diagrama
  updatedAt: DateTime
  createdAt: DateTime
}

// Estructura de snapshot:
{
  nodes: [
    {
      id: string,
      shape: "uml-class",
      x: number,
      y: number,
      width: number,
      height: number,
      data: {
        name: string,
        attributes: string[],
        methods: string[]
      }
    }
  ],
  edges: [
    {
      id: string,
      source: string,      // Node ID
      target: string,      // Node ID
      sourcePort: string,
      targetPort: string,
      router: string,
      connector: string,
      data: {
        type: "assoc" | "inherit" | "comp" | ...,
        name: string,
        multSource: string,
        multTarget: string
      }
    }
  ]
}
```

**Endpoints**:
- `GET /projects/:id/diagram` - Obtener diagrama
- `PUT /projects/:id/diagram` - Guardar/actualizar diagrama
- `DELETE /projects/:id/diagram` - Eliminar diagrama

**Optimización**:
- Autosave cada 1.2 segundos (debounced)
- Snapshot JSON comprimido
- Versionado de diagramas (tabla DiagramVersion)

---

#### 5. **Diagram Realtime Module** (`src/diagram-realtime/`)

**Propósito**: Sincronización en tiempo real entre usuarios

**Tecnologías**:
- **Socket.IO**: Comunicación bidireccional
- **Yjs**: CRDT para resolución de conflictos
- **Y-Protocols**: Protocolo de sincronización

**Archivos clave**:
- `diagram.gateway.ts`: WebSocket handler
- `diagram-sync.service.ts`: Lógica de sincronización
- `awareness.service.ts`: Tracking de cursores

**¿Cómo funciona Yjs?**

Yjs es un **CRDT** (Conflict-free Replicated Data Type). Significa que:
- Múltiples usuarios pueden editar simultáneamente
- No hay "conflictos" que resolver manualmente
- Todos convergen al mismo estado final

**Ejemplo**:
```
Usuario A: Agrega clase "User" en (100, 100)
Usuario B: Agrega clase "Order" en (200, 200)
Al mismo tiempo (sin esperar al otro)

Resultado: Ambos ven las 2 clases correctamente
Sin Yjs: Una de las dos se perdería
```

**Eventos WebSocket**:

**Cliente → Servidor**:
- `join`: Usuario se une a un proyecto
  ```javascript
  socket.emit('join', { 
    projectId: '123', 
    authToken: 'jwt...' 
  })
  ```

- `y:sync:push`: Cliente envía cambios
  ```javascript
  socket.emit('y:sync:push', {
    projectId: '123',
    updateBase64: 'encoded_yjs_update'
  })
  ```

- `awareness:update`: Posición del cursor
  ```javascript
  socket.emit('awareness:update', {
    projectId: '123',
    states: {
      [socketId]: {
        cursor: { x: 150, y: 200 },
        name: 'Juan',
        color: '#FF5733'
      }
    }
  })
  ```

**Servidor → Cliente**:
- `joined`: Confirmación de unión
- `y:sync`: Estado inicial del diagrama
- `y:update`: Cambio de otro usuario
- `awareness:remote`: Cursores de otros usuarios
- `memberUpdated`: Rol de usuario cambió
- `editApproved`: Solicitud aprobada
- `editDenied`: Solicitud rechazada

**Flujo Completo**:
```
1. Usuario A abre proyecto → socket.emit('join')
2. Servidor verifica permisos
3. Servidor carga Y.Doc del proyecto
4. Servidor envía estado actual → socket.emit('joined')
5. Usuario A mueve una clase
6. Frontend actualiza Y.Doc local
7. Y.Doc dispara evento 'update'
8. Frontend envía → socket.emit('y:sync:push')
9. Servidor aplica update a Y.Doc central
10. Servidor broadcast a otros usuarios → socket.emit('y:update')
11. Otros usuarios reciben y aplican update
12. Todos ven el mismo diagrama sincronizado
```

**Ventajas**:
- Latencia baja (~50ms)
- Offline-first (cambios se aplican local, sync después)
- Escalable (Redis pub/sub para múltiples servidores)
- Sin pérdida de datos

---

#### 6. **AI Module** (`src/ai/`)

**Propósito**: Asistente inteligente para diseño UML

**Archivos clave**:
- `ai.controller.ts`: Endpoints de IA
- `ai.service.ts`: Integración con Groq API
- `asistente.ts`: Lógica específica de UML
- `scan-diagram.ts`: OCR de imágenes

**Modelo de IA**:
- **Proveedor**: Groq (https://groq.com)
- **Modelo**: Llama 3.1 70B (ultra rápido)
- **API Key**: Variable de entorno `GROQ_API_KEY`

**Funcionalidades**:

##### A) **Asistente de Chat**
Endpoint: `POST /api/ai/asistente`

Request:
```json
{
  "message": "Crea una clase Usuario con atributos nombre y email",
  "context": {
    "nodes": [...],      // Diagrama actual
    "edges": [...],
    "userLevel": "beginner",
    "lastAction": "cursor"
  }
}
```

Response:
```json
{
  "message": "Perfecto, voy a crear la clase Usuario...",
  "suggestions": {
    "classes": [
      {
        "name": "Usuario",
        "attributes": ["nombre: String", "email: String"],
        "methods": ["validarEmail(): boolean"]
      }
    ],
    "relations": []
  },
  "tips": ["💡 Considera agregar un ID único"],
  "nextSteps": ["Crea la clase Producto", "Relaciona Usuario con Orden"],
  "contextualHelp": [
    {
      "action": "create_first_class",
      "description": "Crear tu primera clase",
      "priority": "high"
    }
  ]
}
```

**Casos de Uso**:
- "Analiza mi diagrama"
- "Crea una clase Producto"
- "Agrega atributos a Usuario"
- "Crea una relación entre Usuario y Orden"
- "¿Qué tipo de relación usar?"
- "Explícame la herencia"

##### B) **Escaneo de Diagramas** (OCR)
Endpoint: `POST /api/ai/scan-diagram`

Request: `multipart/form-data` con imagen

Process:
```
1. Usuario sube imagen (PNG/JPG)
2. Sharp procesa y optimiza imagen
3. Tesseract.js extrae texto (OCR)
4. IA (Groq) analiza texto extraído
5. IA identifica clases, atributos, relaciones
6. Backend devuelve estructura JSON
7. Frontend crea diagrama automáticamente
```

Response:
```json
{
  "message": "Detecté 3 clases y 2 relaciones",
  "suggestions": {
    "classes": [
      { "name": "Usuario", "attributes": ["id", "nombre"], "methods": [] },
      { "name": "Producto", "attributes": ["codigo", "precio"], "methods": [] },
      { "name": "Orden", "attributes": ["fecha", "total"], "methods": [] }
    ],
    "relations": [
      { "from": "Usuario", "to": "Orden", "type": "assoc" },
      { "from": "Orden", "to": "Producto", "type": "comp" }
    ]
  }
}
```

**Limitaciones**:
- Funciona mejor con diagramas dibujados claramente
- Requiere texto legible
- Puede necesitar ajustes manuales

---

#### 7. **Share Module** (`src/share/`)

**Propósito**: Compartir proyectos públicamente

**Modelo**:
```typescript
ProjectShareLink {
  id: string
  projectId: string
  token: string         // Token único para acceso
  role: VIEWER | EDITOR
  expiresAt: DateTime?  // Opcional
  createdAt: DateTime
}
```

**Endpoints**:
- `POST /projects/:id/share` - Generar enlace
  ```json
  Request: { "role": "VIEWER", "expiresAt": "2026-12-31" }
  Response: { "token": "abc123", "url": "https://..." }
  ```

- `GET /public/projects/:id/diagram?share=TOKEN` - Acceder diagrama público
  ```
  No requiere autenticación
  Verifica token válido
  Retorna diagrama en modo read-only o editable según rol
  ```

- `DELETE /projects/:id/share/:linkId` - Revocar enlace

**Flujo de Compartir**:
```
1. OWNER hace clic en "Compartir"
2. Frontend: POST /projects/:id/share con rol VIEWER
3. Backend genera token único (UUID)
4. Backend guarda ProjectShareLink en DB
5. Backend retorna URL: /project/:id?share=TOKEN
6. Usuario copia URL y la envía
7. Receptor abre URL (sin login)
8. Frontend detecta ?share=TOKEN
9. Frontend: GET /public/projects/:id/diagram?share=TOKEN
10. Backend valida token y permisos
11. Backend retorna diagrama
12. Frontend renderiza en modo apropiado
```

---


## 🎨 FRONTEND - INTERFAZ DE USUARIO (Explicación Detallada)

### ¿Qué hace el Frontend?

El frontend es lo que el usuario VE y con lo que INTERACTÚA:
- Pantallas visuales
- Botones y formularios
- Editor de diagramas
- Comunicación con el servidor

### Páginas Principales

#### 1. **Login** (`pages/Login.tsx`)

**Propósito**: Inicio de sesión

**Elementos**:
- Input de email
- Input de contraseña
- Botón "Iniciar Sesión"
- Link a registro

**Flujo**:
```
1. Usuario ingresa credenciales
2. onClick botón → axios.post('/auth/login')
3. Si éxito: guarda token en localStorage
4. Redirige a /app (Dashboard)
5. Si error: muestra toast de error
```

---

#### 2. **Register** (`pages/Register.tsx`)

**Propósito**: Crear cuenta nueva

**Elementos**:
- Input de nombre
- Input de email
- Input de contraseña
- Input de confirmar contraseña
- Botón "Registrarse"

**Validaciones**:
- Email válido (formato)
- Contraseña mínimo 6 caracteres
- Contraseñas coinciden

---

#### 3. **Dashboard** (`pages/Dashboard.tsx`)

**Propósito**: Lista de proyectos del usuario

**Elementos**:
- Header con nombre de usuario y logout
- Botón "Nuevo Proyecto"
- Grid de tarjetas de proyectos
- Botón de importar desde imagen

**Funcionalidades**:
- Ver todos los proyectos (propios + compartidos)
- Crear proyecto nuevo
- Abrir proyecto (navega a Editor)
- Eliminar proyecto (solo OWNER)
- Importar diagrama desde imagen

**Importación desde Imagen** (FEATURE NUEVA):
```
1. Usuario hace clic en "Importar desde Imagen"
2. Selecciona archivo PNG/JPG
3. Frontend: POST /api/ai/scan-diagram (multipart)
4. Muestra loading "Escaneando..."
5. Backend procesa con OCR + IA
6. Backend devuelve clases y relaciones
7. Frontend crea proyecto nuevo automáticamente
8. Frontend guarda diagrama generado
9. Redirige al Editor con diagrama cargado
```

---

#### 4. **Editor** (`pages/Editor.tsx`) ⭐ **MÁS IMPORTANTE**

**Propósito**: Editor visual de diagramas UML

**Componentes**:
- Canvas de X6 (lienzo de dibujo)
- Sidebar (herramientas)
- Toolbar (controles)
- ClassEditorModal (editor de clases)
- AIAssistant (chat con IA)
- MiniMap (minimapa de navegación)
- Cursores remotos (awareness)

**Inicialización**:
```typescript
// 1. Crear instancia de Graph (X6)
const graph = new Graph({
  container: containerRef.current,
  background: { color: "#fafafa" },
  grid: { visible: true, type: "dot" },
  panning: true,                    // Arrastrar canvas
  mousewheel: { enabled: true },    // Zoom con rueda
  connecting: {
    snap: true,                     // Snap a puertos
    allowBlank: false,              // No crear edges sin target
    router: "orth",                 // Líneas ortogonales
    connector: "rounded"            // Esquinas redondeadas
  }
});

// 2. Instalar plugins
graph.use(new Selection({          // Selección múltiple
  rubberband: true                  // Selección con rectángulo
}));

// 3. Conectar WebSocket
const socket = io('/diagram', {
  auth: { token: authToken }
});

socket.emit('join', { projectId });

socket.on('joined', (payload) => {
  // Cargar diagrama inicial
});

socket.on('y:update', ({ updateBase64 }) => {
  // Aplicar cambio de otro usuario
  Y.applyUpdate(ydoc, fromBase64(updateBase64));
  renderFromYDoc();
});

// 4. Y.Doc (CRDT)
const ydoc = new Y.Doc();
ydoc.on('update', (update) => {
  // Enviar cambios propios
  socket.emit('y:sync:push', {
    projectId,
    updateBase64: toBase64(update)
  });
});
```

**Herramientas del Sidebar**:

1. **Cursor** (cursor):
   - Modo selección
   - Mover nodos
   - Seleccionar múltiples

2. **Clase** (class):
   - Click en canvas → crea clase
   - Drag desde sidebar → crea clase

3. **Relaciones**:
   - **Asociación** (assoc): Línea simple
   - **Navegación** (nav): Línea con flecha
   - **Agregación** (aggr): Rombo vacío
   - **Composición** (comp): Rombo relleno
   - **Dependencia** (dep): Línea punteada
   - **Herencia** (inherit): Flecha grande vacía
   - **Many-to-Many**: Para relaciones múltiples

**Flujo de Crear Clase**:
```
1. Usuario hace clic en herramienta "Clase"
2. Usuario hace clic en canvas
3. onBlankClick handler:
   - graph.addNode({
       shape: "uml-class",
       x, y, width, height,
       data: { name: "Class", attributes: [], methods: [] }
     })
4. resizeUmlClass(node) ajusta tamaño según contenido
5. Y.Doc detecta cambio y lo sincroniza
6. Otros usuarios ven la clase aparecer
```

**Flujo de Crear Relación**:
```
1. Usuario selecciona herramienta (ej: "Asociación")
2. oneShotRef.current = { active: true, kind: "assoc" }
3. Usuario hace clic en clase A (source)
4. Usuario hace clic en clase B (target)
5. handleNodeClick:
   - Calcula puertos óptimos (top/right/bottom/left)
   - graph.addEdge({
       source: { cell: A.id, port: "r2" },
       target: { cell: B.id, port: "l2" },
       router: "orth",
       connector: "rounded",
       data: { type: "assoc", name: "", multSource: "", multTarget: "" }
     })
6. applyEdgeLabels(edge) renderiza etiquetas
7. Y.Doc sincroniza
```

**Editar Clase** (doble clic o menú contextual):
```
1. Usuario hace clic derecho en clase
2. Menú: "Editar clase" | "Eliminar"
3. Si "Editar": abre ClassEditorModal
4. Modal muestra:
   - Input de nombre
   - Lista de atributos (agregar/remover)
   - Lista de métodos (agregar/remover)
5. Usuario edita y hace clic en "Guardar"
6. writeFormToNode(node, formValues):
   - node.setAttrs({ name, attrs, methods })
   - node.setData({ name, attributes, methods })
   - resizeUmlClass(node)
7. Y.Doc sincroniza
```

**Auto-resize de Clases**:
```typescript
// Calcula ancho necesario según texto más largo
function computeResizeFromContent(name, attrs, methods) {
  const ctx = canvas.getContext('2d');
  ctx.font = 'JetBrains Mono';
  
  const widths = [
    ctx.measureText(name).width,
    ...attrs.map(a => ctx.measureText(a).width),
    ...methods.map(m => ctx.measureText(m).width)
  ];
  
  const width = Math.max(180, Math.max(...widths) + 16);
  const attrsH = attrs.length * 18 + 12;
  const methodsH = methods.length * 18 + 12;
  
  return { width, height: 44 + attrsH + methodsH };
}
```

**Awareness (Cursores Remotos)**:
```typescript
// Enviar posición de cursor cada 40ms
const handleMouseMove = throttle((e) => {
  const { x, y } = graph.clientToLocal(e.clientX, e.clientY);
  socket.emit('awareness:update', {
    projectId,
    states: {
      [socket.id]: {
        cursor: { x, y },
        name: user.name,
        color: colorFromId(socket.id)
      }
    }
  });
}, 40);

// Renderizar cursores de otros usuarios
socket.on('awareness:remote', ({ states }) => {
  Object.entries(states).forEach(([id, state]) => {
    if (id === socket.id) return; // Skip propio
    
    const { left, top } = graph.localToClient(state.cursor.x, state.cursor.y);
    
    renderCursor({
      id,
      position: { left, top },
      name: state.name,
      color: state.color
    });
  });
});
```

---

### Componentes Clave

#### **Sidebar** (`uml/ui/Sidebar.tsx`)

**Herramientas Disponibles**:
- Botón "Volver" al Dashboard
- Cursor
- Clase (draggable)
- Relaciones (7 tipos)
- **Generar Código Spring Boot**
- ~~Generar App Flutter~~ (comentado temporalmente)

**Generación de Código**:
```
1. Usuario hace clic en "Generar Código Spring"
2. handleGenerateCode():
   - Extrae todas las clases del diagrama
   - Extrae todas las relaciones
   - new JavaSpringGenerator()
   - generator.addClass(clase) para cada clase
   - generator.addRelation(rel) para cada relación
   - files = generator.generateAll()
3. Crea ZIP con archivos:
   - pom.xml
   - Application.java
   - application.properties
   - UserEntity.java, UserRepository.java, UserController.java, etc.
4. Descarga ZIP
5. Usuario descomprime y ejecuta `mvn spring-boot:run`
```

---

#### **DiagramControls** (`uml/ui/DiagramControls.tsx`)

**Funcionalidades**:
- **Toolbar Movible**: Arrastra el header para reposicionar
- **Toolbar Colapsable**: Minimiza para ahorrar espacio
- Zoom In / Zoom Out
- Centrar diagrama
- Guardar (manual)
- Exportar PNG
- Exportar PDF
- Compartir (genera enlace público)

**Exportar PNG**:
```typescript
async function exportPNG() {
  const { default: html2canvas } = await import('html2canvas');
  const container = graph.container;
  const canvas = await html2canvas(container, {
    background: '#fafafa',
    useCORS: true
  });
  
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'diagram.png';
    link.href = url;
    link.click();
  });
}
```

---

#### **ClassEditorModal** (`uml/ui/ClassEditorModal.tsx`)

**Modos**:
1. **Editar Clase**: name, attributes[], methods[]
2. **Editar Relación**: name, multSource, multTarget

**Para Relaciones Many-to-Many**:
- Muestra listas de atributos de source y target
- Permite seleccionar atributos para la relación
- Genera tabla intermedia automáticamente

---

#### **AIAssistant** (`uml/ui/AIAssistant.tsx`)

**UI**:
- Botón flotante (lado derecho)
- Al hacer clic: abre modal de chat
- Input de mensaje
- Historial de conversación
- Botón de importar imagen

**Funcionalidades**:

1. **Chat Contextual**:
```typescript
const handleSendMessage = async () => {
  const context = getDiagramContext(); // Diagrama actual
  
  const response = await fetch('/api/ai/asistente', {
    method: 'POST',
    body: JSON.stringify({
      message: inputValue,
      context: {
        nodes: graph.getNodes().map(...),
        edges: graph.getEdges().map(...),
        userLevel: 'beginner'
      }
    })
  });
  
  const aiResponse = await response.json();
  
  setMessages([...messages, {
    type: 'assistant',
    content: aiResponse.message,
    suggestions: aiResponse.suggestions
  }]);
  
  // Auto-aplicar si es creación de clase
  if (aiResponse.suggestions?.classes) {
    applySuggestion('class', aiResponse.suggestions.classes[0]);
  }
};
```

2. **Sugerencias Rápidas** (botones):
   - Estado vacío: "Crea clase Usuario", "Sistema de biblioteca"
   - Con clases: "¿Qué atributos agregar?", "¿Cómo relacionar?"
   - Completo: "¿Generar código?", "Revisar diseño"

3. **Acciones Contextuales**:
   - Click en sugerencia → activa herramienta automáticamente
   - Ej: "Crear primera clase" → setTool('class')

4. **Importar desde Imagen**:
```typescript
const handleImportFromImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/ai/scan-diagram', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  // Crear todas las clases
  result.suggestions.classes.forEach(cls => {
    onAddClass(cls.name, cls.attributes, cls.methods);
  });
  
  // Crear relaciones
  setTimeout(() => {
    result.suggestions.relations.forEach(rel => {
      onAddRelation(rel.from, rel.to, rel.type);
    });
  }, 800);
};
```

---


## 🗄️ BASE DE DATOS (PostgreSQL + Prisma)

### Esquema Completo

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========== USUARIOS ==========
model User {
  id            String          @id @default(uuid())
  email         String          @unique
  name          String
  passwordHash  String
  role          Role            @default(USER)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  Project       Project[]       // Proyectos que posee
  ProjectMember ProjectMember[] // Proyectos donde es miembro
  editRequests  EditRequest[]   @relation("UserEditRequests")
}

enum Role {
  OWNER   // Dueño de cuenta (no usado actualmente)
  ADMIN   // Administrador global
  EDITOR  // Editor general
  USER    // Usuario normal
}

// ========== PROYECTOS ==========
model Project {
  id          String          @id @default(uuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  
  owner       User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members     ProjectMember[]
  diagram     Diagram?
  shareLinks  ProjectShareLink[] @relation("ProjectShareLinks")
  editRequests EditRequest[]      @relation("ProjectEditRequests")
  diagramVersions DiagramVersion[] @relation("ProjectDiagramVersions")
  
  @@index([ownerId])
}

enum ProjectRole {
  OWNER   // Dueño del proyecto (control total)
  ADMIN   // Administrador (gestiona miembros)
  EDITOR  // Editor (puede editar diagrama)
  VIEWER  // Observador (solo lectura)
}

// ========== MIEMBROS DE PROYECTO ==========
model ProjectMember {
  id        String      @id @default(uuid())
  projectId String
  userId    String
  role      ProjectRole @default(EDITOR)
  createdAt DateTime    @default(now())
  
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])  // Un usuario solo puede tener un rol por proyecto
  @@index([userId])
  @@index([projectId])
}

// ========== DIAGRAMAS ==========
model Diagram {
  id        String   @id @default(uuid())
  projectId String   @unique  // Relación 1-a-1
  snapshot  Json     // { nodes: [], edges: [], updatedAt }
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
  
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// ========== ENLACES COMPARTIDOS ==========
model ProjectShareLink {
  id         String      @id @default(uuid())
  projectId  String
  token      String      @unique
  role       ProjectRole @default(VIEWER)
  expiresAt  DateTime?
  createdAt  DateTime    @default(now())
  
  project    Project     @relation("ProjectShareLinks", fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([projectId])
}

// ========== SOLICITUDES DE EDICIÓN ==========
model EditRequest {
  id         String      @id @default(uuid())
  projectId  String
  userId     String
  message    String?
  status     String      @default("pending")  // pending | approved | denied
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  
  project    Project     @relation("ProjectEditRequests", fields: [projectId], references: [id], onDelete: Cascade)
  user       User        @relation("UserEditRequests", fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([userId])
}

// ========== VERSIONES DE DIAGRAMA (opcional) ==========
model DiagramVersion {
  id        String   @id @default(uuid())
  projectId String
  snapshot  Json
  createdAt DateTime @default(now())
  createdBy String?
  
  project   Project  @relation("ProjectDiagramVersions", fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
}
```

### Relaciones Visualizadas

```
User (1) ←→ (N) Project (como owner)
User (N) ←→ (N) Project (como member) [a través de ProjectMember]
Project (1) ←→ (1) Diagram
Project (1) ←→ (N) ProjectShareLink
Project (1) ←→ (N) EditRequest
User (1) ←→ (N) EditRequest
Project (1) ←→ (N) DiagramVersion
```

### Consultas Comunes

**1. Obtener proyectos de un usuario:**
```typescript
const projects = await prisma.project.findMany({
  where: {
    OR: [
      { ownerId: userId },              // Proyectos propios
      { members: { some: { userId } } } // Proyectos compartidos
    ]
  },
  include: {
    owner: true,
    members: {
      include: { user: true }
    },
    diagram: true
  }
});
```

**2. Verificar permisos:**
```typescript
async function getUserRole(userId: string, projectId: string): Promise<ProjectRole | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { where: { userId } }
    }
  });
  
  if (!project) return null;
  if (project.ownerId === userId) return 'OWNER';
  if (project.members.length > 0) return project.members[0].role;
  return null;
}
```

**3. Guardar diagrama:**
```typescript
await prisma.diagram.upsert({
  where: { projectId },
  create: {
    projectId,
    snapshot: { nodes, edges, updatedAt: new Date().toISOString() }
  },
  update: {
    snapshot: { nodes, edges, updatedAt: new Date().toISOString() }
  }
});
```

---

## ⚙️ INSTALACIÓN Y CONFIGURACIÓN

### Requisitos Previos

1. **Node.js** versión 18 o superior
   - Descargar: https://nodejs.org/
   - Verificar: `node --version`

2. **PostgreSQL** versión 12 o superior
   - Descargar: https://www.postgresql.org/download/
   - Verificar: `psql --version`

3. **Git** (opcional, para clonar)
   - Descargar: https://git-scm.com/

4. **Editor de código** (recomendado: VS Code)
   - Descargar: https://code.visualstudio.com/

### Paso a Paso - Backend

```bash
# 1. Navegar a carpeta backend
cd backend

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env
# Copiar env.example a .env
cp env.example .env

# 4. Editar .env con tus datos
# DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_db"
# JWT_SECRET="tu_secreto_muy_seguro"
# GROQ_API_KEY="tu_api_key_de_groq"

# 5. Crear base de datos
# En PostgreSQL:
# CREATE DATABASE nombre_db;

# 6. Ejecutar migraciones
npx prisma migrate dev

# 7. Generar cliente Prisma
npx prisma generate

# 8. Iniciar servidor de desarrollo
npm run start:dev

# Servidor escuchando en http://localhost:3000
```

### Paso a Paso - Frontend

```bash
# 1. Navegar a carpeta frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# Aplicación disponible en http://localhost:5173
```

### Variables de Entorno

**Backend** (`backend/.env`):
```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/uml_editor_db"

# JWT
JWT_SECRET="super_secreto_cambiame_en_produccion"
JWT_EXPIRES_IN="7d"

# Groq AI
GROQ_API_KEY="gsk_tu_api_key_aqui"

# Redis (opcional, para escalado)
REDIS_HOST="localhost"
REDIS_PORT="6379"

# CORS
FRONTEND_URL="http://localhost:5173"

# Socket.IO
SOCKET_PATH="/socket.io"
```

**Frontend** (`frontend/.env`):
```env
# API Backend
VITE_API_URL="http://localhost:3000/api"
VITE_SOCKET_URL="http://localhost:3000"
VITE_SOCKET_PATH="/socket.io"
```

### Verificar Instalación

**Backend:**
```bash
curl http://localhost:3000
# Respuesta: "Hello World!"

curl http://localhost:3000/api/health
# Respuesta: {"status":"ok"}
```

**Frontend:**
- Abrir navegador: http://localhost:5173
- Debería ver la página de Login

---

## 🔌 ENDPOINTS DE API

### Autenticación

#### `POST /auth/register`
Crear cuenta nueva

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "password": "miPassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `POST /auth/login`
Iniciar sesión

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "miPassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Usuarios

#### `GET /users/me`
Obtener perfil propio

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "USER",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

#### `PATCH /users/me`
Actualizar perfil

**Request:**
```json
{
  "name": "Juan Carlos Pérez"
}
```

---

### Proyectos

#### `GET /projects`
Listar proyectos del usuario

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Sistema de Biblioteca",
    "description": "Gestión de libros y préstamos",
    "ownerId": "uuid",
    "role": "OWNER",
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-19T09:00:00Z",
    "memberCount": 3,
    "diagram": {
      "id": "uuid",
      "updatedAt": "2026-01-19T09:00:00Z"
    }
  }
]
```

#### `POST /projects`
Crear proyecto nuevo

**Request:**
```json
{
  "name": "Sistema de Ventas",
  "description": "Gestión de productos y clientes"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Sistema de Ventas",
  "description": "Gestión de productos y clientes",
  "ownerId": "uuid",
  "createdAt": "2026-01-19T10:00:00Z"
}
```

#### `GET /projects/:id`
Obtener proyecto específico

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Sistema de Biblioteca",
  "description": "...",
  "role": "OWNER",
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "role": "EDITOR",
      "user": {
        "name": "María González",
        "email": "maria@ejemplo.com"
      }
    }
  ]
}
```

#### `DELETE /projects/:id`
Eliminar proyecto (solo OWNER)

**Response (200):**
```json
{
  "message": "Proyecto eliminado correctamente"
}
```

---

### Diagramas

#### `GET /projects/:id/diagram`
Obtener diagrama del proyecto

**Response (200):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "snapshot": {
    "nodes": [
      {
        "id": "node1",
        "shape": "uml-class",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "data": {
          "name": "Usuario",
          "attributes": ["id: Long", "nombre: String", "email: String"],
          "methods": ["validarEmail(): boolean"]
        }
      }
    ],
    "edges": [
      {
        "id": "edge1",
        "source": "node1",
        "target": "node2",
        "data": {
          "type": "assoc",
          "name": "realiza",
          "multSource": "1",
          "multTarget": "*"
        }
      }
    ]
  },
  "updatedAt": "2026-01-19T09:30:00Z"
}
```

#### `PUT /projects/:id/diagram`
Guardar/actualizar diagrama

**Request:**
```json
{
  "nodes": [...],
  "edges": [...],
  "updatedAt": "2026-01-19T10:00:00Z"
}
```

**Response (200):**
```json
{
  "message": "Diagrama guardado correctamente",
  "diagram": { ... }
}
```

---

### Miembros de Proyecto

#### `POST /projects/:id/members`
Agregar miembro al proyecto

**Request:**
```json
{
  "email": "nuevo@ejemplo.com",
  "role": "EDITOR"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "role": "EDITOR",
  "user": {
    "name": "Nuevo Usuario",
    "email": "nuevo@ejemplo.com"
  }
}
```

#### `PATCH /projects/:id/members/:userId`
Cambiar rol de miembro

**Request:**
```json
{
  "role": "ADMIN"
}
```

#### `DELETE /projects/:id/members/:userId`
Remover miembro del proyecto

---

### Solicitudes de Edición

#### `POST /projects/:id/request-edit`
Solicitar permisos de edición

**Request:**
```json
{
  "message": "Necesito editar el diagrama para agregar nuevas clases"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "message": "Necesito editar...",
  "status": "pending",
  "createdAt": "2026-01-19T10:00:00Z"
}
```

#### `POST /projects/:id/approve-edit/:requestId`
Aprobar solicitud (solo OWNER/ADMIN)

**Request:**
```json
{
  "role": "EDITOR"
}
```

**Response (200):**
```json
{
  "message": "Solicitud aprobada",
  "member": { ... }
}
```

---

### Compartir

#### `POST /projects/:id/share`
Generar enlace público

**Request:**
```json
{
  "role": "VIEWER",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Response (201):**
```json
{
  "token": "abc123xyz789",
  "url": "http://localhost:5173/project/uuid?share=abc123xyz789",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

#### `GET /public/projects/:id/diagram?share=TOKEN`
Acceder diagrama público (sin auth)

---

### Inteligencia Artificial

#### `POST /api/ai/asistente`
Chat con asistente UML

**Request:**
```json
{
  "message": "Crea una clase Usuario con atributos nombre y email",
  "context": {
    "nodes": [],
    "edges": [],
    "userLevel": "beginner"
  }
}
```

**Response (200):**
```json
{
  "message": "¡Perfecto! Voy a crear la clase Usuario...",
  "suggestions": {
    "classes": [
      {
        "name": "Usuario",
        "attributes": ["id: Long", "nombre: String", "email: String"],
        "methods": ["validarEmail(): boolean"]
      }
    ]
  },
  "tips": ["💡 Considera agregar un ID único"],
  "nextSteps": ["Crea la clase Producto"]
}
```

#### `POST /api/ai/scan-diagram`
Escanear diagrama desde imagen

**Request:** `multipart/form-data`
```
image: File (PNG/JPG)
```

**Response (200):**
```json
{
  "message": "Detecté 3 clases y 2 relaciones",
  "suggestions": {
    "classes": [
      { "name": "Usuario", "attributes": [...], "methods": [] }
    ],
    "relations": [
      { "from": "Usuario", "to": "Orden", "type": "assoc" }
    ]
  }
}
```

---


## 🎯 FLUJOS DE USUARIO COMPLETOS

### Flujo 1: Registro y Primer Proyecto

```
1. Usuario abre http://localhost:5173
   ↓
2. Ve página de Login
   ↓
3. Clic en "Crear cuenta"
   ↓
4. Llena formulario de registro:
   - Nombre: "Juan Pérez"
   - Email: "juan@ejemplo.com"
   - Contraseña: "miPass123"
   ↓
5. Clic en "Registrarse"
   ↓
6. Frontend: POST /auth/register
   ↓
7. Backend:
   - Valida datos
   - Hashea contraseña con bcrypt
   - Crea usuario en DB
   - Genera JWT token
   - Retorna { user, token }
   ↓
8. Frontend:
   - Guarda token en localStorage
   - Guarda user en AuthContext
   - Navega a /app (Dashboard)
   ↓
9. Dashboard carga proyectos: GET /projects
   - Lista vacía (usuario nuevo)
   ↓
10. Usuario ve botón "Nuevo Proyecto"
    ↓
11. Clic en "Nuevo Proyecto"
    ↓
12. Aparece modal con form:
    - Nombre: "Sistema de Biblioteca"
    - Descripción: "Gestión de libros"
    ↓
13. Clic en "Crear"
    ↓
14. Frontend: POST /projects
    ↓
15. Backend:
    - Crea Project en DB
    - Asocia con userId como owner
    - Retorna proyecto
    ↓
16. Frontend:
    - Actualiza lista de proyectos
    - Navega a /project/{id} (Editor)
    ↓
17. Editor se inicializa:
    - Crea Graph (X6)
    - Conecta WebSocket
    - Carga diagrama (vacío)
    ↓
18. Usuario ve canvas vacío
    - Sidebar con herramientas
    - AIAssistant flotante
    ↓
¡Listo para empezar a diseñar!
```

---

### Flujo 2: Crear Diagrama con IA

```
1. Usuario en Editor (canvas vacío)
   ↓
2. Clic en botón flotante de IA (Bot icon)
   ↓
3. Abre modal de chat
   ↓
4. Usuario escribe: "Quiero un sistema de biblioteca con clases Usuario, Libro y Préstamo"
   ↓
5. Clic en "Enviar" o Enter
   ↓
6. Frontend:
   - Muestra loading "Analizando..."
   - POST /api/ai/asistente con:
     {
       message: "Quiero un sistema...",
       context: { nodes: [], edges: [], userLevel: "beginner" }
     }
   ↓
7. Backend:
   - Envía a Groq API (LLaMA 3.1 70B)
   - IA analiza y genera respuesta
   - Retorna sugerencias estructuradas
   ↓
8. Frontend recibe:
   {
     message: "¡Excelente! Voy a crear 3 clases...",
     suggestions: {
       classes: [
         {
           name: "Usuario",
           attributes: ["id: Long", "nombre: String", "email: String"],
           methods: ["validarEmail(): boolean"]
         },
         {
           name: "Libro",
           attributes: ["isbn: String", "titulo: String", "autor: String"],
           methods: []
         },
         {
           name: "Prestamo",
           attributes: ["id: Long", "fechaInicio: Date", "fechaFin: Date"],
           methods: ["calcularMulta(): Double"]
         }
       ],
       relations: [
         { from: "Usuario", to: "Prestamo", type: "assoc", multiplicity: { source: "1", target: "*" } },
         { from: "Prestamo", to: "Libro", type: "assoc", multiplicity: { source: "*", target: "1" } }
       ]
     }
   }
   ↓
9. Frontend muestra mensaje y sugerencias en chat
   - Botón "Agregar" en cada clase
   ↓
10. Usuario hace clic en "Agregar" de "Usuario"
    ↓
11. applySuggestion('class', classData):
    - graph.addNode({
        shape: "uml-class",
        x: 200, y: 150,
        data: { name: "Usuario", attributes: [...], methods: [...] }
      })
    - resizeUmlClass(node)
    ↓
12. Y.Doc detecta cambio local
    ↓
13. Y.Doc dispara evento 'update'
    ↓
14. Frontend: socket.emit('y:sync:push', { updateBase64 })
    ↓
15. Backend recibe y aplica a Y.Doc central
    ↓
16. Backend guarda en DB (autosave debounced)
    ↓
17. Usuario ve clase "Usuario" en canvas
    ↓
18. Repite para "Libro" y "Prestamo"
    ↓
19. Usuario hace clic en "Agregar" de relaciones
    ↓
20. applySuggestion('relation', relData):
    - Encuentra nodos source y target por nombre
    - graph.addEdge({
        source: { cell: usuarioNode.id, port: "r2" },
        target: { cell: prestamoNode.id, port: "l2" },
        data: { type: "assoc", multSource: "1", multTarget: "*" }
      })
    - applyEdgeLabels(edge)
    ↓
21. Relaciones aparecen conectando las clases
    ↓
¡Diagrama básico creado en minutos!
```

---

### Flujo 3: Editar Clase Manualmente

```
1. Usuario hace doble clic en clase "Usuario"
   ↓
2. Abre ClassEditorModal
   ↓
3. Modal muestra:
   - Input: nombre = "Usuario"
   - Lista de atributos:
     • id: Long [X]
     • nombre: String [X]
     • email: String [X]
   - Botón "Agregar Atributo"
   - Lista de métodos:
     • validarEmail(): boolean [X]
   - Botón "Agregar Método"
   ↓
4. Usuario hace clic en "Agregar Atributo"
   ↓
5. Aparece nuevo input vacío
   ↓
6. Usuario escribe: "telefono: String"
   ↓
7. Clic en "Agregar Método"
   ↓
8. Escribe: "enviarNotificacion(): void"
   ↓
9. Clic en "Guardar"
   ↓
10. onSubmit(formValues):
    - writeFormToNode(node, formValues)
    - node.setAttrs({
        name: { text: "Usuario" },
        attrs: { text: "id: Long\nnombre: String\nemail: String\ntelefono: String" },
        methods: { text: "validarEmail(): boolean\nenviarNotificacion(): void" }
      })
    - node.setData({
        name: "Usuario",
        attributes: ["id: Long", "nombre: String", "email: String", "telefono: String"],
        methods: ["validarEmail(): boolean", "enviarNotificacion(): void"]
      })
    - resizeUmlClass(node) // Ajusta altura automáticamente
    ↓
11. Y.Doc detecta cambio
    ↓
12. Socket sincroniza con servidor
    ↓
13. Servidor broadcast a otros usuarios
    ↓
14. Otros usuarios conectados ven el cambio en tiempo real
    ↓
15. Modal se cierra
    ↓
¡Clase actualizada visualmente!
```

---

### Flujo 4: Colaboración en Tiempo Real

**Escenario**: Juan (OWNER) y María (EDITOR) trabajando simultáneamente

```
=== JUAN (computadora 1) ===
1. Juan abre proyecto
   ↓
2. Socket.emit('join', { projectId })
   ↓
3. Servidor: socket.join(`project:${projectId}`)
   ↓
4. Servidor carga Y.Doc del proyecto
   ↓
5. Servidor: socket.emit('joined', { role: 'OWNER', snapshot })
   ↓
6. Juan ve diagrama con 3 clases
   ↓
7. Juan mueve clase "Usuario" a (300, 200)
   ↓
8. Y.Doc local actualiza
   ↓
9. Socket.emit('y:sync:push', { updateBase64 })
   ↓
10. Servidor recibe y aplica a Y.Doc central
    ↓
11. Servidor: socket.to(`project:${projectId}`).emit('y:update', { updateBase64 })

=== MARÍA (computadora 2) ===
1. María abre el MISMO proyecto (1 minuto después)
   ↓
2. Socket.emit('join', { projectId })
   ↓
3. Servidor verifica rol: EDITOR (puede editar)
   ↓
4. Servidor envía estado actual con cambio de Juan
   ↓
5. María ve clase "Usuario" en (300, 200) - posición de Juan
   ↓
6. María agrega nueva clase "Editorial"
   ↓
7. Y.Doc de María actualiza
   ↓
8. Socket.emit('y:sync:push')
   ↓
9. Servidor aplica cambio
   ↓
10. Servidor broadcast a todos en la sala
    ↓
11. JUAN recibe update y ve aparecer "Editorial" ¡automáticamente!
    ↓

=== SINCRONIZACIÓN DE CURSORES ===
Juan mueve mouse → Frontend cada 40ms:
  socket.emit('awareness:update', {
    states: {
      [socketId]: { cursor: { x, y }, name: "Juan", color: "#FF5733" }
    }
  })
  ↓
Servidor: socket.to(room).emit('awareness:remote', { states })
  ↓
María ve cursor de Juan moverse en tiempo real
  - Círculo con color #FF5733
  - Etiqueta "Juan"
  - Posición sincronizada

¡Colaboración fluida sin conflictos!
```

---

### Flujo 5: Solicitar Permisos de Edición

**Escenario**: Pedro (VIEWER) quiere editar proyecto de Ana (OWNER)

```
=== PEDRO (VIEWER) ===
1. Pedro recibe enlace público de Ana
   ↓
2. Abre: /project/123?share=TOKEN
   ↓
3. Frontend detecta ?share=TOKEN (no requiere login)
   ↓
4. Frontend: GET /public/projects/123/diagram?share=TOKEN
   ↓
5. Backend verifica:
   - Token válido
   - Proyecto existe
   - Token no expirado
   ↓
6. Backend retorna diagrama con role: "VIEWER"
   ↓
7. Pedro ve diagrama en modo READ-ONLY
   - Graph interacting: false
   - No puede mover/editar
   - Banner: "Vista pública / solo lectura"
   ↓
8. Pedro hace clic en "Enviar solicitud de edición"
   ↓
9. Frontend: POST /projects/123/request-edit
   {
     message: "Necesito agregar la clase Factura"
   }
   ↓
10. Backend:
    - Crea EditRequest en DB
    - status: "pending"
    ↓
11. Backend: socket.to(`user:${anaId}`).emit('editRequestReceived', { ... })
    ↓
12. Toast: "Solicitud enviada al anfitrión"
    ↓

=== ANA (OWNER) ===
1. Ana está en el Dashboard
   ↓
2. Recibe notificación WebSocket
   ↓
3. Toast: "Pedro solicitó permiso para editar"
   ↓
4. Ve badge en proyecto con solicitud pendiente
   ↓
5. Clic en proyecto → ve panel de solicitudes
   ↓
6. Ve:
   - Usuario: Pedro
   - Mensaje: "Necesito agregar..."
   - Botones: [Aprobar] [Denegar]
   ↓
7. Ana hace clic en "Aprobar"
   ↓
8. Frontend: POST /projects/123/approve-edit/requestId
   {
     role: "EDITOR"
   }
   ↓
9. Backend:
   - Actualiza EditRequest: status = "approved"
   - Crea/actualiza ProjectMember:
     { userId: pedroId, role: "EDITOR" }
   ↓
10. Backend notifica a Pedro:
    socket.to(`user:${pedroId}`).emit('editApproved', {
      projectId: "123",
      role: "EDITOR"
    })
    ↓

=== PEDRO (ahora EDITOR) ===
1. Recibe evento 'editApproved'
   ↓
2. Toast: "¡Solicitud aprobada! Ya podés editar"
   ↓
3. Frontend actualiza role local: VIEWER → EDITOR
   ↓
4. Banner desaparece
   ↓
5. Graph.interacting = true
   ↓
6. Pedro ahora puede:
   - Mover clases
   - Agregar clases
   - Editar relaciones
   - Todo sincronizado en tiempo real
   ↓
¡Pedro y Ana colaboran juntos!
```

---

### Flujo 6: Generar Código Spring Boot

```
1. Usuario tiene diagrama completo con:
   - Clase Usuario (id, nombre, email)
   - Clase Producto (id, nombre, precio)
   - Relación Usuario → Producto (1 a *)
   ↓
2. Usuario hace clic en "Generar Código Spring"
   ↓
3. handleGenerateCode():
   - Extrae todas las clases del graph
   - Extrae todas las relaciones
   ↓
4. const generator = new JavaSpringGenerator()
   ↓
5. Por cada clase:
   generator.addClass({
     name: "Usuario",
     attributes: ["id: Long", "nombre: String", "email: String"],
     methods: []
   })
   ↓
6. Por cada relación:
   generator.addRelation({
     source: "Usuario",
     target: "Producto",
     type: "assoc",
     sourceMultiplicity: "1",
     targetMultiplicity: "*"
   })
   ↓
7. const files = generator.generateAll()
   
   Genera estructura:
   {
     "pom.xml": "...",
     "src/main/java/com/example/Application.java": "...",
     "src/main/resources/application.properties": "...",
     
     "src/main/java/com/example/model/Usuario.java":
       @Entity
       public class Usuario {
         @Id @GeneratedValue
         private Long id;
         private String nombre;
         private String email;
         
         @OneToMany(mappedBy = "usuario")
         private List<Producto> productos;
         
         // getters/setters
       }
     
     "src/main/java/com/example/repository/UsuarioRepository.java":
       public interface UsuarioRepository extends JpaRepository<Usuario, Long> {}
     
     "src/main/java/com/example/controller/UsuarioController.java":
       @RestController
       @RequestMapping("/api/usuarios")
       public class UsuarioController {
         @GetMapping
         public List<Usuario> findAll() { ... }
         
         @PostMapping
         public Usuario create(@RequestBody Usuario usuario) { ... }
         
         // CRUD completo
       }
     
     // Similar para Producto...
   }
   ↓
8. const zip = new JSZip()
   Object.entries(files).forEach(([path, content]) => {
     zip.file(path, content)
   })
   ↓
9. const blob = await zip.generateAsync({ type: 'blob' })
   ↓
10. Crea link de descarga y hace clic automático
    ↓
11. Navegador descarga "spring-boot-project.zip"
    ↓
12. Usuario descomprime ZIP
    ↓
13. Abre terminal en carpeta descomprimida
    ↓
14. Ejecuta: mvn spring-boot:run
    ↓
15. Servidor Spring arranca en localhost:8080
    ↓
16. Prueba API con Postman:
    - POST http://localhost:8080/api/usuarios
      {
        "nombre": "Juan",
        "email": "juan@ejemplo.com"
      }
    ↓
17. ¡API REST funcionando desde el diagrama!
    ↓

=== CASO ESPECIAL: Fechas ===
Si hay atributo de tipo Date/LocalDate:

Diagrama tiene:
  Medicamento:
    - fechaVencimiento: LocalDate

Postman debe enviar:
  {
    "fechaVencimiento": "2026-12-31"  // Formato ISO: YYYY-MM-DD
  }

NO enviar:
  "fechaVencimiento": "sample_fechaVencimiento"  // ❌ ERROR

Spring Boot automáticamente parsea formato ISO.
```

---


## 🔒 SEGURIDAD

### Autenticación JWT

**¿Cómo funciona?**

```
1. Usuario hace login con email + password
   ↓
2. Backend verifica credenciales en DB
   ↓
3. Si correcto, genera JWT:
   {
     header: { alg: "HS256", typ: "JWT" },
     payload: { 
       sub: userId,
       email: "usuario@ejemplo.com",
       role: "USER",
       iat: timestamp_creacion,
       exp: timestamp_expiracion (7 días)
     },
     signature: HMAC_SHA256(header + payload, JWT_SECRET)
   }
   ↓
4. Backend retorna token al cliente
   ↓
5. Cliente guarda en localStorage:
   localStorage.setItem('token', token)
   ↓
6. En cada petición, cliente envía:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ↓
7. Backend extrae y verifica token:
   - Firma válida (con JWT_SECRET)
   - No expirado
   - Usuario existe
   ↓
8. Si válido: permite acceso
   Si inválido: retorna 401 Unauthorized
```

**Ventajas**:
- Stateless (no sesiones en servidor)
- Escalable (cualquier servidor puede validar)
- Seguro (firma criptográfica)

**Limitaciones**:
- No se puede "revocar" sin blacklist
- Expone información en payload (no sensible)

---

### Autorización por Roles

**Guards en NestJS**:

```typescript
// jwt.guard.ts - Verifica autenticación
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Valida JWT token
    return super.canActivate(context);
  }
}

// roles.guard.ts - Verifica permisos
@Injectable()
export class ProjectRolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id;
    
    const role = await getUserRole(user.id, projectId);
    
    // Ejemplo: solo OWNER puede eliminar
    if (request.method === 'DELETE') {
      return role === 'OWNER';
    }
    
    // EDITOR puede modificar
    if (request.method === 'PUT' || request.method === 'PATCH') {
      return ['OWNER', 'ADMIN', 'EDITOR'].includes(role);
    }
    
    // Todos pueden ver
    return true;
  }
}
```

**Uso en controllers**:
```typescript
@Controller('projects')
@UseGuards(JwtAuthGuard)  // Requiere autenticación
export class ProjectsController {
  
  @Delete(':id')
  @UseGuards(ProjectRolesGuard)  // Requiere rol OWNER
  async deleteProject(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }
}
```

---

### Protección contra Ataques

#### 1. **SQL Injection** ❌
**Vulnerable**:
```typescript
// ❌ MAL: Concatenación directa
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

**Protegido** ✅:
```typescript
// ✅ BIEN: Prisma sanitiza automáticamente
const user = await prisma.user.findUnique({
  where: { email }  // Prisma usa prepared statements
});
```

#### 2. **XSS (Cross-Site Scripting)** ❌
**Vulnerable**:
```typescript
// ❌ MAL: Renderizar HTML sin sanitizar
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**Protegido** ✅:
```typescript
// ✅ BIEN: React escapa automáticamente
<div>{userInput}</div>

// Para HTML necesario: usar DOMPurify
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

#### 3. **CSRF (Cross-Site Request Forgery)**
**Protección**:
- Tokens CSRF en formularios
- SameSite cookies
- Verificación de origen

```typescript
// backend/src/main.ts
app.use(helmet());  // Headers de seguridad
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true
});
```

#### 4. **Rate Limiting**
Prevenir abuso de API:

```typescript
import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100,                   // 100 peticiones por IP
  message: 'Demasiadas peticiones, intenta más tarde'
});

app.use('/api/', limiter);
```

---

### Contraseñas Seguras

**Bcrypt Hashing**:

```typescript
import * as bcrypt from 'bcrypt';

// Al registrar:
const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
await prisma.user.create({
  data: { email, name, passwordHash }
});

// Al hacer login:
const user = await prisma.user.findUnique({ where: { email } });
const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
```

**¿Por qué bcrypt?**
- Adaptativo (aumenta dificultad con el tiempo)
- Salting automático (cada hash es único)
- Resistente a ataques rainbow table
- Lento intencionalmente (previene brute force)

---

### Variables de Entorno

**Nunca commitear**:
```bash
# .gitignore
.env
.env.local
.env.production
```

**Usar en código**:
```typescript
// ❌ MAL: Hardcodear secretos
const secret = "mi_super_secreto";

// ✅ BIEN: Usar variables de entorno
const secret = process.env.JWT_SECRET;

// ✅ MEJOR: Validar con schema
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  GROQ_API_KEY: z.string().startsWith('gsk_')
});

const env = envSchema.parse(process.env);
```

---

## 🧪 TESTING Y CALIDAD

### Tests Unitarios (Jest)

**Ejemplo: Auth Service**
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, PrismaService]
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const result = await service.register(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.user.passwordHash).not.toBe(dto.password);
      expect(result.token).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      // ... test
    });
  });

  describe('login', () => {
    it('should return user and token for valid credentials', async () => {
      // ... test
    });

    it('should throw error for invalid password', async () => {
      // ... test
    });
  });
});
```

**Correr tests**:
```bash
cd backend
npm test

# Con coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

### Tests E2E (End-to-End)

**Ejemplo: Project Creation Flow**
```typescript
// projects.e2e-spec.ts
describe('Projects (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // Setup test app
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login y obtener token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    token = loginRes.body.token;
  });

  it('/projects (POST) should create new project', () => {
    return request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Project',
        description: 'Test Description'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('Test Project');
      });
  });

  it('/projects/:id (GET) should return project details', () => {
    // ... test
  });
});
```

---

### Linting y Formateo

**ESLint** (análisis estático de código):
```bash
# Backend
cd backend
npm run lint
npm run lint -- --fix

# Frontend
cd frontend
npm run lint
```

**Prettier** (formateo consistente):
```bash
npm run format
```

**Configuración** (`.eslintrc.json`):
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

---

## 🚀 DESPLIEGUE (PRODUCCIÓN)

### Opción 1: Despliegue Tradicional (VPS)

**Requisitos**:
- Servidor Linux (Ubuntu 22.04)
- Node.js 18+
- PostgreSQL
- Nginx (reverse proxy)
- PM2 (process manager)

**Pasos**:

#### 1. Configurar Servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Instalar Nginx
sudo apt install nginx

# Instalar PM2
sudo npm install -g pm2
```

#### 2. Configurar Base de Datos
```bash
sudo -u postgres psql

# En psql:
CREATE DATABASE uml_editor_production;
CREATE USER uml_user WITH PASSWORD 'super_secure_password';
GRANT ALL PRIVILEGES ON DATABASE uml_editor_production TO uml_user;
\q
```

#### 3. Clonar y Configurar Backend
```bash
cd /var/www
git clone <repo_url> uml-editor
cd uml-editor/backend

# Instalar dependencias
npm ci --only=production

# Configurar .env
nano .env
# DATABASE_URL=postgresql://uml_user:super_secure_password@localhost:5432/uml_editor_production
# JWT_SECRET=<generar_secreto_seguro>
# GROQ_API_KEY=<tu_api_key>

# Ejecutar migraciones
npx prisma migrate deploy
npx prisma generate

# Construir
npm run build

# Iniciar con PM2
pm2 start dist/main.js --name uml-backend
pm2 startup
pm2 save
```

#### 4. Configurar Frontend
```bash
cd ../frontend

# Instalar dependencias
npm ci

# Configurar .env.production
nano .env.production
# VITE_API_URL=https://api.tudominio.com/api
# VITE_SOCKET_URL=https://api.tudominio.com

# Construir para producción
npm run build

# Mover a carpeta de Nginx
sudo cp -r dist/* /var/www/html/uml-editor/
```

#### 5. Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/uml-editor

# Contenido:
server {
    listen 80;
    server_name tudominio.com;

    # Frontend
    location / {
        root /var/www/html/uml-editor;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Activar sitio
sudo ln -s /etc/nginx/sites-available/uml-editor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL con Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

---

### Opción 2: Despliegue en la Nube (Vercel + Railway)

#### **Frontend en Vercel**

1. Conectar repositorio a Vercel
2. Configurar build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Variables de entorno:
   - `VITE_API_URL`
   - `VITE_SOCKET_URL`
4. Deploy automático en cada push

#### **Backend en Railway**

1. Crear nuevo proyecto en Railway
2. Agregar servicio PostgreSQL
3. Agregar servicio Node.js:
   - Connect GitHub repo
   - Root Directory: `/backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start:prod`
4. Variables de entorno:
   - `DATABASE_URL` (auto-generada por Railway)
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `FRONTEND_URL`
5. Deploy automático

---

### Opción 3: Docker + Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: uml_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: uml_editor
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://uml_user:${DB_PASSWORD}@postgres:5432/uml_editor
      JWT_SECRET: ${JWT_SECRET}
      GROQ_API_KEY: ${GROQ_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: http://backend:3000/api
      VITE_SOCKET_URL: http://backend:3000
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Desplegar**:
```bash
docker-compose up -d
```

---


## 📖 GLOSARIO DE TÉRMINOS

### Términos Generales

**API (Application Programming Interface)**
- Conjunto de reglas para que software se comunique
- Ejemplo: El frontend usa la API del backend para obtener datos

**REST (Representational State Transfer)**
- Estilo de arquitectura para APIs web
- Usa HTTP methods: GET (leer), POST (crear), PUT (actualizar), DELETE (eliminar)

**JSON (JavaScript Object Notation)**
- Formato ligero de intercambio de datos
- Ejemplo: `{ "name": "Juan", "age": 25 }`

**CRUD**
- Create, Read, Update, Delete
- Operaciones básicas sobre datos

---

### Términos de Backend

**NestJS**
- Framework de Node.js para aplicaciones escalables
- Usa TypeScript y decoradores (@Injectable, @Controller)

**Prisma**
- ORM (Object-Relational Mapping)
- Traduce objetos de código a tablas de base de datos

**JWT (JSON Web Token)**
- Token de autenticación que contiene información del usuario
- Firmado criptográficamente para seguridad

**WebSocket**
- Protocolo para comunicación bidireccional en tiempo real
- A diferencia de HTTP, mantiene conexión abierta

**Socket.IO**
- Librería que facilita el uso de WebSockets
- Incluye fallbacks si WebSocket no está disponible

**CRDT (Conflict-free Replicated Data Type)**
- Estructura de datos que se sincroniza automáticamente
- Múltiples usuarios pueden editar sin conflictos

**Yjs**
- Implementación de CRDT para JavaScript
- Usado para colaboración en tiempo real

**Bcrypt**
- Algoritmo de hashing para contraseñas
- Hace que las contraseñas sean ilegibles

**Middleware**
- Función que se ejecuta entre la petición y la respuesta
- Ejemplo: verificar autenticación antes de procesar petición

**Guard**
- Protección de rutas en NestJS
- Decide si un usuario puede acceder a un endpoint

**DTO (Data Transfer Object)**
- Objeto que define la estructura de datos
- Usado para validación y documentación

---

### Términos de Frontend

**React**
- Librería de JavaScript para construir interfaces
- Basada en componentes reutilizables

**Component**
- Pieza independiente y reutilizable de UI
- Ejemplo: Button, Modal, Card

**Hook**
- Funciones especiales de React (useState, useEffect, useRef)
- Permiten usar estado y efectos en componentes funcionales

**State**
- Datos que pueden cambiar y causan re-renderizado
- Ejemplo: `const [count, setCount] = useState(0)`

**Props**
- Propiedades que se pasan de componente padre a hijo
- Son inmutables desde el componente hijo

**Context**
- Forma de compartir datos globalmente sin pasar props
- Ejemplo: AuthContext comparte usuario autenticado

**Portal**
- Renderizar componente fuera del DOM tree principal
- Usado para modales y tooltips

**Ref**
- Referencia a elemento DOM o valor mutable
- No causa re-renderizado al cambiar

**Vite**
- Build tool ultra rápido para desarrollo frontend
- Usa ESM (ES Modules) nativo

**TailwindCSS**
- Framework de CSS basado en utilidades
- Ejemplo: `className="bg-blue-500 text-white px-4 py-2"`

**TypeScript**
- JavaScript con tipos estáticos
- Detecta errores antes de ejecutar

**TSX**
- TypeScript + JSX (sintaxis XML en JS)
- Archivos `.tsx` combinan lógica y UI

---

### Términos de UML

**UML (Unified Modeling Language)**
- Lenguaje estándar para modelar software
- Incluye diagramas de clases, secuencia, casos de uso, etc.

**Diagrama de Clases**
- Representa estructura estática de un sistema
- Muestra clases, atributos, métodos y relaciones

**Clase**
- Plantilla para crear objetos
- Tiene nombre, atributos (datos) y métodos (comportamiento)

**Atributo**
- Variable que pertenece a una clase
- Ejemplo: `nombre: String`, `edad: int`

**Método**
- Función que pertenece a una clase
- Ejemplo: `calcularEdad(): int`, `validar(): boolean`

**Relación**
- Conexión entre dos clases
- Tipos: Asociación, Agregación, Composición, Herencia, Dependencia

**Asociación**
- Relación general entre clases
- Ejemplo: "Usuario usa Producto"

**Agregación**
- Relación "tiene-un" (whole-part)
- Las partes pueden existir independientemente
- Símbolo: rombo vacío ◇

**Composición**
- Agregación fuerte
- Las partes no pueden existir sin el todo
- Símbolo: rombo relleno ◆

**Herencia**
- Relación "es-un"
- Clase hija hereda de clase padre
- Símbolo: flecha grande vacía ▷

**Dependencia**
- Relación débil, uso temporal
- Ejemplo: método recibe parámetro de otra clase
- Símbolo: línea punteada con flecha →

**Multiplicidad (Cardinalidad)**
- Cuántas instancias pueden relacionarse
- `1`: exactamente una
- `*` o `0..*`: cero o muchas
- `1..*`: una o muchas
- `0..1`: cero o una

---

### Términos de Diagramas (X6)

**Graph**
- Contenedor principal del diagrama
- Maneja nodos, edges, eventos

**Node**
- Elemento visual (clase, rectángulo, círculo)
- Tiene posición (x, y), tamaño (width, height), datos

**Edge**
- Línea que conecta dos nodos (relación)
- Tiene source (origen), target (destino), router, connector

**Port**
- Punto de conexión en un nodo
- Posiciones: top, right, bottom, left

**Router**
- Define el camino de una línea
- Tipos: orth (L), manhattan, normal (recta)

**Connector**
- Define cómo se dibuja la línea
- Tipos: rounded (esquinas redondeadas), smooth (curva S)

**Marker**
- Símbolo al final de una línea
- Tipos: block (flecha), diamond (rombo), classic

**Selection**
- Plugin para seleccionar múltiples elementos
- Incluye rubberband (selección con rectángulo)

**MiniMap**
- Mapa pequeño de todo el diagrama
- Para navegación en diagramas grandes

**Snapshot**
- Representación serializable del diagrama
- Se guarda en base de datos como JSON

---

### Términos de Base de Datos

**PostgreSQL**
- Sistema de gestión de base de datos relacional
- Open source, potente, confiable

**Schema**
- Definición de la estructura de la base de datos
- Tablas, columnas, relaciones, tipos

**Migration**
- Script que modifica la estructura de la base de datos
- Permite versionar cambios en el schema

**Foreign Key**
- Columna que referencia a otra tabla
- Crea relación entre tablas

**Index**
- Estructura para búsquedas rápidas
- Como índice de un libro

**UUID (Universally Unique Identifier)**
- ID único de 128 bits
- Ejemplo: `550e8400-e29b-41d4-a716-446655440000`

**Cascade Delete**
- Al eliminar registro padre, elimina hijos automáticamente
- Ejemplo: eliminar Project elimina sus Diagrams

---

### Términos de IA

**LLM (Large Language Model)**
- Modelo de inteligencia artificial entrenado con texto
- Ejemplos: GPT-4, LLaMA, Claude

**Groq**
- Plataforma de inferencia de IA ultra rápida
- Usa chips especializados (LPU)

**Prompt**
- Instrucción que se envía al modelo de IA
- Determina la respuesta generada

**Context**
- Información adicional que se da al modelo
- En nuestro caso: diagrama actual del usuario

**Token**
- Unidad básica que procesa un LLM
- Aproximadamente 4 caracteres = 1 token

**OCR (Optical Character Recognition)**
- Tecnología para leer texto de imágenes
- Usado para importar diagramas desde fotos

**Tesseract**
- Motor de OCR open source
- Desarrollado originalmente por HP, ahora por Google

---

### Términos de Colaboración

**Real-time**
- Sincronización instantánea entre usuarios
- Cambios se ven sin recargar página

**Awareness**
- Información sobre otros usuarios conectados
- Ejemplo: ver cursores de otros

**Concurrent Editing**
- Múltiples usuarios editando simultáneamente
- Sin bloqueos ni conflictos

**Operational Transformation (OT)**
- Técnica para sincronizar ediciones
- Alternativa a CRDT (más complejo)

**Eventual Consistency**
- Todos los clientes convergen al mismo estado
- Puede haber diferencias temporales

---

### Términos de Seguridad

**Hashing**
- Convertir dato en cadena irreversible
- Para contraseñas, usa bcrypt

**Salt**
- Valor aleatorio agregado antes de hashear
- Hace cada hash único

**CORS (Cross-Origin Resource Sharing)**
- Política de seguridad del navegador
- Controla qué dominios pueden acceder a API

**HTTPS**
- HTTP con encriptación TLS/SSL
- Protege datos en tránsito

**Rate Limiting**
- Limitar número de peticiones por tiempo
- Previene abuso de API

**SQL Injection**
- Ataque que inyecta código SQL malicioso
- Prisma previene automáticamente

**XSS (Cross-Site Scripting)**
- Ataque que inyecta JavaScript malicioso
- React escapa contenido automáticamente

---

## ❓ PREGUNTAS FRECUENTES (FAQ)

### Sobre el Proyecto

**P: ¿Qué problema resuelve este proyecto?**
R: Facilita el diseño colaborativo de sistemas y genera código automáticamente, ahorrando tiempo y reduciendo errores.

**P: ¿Quiénes pueden usarlo?**
R: Desarrolladores, estudiantes de programación, arquitectos de software, equipos ágiles.

**P: ¿Es open source?**
R: Depende de la licencia que elijas. Actualmente es un proyecto académico.

**P: ¿Cuánto cuesta ejecutarlo?**
R: Gratis en desarrollo local. En producción depende del hosting elegido.

---

### Sobre Funcionalidades

**P: ¿Cuántos usuarios pueden colaborar simultáneamente?**
R: Sin límite teórico. En práctica depende del servidor (recomendado: hasta 50 por proyecto).

**P: ¿Se guardan los cambios automáticamente?**
R: Sí, cada 1.2 segundos (debounced).

**P: ¿Funciona offline?**
R: Parcialmente. Puedes editar, pero no se sincronizará hasta tener conexión.

**P: ¿Puedo importar diagramas de otras herramientas?**
R: Sí, mediante imagen (OCR + IA). No soporta archivos .xmi o .uml nativamente.

**P: ¿Qué lenguajes de código genera?**
R: Actualmente Java Spring Boot. Flutter está comentado temporalmente.

**P: ¿Puedo exportar a otros formatos?**
R: Sí, PNG, PDF, y ZIP con código Java.

---

### Sobre Tecnología

**P: ¿Por qué NestJS y no Express directo?**
R: NestJS provee estructura, TypeScript nativo, decoradores, inyección de dependencias.

**P: ¿Por qué PostgreSQL y no MongoDB?**
R: Relaciones complejas (usuarios, proyectos, permisos) se modelan mejor en SQL.

**P: ¿Por qué Yjs y no Operational Transformation?**
R: Yjs (CRDT) es más simple y no requiere servidor central de resolución.

**P: ¿Por qué React y no Vue/Angular?**
R: Popularidad, ecosistema, X6 tiene mejor integración con React.

---

### Sobre Instalación

**P: ¿Funciona en Windows/Mac/Linux?**
R: Sí, todas las herramientas son multiplataforma.

**P: ¿Necesito saber Docker?**
R: No, pero facilita el despliegue.

**P: ¿Puedo usar MySQL en lugar de PostgreSQL?**
R: Sí, cambiando la URL en Prisma, pero PostgreSQL es recomendado.

**P: ¿Cómo obtengo una API key de Groq?**
R: Registrarse en https://console.groq.com/ (gratis).

---

### Sobre Seguridad

**P: ¿Las contraseñas se guardan en texto plano?**
R: No, se hashean con bcrypt (12 rounds).

**P: ¿Puedo revocar tokens JWT?**
R: No directamente (son stateless). Necesitarías blacklist en Redis.

**P: ¿Los diagramas son privados?**
R: Sí, solo accesibles por owner y miembros del proyecto.

**P: ¿Puedo hacer un proyecto público?**
R: Sí, generando enlace compartido con token.

---

### Troubleshooting

**P: "Cannot connect to database"**
R: Verifica que PostgreSQL esté corriendo y la URL en .env sea correcta.

**P: "Module not found"**
R: Ejecuta `npm install` en backend y frontend.

**P: "Port 3000 already in use"**
R: Mata el proceso: `lsof -ti:3000 | xargs kill` (Mac/Linux) o usa otro puerto.

**P: "WebSocket connection failed"**
R: Verifica que el backend esté corriendo y las variables VITE_SOCKET_URL sean correctas.

**P: Error de CORS**
R: Agrega `FRONTEND_URL` en .env del backend con la URL de tu frontend.

**P: "Prisma schema not found"**
R: Ejecuta `npx prisma generate` en la carpeta backend.

---

## 🎓 CONCEPTOS PARA DEFENDER EL PROYECTO

### 1. Arquitectura Cliente-Servidor

**Pregunta**: ¿Cómo se comunican el frontend y backend?

**Respuesta**:
- **HTTP/REST**: Para operaciones CRUD (crear, leer, actualizar, eliminar)
- **WebSocket**: Para sincronización en tiempo real
- El frontend hace peticiones HTTP al backend
- El backend procesa, accede a la base de datos y responde
- WebSocket mantiene conexión abierta para notificaciones instantáneas

---

### 2. Base de Datos Relacional

**Pregunta**: ¿Por qué usar PostgreSQL y no NoSQL?

**Respuesta**:
- Relaciones complejas: User → Project (1 a muchos), Project ↔ User (muchos a muchos vía ProjectMember)
- Integridad referencial: Foreign keys aseguran consistencia
- Transacciones ACID: Operaciones críticas (aprobar solicitudes) son atómicas
- Consultas complejas: JOINs para obtener proyectos con miembros y diagramas

---

### 3. Autenticación y Seguridad

**Pregunta**: ¿Cómo se asegura que solo usuarios autorizados accedan?

**Respuesta**:
- **JWT**: Token firmado que identifica al usuario
- **Guards**: Middleware que verifica token antes de procesar petición
- **Roles**: OWNER, ADMIN, EDITOR, VIEWER con permisos distintos
- **Bcrypt**: Contraseñas hasheadas, no reversibles
- **CORS**: Solo frontend autorizado puede acceder a API

---

### 4. Colaboración en Tiempo Real

**Pregunta**: ¿Cómo funciona la edición simultánea sin conflictos?

**Respuesta**:
- **CRDT (Yjs)**: Estructura de datos que se sincroniza automáticamente
- **Y.Doc**: Documento compartido que representa el diagrama
- Cada cambio local se envía al servidor vía WebSocket
- Servidor aplica cambios a Y.Doc central
- Servidor hace broadcast a todos los clientes
- Todos convergen al mismo estado (eventual consistency)
- No hay "conflictos" porque CRDT los resuelve matemáticamente

---

### 5. Generación de Código

**Pregunta**: ¿Cómo se genera el código Spring Boot desde el diagrama?

**Respuesta**:
1. Se extraen clases (nombre, atributos, métodos) y relaciones del diagrama
2. JavaSpringGenerator recorre cada clase y relación
3. Para cada clase, genera:
   - **Entity**: Clase Java con anotaciones JPA (@Entity, @Id, @Column)
   - **Repository**: Interface que extiende JpaRepository
   - **Controller**: Endpoints REST para CRUD
4. Para cada relación, agrega anotaciones:
   - 1-a-* : @OneToMany / @ManyToOne
   - *-a-* : @ManyToMany con tabla intermedia
   - Composición: cascade = CascadeType.ALL
5. Genera archivos de configuración: pom.xml, application.properties
6. Empaqueta todo en ZIP y descarga

---

### 6. Inteligencia Artificial

**Pregunta**: ¿Cómo funciona el asistente de IA?

**Respuesta**:
- Usa modelo LLaMA 3.1 70B vía Groq API
- Se envía el diagrama actual como contexto
- El modelo analiza y genera sugerencias estructuradas
- No es texto libre, sino JSON con clases y relaciones
- Frontend interpreta JSON y crea elementos en el diagrama
- Para importar imagen:
  1. Tesseract.js extrae texto (OCR)
  2. IA analiza texto y detecta clases/relaciones
  3. Retorna estructura JSON
  4. Frontend renderiza diagrama

---

### 7. Escalabilidad

**Pregunta**: ¿Qué pasa si hay muchos usuarios simultáneos?

**Respuesta**:
- **Horizontal scaling**: Múltiples instancias del backend con load balancer
- **Redis**: Para compartir estado de WebSocket entre servidores
- **Database pooling**: Conexiones reutilizables a PostgreSQL
- **CDN**: Frontend estático servido desde edge locations
- **Rate limiting**: Previene abuso de API
- **Lazy loading**: Frontend carga datos bajo demanda

---

### 8. Testing

**Pregunta**: ¿Cómo se asegura la calidad del código?

**Respuesta**:
- **Unit tests**: Jest para lógica de negocio aislada
- **Integration tests**: Probar interacción entre módulos
- **E2E tests**: Simular flujos completos de usuario
- **Linting**: ESLint detecta problemas de código
- **TypeScript**: Tipos previenen errores en tiempo de desarrollo
- **Code coverage**: Medir % de código testeado

---

## 📚 RECURSOS ADICIONALES

### Documentación Oficial

- **NestJS**: https://docs.nestjs.com/
- **React**: https://react.dev/
- **Prisma**: https://www.prisma.io/docs
- **AntV X6**: https://x6.antv.antgroup.com/
- **Yjs**: https://docs.yjs.dev/
- **Socket.IO**: https://socket.io/docs/
- **Groq**: https://console.groq.com/docs

### Tutoriales Recomendados

- **NestJS CRUD**: https://www.youtube.com/watch?v=GHTA143_b-s
- **React Hooks**: https://www.youtube.com/watch?v=O6P86uwfdR0
- **WebSockets**: https://www.youtube.com/watch?v=1BfCnjr_Vjg
- **JWT Auth**: https://www.youtube.com/watch?v=mbsmsi7l3r4

### Comunidades

- **Stack Overflow**: Para preguntas técnicas
- **Discord de NestJS**: https://discord.gg/nestjs
- **Reddit r/reactjs**: https://reddit.com/r/reactjs

---

## 🏆 CONCLUSIÓN

Este proyecto es un **Editor de Diagramas UML** completo con:
- ✅ Interfaz visual intuitiva
- ✅ Colaboración en tiempo real
- ✅ Inteligencia artificial integrada
- ✅ Generación automática de código
- ✅ Seguridad robusta
- ✅ Arquitectura escalable

**Tecnologías principales**:
- Backend: NestJS + PostgreSQL + Prisma + Socket.IO + Yjs
- Frontend: React + TypeScript + X6 + TailwindCSS
- IA: Groq (LLaMA 3.1) + Tesseract.js

**Casos de uso**:
- Diseño de sistemas antes de programar
- Enseñanza de UML y patrones de diseño
- Prototipado rápido de APIs
- Documentación visual de proyectos

---

**Fecha de documentación**: 19 de enero de 2026  
**Versión del proyecto**: 1.0  
**Autor de la documentación**: GitHub Copilot CLI  

---

**¡Listo para defender el proyecto! 🚀**

Esta documentación cubre:
- ✅ Qué es y para qué sirve
- ✅ Cómo funciona internamente
- ✅ Qué tecnologías usa y por qué
- ✅ Dónde está cada cosa
- ✅ Cómo instalarlo y desplegarlo
- ✅ Conceptos clave para la defensa
- ✅ Respuestas a preguntas frecuentes

**Tip para la defensa**: Abre el proyecto, muestra el código mencionando archivos específicos de esta documentación, y ejecuta la aplicación en vivo demostrando las funcionalidades. ¡Éxito! 🎯


