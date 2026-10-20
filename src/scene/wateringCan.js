import * as THREE from 'three';
import { stemBetween } from './plantFactory.js';

export function createWateringCan(scene) {
  const group = new THREE.Group();
  group.position.set(-2.65,0.18,1.35);
  group.rotation.y = -0.45;
  group.userData.kind = 'water';
  const mat = new THREE.MeshStandardMaterial({ color: 0x8c9b67, roughness: 0.72, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.31,0.25,0.53,12,1,true),mat);
  body.position.y = 0.27;
  body.castShadow = true;
  group.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31,0.028,6,24),mat);
  rim.rotation.x = Math.PI/2;
  rim.position.y = 0.53;
  group.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.28,24),new THREE.MeshStandardMaterial({ color: 0x779c99, roughness: 0.25 }));
  water.rotation.x = -Math.PI/2;
  water.position.y = 0.46;
  group.add(water);
  const spout = stemBetween(new THREE.Vector3(0.18,0.2,0),new THREE.Vector3(0.88,0.68,0),0.065,mat);
  group.add(spout);
  const rose = new THREE.Mesh(new THREE.ConeGeometry(0.14,0.16,10),mat);
  rose.position.set(0.88,0.68,0);
  rose.rotation.z = -Math.PI/3;
  group.add(rose);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.25,0.043,6,16,Math.PI*1.55),mat);
  handle.position.set(-0.32,0.28,0);
  handle.rotation.z = 0.72;
  group.add(handle);
  scene.add(group);
  const drops = new THREE.Group();
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x8cbfc4, transparent: true, opacity: 0.8, roughness: 0.2 });
  for (let i=0;i<20;i++) {
    const drop = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035,0),dropMat);
    drop.scale.y = 1.7;
    drops.add(drop);
  }
  drops.visible = false;
  scene.add(drops);
  let waterStart = -10;
  return {
    group,
    pour(time) { waterStart = time; },
    animate(time) {
      const age = time-waterStart;
      const active = age >= 0 && age < 1.15;
      group.rotation.z = active ? -Math.sin(age/1.15*Math.PI)*0.35 : 0;
      drops.visible = active;
      if (active) drops.children.forEach((drop,i) => {
        const t = (age*1.4+i/20)%1;
        drop.position.set(-1.8+t*0.7+Math.sin(i*2)*0.12,1.2-t*0.5,1.1+Math.cos(i*3)*0.22);
      });
    },
  };
}
