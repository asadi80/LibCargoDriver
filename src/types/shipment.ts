// types/shipment.ts

export type ShipmentStatus =
  | "AVAILABLE"
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type ShipmentCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type ShipmentDriverUser = {
  id: string;
  name: string;
  phone: string;
};

export type ShipmentDriver = {
  id: string;
  userId: string;
  vehicleType?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  user: ShipmentDriverUser;
};

export type Shipment = {
  id: string;
  customerId: string;
  driverId?: string | null;

  pickupAddr: string;
  deliveryAddr: string;

  // Stored coords (added after geocoding on create)
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;

  // Injected by getNearbyShipments controller
  distanceToPickup?: number;

  price: number;
  status: ShipmentStatus;

  createdAt: string;
  updatedAt: string;

  // Included relations (present when using include: { driver, customer })
  driver?: ShipmentDriver | null;
  customer?: ShipmentCustomer | null;
};

export type ShipmentInterest = {
  id: string;
  shipmentId: string;
  driverId: string;
  createdAt: string;
  driver: {
    id: string;
    user: ShipmentDriverUser;
  };
};