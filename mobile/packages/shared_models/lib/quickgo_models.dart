enum QuickGoRole { customer, vendor, rider, admin, support, superAdmin }

enum OrderStatus {
  placed,
  vendorAccepted,
  vendorRejected,
  preparingOrPacking,
  readyForPickup,
  riderAssigned,
  pickedUp,
  delivered,
  cancelled
}

enum PaymentMethod { cod, upiOnDelivery }

class QuickGoCategory {
  const QuickGoCategory({
    required this.code,
    required this.name,
    required this.isFresh,
  });

  final String code;
  final String name;
  final bool isFresh;
}

class QuickGoAddress {
  const QuickGoAddress({
    required this.receiverName,
    required this.receiverPhone,
    required this.line1,
    required this.city,
    required this.state,
    this.line2,
    this.pincode,
    this.latitude,
    this.longitude,
  });

  final String receiverName;
  final String receiverPhone;
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String? pincode;
  final double? latitude;
  final double? longitude;
}

class QuickGoOrderSummary {
  const QuickGoOrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
  });

  final String id;
  final String orderNumber;
  final OrderStatus status;
  final num totalAmount;
}

