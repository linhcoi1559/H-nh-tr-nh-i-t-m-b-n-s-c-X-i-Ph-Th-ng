import * as THREE from 'three';
const keys=[
 [0,.48,.76,0xb6cae0,0x1d2b3a,0x1f2f42,.48],
 [5,.48,.76,0xb6cae0,0x1d2b3a,0x1f2f42,.48],
 [6.5,1.42,1.14,0xffd7b0,0xcebcb0,0xc5caca,.66],
 [8,2.65,1.36,0xfff9e2,0xd8ecfa,0xffffff,.82],
 [15.5,2.65,1.36,0xfff9e2,0xd8ecfa,0xffffff,.82],
 [17.5,2.05,1.12,0xffca9e,0xd8b69e,0xebc8aa,.66],
 [19,.48,.76,0xb6cae0,0x1d2b3a,0x1f2f42,.48],
 [24,.48,.76,0xb6cae0,0x1d2b3a,0x1f2f42,.48]
];
export function environmentLighting(hour){
 const h=((Number(hour)||0)%24+24)%24;let i=0;while(i<keys.length-2&&h>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],t=THREE.MathUtils.smoothstep(h,a[0],b[0]),number=n=>THREE.MathUtils.lerp(a[n],b[n],t),color=n=>new THREE.Color(a[n]).lerp(new THREE.Color(b[n]),t);
 return {sun:number(1),hemi:number(2),sunColor:color(3),fog:color(4),sky:color(5),environment:number(6)};
}
