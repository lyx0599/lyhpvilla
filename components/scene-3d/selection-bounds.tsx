"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

type Props = {
  width: number;
  height: number;
  depth: number;
  color?: string;
};

export function SelectionBounds({ width, height, depth, color = "#1677ff" }: Props) {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.045, height + 0.045, depth + 0.045)), [depth, height, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry} renderOrder={50} raycast={() => null}>
      <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.92} toneMapped={false} />
    </lineSegments>
  );
}

