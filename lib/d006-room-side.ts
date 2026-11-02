// Original 2F R12 affected-interface helper: D006 only, not a global swing fix.
type P={x:number,y:number};
function inside(p:P,polygon:P[]){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
}return yes;}
export function d006RoomInwardYaw(args:{id:string,hostStart:P,hostEnd:P,positionOnWall:number,roomBoundary:P[],leafDirection:1|-1,angleDeg:number}):number|undefined{
 if(args.id!=='D-2F-006')return undefined;
 const {hostStart:a,hostEnd:b}=args,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);if(l<1)throw Error('invalid D006 host');
 const normal={x:-dy/l,y:dx/l},c={x:a.x+dx*args.positionOnWall,y:a.y+dy*args.positionOnWall};
 const sign=inside({x:c.x+normal.x*100,y:c.y+normal.y*100},args.roomBoundary)?1:-1;
 return -sign*args.leafDirection*Math.max(0,Math.min(90,args.angleDeg))*Math.PI/180;
}
