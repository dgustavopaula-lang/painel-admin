import * as THREE from './vendor/three.module.js';

export function iniciarGold(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03100d);

  const camera = new THREE.PerspectiveCamera(42,1,.1,100);
  camera.position.set(0,0,8);

  const renderer = new THREE.WebGLRenderer({
    antialias:true
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  container.replaceChildren(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff,1.5));

  const light = new THREE.PointLight(0x44ffbb,35);
  light.position.set(3,4,5);
  scene.add(light);

  const ecosystem = new THREE.Group();
  scene.add(ecosystem);

  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(2.05,64,48),
    new THREE.MeshPhysicalMaterial({
      color:0x168b70,
      transparent:true,
      opacity:.13,
      roughness:.18,
      metalness:.3,
      depthWrite:false,
      side:THREE.DoubleSide
    })
  );
  ecosystem.add(membrane);

  const network = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.08,3),
    new THREE.MeshBasicMaterial({
      color:0x36cda4,
      wireframe:true,
      transparent:true,
      opacity:.08
    })
  );
  ecosystem.add(network);

  const colors=[
    0x48ff88,
    0x38bfff,
    0xffd166,
    0xbb78ff,
    0xff5262
  ];

  const particles=[];
  const geometry=new THREE.SphereGeometry(.045,12,12);

  const materials=colors.map(color=>
    new THREE.MeshBasicMaterial({color})
  );

  for(let i=0;i<240;i++){
    const mesh=new THREE.Mesh(
      geometry,materials[i%5]
    );
    const radius=Math.cbrt(Math.random())*1.92;
    const angle=Math.random()*Math.PI*2;
    const latitude=Math.acos(2*Math.random()-1);

    ecosystem.add(mesh);
    particles.push({
      mesh,radius,angle,latitude,
      speed:.15+Math.random()*.45
    });
  }

  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(2.25,.009,8,128),
      new THREE.MeshBasicMaterial({
        color:0xc7a65a,
        transparent:true,
        opacity:.4
      })
    );
    ring.rotation.x=i*Math.PI/3;
    ring.rotation.y=i*.7;
    ecosystem.add(ring);
  }

  function resize(){
    const w=container.clientWidth||600;
    const h=container.clientHeight||440;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  new ResizeObserver(resize).observe(container);
  resize();

  const reduced=matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  renderer.setAnimationLoop(()=>{
    const t=reduced?0:performance.now()/1000;

    ecosystem.rotation.y=t*.09;
    ecosystem.rotation.x=Math.sin(t*.15)*.12;

    for(const p of particles){
      const a=p.angle+t*p.speed;
      const r=p.radius;

      p.mesh.position.set(
        r*Math.sin(p.latitude)*Math.cos(a),
        r*Math.cos(p.latitude),
        r*Math.sin(p.latitude)*Math.sin(a)
      );

      p.mesh.scale.setScalar(
        1+Math.sin(t*2+p.angle)*.25
      );
    }

    renderer.render(scene,camera);
  });
}
