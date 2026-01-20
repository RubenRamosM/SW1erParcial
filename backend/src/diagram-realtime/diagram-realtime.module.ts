// src/diagram-realtime/diagram-realtime.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { DiagramGateway } from './diagram.gateway';
import { ShareModule } from '../share/share.module';
import { PrismaService } from '../common/prisma.service';
import { RealtimeService } from './realtime.service';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    ShareModule,
    RedisModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  providers: [DiagramGateway, PrismaService, RealtimeService],
  exports: [DiagramGateway, RealtimeService], // 👈 Exportar ambos para inyección en otros módulos
})
export class DiagramRealtimeModule implements OnModuleInit {
  constructor(
    private gateway: DiagramGateway,
    private realtime: RealtimeService,
  ) {}

  /**
   * Inyectar referencias cruzadas después de que todo esté listo
   */
  onModuleInit() {
    this.realtime.setGateway(this.gateway);
    console.log('[DiagramRealtimeModule] Gateway inyectado en RealtimeService');
  }
}

