import { DomainEventBus } from "./domain-event-bus.service";

describe("DomainEventBus", () => {
  it("publishes typed in-process domain events", async () => {
    const bus = new DomainEventBus();
    const observed: string[] = [];

    const registration = bus.on("order.placed", (event) => {
      observed.push(event.payload.orderNumber);
    });

    await bus.publish(
      "order.placed",
      {
        orderId: "order_1",
        orderNumber: "QG-1",
        paymentMethod: "COD"
      },
      { source: "test" }
    );

    registration.unsubscribe();
    expect(observed).toEqual(["QG-1"]);
  });
});
