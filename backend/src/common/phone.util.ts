import { BadRequestException } from "@nestjs/common";

export function normalizeIndianPhone(input: string): string {
  if (!input || typeof input !== "string") throw new BadRequestException("Invalid phone number");
  const digits = input.replace(/\D/g, "");

  let ten = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    ten = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    ten = digits.slice(1);
  } else if (digits.length === 10) {
    ten = digits;
  } else {
    throw new BadRequestException("Please enter a valid Indian mobile number.");
  }

  if (!/^[6-9]\d{9}$/.test(ten)) {
    throw new BadRequestException("Please enter a valid Indian mobile number.");
  }

  return `+91${ten}`;
}
