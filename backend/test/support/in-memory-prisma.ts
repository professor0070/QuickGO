type TableName =
  | "roles"
  | "users"
  | "userRoles"
  | "customers"
  | "addresses"
  | "serviceZones"
  | "categories"
  | "vendors"
  | "vendorStaff"
  | "vendorComplianceDocuments"
  | "riders"
  | "riderKycDocuments"
  | "products"
  | "productPrices"
  | "carts"
  | "cartItems"
  | "orders"
  | "orderItems"
  | "orderHistory"
  | "payments"
  | "paymentCollections"
  | "paymentReconciliationEvents"
  | "deliveryAssignments"
  | "supportTickets"
  | "supportTicketEvents"
  | "notifications"
  | "auditLogs"
  | "payouts"
  | "slaEvents"
  | "riderDevices"
  | "customerDevices"
  | "deviceSessions";

type Store = Record<TableName, Array<Record<string, any>>>;

const roleCodes = [
  "CUSTOMER",
  "VENDOR_OWNER",
  "VENDOR_STAFF",
  "RIDER",
  "ADMIN",
  "SUPER_ADMIN",
  "SUPPORT"
];

const categories = [
  { code: "RESTAURANT_FOOD", name: "Restaurant Food", sortOrder: 1, isFresh: false },
  { code: "VEGETABLES", name: "Vegetables", sortOrder: 2, isFresh: true },
  { code: "FRUITS", name: "Fruits", sortOrder: 3, isFresh: true },
  { code: "DAIRY", name: "Dairy", sortOrder: 4, isFresh: true }
];

export class InMemoryPrismaService {
  role: any;
  user: any;
  userRole: any;
  customer: any;
  address: any;
  serviceZone: any;
  category: any;
  vendor: any;
  vendorStaff: any;
  vendorComplianceDocument: any;
  rider: any;
  riderKycDocument: any;
  product: any;
  productPrice: any;
  cart: any;
  cartItem: any;
  order: any;
  payment: any;
  paymentCollection: any;
  paymentReconciliationEvent: any;
  deliveryAssignment: any;
  supportTicket: any;
  notification: any;
  auditLog: any;
  payout: any;
  slaEvent: any;
  riderDevice: any;
  customerDevice: any;
  deviceSession: any;

  private counter = 1;
  private store!: Store;

  constructor() {
    this.reset();
    this.bindDelegates();
  }

  reset() {
    this.counter = 1;
    this.store = {
      roles: [],
      users: [],
      userRoles: [],
      customers: [],
      addresses: [],
      serviceZones: [],
      categories: [],
      vendors: [],
      vendorStaff: [],
      vendorComplianceDocuments: [],
      riders: [],
      riderKycDocuments: [],
      products: [],
      productPrices: [],
      carts: [],
      cartItems: [],
      orders: [],
      orderItems: [],
      orderHistory: [],
      payments: [],
      paymentCollections: [],
      paymentReconciliationEvents: [],
      deliveryAssignments: [],
      supportTickets: [],
      supportTicketEvents: [],
      notifications: [],
      auditLogs: [],
      payouts: [],
      slaEvents: [],
      riderDevices: [],
      customerDevices: [],
      deviceSessions: []
    };

    for (const code of roleCodes) {
      this.store.roles.push({
        id: this.id("role"),
        code,
        name: code
      });
    }

    for (const category of categories) {
      this.store.categories.push({
        id: this.id("category"),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...category
      });
    }

    this.store.serviceZones.push({
      id: "00000000-0000-4000-8000-000000000001",
      name: "QuickGO Launch Zone",
      city: "Jhajha",
      state: "Bihar",
      centerLatitude: 24.775,
      centerLongitude: 86.38,
      radiusKm: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async $connect() {
    return undefined;
  }

  async $disconnect() {
    return undefined;
  }

  async $transaction<T>(handler: (tx: this) => Promise<T>) {
    return handler(this);
  }

  seedUserWithRoles(phone: string, roles: string[]) {
    const user = this.upsertUser(phone, {});
    for (const code of roles) {
      const role = this.ensureRole(code);
      this.upsertUserRole(user.id, role.id);
    }
    return this.withUserRoles(user);
  }

  categoryId(code: string) {
    const category = this.store.categories.find((item) => item.code === code);
    if (!category) {
      throw new Error(`Missing test category ${code}`);
    }
    return category.id;
  }

  orderByNumber(orderNumber: string) {
    return this.store.orders.find((order) => order.orderNumber === orderNumber);
  }

  paymentForOrder(orderId: string) {
    return this.store.payments.find((payment) => payment.orderId === orderId);
  }

  payoutCount() {
    return this.store.payouts.length;
  }

  private bindDelegates() {
    this.role = {
      findUniqueOrThrow: async ({ where }: any) => {
        const role = this.store.roles.find((item) => item.code === where.code || item.id === where.id);
        if (!role) {
          throw new Error("Role not found");
        }
        return role;
      },
      findUnique: async ({ where }: any) =>
        this.store.roles.find((item) => item.code === where.code || item.id === where.id) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const existing = this.store.roles.find((item) => item.code === where.code);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const role = { id: this.id("role"), createdAt: new Date(), updatedAt: new Date(), ...create };
        this.store.roles.push(role);
        return role;
      }
    };

    this.user = {
      upsert: async ({ where, create, update, include }: any) => {
        const user = this.upsertUser(where.phone, { ...create, ...update });
        const nestedRole = create?.roles?.create?.role;
        const roleCode = nestedRole?.connectOrCreate?.where?.code;
        if (roleCode) {
          const role = this.ensureRole(roleCode, nestedRole.connectOrCreate.create);
          this.upsertUserRole(user.id, role.id);
        }
        return include?.roles ? this.withUserRoles(user) : user;
      },
      findUnique: async ({ where, include, select }: any) => {
        const user = this.store.users.find((item) => item.id === where.id || item.phone === where.phone);
        if (!user) {
          return null;
        }
        const hydrated = include?.roles ? this.withUserRoles(user) : user;
        return select ? this.selectFields(hydrated, select) : hydrated;
      }
    };

    this.userRole = {
      upsert: async ({ where, create }: any) => {
        const key = where.userId_roleId;
        return this.upsertUserRole(key.userId, key.roleId, create.assignedBy);
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = this.store.userRoles.filter((item) => this.matches(item, where));
        const hydrated = rows.map((item) => ({
          ...item,
          role: this.store.roles.find((role) => role.id === item.roleId)
        }));
        return select ? hydrated.map((item) => this.selectFields(item, select)) : hydrated;
      }
    };

    this.customer = {
      upsert: async ({ where, create, update }: any) => {
        const existing = this.store.customers.find((item) => item.userId === where.userId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const customer = {
          id: this.id("customer"),
          name: null,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create
        };
        this.store.customers.push(customer);
        return customer;
      },
      findUnique: async ({ where, include }: any) => {
        const customer = this.store.customers.find((item) => item.id === where.id || item.userId === where.userId);
        return customer ? this.hydrateCustomer(customer, include) : null;
      },
      findUniqueOrThrow: async ({ where, include }: any) => {
        const customer = await this.customer.findUnique({ where, include });
        if (!customer) {
          throw new Error("Customer not found");
        }
        return customer;
      },
      findMany: async ({ where, orderBy, include, select }: any = {}) => {
        const rows = this.sort(this.store.customers.filter((item) => this.matches(item, where)), orderBy);
        const hydrated = rows.map((item) => this.hydrateCustomer(item, include));
        return select ? hydrated.map((item) => this.selectFields(item, select)) : hydrated;
      },
      update: async ({ where, data, include }: any) => {
        const customer = this.store.customers.find((item) => item.id === where.id);
        if (!customer) {
          throw new Error("Customer not found");
        }
        Object.assign(customer, data, { updatedAt: new Date() });
        return this.hydrateCustomer(customer, include);
      }
    };

    this.address = {
      count: async ({ where }: any = {}) => this.store.addresses.filter((item) => this.matches(item, where)).length,
      create: async ({ data }: any) => {
        const address = {
          id: this.id("address"),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.addresses.push(address);
        return address;
      },
      findFirst: async ({ where }: any) =>
        this.store.addresses.find((item) => this.matches(item, where)) ?? null,
      findMany: async ({ where, orderBy }: any = {}) =>
        this.sort(this.store.addresses.filter((item) => this.matches(item, where)), orderBy)
    };

    this.serviceZone = {
      create: async ({ data }: any) => {
        const zone = {
          id: this.id("serviceZone"),
          radiusKm: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.serviceZones.push(zone);
        return zone;
      },
      findUnique: async ({ where }: any) =>
        this.store.serviceZones.find((item) => item.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const zone = this.store.serviceZones.find((item) => item.id === where.id);
        if (!zone) {
          throw new Error("Service zone not found");
        }
        Object.assign(zone, data, { updatedAt: new Date() });
        return zone;
      },
      findMany: async ({ where, orderBy }: any = {}) =>
        this.sort(this.store.serviceZones.filter((item) => this.matches(item, where)), orderBy)
    };

    this.category = {
      create: async ({ data }: any) => {
        const category = {
          id: this.id("category"),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.categories.push(category);
        return category;
      },
      findUnique: async ({ where }: any) =>
        this.store.categories.find((item) => item.id === where.id || item.code === where.code) ?? null,
      update: async ({ where, data }: any) => {
        const category = this.store.categories.find((item) => item.id === where.id || item.code === where.code);
        if (!category) {
          throw new Error("Category not found");
        }
        Object.assign(category, data, { updatedAt: new Date() });
        return category;
      },
      findMany: async ({ where, orderBy }: any = {}) =>
        this.sort(this.store.categories.filter((item) => this.matches(item, where)), orderBy)
    };

    this.vendor = {
      create: async ({ data }: any) => {
        const vendor = {
          id: this.id("vendor"),
          legalName: null,
          latitude: null,
          longitude: null,
          isOpen: false,
          status: "APPROVED",
          onboardingStatus: "APPROVED",
          fssaiStatus: "FSSAI_VERIFIED",
          openingHours: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.vendors.push(vendor);
        return vendor;
      },
      findMany: async ({ where, orderBy, include, select, take }: any = {}) => {
        const rows = this.sort(this.store.vendors.filter((item) => this.matches(item, where)), orderBy).slice(
          0,
          take ?? Number.POSITIVE_INFINITY
        );
        const hydrated = rows.map((item) => this.hydrateVendor(item, include));
        return select ? hydrated.map((item) => this.selectFields(item, select)) : hydrated;
      },
      findUnique: async ({ where, include, select }: any) => {
        const vendor = this.store.vendors.find((item) => item.id === where.id);
        if (!vendor) {
          return null;
        }
        const hydrated = this.hydrateVendor(vendor, include);
        return select ? this.selectFields(hydrated, select) : hydrated;
      },
      update: async ({ where, data, include }: any) => {
        const vendor = this.store.vendors.find((item) => item.id === where.id);
        if (!vendor) {
          throw new Error("Vendor not found");
        }
        Object.assign(vendor, data, { updatedAt: new Date() });
        return this.hydrateVendor(vendor, include);
      },
      count: async ({ where }: any = {}) => this.store.vendors.filter((item) => this.matches(item, where)).length
    };

    this.vendorStaff = {
      create: async ({ data }: any) => {
        const staff = {
          id: this.id("vendorStaff"),
          role: "OWNER",
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.vendorStaff.push(staff);
        return staff;
      },
      findFirst: async ({ where, include }: any) => {
        const staff = this.store.vendorStaff.find((item) => this.matches(item, where));
        if (!staff) {
          return null;
        }
        return include?.vendor
          ? { ...staff, vendor: this.store.vendors.find((vendor) => vendor.id === staff.vendorId) }
          : staff;
      }
    };

    this.vendorComplianceDocument = {
      create: async ({ data }: any) => {
        const document = {
          id: this.id("vendorDocument"),
          status: "PENDING",
          expiresAt: data.expiresAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.vendorComplianceDocuments.push(document);
        return document;
      },
      findUnique: async ({ where }: any) =>
        this.store.vendorComplianceDocuments.find((item) => item.id === where.id) ?? null,
      findMany: async ({ where, orderBy }: any = {}) =>
        this.sort(
          this.store.vendorComplianceDocuments.filter((item) => this.matches(item, where)),
          orderBy
        ),
      update: async ({ where, data }: any) => {
        const document = this.store.vendorComplianceDocuments.find((item) => item.id === where.id);
        if (!document) {
          throw new Error("Vendor compliance document not found");
        }
        Object.assign(document, data, { updatedAt: new Date() });
        return document;
      }
    };

    this.rider = {
      create: async ({ data }: any) => {
        const rider = {
          id: this.id("rider"),
          vehicleType: null,
          vehicleNumber: null,
          isOnline: false,
          status: "APPROVED",
          onboardingStatus: "APPROVED",
          payoutUpiId: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.riders.push(rider);
        return rider;
      },
      findUnique: async ({ where, include, select }: any) => {
        const rider = this.store.riders.find((item) => item.id === where.id || item.userId === where.userId);
        if (!rider) {
          return null;
        }
        const hydrated = include ? this.hydrateRider(rider, include) : rider;
        return select ? this.selectFields(hydrated, select) : hydrated;
      },
      findMany: async ({ where, orderBy, include }: any = {}) =>
        this.sort(this.store.riders.filter((item) => this.matches(item, where)), orderBy).map((item) =>
          this.hydrateRider(item, include)
        ),
      update: async ({ where, data, include }: any) => {
        const rider = this.store.riders.find((item) => item.id === where.id || item.userId === where.userId);
        if (!rider) {
          throw new Error("Rider not found");
        }
        Object.assign(rider, data, { updatedAt: new Date() });
        return include ? this.hydrateRider(rider, include) : rider;
      },
      count: async ({ where }: any = {}) => this.store.riders.filter((item) => this.matches(item, where)).length
    };

    this.riderKycDocument = {
      create: async ({ data }: any) => {
        const document = {
          id: this.id("riderDocument"),
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.riderKycDocuments.push(document);
        return document;
      },
      findUnique: async ({ where }: any) =>
        this.store.riderKycDocuments.find((item) => item.id === where.id) ?? null,
      findMany: async ({ where, orderBy }: any = {}) =>
        this.sort(
          this.store.riderKycDocuments.filter((item) => this.matches(item, where)),
          orderBy
        ),
      update: async ({ where, data }: any) => {
        const document = this.store.riderKycDocuments.find((item) => item.id === where.id);
        if (!document) {
          throw new Error("Rider KYC document not found");
        }
        Object.assign(document, data, { updatedAt: new Date() });
        return document;
      }
    };

    this.product = {
      create: async ({ data, include }: any) => {
        const product = {
          id: this.id("product"),
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          productType: "FOOD",
          isStockManaged: false,
          isApproved: data.isApproved ?? false,
          isAvailable: true,
          approvalStatus: data.isApproved ? "APPROVED" : "PENDING",
          createdBy: null,
          approvedBy: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        delete product.prices;
        this.store.products.push(product);
        if (data.prices?.create) {
          this.store.productPrices.push({
            id: this.id("price"),
            productId: product.id,
            effectiveOn: new Date(),
            isActive: true,
            createdAt: new Date(),
            ...data.prices.create
          });
        }
        return this.hydrateProduct(product, include);
      },
      findUnique: async ({ where, include }: any) => {
        const product = this.store.products.find((item) => item.id === where.id);
        return product ? this.hydrateProduct(product, include) : null;
      },
      findFirst: async ({ where }: any) =>
        this.store.products.find((item) => this.matches(item, where)) ?? null,
      findMany: async ({ where, include, orderBy }: any = {}) =>
        this.sort(this.store.products.filter((item) => this.matches(item, where)), orderBy).map((item) =>
          this.hydrateProduct(item, include)
        ),
      update: async ({ where, data, include }: any) => {
        const product = this.store.products.find((item) => item.id === where.id);
        if (!product) {
          throw new Error("Product not found");
        }
        Object.assign(product, data, { updatedAt: new Date() });
        return this.hydrateProduct(product, include);
      },
      count: async ({ where }: any = {}) => this.store.products.filter((item) => this.matches(item, where)).length
    };

    this.productPrice = {
      updateMany: async ({ where, data }: any) => {
        const rows = this.store.productPrices.filter((item) => this.matches(item, where));
        rows.forEach((item) => Object.assign(item, data));
        return { count: rows.length };
      },
      create: async ({ data }: any) => {
        const price = {
          id: this.id("price"),
          effectiveOn: new Date(),
          createdAt: new Date(),
          ...data
        };
        this.store.productPrices.push(price);
        return price;
      }
    };

    this.cart = {
      findFirst: async ({ where, include }: any) => {
        const cart = this.store.carts.find((item) => this.matches(item, where));
        return cart ? this.hydrateCart(cart, include) : null;
      },
      findUniqueOrThrow: async ({ where, include }: any) => {
        const cart = this.store.carts.find((item) => item.id === where.id);
        if (!cart) {
          throw new Error("Cart not found");
        }
        return this.hydrateCart(cart, include);
      },
      create: async ({ data }: any) => {
        const cart = {
          id: this.id("cart"),
          vendorId: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        this.store.carts.push(cart);
        return cart;
      },
      update: async ({ where, data }: any) => {
        const cart = this.store.carts.find((item) => item.id === where.id);
        if (!cart) {
          throw new Error("Cart not found");
        }
        Object.assign(cart, data, { updatedAt: new Date() });
        return cart;
      }
    };

    this.cartItem = {
      upsert: async ({ where, update, create }: any) => {
        const key = where.cartId_productId;
        let item = this.store.cartItems.find(
          (row) => row.cartId === key.cartId && row.productId === key.productId
        );
        if (item) {
          item.quantity += update.quantity?.increment ?? 0;
          if (update.unitPrice !== undefined) {
            item.unitPrice = update.unitPrice;
          }
          return item;
        }
        const newItem = {
          id: this.id("cartItem"),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create
        };
        this.store.cartItems.push(newItem);
        return newItem;
      },
      findFirst: async ({ where }: any) =>
        this.store.cartItems.find((item) => this.matches(item, where)) ?? null,
      update: async ({ where, data }: any) => {
        const item = this.store.cartItems.find((row) => row.id === where.id);
        if (!item) {
          throw new Error("Cart item not found");
        }
        Object.assign(item, data, { updatedAt: new Date() });
        return item;
      },
      delete: async ({ where }: any) => {
        const index = this.store.cartItems.findIndex((row) => row.id === where.id);
        const [deleted] = this.store.cartItems.splice(index, 1);
        return deleted;
      },
      deleteMany: async ({ where }: any) => {
        const before = this.store.cartItems.length;
        this.store.cartItems = this.store.cartItems.filter((item) => !this.matches(item, where));
        return { count: before - this.store.cartItems.length };
      }
    };

    this.order = {
      create: async ({ data, include }: any) => {
        const order = {
          id: this.id("order"),
          riderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          acceptedAt: null,
          readyAt: null,
          assignedAt: null,
          pickedAt: null,
          deliveredAt: null,
          completedAt: null,
          cancelledAt: null,
          cancellationReason: null,
          ...data
        };
        delete order.items;
        delete order.history;
        delete order.payments;
        this.store.orders.push(order);

        for (const itemData of data.items?.create ?? []) {
          this.store.orderItems.push({
            id: this.id("orderItem"),
            orderId: order.id,
            ...itemData
          });
        }
        if (data.history?.create) {
          this.store.orderHistory.push({
            id: this.id("orderHistory"),
            orderId: order.id,
            fromStatus: null,
            createdAt: new Date(),
            ...data.history.create
          });
        }
        if (data.payments?.create) {
          this.store.payments.push({
            id: this.id("payment"),
            orderId: order.id,
            paymentMethodActual: null,
            collectorType: null,
            collectorId: null,
            amountCollected: 0,
            collectionTimestamp: null,
            paymentProofReference: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            reconciledAt: null,
            reconciledBy: null,
            ...data.payments.create
          });
        }
        return this.hydrateOrder(order, include);
      },
      update: async ({ where, data, include }: any) => {
        const order = this.store.orders.find((item) => item.id === where.id);
        if (!order) {
          throw new Error("Order not found");
        }
        this.applyOrderNestedWrites(order, data);
        return this.hydrateOrder(order, include);
      },
      findFirst: async ({ where, include }: any) => {
        const order = this.store.orders.find((item) => this.matches(item, where));
        return order ? this.hydrateOrder(order, include) : null;
      },
      findUnique: async ({ where, include }: any) => {
        const order = this.store.orders.find((item) => item.id === where.id);
        return order ? this.hydrateOrder(order, include) : null;
      },
      findMany: async ({ where, include, orderBy, take, select }: any = {}) => {
        const rows = this.sort(this.store.orders.filter((item) => this.matches(item, where)), orderBy).slice(
          0,
          take ?? Number.POSITIVE_INFINITY
        );
        const hydrated = rows.map((item) => this.hydrateOrder(item, include));
        return select ? hydrated.map((item) => this.selectFields(item, select)) : hydrated;
      },
      count: async ({ where }: any = {}) => this.store.orders.filter((item) => this.matches(item, where)).length,
      aggregate: async ({ where, _sum }: any = {}) => {
        const rows = this.store.orders.filter((item) => this.matches(item, where));
        const sum: Record<string, number> = {};
        for (const field of Object.keys(_sum ?? {})) {
          sum[field] = rows.reduce((total, item) => total + Number(item[field] ?? 0), 0);
        }
        return { _sum: sum };
      },
      groupBy: async ({ by, _count }: any) => {
        const field = by[0];
        const grouped = new Map<string, number>();
        for (const order of this.store.orders) {
          grouped.set(order[field], (grouped.get(order[field]) ?? 0) + 1);
        }
        return [...grouped.entries()].map(([key, count]) => ({
          [field]: key,
          _count: _count?._all ? { _all: count } : count
        }));
      }
    };

    this.payment = {
      findUnique: async ({ where, include }: any) => {
        const payment = this.store.payments.find((item) => item.id === where.id);
        if (!payment) {
          return null;
        }
        return {
          ...payment,
          ...(include?.order
            ? { order: this.store.orders.find((order) => order.id === payment.orderId) }
            : {}),
          ...(include?.reconciliationEvents
            ? {
                reconciliationEvents: this.store.paymentReconciliationEvents.filter(
                  (event) => event.paymentId === payment.id
                )
              }
            : {})
        };
      },
      update: async ({ where, data, include }: any) => {
        const payment = this.store.payments.find((item) => item.id === where.id);
        if (!payment) {
          throw new Error("Payment not found");
        }
        Object.assign(payment, data, { updatedAt: new Date() });
        return this.payment.findUnique({ where, include });
      },
      updateMany: async ({ where, data }: any) => {
        const rows = this.store.payments.filter((item) => this.matches(item, where));
        rows.forEach((item) => Object.assign(item, data, { updatedAt: new Date() }));
        return { count: rows.length };
      },
      create: async ({ data }: any) => {
        const payment = {
          id: this.id("payment"),
          amountCollected: 0,
          collectionTimestamp: null,
          paymentProofReference: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          reconciledAt: null,
          reconciledBy: null,
          ...data
        };
        this.store.payments.push(payment);
        return payment;
      },
      count: async ({ where }: any = {}) => this.store.payments.filter((item) => this.matches(item, where)).length
    };

    this.paymentCollection = {
      create: async ({ data }: any) => {
        const collection = {
          id: this.id("collection"),
          collectedAt: new Date(),
          reconciledAt: null,
          note: null,
          ...data
        };
        this.store.paymentCollections.push(collection);
        return collection;
      },
      updateMany: async ({ where, data }: any) => {
        const rows = this.store.paymentCollections.filter((item) => this.matches(item, where));
        rows.forEach((item) => Object.assign(item, data));
        return { count: rows.length };
      }
    };

    this.paymentReconciliationEvent = {
      create: async ({ data }: any) => {
        const event = {
          id: this.id("paymentEvent"),
          createdAt: new Date(),
          ...data
        };
        this.store.paymentReconciliationEvents.push(event);
        return event;
      }
    };

    this.deliveryAssignment = {
      create: async ({ data }: any) => {
        const assignment = {
          id: this.id("assignment"),
          assignedAt: new Date(),
          pickedAt: null,
          deliveredAt: null,
          isActive: true,
          ...data
        };
        this.store.deliveryAssignments.push(assignment);
        return assignment;
      },
      updateMany: async ({ where, data }: any) => {
        const rows = this.store.deliveryAssignments.filter((item) => this.matches(item, where));
        rows.forEach((item) => Object.assign(item, data));
        return { count: rows.length };
      }
    };

    this.supportTicket = {
      create: async ({ data, include }: any) => {
        const ticket = {
          id: this.id("ticket"),
          orderId: data.orderId ?? null,
          customerId: data.customerId ?? null,
          status: "OPEN",
          priority: "MEDIUM",
          adminNote: null,
          acknowledgedAt: null,
          resolvedAt: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        delete ticket.events;
        this.store.supportTickets.push(ticket);
        if (data.events?.create) {
          this.store.supportTicketEvents.push({
            id: this.id("ticketEvent"),
            ticketId: ticket.id,
            createdAt: new Date(),
            ...data.events.create
          });
        }
        return this.hydrateTicket(ticket, include);
      },
      findUnique: async ({ where, include }: any) => {
        const ticket = this.store.supportTickets.find((item) => item.id === where.id);
        return ticket ? this.hydrateTicket(ticket, include) : null;
      },
      update: async ({ where, data, include }: any) => {
        const ticket = this.store.supportTickets.find((item) => item.id === where.id);
        if (!ticket) {
          throw new Error("Support ticket not found");
        }
        const { events, ...plain } = data;
        Object.assign(ticket, plain, { updatedAt: new Date() });
        if (events?.create) {
          this.store.supportTicketEvents.push({
            id: this.id("ticketEvent"),
            ticketId: ticket.id,
            createdAt: new Date(),
            ...events.create
          });
        }
        return this.hydrateTicket(ticket, include);
      },
      findMany: async ({ where, orderBy, include, take }: any = {}) =>
        this.sort(this.store.supportTickets.filter((item) => this.matches(item, where)), orderBy)
          .slice(0, take ?? Number.POSITIVE_INFINITY)
          .map((item) => this.hydrateTicket(item, include)),
      count: async ({ where }: any = {}) =>
        this.store.supportTickets.filter((item) => this.matches(item, where)).length
    };

    this.notification = {
      create: async ({ data }: any) => {
        const notification = {
          id: this.id("notification"),
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
          channel: "IN_APP",
          deliveryStatus: "PENDING",
          deliveryAttempts: 0,
          deliveryError: null,
          deliveryMetadata: null,
          ...data
        };
        this.store.notifications.push(notification);
        return notification;
      },
      createMany: async ({ data }: any) => {
        const rows = data.map((item: any) => ({
          id: this.id("notification"),
          sentAt: null,
          readAt: null,
          createdAt: new Date(),
          channel: "IN_APP",
          deliveryStatus: "PENDING",
          deliveryAttempts: 0,
          deliveryError: null,
          deliveryMetadata: null,
          ...item
        }));
        this.store.notifications.push(...rows);
        return { count: rows.length };
      },
      findMany: async ({ where, orderBy, take }: any = {}) =>
        this.sort(this.store.notifications.filter((item) => this.matches(item, where)), orderBy).slice(
          0,
          take ?? Number.POSITIVE_INFINITY
        ),
      count: async ({ where }: any = {}) =>
        this.store.notifications.filter((item) => this.matches(item, where)).length,
      updateMany: async ({ where, data }: any) => {
        const rows = this.store.notifications.filter((item) => this.matches(item, where));
        rows.forEach((item) => Object.assign(item, data));
        return { count: rows.length };
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const notification = this.store.notifications.find((item) => item.id === where.id);
        if (!notification) {
          throw new Error("Notification not found");
        }
        return notification;
      }
    };

    this.auditLog = {
      create: async ({ data }: any) => {
        const log = {
          id: this.id("audit"),
          createdAt: new Date(),
          ...data
        };
        this.store.auditLogs.push(log);
        return log;
      },
      findMany: async ({ where, orderBy, take }: any = {}) =>
        this.sort(this.store.auditLogs.filter((item) => this.matches(item, where)), orderBy).slice(
          0,
          take ?? Number.POSITIVE_INFINITY
        )
    };

    this.payout = {
      findFirst: async ({ where }: any) =>
        this.store.payouts.find((item) => this.matches(item, where)) ?? null,
      create: async ({ data }: any) => {
        const payout = {
          id: this.id("payout"),
          createdAt: new Date(),
          updatedAt: new Date(),
          paidAt: null,
          approvedAt: null,
          ...data
        };
        this.store.payouts.push(payout);
        return payout;
      }
    };

    this.slaEvent = {
      create: async ({ data }: any) => {
        const event = {
          id: this.id("sla"),
          createdAt: new Date(),
          breached: false,
          resolvedAt: null,
          ...data
        };
        this.store.slaEvents.push(event);
        return event;
      },
      findFirst: async ({ where }: any = {}) =>
        this.store.slaEvents.find((item) => this.matches(item, where)) ?? null,
      findMany: async ({ where }: any = {}) =>
        this.store.slaEvents.filter((item) => this.matches(item, where)),
      updateMany: async ({ where, data }: any) => {
        const rows = this.store.slaEvents.filter((item) => this.matches(item, where));
        rows.forEach((item) => Object.assign(item, data));
        return { count: rows.length };
      }
    };

    this.riderDevice = {
      create: async ({ data }: any) => {
        const device = {
          id: this.id("riderDevice"),
          createdAt: new Date(),
          ...data
        };
        this.store.riderDevices.push(device);
        return device;
      },
      findMany: async ({ where }: any = {}) =>
        this.store.riderDevices.filter((item) => this.matches(item, where))
    };

    this.customerDevice = {
      create: async ({ data }: any) => {
        const device = {
          id: this.id("customerDevice"),
          createdAt: new Date(),
          ...data
        };
        this.store.customerDevices.push(device);
        return device;
      },
      findMany: async ({ where }: any = {}) =>
        this.store.customerDevices.filter((item) => this.matches(item, where))
    };

    this.deviceSession = {
      create: async ({ data }: any) => {
        const session = {
          id: this.id("deviceSession"),
          createdAt: new Date(),
          lastSeenAt: new Date(),
          ...data
        };
        this.store.deviceSessions.push(session);
        return session;
      },
      findMany: async ({ where }: any = {}) =>
        this.store.deviceSessions.filter((item) => this.matches(item, where))
    };
  }

  private applyOrderNestedWrites(order: Record<string, any>, data: Record<string, any>) {
    const { history, payments, deliveryAssignments, ...plain } = data;
    Object.assign(order, plain, { updatedAt: new Date() });
    if (history?.create) {
      this.store.orderHistory.push({
        id: this.id("orderHistory"),
        orderId: order.id,
        createdAt: new Date(),
        ...history.create
      });
    }
    if (payments?.updateMany) {
      const rows = this.store.payments.filter((item) =>
        this.matches(item, { orderId: order.id, ...payments.updateMany.where })
      );
      rows.forEach((item) => Object.assign(item, payments.updateMany.data, { updatedAt: new Date() }));
    }
    if (deliveryAssignments?.updateMany) {
      const rows = this.store.deliveryAssignments.filter((item) =>
        this.matches(item, { orderId: order.id, ...deliveryAssignments.updateMany.where })
      );
      rows.forEach((item) => Object.assign(item, deliveryAssignments.updateMany.data));
    }
  }

  private hydrateCustomer(customer: Record<string, any>, include: any) {
    return {
      ...customer,
      ...(include?.user
        ? { user: this.selectFields(this.store.users.find((user) => user.id === customer.userId), include.user.select) }
        : {}),
      ...(include?.addresses
        ? { addresses: this.store.addresses.filter((address) => address.customerId === customer.id) }
        : {})
    };
  }

  private hydrateVendor(vendor: Record<string, any>, include: any) {
    const hydrated = { ...vendor };
    if (include?.serviceZone) {
      hydrated.serviceZone = this.store.serviceZones.find((zone) => zone.id === vendor.serviceZoneId);
    }
    if (include?.staff) {
      hydrated.staff = this.store.vendorStaff
        .filter((staff) => staff.vendorId === vendor.id && this.matches(staff, include.staff.where))
        .map((staff) => ({
          ...staff,
          ...(include.staff.include?.user
            ? { user: this.store.users.find((user) => user.id === staff.userId) }
            : {})
        }));
    }
    if (include?.products) {
      hydrated.products = this.store.products
        .filter((product) => product.vendorId === vendor.id && this.matches(product, include.products.where))
        .map((product) => this.hydrateProduct(product, include.products.include));
    }
    if (include?.documents) {
      hydrated.documents = this.store.vendorComplianceDocuments.filter(
        (document) => document.vendorId === vendor.id
      );
    }
    return hydrated;
  }

  private hydrateRider(rider: Record<string, any>, include: any) {
    return {
      ...rider,
      ...(include?.serviceZone
        ? { serviceZone: this.store.serviceZones.find((zone) => zone.id === rider.serviceZoneId) }
        : {}),
      ...(include?.user ? { user: this.store.users.find((user) => user.id === rider.userId) } : {}),
      ...(include?.kycDocuments
        ? {
            kycDocuments: this.store.riderKycDocuments.filter(
              (document) => document.riderId === rider.id
            )
          }
        : {})
    };
  }

  private hydrateProduct(product: Record<string, any>, include: any) {
    const prices = this.store.productPrices.filter((price) => price.productId === product.id);
    const hydrated = { ...product };
    if (include?.prices) {
      hydrated.prices = this.sort(
        prices.filter((price) => this.matches(price, include.prices.where)),
        include.prices.orderBy
      ).slice(0, include.prices.take ?? Number.POSITIVE_INFINITY);
    }
    if (include?.vendor) {
      const vendor = this.store.vendors.find((item) => item.id === product.vendorId);
      hydrated.vendor = include.vendor.select ? this.selectFields(vendor, include.vendor.select) : vendor;
    }
    if (include?.category) {
      hydrated.category = this.store.categories.find((item) => item.id === product.categoryId);
    }
    return hydrated;
  }

  private hydrateCart(cart: Record<string, any>, include: any) {
    const hydrated = { ...cart };
    if (include?.items) {
      hydrated.items = this.store.cartItems
        .filter((item) => item.cartId === cart.id)
        .map((item) => ({
          ...item,
          ...(include.items.include?.product
            ? {
                product: this.hydrateProduct(
                  this.store.products.find((product) => product.id === item.productId)!,
                  include.items.include.product.include
                )
              }
            : {})
        }));
    }
    return hydrated;
  }

  private hydrateOrder(order: Record<string, any>, include: any) {
    const hydrated = { ...order };
    if (include?.items) {
      hydrated.items = this.store.orderItems.filter((item) => item.orderId === order.id);
    }
    if (include?.history) {
      hydrated.history = this.sort(
        this.store.orderHistory.filter((item) => item.orderId === order.id),
        include.history.orderBy
      );
    }
    if (include?.payments) {
      hydrated.payments = this.sort(
        this.store.payments.filter((item) => item.orderId === order.id),
        include.payments.orderBy
      ).slice(0, include.payments.take ?? Number.POSITIVE_INFINITY);
    }
    if (include?.collections) {
      hydrated.collections = this.store.paymentCollections.filter((item) => item.orderId === order.id);
    }
    if (include?.deliveryAssignments) {
      hydrated.deliveryAssignments = this.store.deliveryAssignments.filter((item) => item.orderId === order.id);
    }
    if (include?.supportTickets) {
      hydrated.supportTickets = this.store.supportTickets.filter((item) => item.orderId === order.id);
    }
    if (include?.slaEvents) {
      hydrated.slaEvents = this.store.slaEvents.filter((item) => item.orderId === order.id);
    }
    if (include?.vendor) {
      const vendor = this.store.vendors.find((item) => item.id === order.vendorId);
      hydrated.vendor = include.vendor.select
        ? this.selectFields(vendor, include.vendor.select)
        : this.hydrateVendor(vendor!, include.vendor.include);
    }
    if (include?.customer) {
      const customer = this.store.customers.find((item) => item.id === order.customerId);
      hydrated.customer = this.hydrateCustomer(customer!, include.customer.include);
    }
    return hydrated;
  }

  private hydrateTicket(ticket: Record<string, any>, include: any) {
    return {
      ...ticket,
      ...(include?.events
        ? { events: this.store.supportTicketEvents.filter((event) => event.ticketId === ticket.id) }
        : {})
    };
  }

  private withUserRoles(user: Record<string, any>) {
    return {
      ...user,
      roles: this.store.userRoles
        .filter((item) => item.userId === user.id)
        .map((item) => ({
          ...item,
          role: this.store.roles.find((role) => role.id === item.roleId)
        }))
    };
  }

  private upsertUser(phone: string, data: Record<string, any>) {
    let user = this.store.users.find((item) => item.phone === phone);
    if (user) {
      Object.assign(user, data, { updatedAt: new Date() });
      return user;
    }
    user = {
      id: this.id("user"),
      phone,
      name: data.name ?? null,
      email: data.email ?? null,
      isPhoneVerified: data.isPhoneVerified ?? false,
      status: data.status ?? "ACTIVE",
      lastLoginAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.store.users.push(user);
    return user;
  }

  private ensureRole(code: string, data: Record<string, any> = {}) {
    let role = this.store.roles.find((item) => item.code === code);
    if (role) {
      return role;
    }
    role = {
      id: this.id("role"),
      code,
      name: data.name ?? code,
      description: data.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.store.roles.push(role);
    return role;
  }

  private upsertUserRole(userId: string, roleId: string, assignedBy?: string) {
    let userRole = this.store.userRoles.find((item) => item.userId === userId && item.roleId === roleId);
    if (userRole) {
      return userRole;
    }
    userRole = {
      id: this.id("userRole"),
      userId,
      roleId,
      assignedBy: assignedBy ?? null,
      createdAt: new Date()
    };
    this.store.userRoles.push(userRole);
    return userRole;
  }

  private matches(row: Record<string, any> | undefined, where: any): boolean {
    if (!row || !where) {
      return true;
    }
    for (const [key, expected] of Object.entries(where)) {
      if (key === "role") {
        const role = this.store.roles.find((item) => item.id === row.roleId);
        if (!this.matches(role, expected)) {
          return false;
        }
        continue;
      }
      if (key === "category") {
        const category = this.store.categories.find((item) => item.id === row.categoryId);
        if (!this.matches(category, expected)) {
          return false;
        }
        continue;
      }
      if (key === "prices") {
        const prices = this.store.productPrices.filter((price) => price.productId === row.id);
        const some = (expected as any).some;
        if (some && !prices.some((price) => this.matches(price, some))) {
          return false;
        }
        continue;
      }
      if (!this.valueMatches(row[key], expected)) {
        return false;
      }
    }
    return true;
  }

  private valueMatches(value: any, expected: any): boolean {
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("in" in expected && !expected.in.includes(value)) {
        return false;
      }
      if ("gte" in expected && !(value >= expected.gte)) {
        return false;
      }
      if ("not" in expected && value === expected.not) {
        return false;
      }
      return true;
    }
    return value === expected;
  }

  private sort(rows: Array<Record<string, any>>, orderBy: any) {
    if (!orderBy) {
      return [...rows];
    }
    const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((left, right) => {
      for (const clause of clauses) {
        const [field, direction] = Object.entries(clause)[0] as [string, string];
        const leftValue = left[field] instanceof Date ? left[field].getTime() : left[field];
        const rightValue = right[field] instanceof Date ? right[field].getTime() : right[field];
        if (leftValue === rightValue) {
          continue;
        }
        const result = leftValue > rightValue ? 1 : -1;
        return direction === "desc" ? -result : result;
      }
      return 0;
    });
  }

  private selectFields(row: Record<string, any> | undefined, select: Record<string, boolean> | undefined) {
    if (!row || !select) {
      return row;
    }
    return Object.fromEntries(Object.entries(select).filter(([, enabled]) => enabled).map(([key]) => [key, row[key]]));
  }

  private id(prefix: string) {
    return `${prefix}_${this.counter++}`;
  }
}
