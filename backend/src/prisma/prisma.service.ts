import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const adapter = databaseUrl
      ? new PrismaMssql(databaseUrl)
      : new PrismaMssql({
          server: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '1433', 10),
          database: process.env.DB_NAME || 'AlertifyDB',
          user: process.env.DB_USER || '',
          password: process.env.DB_PASSWORD || '',
          options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate:
              process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
          },
        });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    const maxRetries = Number(process.env.DB_CONNECT_RETRIES ?? 5);
    const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 3000);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(`Conexion a DB recuperada en intento ${attempt}/${maxRetries}`);
        }
        return;
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'UNKNOWN';

        this.logger.error(
          `Fallo conectando a DB (intento ${attempt}/${maxRetries}, code=${code})`,
        );

        if (attempt === maxRetries) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
