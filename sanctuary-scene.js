import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

// Each knot has an authored position, gaze and a native-scroll time. The nave stays open.
const keys = [
  [0, [34, 19, 74], [-8, 5, -2]],
  [.09, [8, 11, 55], [-3, 5.5, -3]],
  [.18, [-4.8, 5.2, 35], [0, 6, 3]],
  [.28, [-1, 3.5, 20], [0, 5, -6]],
  [.38, [0, 3.2, 5], [0, 4.8, -20]],
  [.52, [0, 3.3, -9], [0, 4.5, -23]],
  [.62, [0, 4.2, -12.7], [0, 3.3, -23]],
  [.73, [4.6, 5.8, -16.3], [0, 3.1, -23]],
  [.82, [4.8, 6.3, -26], [0, 6.3, -43]],
  [.9, [0, 5.3, -43], [0, 9, -90]],
  [1, [-8, 19, -55], [0, 5, -125]]
];

export async function createSanctuary(canvas, onFailure) {
  const compact = matchMedia('(max-width: 700px)').matches;
  const constrained = compact || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !constrained, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, constrained ? 1.25 : 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = !constrained;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#c5d9e2', .0033);
  const camera = new THREE.PerspectiveCamera(43, 1, .16, 540);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(440, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { top: { value: new THREE.Color('#72b9df') }, middle: { value: new THREE.Color('#b7d9ed') }, bottom: { value: new THREE.Color('#f8e7d8') } },
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vDirection; uniform vec3 top; uniform vec3 middle; uniform vec3 bottom; void main(){float h=normalize(vDirection).y; vec3 color=mix(bottom,middle,smoothstep(-.3,.04,h)); color=mix(color,top,smoothstep(-.04,.38,h)); gl_FragColor=vec4(color,1.); \n #include <colorspace_fragment> \n }'
  }));
  // Shader chunks are separate lines for preprocessor portability across mobile drivers.
  sky.material.fragmentShader = sky.material.fragmentShader.replace('; #include', ';\n#include').replace('> }', '>\n}');
  scene.add(sky);
  scene.add(new THREE.HemisphereLight('#eff7ff', '#969687', 1.8));
  const sun = new THREE.DirectionalLight('#ffe3b3', 2.7);
  sun.position.set(-40, 70, 38);
  sun.target.position.set(0, 0, -13);
  sun.castShadow = !constrained;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 65, bottom: -65, near: 1, far: 160 });
  sun.shadow.bias = -.00035;
  sun.shadow.normalBias = .065;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#a4caee', 1.0);
  fill.position.set(25, 18, -45);
  scene.add(fill);
  const pactLight = new THREE.PointLight('#a9eaff', 0, 20, 2);
  pactLight.position.set(0, 5, -23);
  scene.add(pactLight);
  // Soft hall light; no per-light shadow maps or expensive postprocessing.
  const hallLight = new THREE.PointLight('#ffe4bd', 95, 42, 2);
  hallLight.position.set(0, 10, -11);
  scene.add(hallLight);

  const loader = new GLTFLoader();
  let gltf;
  try { gltf = await loader.loadAsync('./assets/sanctuary/sanctuary.glb'); }
  catch (error) { renderer.dispose(); sky.geometry.dispose(); sky.material.dispose(); throw error; }
  const model = gltf.scene;
  scene.add(model);
  const materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = !/Cloud|Water|Glass|Rune/i.test(object.name);
    object.receiveShadow = true;
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) materials.add(material);
  });
  const left = model.getObjectByName('DoorLeft');
  const right = model.getObjectByName('DoorRight');
  const crystal = model.getObjectByName('PactCrystal');
  // Scale the authored gem for an intimate view with the entire altar still in frame.
  if (crystal) { crystal.scale.multiplyScalar(.68); crystal.position.y -= .4; }
  const clouds = model.getObjectByName('CloudBanks');
  const cloudX = clouds?.position.x || 0;
  const cloudY = clouds?.position.y || 0;
  const leftRest = left?.quaternion.clone();
  const rightRest = right?.quaternion.clone();
  const crystalRest = crystal?.quaternion.clone();
  const crystalY = crystal?.position.y || 0;
  const rune = [...materials].find(material => material.name === 'RuneGlow');
  const crystalMat = crystal?.material;
  if (crystalMat?.emissive) {
    crystalMat.color.set('#79c6e6');
    crystalMat.emissive.set('#a3ddff');
    crystalMat.roughness = .24;
    crystalMat.metalness = .16;
  }
  const positionCurve = new THREE.CatmullRomCurve3(keys.map(key => new THREE.Vector3(...key[1])), false, 'centripetal');
  const targetCurve = new THREE.CatmullRomCurve3(keys.map(key => new THREE.Vector3(...key[2])), false, 'centripetal');
  const gaze = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const rotation = new THREE.Quaternion();
  const count = constrained ? 32 : 86;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  // Deterministic little motes around the altar, never full-screen visual noise.
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963;
    seeds[i * 3] = a;
    seeds[i * 3 + 1] = 1.5 + (i % 11) * .32;
    seeds[i * 3 + 2] = (i * .731) % 6;
  }
  const particlesGeo = new THREE.BufferGeometry();
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMat = new THREE.PointsMaterial({ color: '#ffdc8a', size: .04, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  particlesMat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat moteRadius = length(gl_PointCoord - vec2(.5));\nif (moteRadius > .5) discard;\ndiffuseColor.a *= 1. - smoothstep(.08, .5, moteRadius);');
  };
  const particles = new THREE.Points(particlesGeo, particlesMat);
  particles.frustumCulled = false;
  scene.add(particles);
  let lastProgress = -1;
  let lastStill = false;
  let currentPact = 0;
  let currentDoor = 0;
  let disposed = false;
  let slowFrames = 0;
  let measuredFrames = 0;
  let lastRender = 0;
  let adapted = false;
  let courtyard = null;
  let courtyardPromise = null;
  let inCourtyard = false;

  function loadCourtyard() {
    if (!courtyardPromise) courtyardPromise = import('./courtyard-scene.js').then(module => module.createCourtyard(scene)).then(result => {
      if (disposed) { result.dispose(); throw new Error('Scene disposed'); }
      courtyard = result;
      return courtyard;
    });
    return courtyardPromise;
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 59 : 43;
    camera.updateProjectionMatrix();
    lastProgress = -1;
  }

  function update(progress, time, still, extension = null) {
    if (disposed) return;
    const extensionActive = !!courtyard && extension?.progress > 0;
    if (inCourtyard && !extensionActive) lastProgress = -1;
    if (lastProgress !== progress || lastStill !== still) {
      let index = 0;
      while (index < keys.length - 2 && progress > keys[index + 1][0]) index++;
      const local = (progress - keys[index][0]) / (keys[index + 1][0] - keys[index][0]);
      const t = (index + clamp(local, 0, 1)) / (keys.length - 1);
      positionCurve.getPoint(t, camera.position);
      targetCurve.getPoint(t, gaze);
      // Portrait opening composition holds the island above the lower text block.
      if (camera.aspect < .85 && progress < .18) {
        const factor = 1 - smooth(.07, .18, progress);
        camera.position.x -= factor * 16;
        camera.position.y += factor * 3;
        gaze.x += factor * 7;
        gaze.y -= factor * 10;
      }
      camera.lookAt(gaze);
      currentDoor = smooth(.205, .335, progress);
      if (left) left.quaternion.copy(leftRest).premultiply(rotation.setFromAxisAngle(up, currentDoor * Math.PI * .49));
      if (right) right.quaternion.copy(rightRest).premultiply(rotation.setFromAxisAngle(up, -currentDoor * Math.PI * .49));
      currentPact = smooth(.61, .78, progress);
      pactLight.intensity = 8 + currentPact * 105;
      if (rune) rune.emissiveIntensity = .12 + currentPact * 2.2;
      if (crystalMat?.emissive) crystalMat.emissiveIntensity = .12 + currentPact * .9;
      particlesMat.opacity = currentPact * .75;
      renderer.toneMappingExposure = 1.02 - smooth(.34, .46, progress) * .05 + smooth(.8, .94, progress) * .05;
      lastProgress = progress;
      lastStill = still;
    }
    if (crystal) {
      crystal.position.y = crystalY + Math.sin(time * .85) * .12;
      crystal.quaternion.copy(crystalRest).premultiply(rotation.setFromAxisAngle(up, time * .13));
    }
    if (clouds) {
      clouds.position.x = cloudX + Math.sin(time * .035) * .5;
      clouds.position.y = cloudY + Math.sin(time * .055) * .14;
    }
    if (currentPact > 0 && !still) {
      for (let i = 0; i < count; i++) {
        const a = seeds[i * 3] + time * .09;
        const r = seeds[i * 3 + 1];
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = .6 + ((seeds[i * 3 + 2] + time * .35) % 6);
        positions[i * 3 + 2] = -23 + Math.sin(a) * r;
      }
      particlesGeo.attributes.position.needsUpdate = true;
    }
    if (extensionActive !== inCourtyard) {
      inCourtyard = extensionActive;
      if (inCourtyard) {
        sun.position.set(35, 70, -84);
        sun.target.position.set(80, 0, -140);
        sun.shadow.camera.left = -70;
        sun.shadow.camera.right = 70;
        sun.shadow.camera.updateProjectionMatrix();
      } else {
        sun.position.set(-40, 70, 38);
        sun.target.position.set(0, 0, -13);
        sun.shadow.camera.left = -48;
        sun.shadow.camera.right = 48;
        sun.shadow.camera.updateProjectionMatrix();
      }
    }
    model.visible = !extensionActive || extension.progress < .18;
    particles.visible = !extensionActive;
    courtyard?.update(camera, extensionActive ? extension.progress : 0, time, still, extension?.dt || .016);
    if (extensionActive) renderer.toneMappingExposure = 1.03;
    const now = performance.now();
    if (lastRender && !still && !adapted) {
      measuredFrames++;
      if (now - lastRender > 35) slowFrames++;
      if (measuredFrames >= 150) {
        if (slowFrames > 75) {
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
          renderer.shadowMap.enabled = false;
          resize();
        }
        adapted = true;
      }
    }
    lastRender = now;
    renderer.render(scene, camera);
  }

  function contextLost(event) { event.preventDefault(); onFailure(new Error('WebGL context lost')); }
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();
  return {
    resize, update, loadCourtyard,
    selectHero(id) { courtyard?.setHero(id); },
    selectShirt(id) { courtyard?.setShirt(id); },
    rotateShirt(delta, immediate) { courtyard?.rotate(delta, immediate); },
    viewShirt(side, immediate) { courtyard?.view(side, immediate); },
    stats: () => ({ drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio(), doorOpen: currentDoor, pactPower: currentPact, camera: camera.position.toArray(), quality: renderer.shadowMap.enabled ? 'full' : 'gentle', meshes: renderer.info.memory.geometries, courtyardReady: false, ...courtyard?.stats() }),
    dispose() {
      if (disposed) return;
      disposed = true;
      courtyard?.dispose();
      canvas.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      sky.material.dispose();
      particlesMat.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    }
  };
}
