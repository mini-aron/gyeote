import * as THREE from "three";
import { COLOR_KEYS, MOODS, NUM_KEYS, type MoodKey } from "./moods";
import { STATIONS, type StationKey } from "./stations";

// Fixed at desktop-grade fidelity for now — no low-power branch yet.
const BLADE_COUNT = 34000;
const DUST_COUNT = 700;
const STAR_COUNT = 900;
const MAX_PIXEL_RATIO = 2;
const CHURCH_Z = -17;
const BACKYARD_Z = -29;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type ColorKey = (typeof COLOR_KEYS)[number];
type NumKey = (typeof NUM_KEYS)[number];

interface MoodState extends Record<ColorKey, THREE.Color>, Record<NumKey, number> {
  sunDir: THREE.Vector3;
}

export class WorldScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly timer = new THREE.Timer();

  // Camera "flight" between named stations — see ./stations.ts. basePos/baseLook
  // are the current (possibly mid-flight) station values; the idle drift/drag
  // look offsets in step() are applied on top of these, not instead of them.
  private station: StationKey = "church";
  private readonly basePos = new THREE.Vector3(...STATIONS.church.position);
  private readonly baseLook = new THREE.Vector3(...STATIONS.church.lookAt);
  private readonly flightFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private readonly flightTo = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private flightT = 1;
  private flightDuration = 2200;

  private readonly hemi: THREE.HemisphereLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly ambient: THREE.AmbientLight;

  private readonly sky: THREE.Mesh;
  private readonly skyUniforms: {
    uTop: { value: THREE.Color };
    uMid: { value: THREE.Color };
    uBottom: { value: THREE.Color };
    uSun: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
  };

  private readonly stars: THREE.Points;
  private readonly starMat: THREE.PointsMaterial;

  private readonly groundMat: THREE.MeshLambertMaterial;
  private readonly grass: THREE.Mesh;
  private readonly grassUniforms: {
    uTime: { value: number };
    uWindDir: { value: THREE.Vector2 };
    uWind: { value: number };
    uBase: { value: THREE.Color };
    uTip: { value: THREE.Color };
    uFogColor: { value: THREE.Color };
    uFogNear: { value: number };
    uFogFar: { value: number };
    uSunColor: { value: THREE.Color };
    uSunAmt: { value: number };
  };

  private readonly stoneMat: THREE.MeshLambertMaterial;
  private readonly roofMat: THREE.MeshLambertMaterial;
  private readonly trimMat: THREE.MeshLambertMaterial;
  private readonly glassMat: THREE.MeshBasicMaterial;
  private readonly windowGlows: THREE.Sprite[] = [];

  private readonly shafts: THREE.Group;
  private readonly shaftMats: THREE.MeshBasicMaterial[] = [];
  private readonly mistMats: THREE.MeshBasicMaterial[] = [];

  private readonly dust: THREE.Points;
  private readonly dustGeo: THREE.BufferGeometry;
  private readonly dustMat: THREE.PointsMaterial;

  private readonly reduceMotion: boolean;
  private readonly cur: MoodState;
  private readonly tgt: MoodState;
  private time = 0;

  private readonly pointer = { x: 0, y: 0 };
  private readonly look = { x: 0, y: 0 };
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  private rafId: number | null = null;
  private resizeRafId: number | null = null;
  private disposed = false;

  // Bound listener references, kept so dispose() can remove exactly what we added.
  private readonly handlePointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };
  private readonly handlePointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.pointer.x += (e.clientX - this.lastX) * 0.0016;
    this.pointer.y += (e.clientY - this.lastY) * 0.0012;
    this.pointer.x = Math.max(-0.55, Math.min(0.55, this.pointer.x));
    this.pointer.y = Math.max(-0.28, Math.min(0.32, this.pointer.y));
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };
  private readonly handlePointerUp = () => {
    this.dragging = false;
  };
  private readonly handleResize = () => {
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.resize();
    });
  };
  private readonly handleVisibilityChange = () => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 20, 120);

    this.camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.1,
      900,
    );
    this.camera.position.set(...STATIONS.church.position);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404020, 0.6);
    this.scene.add(this.hemi);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(12, 16, -26);
    this.scene.add(this.sunLight);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambient);

    const dotTex = this.createSoftDotTexture();

    // ---------- Sky ----------
    this.skyUniforms = {
      uTop: { value: new THREE.Color(0x1d2350) },
      uMid: { value: new THREE.Color(0x7b6ea8) },
      uBottom: { value: new THREE.Color(0xf0b9a6) },
      uSun: { value: new THREE.Color(0xffd0a4) },
      uSunDir: { value: new THREE.Vector3(0.18, 0.1, -1).normalize() },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(420, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyUniforms,
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
      }),
    );
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // ---------- Stars ----------
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.1);
      const r = 340;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      size: 2.6,
      map: dotTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      sizeAttenuation: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.renderOrder = -9;
    this.scene.add(this.stars);

    // ---------- Ground + grass ----------
    this.groundMat = new THREE.MeshLambertMaterial({ color: 0x2a4335 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.scene.add(ground);

    const { grass, grassUniforms } = this.createGrass();
    this.grass = grass;
    this.grassUniforms = grassUniforms;
    this.scene.add(this.grass);

    // ---------- Church ----------
    const church = new THREE.Group();
    church.position.z = CHURCH_Z;
    this.scene.add(church);

    this.stoneMat = new THREE.MeshLambertMaterial({ color: 0xcfc3cc });
    this.roofMat = new THREE.MeshLambertMaterial({ color: 0x5d5570 });
    this.trimMat = new THREE.MeshLambertMaterial({ color: 0xb0a4b2 });
    this.glassMat = new THREE.MeshBasicMaterial({ color: 0xffca85, fog: true });
    this.buildChurch(church, dotTex);

    this.buildDistantTrees();
    this.buildWell();
    this.buildBackyardTrees();

    // ---------- Light shafts / mist / dust ----------
    this.shafts = new THREE.Group();
    this.scene.add(this.shafts);
    this.buildShafts();
    this.buildMist();

    const { dust, dustGeo, dustMat } = this.buildDust(dotTex);
    this.dust = dust;
    this.dustGeo = dustGeo;
    this.dustMat = dustMat;
    this.scene.add(this.dust);

    // ---------- Mood state ----------
    this.cur = this.buildMoodState("night");
    this.tgt = this.buildMoodState("night");
    this.applyMood();

    this.attachListeners();
    this.startLoop();
  }

  setMood(key: MoodKey): void {
    const preset = MOODS[key];
    for (const k of COLOR_KEYS) this.tgt[k].set(preset[k]);
    for (const k of NUM_KEYS) this.tgt[k] = preset[k];
    this.tgt.sunDir.fromArray(preset.sunDir).normalize();
  }

  /** Smoothly moves the camera to a named station. durationMs=0 snaps instantly. */
  flyTo(station: StationKey, durationMs = 2200): void {
    if (station === this.station && this.flightT >= 1) return;
    const target = STATIONS[station];
    this.flightFrom.pos.copy(this.basePos);
    this.flightFrom.look.copy(this.baseLook);
    this.flightTo.pos.set(...target.position);
    this.flightTo.look.set(...target.lookAt);
    this.station = station;

    if (durationMs <= 0) {
      this.basePos.copy(this.flightTo.pos);
      this.baseLook.copy(this.flightTo.look);
      this.flightT = 1;
    } else {
      this.flightDuration = durationMs;
      this.flightT = 0;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoop();

    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    if (this.resizeRafId !== null) cancelAnimationFrame(this.resizeRafId);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose?.();
        const material = obj.material;
        if (Array.isArray(material)) material.forEach((m) => this.disposeMaterial(m));
        else if (material) this.disposeMaterial(material);
      }
    });

    this.renderer.dispose();
    this.timer.dispose();
  }

  // ---------------------------------------------------------------------
  // Setup helpers
  // ---------------------------------------------------------------------

  private disposeMaterial(material: THREE.Material): void {
    const withMap = material as THREE.Material & { map?: THREE.Texture | null };
    withMap.map?.dispose?.();
    material.dispose();
  }

  private createSoftDotTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  private createShaftTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 512;
    const g = c.getContext("2d")!;
    const v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, "rgba(255,255,255,.85)");
    v.addColorStop(0.55, "rgba(255,255,255,.3)");
    v.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = v;
    g.fillRect(0, 0, 128, 512);
    g.globalCompositeOperation = "destination-in";
    const h = g.createLinearGradient(0, 0, 128, 0);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(0.5, "rgba(0,0,0,1)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = h;
    g.fillRect(0, 0, 128, 512);
    return new THREE.CanvasTexture(c);
  }

  private createMistTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 24 + Math.random() * 62;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private inChurchFootprint(x: number, z: number): boolean {
    return Math.abs(x) < 4.2 && z > CHURCH_Z - 7 && z < CHURCH_Z + 8.5;
  }

  private createGrass() {
    const offsets = new Float32Array(BLADE_COUNT * 3);
    const params = new Float32Array(BLADE_COUNT * 4);
    let placed = 0;
    let guard = 0;
    while (placed < BLADE_COUNT && guard < BLADE_COUNT * 6) {
      guard++;
      const near = placed < BLADE_COUNT * 0.62;
      const ang = Math.random() * Math.PI * 2;
      let rad: number;
      let cx: number;
      let cz: number;
      let scl: number;
      if (near) {
        rad = 15 * Math.sqrt(Math.random());
        cx = 0;
        cz = 2;
        scl = 0.34 + Math.random() * 0.46;
      } else {
        rad = 15 + 52 * Math.pow(Math.random(), 0.8);
        cx = 0;
        cz = -8;
        scl = 0.42 + Math.random() * 0.62;
      }
      const px = cx + Math.cos(ang) * rad;
      const pz = cz + Math.sin(ang) * rad;
      if (this.inChurchFootprint(px, pz)) continue;

      offsets[placed * 3] = px;
      offsets[placed * 3 + 1] = 0;
      offsets[placed * 3 + 2] = pz;
      params[placed * 4] = scl;
      params[placed * 4 + 1] = Math.random() * Math.PI;
      params[placed * 4 + 2] = Math.random() * Math.PI * 2;
      params[placed * 4 + 3] = Math.random();
      placed++;
    }

    const blade = new THREE.PlaneGeometry(0.1, 1, 1, 4);
    blade.translate(0, 0.5, 0);

    const grassGeo = new THREE.InstancedBufferGeometry();
    grassGeo.index = blade.index;
    grassGeo.attributes.position = blade.attributes.position;
    grassGeo.attributes.uv = blade.attributes.uv;
    grassGeo.instanceCount = placed;
    grassGeo.setAttribute("iOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    grassGeo.setAttribute("iParams", new THREE.InstancedBufferAttribute(params, 4));

    const grassUniforms = {
      uTime: { value: 0 },
      uWindDir: { value: new THREE.Vector2(0.85, 0.53) },
      uWind: { value: 0.5 },
      uBase: { value: new THREE.Color(0x2a4335) },
      uTip: { value: new THREE.Color(0x7c9c6d) },
      uFogColor: { value: new THREE.Color(0xb8a6bd) },
      uFogNear: { value: 22 },
      uFogFar: { value: 128 },
      uSunColor: { value: new THREE.Color(0xffc79a) },
      uSunAmt: { value: 0.42 },
    };

    const grassMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: false,
      uniforms: grassUniforms,
      vertexShader: GRASS_VERTEX_SHADER,
      fragmentShader: GRASS_FRAGMENT_SHADER,
    });

    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.frustumCulled = false;
    return { grass, grassUniforms };
  }

  private box(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  private archShape(w: number, h: number): THREE.ShapeGeometry {
    const s = new THREE.Shape();
    const r = w / 2;
    s.moveTo(-r, 0);
    s.lineTo(-r, h - r);
    s.absarc(0, h - r, r, Math.PI, 0, true);
    s.lineTo(r, 0);
    s.lineTo(-r, 0);
    return new THREE.ShapeGeometry(s, 12);
  }

  private buildChurch(church: THREE.Group, dotTex: THREE.CanvasTexture): void {
    this.box(church, 6.4, 5.2, 11, 0, 2.6, 0, this.stoneMat);

    const pitch = 0.66;
    const half = 3.5;
    const slope = half / Math.cos(pitch);
    for (const sgn of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.36, 11.4), this.roofMat);
      panel.position.set((sgn * half) / 2, 5.2 + (half * Math.tan(pitch)) / 2, 0);
      panel.rotation.z = -sgn * pitch;
      church.add(panel);
    }
    this.box(church, 0.44, 0.4, 11.6, 0, 5.2 + half * Math.tan(pitch), 0, this.roofMat);

    const towerZ = 6.4;
    this.box(church, 3, 10.5, 3, 0, 5.25, towerZ, this.stoneMat);
    this.box(church, 3.4, 0.35, 3.4, 0, 10.4, towerZ, this.trimMat);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0, 2.25, 5.4, 4), this.roofMat);
    spire.position.set(0, 13.3, towerZ);
    spire.rotation.y = Math.PI / 4;
    church.add(spire);

    this.box(church, 0.17, 1.9, 0.17, 0, 17, towerZ, this.trimMat);
    this.box(church, 0.95, 0.17, 0.17, 0, 17.35, towerZ, this.trimMat);

    const addWindow = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(this.archShape(w, h), this.glassMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      church.add(m);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: dotTex,
          color: 0xffc27a,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      glow.position.set(x + Math.sin(ry) * 0.25, y + h * 0.45, z + Math.cos(ry) * 0.25);
      glow.scale.set(w * 4.4, h * 3.4, 1);
      church.add(glow);
      this.windowGlows.push(glow);
    };

    for (let wi = 0; wi < 3; wi++) {
      const wz = -3.2 + wi * 3.2;
      addWindow(1.05, 2.5, 3.22, 1.5, wz, Math.PI / 2);
      addWindow(1.05, 2.5, -3.22, 1.5, wz, -Math.PI / 2);
    }
    addWindow(1.15, 2.6, 0, 5.4, towerZ + 1.52, 0);
    addWindow(1.5, 3.1, 0, 0.05, towerZ + 1.52, 0);
    this.box(church, 1.2, 1.7, 0.22, 0, 9.1, towerZ + 1.5, this.roofMat);
  }

  private buildDistantTrees(): void {
    const treeTrunk = new THREE.MeshLambertMaterial({ color: 0x2f2a33 });
    const treeLeaf = new THREE.MeshLambertMaterial({ color: 0x24402f });
    for (let t = 0; t < 22; t++) {
      const ta = Math.random() * Math.PI * 2;
      const tr = 34 + Math.random() * 46;
      const tx = Math.cos(ta) * tr;
      const tz = -12 + Math.sin(ta) * tr;
      if (tz > 14) continue;
      const th = 5 + Math.random() * 7;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, th * 0.42, 5), treeTrunk);
      trunk.position.set(tx, th * 0.21, tz);
      this.scene.add(trunk);
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 1.5 + Math.random(), th, 6),
        treeLeaf,
      );
      crown.position.set(tx, th * 0.42 + th * 0.42, tz);
      this.scene.add(crown);
    }
  }

  private buildWell(): void {
    const well = new THREE.Group();
    well.position.set(0, 0, BACKYARD_Z);
    this.scene.add(well);

    // Stone parts reuse the church's own materials so they track mood too.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.85, 16), this.stoneMat);
    base.position.y = 0.425;
    well.add(base);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 20), this.trimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.85;
    well.add(rim);

    // Wood parts are a fixed color — not worth mood-tracking for one small prop.
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5b4636 });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), woodMat);
      post.position.set(side * 0.95, 0.85 + 0.75, 0);
      well.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.12), woodMat);
    beam.position.set(0, 0.85 + 1.5, 0);
    well.add(beam);

    const roofPitch = 0.5;
    const roofHalf = 1.3;
    const roofSlope = roofHalf / Math.cos(roofPitch);
    for (const sgn of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(roofSlope, 0.08, 1.6), this.roofMat);
      panel.position.set(
        (sgn * roofHalf) / 2,
        0.85 + 1.5 + (roofHalf * Math.tan(roofPitch)) / 2 + 0.1,
        0,
      );
      panel.rotation.z = -sgn * roofPitch;
      well.add(panel);
    }

    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4), this.trimMat);
    rope.position.set(0, 0.85 + 1.0, 0);
    well.add(rope);

    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.22, 8), woodMat);
    bucket.position.set(0, 0.85 + 0.5, 0);
    well.add(bucket);
  }

  private buildBackyardTrees(): void {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2f2a33 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x24402f });
    const positions: Array<[number, number]> = [
      [-4.5, BACKYARD_Z + 2.5],
      [4.5, BACKYARD_Z + 2.5],
      [-3, BACKYARD_Z - 3.5],
      [3.2, BACKYARD_Z - 3.5],
      [-6.2, BACKYARD_Z - 0.5],
      [6, BACKYARD_Z - 1.2],
    ];
    for (const [tx, tz] of positions) {
      const th = 6 + Math.random() * 2.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.38, th * 0.42, 6), trunkMat);
      trunk.position.set(tx, th * 0.21, tz);
      this.scene.add(trunk);
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 1.8 + Math.random() * 0.6, th, 7),
        leafMat,
      );
      crown.position.set(tx, th * 0.42 + th * 0.42, tz);
      this.scene.add(crown);
    }
  }

  private buildShafts(): void {
    const shaftTex = this.createShaftTexture();
    for (let sh = 0; sh < 6; sh++) {
      const mat = new THREE.MeshBasicMaterial({
        map: shaftTex,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        color: 0xffd9b0,
      });
      this.shaftMats.push(mat);
      const q = new THREE.Mesh(new THREE.PlaneGeometry(5 + Math.random() * 7, 46), mat);
      q.position.set(-16 + sh * 6.4 + Math.random() * 3, 17, CHURCH_Z - 12 - Math.random() * 10);
      q.rotation.z = (Math.random() - 0.5) * 0.4;
      q.rotation.y = (Math.random() - 0.5) * 0.3;
      q.userData.phase = Math.random() * Math.PI * 2;
      this.shafts.add(q);
    }
  }

  private buildMist(): void {
    const mistTex = this.createMistTexture();
    for (let mi = 0; mi < 3; mi++) {
      const mm = new THREE.MeshBasicMaterial({
        map: mistTex,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        color: 0xd9cfe6,
      });
      this.mistMats.push(mm);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), mm);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, 0.5 + mi * 0.85, -14 + mi * 6);
      this.scene.add(plane);
    }
  }

  private buildDust(dotTex: THREE.CanvasTexture) {
    const dustPos = new Float32Array(DUST_COUNT * 3);
    for (let d = 0; d < DUST_COUNT; d++) {
      dustPos[d * 3] = (Math.random() - 0.5) * 70;
      dustPos[d * 3 + 1] = Math.random() * 14;
      dustPos[d * 3 + 2] = -34 + Math.random() * 46;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.16,
      map: dotTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffe3c4,
      fog: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    return { dust, dustGeo, dustMat };
  }

  private buildMoodState(initial: MoodKey): MoodState {
    const preset = MOODS[initial];
    const state = {} as MoodState;
    for (const k of COLOR_KEYS) state[k] = new THREE.Color(preset[k]);
    for (const k of NUM_KEYS) state[k] = preset[k];
    state.sunDir = new THREE.Vector3().fromArray(preset.sunDir).normalize();
    return state;
  }

  private attachListeners(): void {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private startLoop(): void {
    if (this.rafId !== null || this.disposed) return;
    const frame = (timestamp: number) => {
      this.rafId = requestAnimationFrame(frame);
      this.step(timestamp);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private lerpMood(dt: number): void {
    const k = 1 - Math.pow(0.0015, dt);
    for (const key of COLOR_KEYS) this.cur[key].lerp(this.tgt[key], k);
    for (const key of NUM_KEYS) {
      this.cur[key] += (this.tgt[key] - this.cur[key]) * k;
    }
    this.cur.sunDir.lerp(this.tgt.sunDir, k).normalize();
  }

  private applyMood(): void {
    const cur = this.cur;
    this.skyUniforms.uTop.value.copy(cur.skyTop);
    this.skyUniforms.uMid.value.copy(cur.skyMid);
    this.skyUniforms.uBottom.value.copy(cur.skyBottom);
    this.skyUniforms.uSun.value.copy(cur.sunColor);
    this.skyUniforms.uSunDir.value.copy(cur.sunDir);

    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(cur.fog);
    fog.near = cur.fogNear;
    fog.far = cur.fogFar;
    this.renderer.setClearColor(cur.fog, 1);

    this.hemi.color.copy(cur.hemiSky);
    this.hemi.groundColor.copy(cur.hemiGround);
    this.hemi.intensity = cur.hemiInt;
    this.sunLight.color.copy(cur.dirColor);
    this.sunLight.intensity = cur.dirInt;
    this.sunLight.position.set(
      cur.sunDir.x * 60,
      Math.max(cur.sunDir.y, 0.12) * 70 + 12,
      cur.sunDir.z * 60,
    );
    this.ambient.intensity = cur.ambInt;

    this.groundMat.color.copy(cur.grassBase).multiplyScalar(0.78);
    this.grassUniforms.uBase.value.copy(cur.grassBase);
    this.grassUniforms.uTip.value.copy(cur.grassTip);
    this.grassUniforms.uFogColor.value.copy(cur.fog);
    this.grassUniforms.uFogNear.value = cur.fogNear;
    this.grassUniforms.uFogFar.value = cur.fogFar;
    this.grassUniforms.uSunColor.value.copy(cur.dirColor);
    this.grassUniforms.uSunAmt.value = cur.grassSun;

    this.stoneMat.color.copy(cur.stone);
    this.roofMat.color.copy(cur.roof);
    this.trimMat.color.copy(cur.stone).multiplyScalar(0.88);
    const windowAmt = cur.window;
    this.glassMat.color.setRGB(
      Math.min(1, 1 * windowAmt),
      Math.min(1, 0.78 * windowAmt),
      Math.min(1, 0.52 * windowAmt),
    );

    this.starMat.opacity = cur.star;
    this.dustMat.opacity = cur.dust * 0.7;
    this.dustMat.color.copy(cur.dustColor);

    for (const glow of this.windowGlows) {
      (glow.material as THREE.SpriteMaterial).opacity = 0.16 + windowAmt * 0.42;
    }
    for (const mat of this.shaftMats) mat.color.copy(cur.sunColor);
    for (const mat of this.mistMats) mat.opacity = cur.mist * 0.16;
  }

  private step(timestamp: number): void {
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    if (!this.reduceMotion) this.time += dt;

    this.lerpMood(dt);
    this.applyMood();

    this.grassUniforms.uTime.value = this.time;
    this.grassUniforms.uWind.value = 0.42 + Math.sin(this.time * 0.17) * 0.16;

    if (this.flightT < 1) {
      this.flightT = Math.min(1, this.flightT + dt * 1000 / this.flightDuration);
      const e = easeInOutCubic(this.flightT);
      this.basePos.lerpVectors(this.flightFrom.pos, this.flightTo.pos, e);
      this.baseLook.lerpVectors(this.flightFrom.look, this.flightTo.look, e);
    }

    this.look.x += (this.pointer.x - this.look.x) * Math.min(1, dt * 3.2);
    this.look.y += (this.pointer.y - this.look.y) * Math.min(1, dt * 3.2);
    const driftX = Math.sin(this.time * 0.08) * 0.35;
    const driftY = Math.sin(this.time * 0.12) * 0.12;
    this.camera.position.set(
      this.basePos.x + driftX + this.look.x * 5.5,
      this.basePos.y + driftY - this.look.y * 1.6,
      this.basePos.z,
    );
    this.camera.lookAt(
      this.baseLook.x + this.look.x * 2.2,
      this.baseLook.y - this.look.y * 3.4,
      this.baseLook.z,
    );
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);

    for (const child of this.shafts.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const phase = mesh.userData.phase as number;
      mat.opacity = this.cur.shaft * (0.09 + 0.07 * (Math.sin(this.time * 0.32 + phase) * 0.5 + 0.5));
    }

    for (let i = 0; i < this.mistMats.length; i++) {
      const tex = this.mistMats[i].map;
      if (tex) tex.offset.x = (this.time * (0.004 + i * 0.0025)) % 1;
    }

    const positions = this.dustGeo.attributes.position.array as Float32Array;
    for (let p = 0; p < DUST_COUNT; p++) {
      const iy = p * 3 + 1;
      positions[iy] += dt * (0.12 + (p % 7) * 0.02);
      positions[p * 3] += Math.sin(this.time * 0.5 + p) * dt * 0.09;
      if (positions[iy] > 15) positions[iy] = 0.2;
    }
    this.dustGeo.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}

const SKY_VERTEX_SHADER = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

const SKY_FRAGMENT_SHADER = `
precision highp float;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
uniform vec3 uSun; uniform vec3 uSunDir;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y * 0.5 + 0.5;
  vec3 c = mix(uBottom, uMid, smoothstep(0.44, 0.545, h));
  c = mix(c, uTop, smoothstep(0.545, 0.94, h));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSun * pow(s, 22.0) * 1.05;
  c += uSun * pow(s, 3.5) * 0.14;
  gl_FragColor = vec4(c, 1.0);
}
`;

const GRASS_VERTEX_SHADER = `
precision highp float;
attribute vec3 iOffset;
attribute vec4 iParams;
uniform float uTime; uniform vec2 uWindDir; uniform float uWind;
varying float vH; varying float vRand; varying float vFog; varying float vFace;
void main(){
  float s = iParams.x;
  float a = iParams.y;
  float ph = iParams.z;
  vRand = iParams.w;
  vec3 p = position;
  float hN = clamp(p.y, 0.0, 1.0);
  vH = hN;
  p.x *= (1.0 - hN * 0.86);
  p.y *= s;
  float sway = sin(uTime * 1.5 + ph + iOffset.x * 0.42 + iOffset.z * 0.3) * 0.5 + 0.5;
  float gust = sin(uTime * 0.38 + (iOffset.x + iOffset.z) * 0.045) * 0.5 + 0.5;
  float bend = uWind * (0.22 + 0.78 * gust) * sway * hN * hN * s;
  p.y -= bend * bend * 0.4;
  float ca = cos(a), sa = sin(a);
  vec3 r = vec3(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);
  r.x += bend * uWindDir.x;
  r.z += bend * uWindDir.y;
  vFace = abs(ca);
  vec4 mv = modelViewMatrix * vec4(r + iOffset, 1.0);
  vFog = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const GRASS_FRAGMENT_SHADER = `
precision highp float;
uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uFogColor; uniform vec3 uSunColor;
uniform float uFogNear; uniform float uFogFar; uniform float uSunAmt;
varying float vH; varying float vRand; varying float vFog; varying float vFace;
void main(){
  vec3 c = mix(uBase, uTip, pow(vH, 0.85));
  c *= 0.74 + 0.5 * vRand;
  c *= 0.5 + 0.5 * vH;
  c += uSunColor * uSunAmt * pow(vH, 3.0) * (0.3 + 0.7 * vFace);
  float f = smoothstep(uFogNear, uFogFar, vFog);
  c = mix(c, uFogColor, f);
  gl_FragColor = vec4(c, 1.0);
}
`;
