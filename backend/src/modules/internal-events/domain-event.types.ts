export type DomainEventMetadata = {
  actorId?: string;
  requestId?: string;
  idempotencyKey?: string;
  source: string;
};

export type DomainEventMap = {
  "auth.otp_requested": {
    phone: string;
    purpose: "LOGIN";
  };
  "auth.otp_verified": {
    userId: string;
    phone: string;
    roles: string[];
    appContext?: string;
  };
  "order.placed": {
    orderId: string;
    orderNumber: string;
    paymentMethod: string;
  };
  "order.cancelled": {
    orderId: string;
    reason: string;
  };
  "vendor.order_accepted": {
    orderId: string;
  };
  "vendor.order_rejected": {
    orderId: string;
    reason: string;
  };
  "vendor.order_preparing": {
    orderId: string;
  };
  "vendor.order_ready_for_pickup": {
    orderId: string;
  };
  "delivery.rider_assigned": {
    orderId: string;
    riderId: string;
    reason: string;
  };
  "delivery.rider_reassigned": {
    orderId: string;
    riderId: string;
    reason: string;
  };
  "delivery.picked_up": {
    orderId: string;
  };
  "delivery.delivered": {
    orderId: string;
  };
  "payment.collected": {
    orderId: string;
    paymentId?: string;
    amount: number;
    collectorType?: string;
    collectorId?: string;
    paymentMethodActual?: string;
  };
  "payment.reconciled": {
    paymentId: string;
    orderId?: string;
    status?: string;
    amountCollected?: number;
    reason: string;
  };
  "support.ticket_created": {
    ticketId: string;
    subject?: string;
  };
  "support.ticket_updated": {
    ticketId: string;
    status: string;
    adminNote?: string;
  };
  "delivery.rider_arrived": {
    orderId: string;
  };
  "admin.reconciliation_alert_created": {
    alertId: string;
    message: string;
  };
  "admin.sla_breach_detected": {
    breachId: string;
    message: string;
  };
  "compliance.privacy_request_created": {
    requestId: string;
  };
  "compliance.privacy_request_updated": {
    requestId: string;
  };
  "compliance.document_submitted": {
    documentId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
    type: string;
  };
  "compliance.document_approved": {
    documentId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
    type: string;
  };
  "compliance.document_rejected": {
    documentId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
    type: string;
    reason: string;
  };
  "compliance.document_expiring_soon": {
    documentId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
    type: string;
    expiresAt: string;
  };
  "compliance.document_expired": {
    documentId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
    type: string;
  };
  "compliance.bank_details_submitted": {
    versionId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
  };
  "compliance.bank_details_approved": {
    versionId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
  };
  "compliance.bank_details_rejected": {
    versionId: string;
    partnerId: string;
    partnerType: "vendor" | "rider";
    reason: string;
  };
  "compliance.partner_suspended": {
    partnerId: string;
    partnerType: "vendor" | "rider";
    reason: string;
  };
  "compliance.partner_reinstated": {
    partnerId: string;
    partnerType: "vendor" | "rider";
    reason: string;
  };
  "compliance.agreement_terminated": {
    partnerId: string;
    partnerType: "vendor" | "rider";
    reason: string;
  };
};

export type DomainEventName = keyof DomainEventMap;

export type DomainEvent<TName extends DomainEventName = DomainEventName> = {
  id: string;
  name: TName;
  payload: DomainEventMap[TName];
  occurredAt: string;
  metadata: DomainEventMetadata;
};

export type DomainEventHandler<TName extends DomainEventName = DomainEventName> = (
  event: DomainEvent<TName>
) => void | Promise<void>;
