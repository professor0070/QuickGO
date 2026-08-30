import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { existsSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";
import { Readable } from "stream";
import { AllExceptionsFilter } from "./common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";

async function bootstrap() {
  const adapter = new FastifyAdapter();
  const fastifyInstance = adapter.getInstance();
  
  fastifyInstance.addHook("preParsing", (request, reply, payload, done) => {
    let rawBody = "";
    const passThrough = new Readable({
      read() {}
    });

    payload.on("data", (chunk) => {
      const str = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      rawBody += str;
      passThrough.push(chunk);
    });

    payload.on("end", () => {
      (request as any).rawBody = rawBody;
      passThrough.push(null);
    });

    payload.on("error", (err) => {
      passThrough.emit("error", err);
    });

    done(null, passThrough);
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: config.getOrThrow<string>("ADMIN_APP_URL").split(","),
    credentials: true
  });
  await app.register(fastifyHelmet);
  await app.register(fastifyMultipart);

  const uploadsDir = [
    join(process.cwd(), "public", "uploads"),
    join(process.cwd(), "backend", "public", "uploads"),
    join(__dirname, "..", "public", "uploads"),
    join(__dirname, "..", "..", "public", "uploads"),
  ].find((dir) => existsSync(dir)) ?? join(process.cwd(), "public", "uploads");

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>("PORT");
  // Bind to all interfaces for local device testing.
  await app.listen(port, "::");
}

void bootstrap();
