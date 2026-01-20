import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import type { RealtimeService } from '../diagram-realtime/realtime.service';
import type { DiagramSnapshot } from '../diagram-realtime/realtime.service';

@Injectable()
export class DiagramsService {
  private realtimeService?: RealtimeService;

  constructor(private prisma: PrismaService) {}

  /** Inyectar el servicio de tiempo real (se hace en el módulo) */
  setRealtimeService(service: RealtimeService) {
    this.realtimeService = service;
  }

  /** Verifica si el usuario puede ver/editar el proyecto */
  private async assertProjectAccess(userId: string, projectId: string) {
    const p = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        members: { where: { userId }, select: { id: true }, take: 1 },
      },
    });
    if (!p) throw new NotFoundException('Proyecto no encontrado');
    const isMember = p.ownerId === userId || p.members.length > 0;
    if (!isMember) throw new ForbiddenException('Sin acceso a este proyecto');
  }

  /** Interno: obtiene o crea el snapshot vacío */
  private async getOrInit(projectId: string) {
    let d = await this.prisma.diagram.findUnique({ where: { projectId } });
    if (!d) {
      d = await this.prisma.diagram.create({
        data: {
          projectId,
          snapshot: {
            nodes: [],
            edges: [],
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }
    return d.snapshot;
  }

  /** Interno: upsert del snapshot */
  private async upsert(
    projectId: string,
    payload: { nodes: any[]; edges: any[]; updatedAt?: string },
  ) {
    const snapshot = {
      nodes: payload.nodes ?? [],
      edges: payload.edges ?? [],
      updatedAt: payload.updatedAt ?? new Date().toISOString(),
    };

    const d = await this.prisma.diagram.upsert({
      where: { projectId },
      update: { snapshot },
      create: { projectId, snapshot },
      select: { snapshot: true },
    });

    return d.snapshot;
  }

  // ===== Públicos para el controller (con control de acceso) =====

  async getOrInitForUser(userId: string, projectId: string) {
    await this.assertProjectAccess(userId, projectId);
    return this.getOrInit(projectId);
  }

  async upsertForUser(
    userId: string,
    projectId: string,
    payload: { nodes: any[]; edges: any[]; updatedAt?: string },
  ) {
    await this.assertCanEdit(userId, projectId);
    const result = await this.upsert(projectId, payload);
    
    // ✅ NOTIFICAR a todos los clientes conectados en tiempo real
    if (this.realtimeService && result) {
      this.realtimeService.broadcastSnapshotUpdate(projectId, result as DiagramSnapshot);
    }
    
    return result;
  }

  private async assertCanEdit(userId: string, projectId: string) {
    const p = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        members: { where: { userId }, select: { role: true }, take: 1 },
      },
    });
    if (!p) throw new NotFoundException('Proyecto no encontrado');
    const role = p.ownerId === userId ? 'OWNER' : (p.members[0]?.role ?? null);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN' && role !== 'EDITOR')) {
      throw new ForbiddenException(
        'No tenés permisos para editar este proyecto',
      );
    }
  }
}
