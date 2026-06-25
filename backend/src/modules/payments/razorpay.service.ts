import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>("RAZORPAY_KEY_ID") || "rzp_test_placeholder_key_id";
    this.keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET") || "rzp_test_placeholder_key_secret";
  }

  async createOrder(amountRupees: number, receiptId: string): Promise<any> {
    const amountPaise = Math.round(amountRupees * 100);
    
    // Use mock mode if in testing environment or if credentials are placeholders
    const isMock = 
      this.config.get<string>("NODE_ENV") === "test" ||
      this.keyId === "rzp_test_placeholder_key_id" ||
      this.keySecret === "rzp_test_placeholder_key_secret";

    if (isMock) {
      this.logger.log(`[MOCK] Creating Razorpay order for receipt ${receiptId} of amount ${amountRupees} (${amountPaise} paise)`);
      const mockOrderId = `order_${Math.random().toString(36).substring(2, 11)}`;
      return {
        id: mockOrderId,
        amount: amountPaise,
        currency: "INR",
        receipt: receiptId,
        status: "created"
      };
    }

    this.logger.log(`Creating Razorpay order for receipt ${receiptId} of amount ${amountRupees}`);
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: receiptId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Razorpay API error: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Failed to create Razorpay order: ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`Razorpay order created successfully: ${data.id}`);
      return data;
    } catch (error) {
      this.logger.error("Error calling Razorpay API", error);
      throw new BadRequestException(error instanceof Error ? error.message : "Error creating Razorpay order");
    }
  }
}
