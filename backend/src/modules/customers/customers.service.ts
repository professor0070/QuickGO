import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AddAddressDto, UpdateCustomerProfileDto } from "./customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCustomer(userId: string) {
    return this.prisma.customer.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
  }

  async profile(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);
    return this.prisma.customer.findUnique({
      where: { id: customer.id },
      include: {
        user: { select: { id: true, phone: true, status: true } },
        addresses: { orderBy: { createdAt: "desc" } }
      }
    });
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const customer = await this.getOrCreateCustomer(userId);
    return this.prisma.customer.update({
      where: { id: customer.id },
      data: { name: dto.name },
      include: { user: { select: { id: true, phone: true } } }
    });
  }

  async addAddress(userId: string, dto: AddAddressDto) {
    const customer = await this.getOrCreateCustomer(userId);
    const existingCount = await this.prisma.address.count({
      where: { customerId: customer.id }
    });

    return this.prisma.address.create({
      data: {
        customerId: customer.id,
        receiverName: dto.receiver_name,
        receiverPhone: dto.receiver_phone,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: existingCount === 0
      }
    });
  }

  async listAddresses(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);
    return this.prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });
  }
}

