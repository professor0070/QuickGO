import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FcmProvider } from "./fcm.provider";

describe("FcmProvider Unit Tests", () => {
  let provider: FcmProvider;
  let configServiceMock: Partial<ConfigService>;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === "FCM_SERVER_KEY_OR_SERVICE_ACCOUNT") {
          return undefined;
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmProvider,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    provider = module.get<FcmProvider>(FcmProvider);
  });

  it("should initialize in simulation mode when FCM credentials are unconfigured", () => {
    provider.onModuleInit();
    // Module initializes safely without throwing
    expect(provider).toBeDefined();
  });

  it("should return simulated push dispatch result when uninitialized and tokens are provided", async () => {
    provider.onModuleInit();
    const result = await provider.sendToDevices(
      ["token-1", "token-2"],
      "Test Title",
      "Test Body",
      { orderId: "ord-123", amount: 250 }
    );

    expect(result).toEqual({
      attemptedTokens: 2,
      successCount: 2,
      failureCount: 0,
      simulated: true,
    });
  });

  it("should return zero counts when no tokens are provided", async () => {
    provider.onModuleInit();
    const result = await provider.sendToDevices([], "Title", "Body");

    expect(result).toEqual({
      attemptedTokens: 0,
      successCount: 0,
      failureCount: 0,
      simulated: true,
    });
  });

  it("should safely handle invalid JSON credential config without throwing unhandled exceptions", () => {
    (configServiceMock.get as jest.Mock).mockReturnValue("{ invalid_json_string ");
    expect(() => provider.onModuleInit()).not.toThrow();
  });
});
