import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';

// One connected place, in the same coordinates and renderer as the sanctuary.
// The first knot matches the sanctuary's final camera exactly.
const route = [
  [0, [-8, 19, -55], [0, 5, -125]],
  [.08, [36, 23, -52], [66, 2, -91]],
  [.1923, [95, 12, -77], [75, 2.7, -100]],
  [.32, [92, 10, -84], [76, 3, -102]],
  [.4423, [86, 8, -101], [72.5, 2.5, -126]],
  [.56, [85.5, 7.6, -102], [72.5, 2.6, -126]],
  [.6923, [90, 6.7, -139], [76.3, 2.7, -153]],
  [.8, [89, 6.3, -140], [76.4, 2.8, -153]],
  [.9423, [85.4, 5.1, -166.6], [76.3, 3.1, -179.5]],
  [1, [84.4, 4.7, -168], [76.5, 3.1, -179.5]]
];
const heroIds = ['rachan', 'wayu', 'niran'];
const textureLoader = new THREE.TextureLoader();

export async function createCourtyard(scene) {
  const loader = new GLTFLoader();
  const group = new THREE.Group();
  group.name = 'PufflingCourtyard';
  group.visible = false;
  const resources = [];
  const loaded = await Promise.allSettled([
    loader.loadAsync('./assets/courtyard/courtyard.glb'),
    loader.loadAsync('./assets/courtyard/shirt.glb'),
    textureLoader.loadAsync('./assets/courtyard/shirt-cream.webp'),
    textureLoader.loadAsync('./assets/courtyard/shirt-forest.webp'),
    textureLoader.loadAsync('./assets/creator.webp')
  ]);
  if (loaded.some(result => result.status !== 'fulfilled')) {
    loaded.forEach(result => {
      if (result.status !== 'fulfilled') return;
      const value = result.value;
      if (value.isTexture) value.dispose();
      value.scene?.traverse(object => {
        object.geometry?.dispose();
        const mats = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
        mats.forEach(material => { material.map?.dispose(); material.dispose(); });
      });
    });
    throw new Error('Courtyard assets could not load');
  }
  const [environment, shirtAsset, creamPrint, forestPrint, portrait] = loaded.map(result => result.value);
  group.add(environment.scene);
  const shirt = new THREE.Group();
  shirt.name = 'ShirtTurntable';
  shirt.position.set(80, 3.4, -179.5);
  shirt.add(shirtAsset.scene);
  group.add(shirt);
  [creamPrint, forestPrint, portrait].forEach(texture => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    resources.push(texture);
  });
  const portraitFrame = environment.scene.getObjectByName('CreatorPortrait');
  if (portraitFrame?.isMesh) {
    portraitFrame.material = new THREE.MeshBasicMaterial({ map: portrait, side: THREE.DoubleSide });
  }
  const shirtMaterials = new Set();
  shirt.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => shirtMaterials.add(material));
    object.castShadow = true;
    object.receiveShadow = true;
  });
  const fabric = [...shirtMaterials].filter(material => /ShirtFabric|ShirtCollar|ShirtSeam/i.test(material.name));
  const printMesh = shirtAsset.scene.getObjectByName('ShirtPrint');
  let printMaterial;
  if (printMesh?.isMesh) {
    printMaterial = new THREE.MeshStandardMaterial({ name: 'LiveShirtPrint', map: creamPrint, transparent: true, alphaTest: .03, roughness: .94, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 });
    printMesh.material = printMaterial;
  }
  const heroes = ['HeroRachan', 'HeroWayu', 'HeroNiran'].map(name => environment.scene.getObjectByName(name));
  const rest = heroes.map(hero => hero ? { scale: hero.scale.clone(), rotation: hero.quaternion.clone(), y: hero.position.y } : null);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.85, .035, 6, 48), new THREE.MeshBasicMaterial({ color: '#ddba70' }));
  halo.rotation.x = Math.PI / 2;
  halo.position.set(75, 1.2, -126);
  group.add(halo);
  group.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = !/Cloud|Portrait|Print/i.test(object.name);
    object.receiveShadow = true;
  });
  const lamp = new THREE.PointLight('#ffe4b5', 70, 15, 2);
  lamp.position.set(78, 5, -153);
  group.add(lamp);
  const shopFill = new THREE.PointLight('#fff0dc', 30, 13, 2);
  shopFill.position.set(80, 5.7, -175);
  group.add(shopFill);
  const curve = new THREE.CatmullRomCurve3(route.map(knot => new THREE.Vector3(...knot[1])), false, 'centripetal');
  const gazeCurve = new THREE.CatmullRomCurve3(route.map(knot => new THREE.Vector3(...knot[2])), false, 'centripetal');
  const gaze = new THREE.Vector3();
  const heroCamera = new THREE.Vector3();
  const heroGaze = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const rotation = new THREE.Quaternion();
  let selectedHero = 'rachan';
  let selectedShirt = 'cream';
  let focusX = 75;
  let angle = 0;
  let targetAngle = 0;
  let disposed = false;
  scene.add(group);

  function setShirt(variant) {
    if (!['cream', 'forest'].includes(variant)) return;
    selectedShirt = variant;
    fabric.forEach(material => {
      material.color.set(variant === 'cream' ? (/Collar/.test(material.name) ? '#daceb7' : '#f4ecd8') : (/Collar/.test(material.name) ? '#253b34' : '#344f43'));
      material.roughness = .94;
      material.metalness = 0;
    });
    if (printMaterial) { printMaterial.map = variant === 'cream' ? creamPrint : forestPrint; printMaterial.needsUpdate = true; }
  }
  setShirt('cream');

  return {
    setHero(id) { if (heroIds.includes(id)) selectedHero = id; },
    setShirt,
    rotate(delta, immediate = false) { targetAngle += delta; if (immediate) angle = targetAngle; },
    view(side, immediate = false) { targetAngle = side === 'back' ? Math.PI : 0; if (immediate) angle = targetAngle; },
    update(camera, progress, time, still, dt) {
      group.visible = progress > 0;
      if (!group.visible || disposed) return;
      let index = 0;
      while (index < route.length - 2 && progress > route[index + 1][0]) index++;
      const local = THREE.MathUtils.clamp((progress - route[index][0]) / (route[index + 1][0] - route[index][0]), 0, 1);
      const t = (index + local) / (route.length - 1);
      curve.getPoint(t, camera.position);
      gazeCurve.getPoint(t, gaze);
      const selected = heroIds.indexOf(selectedHero);
      focusX = still ? 75 + selected * 5 : THREE.MathUtils.damp(focusX, 75 + selected * 5, 8, dt);
      if (camera.aspect < .85) {
        // Portrait: sculptures in the clear upper part; live copy below.
        const adjustment = THREE.MathUtils.smoothstep(progress, .08, .19);
        gaze.x += 4.0 * adjustment;
        gaze.y -= (progress > .87 ? 3.1 : 4.0) * adjustment;
        camera.position.x -= 3.3 * adjustment;
        // On a narrow screen, give the chosen companion its own portrait.
        const heroFocus = THREE.MathUtils.smoothstep(progress, .34, .425) * (1 - THREE.MathUtils.smoothstep(progress, .56, .65));
        camera.position.lerp(heroCamera.set(focusX + 1.5, 6, -112), heroFocus);
        gaze.lerp(heroGaze.set(focusX, .1, -126), heroFocus);
      }
      camera.lookAt(gaze);
      halo.position.x = 75 + selected * 5;
      heroes.forEach((hero, i) => {
        if (!hero || !rest[i]) return;
        const factor = i === selected ? 1.06 : .96;
        hero.scale.copy(rest[i].scale).multiplyScalar(factor);
        hero.quaternion.copy(rest[i].rotation).premultiply(rotation.setFromAxisAngle(up, i === selected && !still ? Math.sin(time * .38) * .07 : 0));
      });
      angle = still ? targetAngle : THREE.MathUtils.damp(angle, targetAngle, 15, dt);
      shirt.rotation.y = angle;
      shirt.position.y = 3.4 + (still ? 0 : Math.sin(time * .7) * .06);
    },
    stats: () => ({ courtyardReady: true, selectedHero, selectedShirt, shirtAngle: angle, shirtTargetAngle: targetAngle, heroModels: heroes.filter(Boolean).length, shirtPrint: !!printMaterial,
      shirtFabricColors: fabric.map(material => ({ name: material.name, hex: material.color.getHexString() })),
      shirtPrintSource: printMaterial?.map?.image?.currentSrc || printMaterial?.map?.image?.src,
      shirtPrintFlipY: printMaterial?.map?.flipY, shirtPrintColorSpace: printMaterial?.map?.colorSpace }),
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(group);
      const geometries = new Set();
      const materials = new Set([...shirtMaterials]);
      const textures = new Set(resources);
      group.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        (object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []).forEach(material => materials.add(material));
      });
      materials.forEach(material => { if (material.map) textures.add(material.map); material.dispose(); });
      textures.forEach(texture => texture.dispose());
      geometries.forEach(geometry => geometry.dispose());
    }
  };
}
