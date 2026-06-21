import { assertOrderTransition, canCustomerCancel } from "./order-state.machine";

describe("QuickGO order state machine", () => {
  it("allows customer cancellation only before vendor acceptance", () => {
    expect(canCustomerCancel("PLACED")).toBe(true);
    expect(canCustomerCancel("VENDOR_ACCEPTED")).toBe(false);
  });

  it("allows the documented happy path", () => {
    expect(() => assertOrderTransition("PLACED", "VENDOR_ACCEPTED")).not.toThrow();
    expect(() => assertOrderTransition("VENDOR_ACCEPTED", "PREPARING_OR_PACKING")).not.toThrow();
    expect(() => assertOrderTransition("PREPARING_OR_PACKING", "READY_FOR_PICKUP")).not.toThrow();
    expect(() => assertOrderTransition("READY_FOR_PICKUP", "RIDER_ASSIGNED")).not.toThrow();
    expect(() => assertOrderTransition("RIDER_ASSIGNED", "PICKED_UP")).not.toThrow();
    expect(() => assertOrderTransition("PICKED_UP", "DELIVERED")).not.toThrow();
    expect(() => assertOrderTransition("DELIVERED", "PAYMENT_COLLECTED")).not.toThrow();
    expect(() => assertOrderTransition("PAYMENT_COLLECTED", "COMPLETED")).not.toThrow();
  });

  it("blocks invalid terminal transitions", () => {
    expect(() => assertOrderTransition("DELIVERED", "ADMIN_CANCELLED")).toThrow();
    expect(() => assertOrderTransition("VENDOR_REJECTED", "READY_FOR_PICKUP")).toThrow();
  });
});
