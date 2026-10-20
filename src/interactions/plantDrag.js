import * as THREE from 'three';
import { SLOTS, SPECIES } from '../simulation/species.js';
import { comfortFor, lightAt } from '../simulation/simulation.js';
import { SOIL_Y } from '../scene/terrarium.js';

export function createInteractions(world, ui, { getState, isBusy, onPlace, onLamp, onWater }) {
  const canvas=world.renderer.domElement;
  const raycaster=new THREE.Raycaster();
  const soilPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-SOIL_Y);
  const lampPlane=new THREE.Plane(new THREE.Vector3(0,0,1),1.8);
  const controller=new AbortController();
  const signal=controller.signal;
  let selected=null, drag=null, currentSlot=-1;
  const cursor=ui.$('#drag-cursor');

  function pointerRay(event){
    const rect=canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),world.camera);
    return event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
  }
  function slotUnderPointer(event,moving=false){
    if(!pointerRay(event))return -1;
    const p=raycaster.ray.intersectPlane(soilPlane,new THREE.Vector3());
    if(!p || Math.hypot(p.x,p.z)>2.02)return -1;
    let nearest=-1,distance=Infinity;
    for(let i=0;i<SLOTS.length;i++){
      if(!moving&&getState().plants.some(plant=>plant.slot===i))continue;
      const d=Math.hypot(p.x-SLOTS[i].x,p.z-SLOTS[i].z);
      if(d<distance){distance=d;nearest=i;}
    }
    return distance<1.05?nearest:-1;
  }
  function pick(event){
    pointerRay(event);
    const objects=[...world.plants.values(),world.lamp.head,world.wateringCan.group];
    const hit=raycaster.intersectObjects(objects,true)[0];
    if(!hit)return null;
    let object=hit.object;
    while(object){
      if(object.userData.species)return {kind:'plant',species:object.userData.species};
      if(object.userData.kind)return {kind:object.userData.kind};
      object=object.parent;
    }
    return null;
  }
  function select(species){
    selected=species;
    ui.select(species);
    world.highlight(-1,!!species);
    ui.render(getState(),isBusy());
  }
  function clearTransient(){
    world.clearPreview();ui.hidePreview();cursor.hidden=true;
    world.controls.enabled=true;
    currentSlot=-1;
  }
  function cancel(message=false){
    const had=drag||selected;
    drag=null;clearTransient();select(null);
    if(message&&had)ui.toast('Placement cancelled. Your little world is unchanged.');
  }
  function begin(event,kind,species=null,moving=false){
    drag={kind,species,moving,startX:event.clientX,startY:event.clientY,active:false,id:event.pointerId};
    world.controls.enabled=false;
    canvas.style.cursor='grabbing';
  }
  function showPlacement(event,species,moving){
    currentSlot=slotUnderPointer(event,moving);
    world.highlight(currentSlot,true);
    const plant=getState().plants.find(p=>p.species===species);
    world.preview(species,currentSlot,plant?.health,plant?.growth);
    if(currentSlot>=0){
      const slot=SLOTS[currentSlot];
      const percent=Math.round(comfortFor(species,getState().soilMoisture,lightAt(getState().lampPosition,slot))*100);
      ui.preview(species,currentSlot,percent,world.project(new THREE.Vector3(slot.x,SOIL_Y+0.6,slot.z)));
      cursor.hidden=true;
    }else{
      ui.hidePreview();
      cursor.hidden=false;
      cursor.querySelector('img').src=world.thumbnails[species];
      cursor.querySelector('span').textContent=SPECIES[species].name;
      cursor.style.transform=`translate(${event.clientX+12}px,${event.clientY-55}px)`;
    }
  }
  for(const card of document.querySelectorAll('[data-species]')){
    card.addEventListener('pointerdown',event=>{
      if(event.button!==0||isBusy()||card.disabled)return;
      event.preventDefault();
      select(card.dataset.species);
      begin(event,'plant',card.dataset.species,false);
    },{signal});
    card.addEventListener('click',event=>{if(event.detail===0&&!isBusy())select(card.dataset.species);},{signal});
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    if(isBusy()){event.stopImmediatePropagation();return;}
    const hit=pick(event);
    // Capture phase prevents OrbitControls from starting a conflicting drag.
    if(hit?.kind==='lamp'){
      event.stopImmediatePropagation();event.preventDefault();begin(event,'lamp');return;
    }
    if(hit?.kind==='water'){
      event.stopImmediatePropagation();event.preventDefault();onWater();return;
    }
    if(selected){
      event.stopImmediatePropagation();event.preventDefault();
      const slot=slotUnderPointer(event,getState().plants.some(p=>p.species===selected));
      if(slot>=0){const species=selected;cancel();onPlace(species,slot);}else ui.toast('Choose an empty planting ring inside the soil.');
      return;
    }
    if(hit?.kind==='plant'){
      event.stopImmediatePropagation();event.preventDefault();
      begin(event,'plant',hit.species,true);
    }
  },{capture:true,signal});
  window.addEventListener('pointermove',event=>{
    if(!drag){
      if(event.target===canvas&&!isBusy())canvas.style.cursor=pick(event)?'grab':selected?'crosshair':'grab';
      return;
    }
    if(event.pointerId!==drag.id)return;
    if(!drag.active&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5)drag.active=true;
    if(!drag.active)return;
    if(drag.kind==='lamp'){
      pointerRay(event);
      const p=raycaster.ray.intersectPlane(lampPlane,new THREE.Vector3());
      if(p)onLamp(p.x,false);
    }else{
      if(drag.moving)world.hideSpecies(drag.species);
      showPlacement(event,drag.species,drag.moving);
    }
  },{signal});
  window.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const finished=drag;drag=null;
    const slot=finished.active&&finished.kind==='plant'?slotUnderPointer(event,finished.moving):-1;
    clearTransient();
    if(finished.kind==='lamp'){if(finished.active)onLamp(getState().lampPosition.x,true);return;}
    if(finished.active){
      select(null);
      if(slot>=0)onPlace(finished.species,slot);else ui.toast('Drop inside a planting ring. Your plants are unchanged.');
    }else select(finished.species);
    canvas.style.cursor='grab';
  },{signal});
  window.addEventListener('pointercancel',()=>cancel(true),{signal});
  window.addEventListener('blur',()=>cancel(),{signal});
  window.addEventListener('keydown',event=>{if(event.key==='Escape')cancel(true);},{signal});
  for(const button of document.querySelectorAll('[data-slot]')){
    button.addEventListener('click',()=>{
      if(isBusy())return;
      const slot=Number(button.dataset.slot);
      if(selected){const species=selected;cancel();onPlace(species,slot);}
      else{
        const plant=getState().plants.find(p=>p.slot===slot);
        if(plant){select(plant.species);ui.toast(`${SPECIES[plant.species].name} selected. Choose another spot to move or swap.`);}
        else ui.toast('Select a plant from the collection first.');
      }
    },{signal});
  }
  return {cancel,dispose(){cancel();controller.abort();}};
}
