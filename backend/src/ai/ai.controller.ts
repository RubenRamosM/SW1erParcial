import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AiService, AiResponse } from './ai.service';
import { IsString, MaxLength, IsOptional, IsArray } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';

import {
  AiAssistantService,
  DiagramContext,
  AssistantResponse,
} from './asistente';
import {
  DiagramScannerService,
  DiagramScanResult,
} from './diagram-scanner.service';

export class AnalyzeUmlDto {
  @IsString()
  @MaxLength(5000, { message: 'El input no puede exceder 5000 caracteres' })
  userInput!: string;
}

export class SuggestCardinalityDto {
  @IsString()
  @MaxLength(100)
  sourceClass!: string;

  @IsString()
  @MaxLength(100)
  targetClass!: string;

  @IsOptional()
  @IsArray()
  sourceAttributes?: string[];

  @IsOptional()
  @IsArray()
  targetAttributes?: string[];
}

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly assistantService: AiAssistantService,
    private readonly diagramScanner: DiagramScannerService,
  ) {}

  @Post('analyze-uml')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async analyzeUml(@Body() dto: AnalyzeUmlDto): Promise<AiResponse> {
    return this.aiService.analyzeUmlRequest(dto.userInput);
  }

  @Post('suggest-cardinality')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async suggestCardinality(@Body() dto: SuggestCardinalityDto) {
    return this.aiService.suggestCardinality(
      dto.sourceClass,
      dto.targetClass,
      dto.sourceAttributes,
      dto.targetAttributes,
    );
  }

  @Post('analyze-image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|bmp|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
        }
      },
    }),
  )
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AiResponse> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo de imagen');
    }

    return this.aiService.analyzeUmlFromImage(file.buffer);
  }

  @Post('scan-diagram')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|bmp|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
        }
      },
    }),
  )
  async scanDiagram(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AssistantResponse> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo de imagen');
    }

    this.logger.log('[AI Controller] Escaneando diagrama desde imagen:', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    // Paso 1: Escanear la imagen con OCR + IA
    const scanResult = await this.diagramScanner.scanDiagramImage(file.buffer);

    this.logger.log('[AI Controller] Scan completado:', {
      classCount: scanResult.classes.length,
      relationCount: scanResult.relations.length,
      confidence: scanResult.confidence,
    });

    // Paso 2: Convertir el resultado del scan en sugerencias para el asistente
    const assistantResponse =
      await this.assistantService.convertScanToSuggestions(scanResult);

    this.logger.log('[AI Controller] Sugerencias generadas:', {
      classesCount: assistantResponse.suggestions?.classes?.length || 0,
      relationsCount: assistantResponse.suggestions?.relations?.length || 0,
    });

    return assistantResponse;
  }

  @Post('asistente')
  async getAssistantHelp(
    @Body() body: { context: DiagramContext; message?: string },
  ): Promise<AssistantResponse> {
    // 🔍 DEBUG: Log para verificar que llega el contexto
    this.logger.log('[AI Controller] Petición recibida:', {
      hasContext: !!body.context,
      nodeCount: body.context?.nodes?.length || 0,
      edgeCount: body.context?.edges?.length || 0,
      message: body.message || '(sin mensaje)',
    });

    return this.assistantService.getContextualHelp(body.context, body.message);
  }
}
