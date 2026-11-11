import {PerspectiveCamera,Vector3} from 'three';
import {getStructureCameraBounds,type CameraCompositionBounds,type CameraViewport} from './camera-composition.ts';
import {explorationScenePoint} from './exploration-mode.ts';
import type {FixedCameraView,FloorId,HouseStructure,MmPoint,Furniture} from '../types/space.ts';

/** Diagnostic views derive exclusively from this scene's current geometry. They are virtual cameras. */
export function buildModelInspectionCameras(floor:FloorId,structure:HouseStructure,viewport:CameraViewport,furniture:readonly Furniture[]=[]):FixedCameraView[] {
  const views:FixedCameraView[]=[];
  const aspect=Math.max(1,viewport.width)/Math.max(1,viewport.height);
  const make=(id:string,name:string,bounds:CameraCompositionBounds,top=true,from?:[number,number,number])=>{
    const target=new Vector3((bounds.minX+bounds.maxX)/2,top?0:(bounds.minY+bounds.maxY)/2,(bounds.minZ+bounds.maxZ)/2);
    // Ordinary fixed views are clamped to minPolarAngle=0.14*pi by the renderer.
    // Fit the permitted pose so a nominal vertical request cannot drift or clip.
    const polar=Math.PI*0.14;
    const direction=from?new Vector3(...from).normalize():top?new Vector3(0,Math.cos(polar),Math.sin(polar)):new Vector3(1.15,0.65,1.2).normalize();
    const corners=[bounds.minX,bounds.maxX].flatMap(x=>[bounds.minY,bounds.maxY].flatMap(y=>[bounds.minZ,bounds.maxZ].map(z=>new Vector3(x,y,z))));
    const camera=new PerspectiveCamera(42,aspect,0.1,80);
    let distance=Math.max(3,bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ);
    let fitted=false;
    for(let i=0;i<120;i++) {
      camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld();
      fitted=corners.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<=0.91&&Math.abs(q.y)<=0.91&&q.z>-1&&q.z<1;});
      if(fitted)break;distance*=1.035;
    }
    if(!fitted)throw new Error('Current model inspection camera cannot frame '+id);
    views.push({id:'current-'+floor+'-'+id,name,floor,cameraPosition:{x:camera.position.x,y:camera.position.y,z:camera.position.z},target:{x:target.x,y:target.y,z:target.z},fov:42,mode:'perspective',scope:'floor',description:'按当前实际模型边界和画布水平/垂直视场计算；虚拟检查相机，不代表人体可达或通路通过。'});
  };
  const region=(points:MmPoint[],padding=180)=>{
    const scenePoints=points.map(p=>explorationScenePoint(p,structure));
    return {minX:Math.min(...scenePoints.map(p=>p.x))-padding/1000,maxX:Math.max(...scenePoints.map(p=>p.x))+padding/1000,minY:0,maxY:2.8,minZ:Math.min(...scenePoints.map(p=>p.z))-padding/1000,maxZ:Math.max(...scenePoints.map(p=>p.z))+padding/1000};
  };
  make('plan','当前整层俯视｜实际模型',getStructureCameraBounds(structure,floor==='2F'));
  if(structure.outdoors.length)make('site','室内与室外分界俯视',getStructureCameraBounds(structure,true));
  const stairRoom=structure.rooms.find(r=>r.name.includes('楼梯'));
  if(stairRoom)make('stair','楼梯与洞口局部｜真实模型',region(stairRoom.boundary,650),false);
  const roomView=(id:string,label:string)=>{const room=structure.rooms.find(r=>r.id===id);if(room)make(id,label,region(room.boundary));};
  if(floor==='1F')roomView('ROOM-1F-004','长辈房与新入口俯视');
  if(floor==='B2'){
    roomView('ROOM-B2-005','四席桌岛与收纳区｜当前方案');
    roomView('ROOM-B2-001','客厅与入户｜当前模型');
    const f=furniture.find(f=>f.id==='furn-b2-sports-camping-storage-candidate-20261030');
    if(f){const cs=structure.coordinateSystem,cx=cs.origin.x+f.position.x/100*cs.width,cy=cs.origin.y+f.position.y/100*cs.height,a=(f.position.rotation??0)*Math.PI/180;
      const points=[-1,1].flatMap(x=>[-1,1].map(y=>{const dx=x*f.dimensions.width*5,dy=y*f.dimensions.depth*5;return{x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)};}));
      make('east-deep','东侧深挂与取物｜实际模型',region(points,650),false,[-1.5,.8,.25]);
    }
  }
  if(floor==='B1') {
    roomView('ROOM-B1-002','北部偶住与洗烘俯视');
    roomView('ROOM-B1-004','阅读与便携柜完整区域');
    const objectView=(id:string,label:string,from:[number,number,number])=>{
      const f=furniture.find(f=>f.id===id);if(!f)return;
      const cs=structure.coordinateSystem,cx=cs.origin.x+f.position.x/100*cs.width,cy=cs.origin.y+f.position.y/100*cs.height,a=(f.position.rotation??0)*Math.PI/180;
      const points=[-1,1].flatMap(x=>[-1,1].map(y=>{const dx=x*f.dimensions.width*5,dy=y*f.dimensions.depth*5;return{x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)};}));
      make(id,label,region(points,500),false,from);
    };
    objectView('furn-b1-activity-bookshelf-001','阅读柜正面与单门局部',[1.5,.65,.25]);
    objectView('furn-b1-activity-piano-001','便携柜正面与单门局部',[.15,.65,-1.5]);
    objectView('furn-b1-guest-bed-001','偶住沙发床与展开包络',[.15,1.2,1.1]);
  }
  if(floor==='2F') {
    roomView('ROOM-2F-001','客卫与门口俯视｜当前布局');
    roomView('ROOM-2F-002','衣帽间与入口俯视｜当前布局');
    roomView('ROOM-2F-006','主卧与飘窗俯视｜当前布局');
    const doors=structure.doors.filter(d=>['D-2F-003','D-2F-004'].includes(d.id));
    const points=doors.flatMap(d=>{const host=structure.walls.find(w=>w.id===d.hostId);return host?.kind==='straight'?[host.start,host.end]:[];});
    if(points.length) {
      make('guest-entries','两客房入口俯视｜当前新设计',region(points,800));
      make('guest-entry-detail','两客房入口侧向局部｜当前新设计',region(points,800),false);
    }
  }
  return views;
}
