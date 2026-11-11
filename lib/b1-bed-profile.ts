type BedProfileContract={foldedDepthMm:number;flatDepthMm:number;foldedHeightMm:number;flatHeightMm:number};
/** A declared design proxy; these interpolated intermediate poses are not OEM kinematics. */
export function getB1BedProfile(contract:BedProfileContract,amount:number,baseElevationMm=35){
  const t=Number.isFinite(amount)?Math.max(0,Math.min(1,amount)):0;
  const depthMm=contract.foldedDepthMm+(contract.flatDepthMm-contract.foldedDepthMm)*t;
  const topMm=baseElevationMm+contract.foldedHeightMm+(contract.flatHeightMm-contract.foldedHeightMm)*t;
  const backHeightMm=450-300*t;
  return{amount:t,depthMm,backHeightMm,backCenterMm:topMm-backHeightMm/2,seatCenterMm:baseElevationMm+contract.flatHeightMm-100,seatHeightMm:200,proxyTopMm:topMm};
}
