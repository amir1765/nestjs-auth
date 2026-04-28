import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { setCryptoKey } from './common/crypto';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  // app.enableCors({
  //   origin: ['https://yourdomain.com'],
  //   credentials: true,
  // });
  // 👇 Only run Swagger when not in production
  if (process.env.NODE_ENV !== 'production') {
    app.use(
      helmet({
        contentSecurityPolicy: false,
      }),
    );
    const config = new DocumentBuilder()
      .setTitle('My API')
      .setDescription('The cats API description')
      .setVersion('1.0')
      .addTag('cats')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
  const config = app.get(ConfigService);
  setCryptoKey(config.get<string>('CRYPTO_SECRET')!);

  await app.listen(3000);
}
bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
