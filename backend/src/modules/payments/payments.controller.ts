import { Body, Controller, Post, Req, Headers, BadRequestException } from "@nestjs/common";
import { IsString } from "class-validator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { Public } from "../../common/auth/public.decorator";
import { PaymentsService } from "./payments.service";

export class CreateRazorpayOrderDto {
  @IsString()
  orderId!: string;
}

export class VerifyRazorpayPaymentDto {
  @IsString()
  orderId!: string;

  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles("CUSTOMER")
  @Post("create-razorpay-order")
  async createRazorpayOrder(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateRazorpayOrderDto
  ) {
    return this.paymentsService.createRazorpayOrder(user.id, body.orderId);
  }

  @Roles("CUSTOMER")
  @Post("verify-razorpay-payment")
  async verifyRazorpayPayment(
    @CurrentUser() user: RequestUser,
    @Body() body: VerifyRazorpayPaymentDto
  ) {
    return this.paymentsService.verifyRazorpayPayment(user.id, body);
  }

  @Public()
  @Post("webhook/razorpay")
  async razorpayWebhook(
    @Req() req: any,
    @Headers("x-razorpay-signature") signature: string,
    @Body() body: any
  ) {
    const rawBody = req.rawBody || "";
    if (!signature) {
      throw new BadRequestException("Missing signature header");
    }
    return this.paymentsService.processWebhook(rawBody, signature, body);
  }
}
