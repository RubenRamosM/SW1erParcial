// src/projects/edit-requests.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../common/prisma.service';
import { DiagramGateway } from '../diagram-realtime/diagram.gateway';
import { RequestEditDto } from './dto/request-edit.dto';
import { IsString } from 'class-validator';

class RejectEditDto {
  @IsString()
  targetUserId!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class EditRequestsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly prisma: PrismaService,
    private readonly gateway: DiagramGateway, // emitimos al owner por socket
  ) {}

  // GET /api/projects/pending-requests - Obtiene todas las solicitudes pendientes para el owner
  @Get('pending-requests')
  async getPendingRequests(@Req() req: any) {
    const ownerId: string = req.user.id;
    return this.projects.getPendingRequestsForOwner(ownerId);
  }

  // POST /api/projects/:projectId/request-edit
  @Post(':projectId/request-edit')
  async requestEdit(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: RequestEditDto,
  ) {
    const requesterId: string = req.user.id;

    // Crea (o asegura) la solicitud en BD
    const result = await this.projects.createEditRequest(
      requesterId,
      projectId,
      dto?.message,
    );

    // Si fue skipped (usuario ya es editor), no notificamos
    if (result.skipped) {
      return result;
    }

    // Verifica proyecto y obtiene owner + nombre del solicitante
    const [proj, requester] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true, name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { name: true, email: true },
      }),
    ]);
    if (!proj) throw new NotFoundException('Proyecto no encontrado');

    // Notifica al owner en su sala "user:<ownerId>"
    // (el gateway mete al socket en esa sala en handleConnection)
    const ns: any = (this.gateway as any).server; // Namespace
    if (ns && result.request?.id) {
      console.log('[EditRequest] Emitiendo editRequest a user:', proj.ownerId, 'requestId:', result.request.id);
      ns.to(`user:${proj.ownerId}`).emit('editRequest', {
        requestId: result.request.id,
        projectId,
        projectName: proj.name,
        requesterId,
        requesterName: requester?.name || requester?.email || 'Usuario',
        message: dto?.message ?? null,
      });
    }

    return result; // { ok: true, request }
  }

  // POST /api/projects/:projectId/reject-edit
  @Post(':projectId/reject-edit')
  async rejectEdit(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: RejectEditDto,
  ) {
    const ownerId: string = req.user.id;

    const result = await this.projects.rejectEditRequest(
      ownerId,
      projectId,
      dto.targetUserId,
    );

    // Notificar al usuario que su solicitud fue rechazada
    const ns: any = (this.gateway as any).server;
    ns?.to?.(`user:${dto.targetUserId}`)?.emit?.('editRequestRejected', {
      projectId,
      message: 'Tu solicitud de edición fue rechazada',
    });

    return { ok: result };
  }
}
