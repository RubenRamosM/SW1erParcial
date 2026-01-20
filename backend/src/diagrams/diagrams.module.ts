import { Module, OnModuleInit } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { DiagramsController } from './diagrams.controller';
import { PrismaService } from '../common/prisma.service';
import { DiagramRealtimeModule } from '../diagram-realtime/diagram-realtime.module';
import { RealtimeService } from '../diagram-realtime/realtime.service';

@Module({
  imports: [DiagramRealtimeModule],
  controllers: [DiagramsController],
  providers: [DiagramsService, PrismaService],
  exports: [DiagramsService],
})
export class DiagramsModule implements OnModuleInit {
  constructor(
    private diagrams: DiagramsService,
    private realtime: RealtimeService,
  ) {}

  /**
   * Inyectar RealtimeService en DiagramsService después de que ambos estén listos
   */
  onModuleInit() {
    this.diagrams.setRealtimeService(this.realtime);
    console.log('[DiagramsModule] RealtimeService inyectado en DiagramsService');
  }
}

