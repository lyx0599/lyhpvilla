import type { FloorId } from "@/types/space";

export type SemanticCategory =
  | "Room"
  | "Zone"
  | "Wall"
  | "Door"
  | "Window"
  | "Furniture"
  | "Material"
  | "Light"
  | "Switch"
  | "Socket"
  | "WaterPoint"
  | "DrainPoint"
  | "Appliance"
  | "HVAC"
  | "Dehumidifier"
  | "SmartDevice"
  | "OutdoorElement";

export type Point = { x: number; y: number };
export type Size = { width: number; depth?: number; height?: number; unit: "cm" };
export type Boundary = Point[];

export type SemanticBase = {
  id: string;
  name: string;
  floorId: FloorId;
  category: SemanticCategory;
  type: string;
  notes: string;
};

export type WallDetails = {
  wallType: "loadBearing" | "partition" | "exterior" | "unknown";
  roomIds: string[];
  zoneIds: string[];
  start: Point;
  end: Point;
  thickness: number;
  height: number;
  editable: boolean;
  removable: boolean;
  riskLevel: "low" | "medium" | "high";
};

export type RoomDetails = { area: number; boundary: Boundary };
export type ZoneDetails = { roomId: string; boundary: Boundary };
export type DoorWindowDetails = { wallId: string; size: Size; position: Point; openDirection: string };
export type FurnitureDetails = {
  roomId: string;
  zoneId: string;
  size: Size;
  position: Point;
  rotation: number;
  materialId: string;
  relatedWallIds: string[];
  referenceImage?: string;
  source?: string;
  brand?: string;
  purchaseLink?: string;
};
export type LightDetails = { roomId: string; zoneId: string; lightType: string; position: Point; brightness: number; colorTemperature: number; controlSwitchIds: string[] };
export type SwitchDetails = { roomId: string; position: Point; controlledObjectIds: string[] };
export type SocketDetails = { roomId: string; zoneId: string; position: Point; socketType: string; heightFromFloor: number };
export type WaterDrainPointDetails = { roomId: string; zoneId: string; position: Point; usage: string };
export type ApplianceDetails = { roomId: string; zoneId: string; size: Size; position: Point; powerRequirement: string; waterRequired: boolean; drainageRequired: boolean };
export type SmartDeviceDetails = { roomId: string; zoneId: string; deviceType: string; position: Point; ecosystem: string; relatedObjectIds: string[] };
export type OutdoorElementDetails = { zoneId: string; position: Point; size: Size; materialId: string; waterRequired: boolean; drainageRequired: boolean; powerRequired: boolean };

export type SemanticDetails =
  | RoomDetails
  | ZoneDetails
  | WallDetails
  | DoorWindowDetails
  | FurnitureDetails
  | LightDetails
  | SwitchDetails
  | SocketDetails
  | WaterDrainPointDetails
  | ApplianceDetails
  | SmartDeviceDetails
  | OutdoorElementDetails
  | Record<string, unknown>;

export type SemanticObject = SemanticBase & {
  position?: Point;
  details: SemanticDetails;
};
