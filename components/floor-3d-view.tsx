"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type {
  Floor,
  Furniture,
  HouseBayWindow,
  HouseDoor,
  HousePartition,
  HouseStair,
  HouseStructure,
  HouseWall,
  HouseWindow,
  MmPoint
} from "@/types/space";

type Floor3DViewProps = {
  floor: Floor;
  houseStructure: HouseStructure;
  furniture: Furniture[];
  selectedObjectId: string;
  selectedFurnitureId: string;
  showObjectIds: boolean;
  onShowObjectIdsChange: (visible: boolean) => void;
  onSelectStructure: (objectId: string) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onHoverObject: (objectId: string) => void;
  onClearHoverObject: (objectId: string) => void;
};

type ScenePoint = {
  x: number;
  z: number;
};

type HostSegment = {
  start: MmPoint;
  end: MmPoint;
  thickness: number;
  height: number;
};

type CameraPreset = "overview" | "living" | "kitchen";

const MM_TO_M = 1 / 1000;
const DEFAULT_STRUCTURE_WIDTH_MM = 12000;
const DEFAULT_STRUCTURE_HEIGHT_MM = 9000;
const roomFloorColors = ["#f8fafc", "#eef6ff", "#f7f3e8", "#eef7f1", "#f6eef7", "#f2f4f7"];

function getStructureSize(structure: HouseStructure) {
  return {
    width: structure.coordinateSystem?.width || DEFAULT_STRUCTURE_WIDTH_MM,
    height: structure.coordinateSystem?.height || DEFAULT_STRUCTURE_HEIGHT_MM
  };
}

function toScenePoint(point: MmPoint, structure: HouseStructure): ScenePoint {
  const size = getStructureSize(structure);
  return {
    x: (point.x - size.width / 2) * MM_TO_M,
    z: (point.y - size.height / 2) * MM_TO_M
  };
}

function toShapePoint(point: MmPoint, structure: HouseStructure) {
  const size = getStructureSize(structure);
  return new THREE.Vector2((point.x - size.width / 2) * MM_TO_M, -(point.y - size.height / 2) * MM_TO_M);
}

function lineMetrics(start: MmPoint, end: MmPoint, structure: HouseStructure) {
  const startPoint = toScenePoint(start, structure);
  const endPoint = toScenePoint(end, structure);
  const dx = endPoint.x - startPoint.x;
  const dz = endPoint.z - startPoint.z;
  const length = Math.max(0.01, Math.hypot(dx, dz));
  return {
    startPoint,
    endPoint,
    length,
    midpoint: {
      x: (startPoint.x + endPoint.x) / 2,
      z: (startPoint.z + endPoint.z) / 2
    },
    rotationY: Math.atan2(-dz, dx),
    normal: {
      x: -dz / length,
      z: dx / length
    }
  };
}

function getArcWallPoints(wall: Extract<HouseWall, { kind: "arc" }>, steps = 20) {
  const startAngle = wall.startAngle * Math.PI / 180;
  const endAngle = wall.endAngle * Math.PI / 180;
  let sweep = endAngle - startAngle;
  if (wall.direction === "clockwise" && sweep > 0) sweep -= Math.PI * 2;
  if (wall.direction === "counterclockwise" && sweep < 0) sweep += Math.PI * 2;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = startAngle + sweep * (index / steps);
    return {
      x: Math.round(wall.center.x + Math.cos(angle) * wall.radius),
      y: Math.round(wall.center.y + Math.sin(angle) * wall.radius)
    };
  });
}

function getHostSegment(structure: HouseStructure, hostId: string): HostSegment | null {
  const wall = structure.walls.find((item) => item.id === hostId);
  if (wall?.kind === "straight") {
    return { start: wall.start, end: wall.end, thickness: wall.thickness, height: wall.height };
  }
  const partition = structure.partitions.find((item) => item.id === hostId);
  if (partition) {
    return { start: partition.start, end: partition.end, thickness: partition.thickness, height: partition.height };
  }
  return null;
}

function getFurnitureScenePosition(item: Furniture, structure: HouseStructure): ScenePoint {
  const size = getStructureSize(structure);
  return {
    x: ((item.position.x / 100) * size.width - size.width / 2) * MM_TO_M,
    z: ((item.position.y / 100) * size.height - size.height / 2) * MM_TO_M
  };
}

function getFurnitureHeight(item: Furniture) {
  const height = item.dimensions.height / 100;
  if (item.moduleType === "pegboard" || item.moduleType === "fireplace") return Math.max(0.08, Math.min(height, 1.8));
  if (item.moduleType === "shower") return Math.max(1.9, height);
  if (item.moduleType === "fridge" || item.moduleType === "wardrobe" || item.moduleType === "tallCabinet") return Math.max(1.8, height);
  return Math.max(0.12, Math.min(height, 2.4));
}

function getFurnitureColor(item: Furniture) {
  if (item.moduleType === "shower") return "#9bd7ef";
  if (item.moduleType === "fireplace") return "#b56b50";
  if (item.moduleType === "island") return "#cfd8d3";
  if (item.moduleType === "kitchenCabinet") return "#d8e3dc";
  if (item.moduleType === "snackCabinet") return "#f4d4a1";
  if (item.moduleType === "pegboard") return "#b7dac9";
  if (item.moduleType === "sink") return "#9cc7dc";
  if (item.moduleType === "cooktop") return "#56616f";
  if (item.moduleType === "fridge") return "#dbe4ec";
  if (item.moduleType === "toilet" || item.moduleType === "vanity") return "#eef2f7";
  return item.color || "#d8d4cb";
}

function RoomFloorMesh({ room, index, structure }: { room: HouseStructure["rooms"][number]; index: number; structure: HouseStructure }) {
  const key = room.boundary.map((point) => `${point.x},${point.y}`).join(" ");
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    room.boundary.forEach((point, pointIndex) => {
      const nextPoint = toShapePoint(point, structure);
      if (pointIndex === 0) shape.moveTo(nextPoint.x, nextPoint.y);
      else shape.lineTo(nextPoint.x, nextPoint.y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [key, structure]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018 + index * 0.002, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={roomFloorColors[index % roomFloorColors.length]} roughness={0.82} metalness={0.02} />
    </mesh>
  );
}

function LineBox({
  id,
  start,
  end,
  widthMm,
  heightMm,
  structure,
  color,
  opacity = 1,
  yOffset = 0,
  selected = false,
  onSelect,
  onHover,
  onClearHover
}: {
  id: string;
  start: MmPoint;
  end: MmPoint;
  widthMm: number;
  heightMm: number;
  structure: HouseStructure;
  color: string;
  opacity?: number;
  yOffset?: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string) => void;
  onClearHover?: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(start, end, structure), [start, end, structure]);
  const width = Math.max(0.025, widthMm * MM_TO_M);
  const height = Math.max(0.04, heightMm * MM_TO_M);
  return (
    <mesh
      castShadow
      receiveShadow
      position={[metrics.midpoint.x, yOffset + height / 2, metrics.midpoint.z]}
      rotation={[0, metrics.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover?.(id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover?.(id);
      }}
    >
      <boxGeometry args={[metrics.length, height, width]} />
      <meshStandardMaterial color={selected ? "#2563eb" : color} transparent={opacity < 1} opacity={opacity} roughness={0.7} />
    </mesh>
  );
}

function WallMesh({
  wall,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  wall: HouseWall;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  if (wall.kind === "arc") {
    const points = getArcWallPoints(wall);
    return (
      <group>
        {points.slice(0, -1).map((point, index) => (
          <LineBox
            key={`${wall.id}-${index}`}
            id={wall.id}
            start={point}
            end={points[index + 1]}
            widthMm={wall.thickness}
            heightMm={wall.height}
            structure={structure}
            color="#e7e5df"
            selected={selected}
            onSelect={onSelect}
            onHover={onHover}
            onClearHover={onClearHover}
          />
        ))}
      </group>
    );
  }

  return (
    <LineBox
      id={wall.id}
      start={wall.start}
      end={wall.end}
      widthMm={wall.thickness}
      heightMm={wall.height}
      structure={structure}
      color="#e4e1d8"
      selected={selected}
      onSelect={onSelect}
      onHover={onHover}
      onClearHover={onClearHover}
    />
  );
}

function PartitionMesh({
  partition,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  partition: HousePartition;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  return (
    <LineBox
      id={partition.id}
      start={partition.start}
      end={partition.end}
      widthMm={partition.thickness}
      heightMm={partition.height}
      structure={structure}
      color={partition.material === "glass" ? "#bae6fd" : "#ddd6c8"}
      opacity={partition.transparency ? Math.max(0.28, 1 - partition.transparency) : 0.82}
      selected={selected}
      onSelect={onSelect}
      onHover={onHover}
      onClearHover={onClearHover}
    />
  );
}

function OpeningMesh({
  opening,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  opening: HouseDoor | HouseWindow;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const host = getHostSegment(structure, opening.hostId);
  if (!host) return null;
  const metrics = lineMetrics(host.start, host.end, structure);
  const t = Math.min(1, Math.max(0, opening.positionOnWall));
  const center = {
    x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t + metrics.normal.x * ((host.thickness / 2) * MM_TO_M + 0.035),
    z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t + metrics.normal.z * ((host.thickness / 2) * MM_TO_M + 0.035)
  };
  const isDoor = "openDirection" in opening;
  const width = Math.max(0.2, opening.width * MM_TO_M);
  const height = Math.max(0.3, opening.height * MM_TO_M);
  const y = isDoor ? height / 2 + 0.02 : 1.35;
  const isGlassDoor = isDoor && "material" in opening && opening.material?.toLowerCase().includes("glass");
  const color = selected ? "#2563eb" : isDoor ? (isGlassDoor ? "#7dd3fc" : "#fbbf24") : "#60a5fa";
  const opacity = isDoor ? ("transparency" in opening && opening.transparency ? Math.max(0.28, 1 - opening.transparency) : 0.45) : 0.5;

  return (
    <mesh
      castShadow
      position={[center.x, y, center.z]}
      rotation={[0, metrics.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(opening.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(opening.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(opening.id);
      }}
    >
      <boxGeometry args={[width, height, 0.05]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.35} metalness={0.02} />
    </mesh>
  );
}

function BayWindowMesh({
  bayWindow,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  bayWindow: HouseBayWindow;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const host = getHostSegment(structure, bayWindow.wallId);
  if (!host) return null;
  const metrics = lineMetrics(host.start, host.end, structure);
  const t = Math.min(1, Math.max(0, bayWindow.positionOnWall));
  const center = {
    x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t + metrics.normal.x * ((host.thickness / 2 + bayWindow.depth / 2) * MM_TO_M),
    z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t + metrics.normal.z * ((host.thickness / 2 + bayWindow.depth / 2) * MM_TO_M)
  };
  return (
    <mesh
      castShadow
      receiveShadow
      position={[center.x, 0.55, center.z]}
      rotation={[0, metrics.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(bayWindow.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(bayWindow.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(bayWindow.id);
      }}
    >
      <boxGeometry args={[bayWindow.width * MM_TO_M, 1.1, bayWindow.depth * MM_TO_M]} />
      <meshStandardMaterial color={selected ? "#2563eb" : "#bfdbfe"} transparent opacity={0.55} roughness={0.28} />
    </mesh>
  );
}

function StairMesh({
  stair,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  stair: HouseStair;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const metrics = useMemo(() => lineMetrics(stair.start, stair.end, structure), [stair, structure]);
  const count = Math.max(1, stair.stepCount);
  const stepLength = metrics.length / count;
  const totalHeight = Math.max(0.4, stair.height * MM_TO_M);
  const stairWidth = Math.max(0.5, stair.width * MM_TO_M);
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(stair.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(stair.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(stair.id);
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count;
        const height = totalHeight * ((index + 1) / count);
        const center = {
          x: metrics.startPoint.x + (metrics.endPoint.x - metrics.startPoint.x) * t,
          z: metrics.startPoint.z + (metrics.endPoint.z - metrics.startPoint.z) * t
        };
        return (
          <mesh key={`${stair.id}-step-${index}`} castShadow receiveShadow position={[center.x, height / 2, center.z]} rotation={[0, metrics.rotationY, 0]}>
            <boxGeometry args={[stepLength * 0.92, height, stairWidth]} />
            <meshStandardMaterial color={selected ? "#2563eb" : "#d6c6ae"} roughness={0.72} />
          </mesh>
        );
      })}
    </group>
  );
}

function FurnitureBlock({
  item,
  structure,
  selected,
  onSelect,
  onHover,
  onClearHover
}: {
  item: Furniture;
  structure: HouseStructure;
  selected: boolean;
  onSelect: (item: Furniture) => void;
  onHover: (id: string) => void;
  onClearHover: (id: string) => void;
}) {
  const position = getFurnitureScenePosition(item, structure);
  const width = Math.max(0.12, item.dimensions.width / 100);
  const depth = Math.max(0.08, item.dimensions.depth / 100);
  const height = getFurnitureHeight(item);
  const rotation = -(item.position.rotation || 0) * Math.PI / 180;
  const color = selected ? "#2563eb" : getFurnitureColor(item);
  const transparent = item.moduleType === "shower" || item.moduleType === "fireplace" || item.type === "plant";
  const opacity = item.moduleType === "shower" ? 0.42 : item.moduleType === "fireplace" ? 0.82 : transparent ? 0.78 : 1;

  return (
    <mesh
      castShadow
      receiveShadow
      position={[position.x, height / 2 + 0.035, position.z]}
      rotation={[0, rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(item.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onClearHover(item.id);
      }}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} transparent={transparent || opacity < 1} opacity={opacity} roughness={0.62} metalness={0.03} />
    </mesh>
  );
}

function CameraRig({ preset }: { preset: CameraPreset }) {
  const { camera } = useThree();
  useEffect(() => {
    const positions: Record<CameraPreset, [number, number, number]> = {
      overview: [7.4, 8.2, 8.6],
      living: [5.8, 3.9, 7.2],
      kitchen: [1.6, 4.8, -7.8]
    };
    camera.position.set(...positions[preset]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, preset]);
  return null;
}

function Floor3DScene({
  cameraPreset,
  houseStructure,
  furniture,
  selectedObjectId,
  selectedFurnitureId,
  onSelectStructure,
  onSelectFurniture,
  onHoverObject,
  onClearHoverObject
}: {
  cameraPreset: CameraPreset;
  houseStructure: HouseStructure;
  furniture: Furniture[];
  selectedObjectId: string;
  selectedFurnitureId: string;
  onSelectStructure: (objectId: string) => void;
  onSelectFurniture: (furniture: Furniture) => void;
  onHoverObject: (objectId: string) => void;
  onClearHoverObject: (objectId: string) => void;
}) {
  const size = getStructureSize(houseStructure);
  return (
    <>
      <CameraRig preset={cameraPreset} />
      <color attach="background" args={["#f5f1e8"]} />
      <ambientLight intensity={0.58} />
      <directionalLight castShadow position={[4, 8, 5]} intensity={1.15} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <hemisphereLight args={["#dbeafe", "#f5e6cc", 0.55]} />

      <mesh receiveShadow position={[0, -0.012, 0]}>
        <boxGeometry args={[size.width * MM_TO_M + 0.5, 0.02, size.height * MM_TO_M + 0.5]} />
        <meshStandardMaterial color="#efe9dd" roughness={0.9} />
      </mesh>

      {houseStructure.rooms.map((room, index) => (
        <RoomFloorMesh key={room.id} room={room} index={index} structure={houseStructure} />
      ))}

      {houseStructure.walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          structure={houseStructure}
          selected={selectedObjectId === wall.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.partitions.map((partition) => (
        <PartitionMesh
          key={partition.id}
          partition={partition}
          structure={houseStructure}
          selected={selectedObjectId === partition.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.doors.map((door) => (
        <OpeningMesh
          key={door.id}
          opening={door}
          structure={houseStructure}
          selected={selectedObjectId === door.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.windows.map((windowObject) => (
        <OpeningMesh
          key={windowObject.id}
          opening={windowObject}
          structure={houseStructure}
          selected={selectedObjectId === windowObject.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.bayWindows.map((bayWindow) => (
        <BayWindowMesh
          key={bayWindow.id}
          bayWindow={bayWindow}
          structure={houseStructure}
          selected={selectedObjectId === bayWindow.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {houseStructure.stairs.map((stair) => (
        <StairMesh
          key={stair.id}
          stair={stair}
          structure={houseStructure}
          selected={selectedObjectId === stair.id}
          onSelect={onSelectStructure}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      {furniture.map((item) => (
        <FurnitureBlock
          key={item.id}
          item={item}
          structure={houseStructure}
          selected={selectedFurnitureId === item.id || selectedObjectId === item.id}
          onSelect={onSelectFurniture}
          onHover={onHoverObject}
          onClearHover={onClearHoverObject}
        />
      ))}

      <gridHelper args={[14, 14, "#d8d0c0", "#eee6d7"]} position={[0, 0.006, 0]} />
    </>
  );
}

export function Floor3DView({
  floor,
  houseStructure,
  furniture,
  selectedObjectId,
  selectedFurnitureId,
  showObjectIds,
  onShowObjectIdsChange,
  onSelectStructure,
  onSelectFurniture,
  onHoverObject,
  onClearHoverObject
}: Floor3DViewProps) {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("overview");
  const selectedFurniture = furniture.find((item) => item.id === selectedFurnitureId || item.id === selectedObjectId);
  const selectedStructure =
    houseStructure.walls.find((item) => item.id === selectedObjectId) ??
    houseStructure.partitions.find((item) => item.id === selectedObjectId) ??
    houseStructure.stairs.find((item) => item.id === selectedObjectId) ??
    houseStructure.doors.find((item) => item.id === selectedObjectId) ??
    houseStructure.windows.find((item) => item.id === selectedObjectId) ??
    houseStructure.bayWindows.find((item) => item.id === selectedObjectId) ??
    null;
  const selectedName = selectedFurniture?.name ?? selectedStructure?.name ?? selectedObjectId;

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#ede7da] shadow-inner">
      <Canvas shadows camera={{ fov: 42, near: 0.1, far: 80 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Floor3DScene
          cameraPreset={cameraPreset}
          houseStructure={houseStructure}
          furniture={furniture}
          selectedObjectId={selectedObjectId}
          selectedFurnitureId={selectedFurnitureId}
          onSelectStructure={onSelectStructure}
          onSelectFurniture={onSelectFurniture}
          onHoverObject={onHoverObject}
          onClearHoverObject={onClearHoverObject}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto rounded-lg border border-white/80 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">1F 3D White Model</div>
          <div className="mt-1 text-lg font-black text-stone-900">{floor.label} · {floor.subtitle}</div>
          <div className="mt-1 text-xs font-semibold text-stone-500">墙体 / 门窗 / 楼梯 / 家具都来自当前 1F 模型</div>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2 rounded-lg border border-white/80 bg-white/88 p-2 shadow-sm backdrop-blur">
          {([
            ["overview", "鸟瞰"],
            ["living", "客厅"],
            ["kitchen", "厨房"]
          ] as Array<[CameraPreset, string]>).map(([preset, label]) => (
            <button
              key={preset}
              className={`rounded-md px-3 py-2 text-xs font-bold transition ${cameraPreset === preset ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              onClick={() => setCameraPreset(preset)}
              type="button"
            >
              {label}
            </button>
          ))}
          <label className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100">
            <input checked={showObjectIds} onChange={(event) => onShowObjectIdsChange(event.target.checked)} type="checkbox" />
            对象信息
          </label>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-sm rounded-lg border border-white/80 bg-white/88 p-4 text-sm leading-6 text-stone-600 shadow-sm backdrop-blur">
        <div className="font-black text-stone-900">1F 立体白模</div>
        <div className="mt-1">先用白模确认空间比例、通道和家具体量；材质、灯光和漫游下一步再叠加。</div>
        {showObjectIds && (
          <div className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
            {selectedObjectId ? `当前选中：${selectedObjectId}${selectedName ? ` · ${selectedName}` : ""}` : "点选墙体、楼梯、门窗或家具后，这里显示对象信息。"}
          </div>
        )}
      </div>
    </div>
  );
}
