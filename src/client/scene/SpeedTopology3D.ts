import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { PrismaRegion, RegionNode } from '../../shared/regions.ts';
import type { NodeStatus } from '../speedtest/engine.ts';

export interface NodeVisualState {
  selected: boolean;
  reachable: boolean | null;
  isLocalFallback: boolean;
  hasUrl: boolean;
  status: NodeStatus;
  latencyMs: number | null;
  downloadMbps: number;
  uploadMbps: number;
}

interface PacketVisual {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  t: number;
  direction: 1 | -1;
}

interface RegionSceneNode {
  region: RegionNode;
  position: THREE.Vector3;
  beacon: THREE.Mesh;
  beaconMat: THREE.MeshBasicMaterial;
  edgeMat: THREE.LineBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  hitMesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  wireMat: THREE.MeshBasicMaterial;
  packets: PacketVisual[];
  hudEl: HTMLButtonElement;
  hudPingEl: HTMLSpanElement;
  hudRateEl: HTMLSpanElement;
  state: NodeVisualState;
}

// Clean symmetric panoramic arc on the grid plane so all 6 nodes & labels fit comfortably in frame.
const REGION_COORDS_3D: Record<PrismaRegion, [number, number, number]> = {
  'us-west-1': [-8.2, 0, 2.8],
  'us-east-1': [-7.2, 0, -4.4],
  'eu-west-3': [-2.6, 0, -7.8],
  'eu-central-1': [2.6, 0, -7.8],
  'ap-northeast-1': [7.2, 0, -4.4],
  'ap-southeast-1': [8.2, 0, 2.8],
};

const PACKETS_PER_WIRE = 14;
const UP_VEC = new THREE.Vector3(0, 1, 0);
const SCALE_VEC = new THREE.Vector3(1, 1, 1);

export class SpeedTopology3D {
  private container: HTMLElement;
  private hudLayer: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private rafId: number | null = null;
  private lastFrameMs = performance.now();
  private userHasOrbited = false;

  private pcOrbitRing: THREE.Mesh;
  private pcOrbitMat: THREE.MeshBasicMaterial;
  private pcScreenMat: THREE.MeshBasicMaterial;
  private pcHudEl: HTMLDivElement;

  private starField: THREE.Points;
  private regionNodes = new Map<PrismaRegion, RegionSceneNode>();
  private hitMeshes: THREE.Object3D[] = [];
  private hoveredRegion: PrismaRegion | null = null;
  private onToggleRegion: (regionId: PrismaRegion) => void;
  private disposed = false;

  constructor(
    container: HTMLElement,
    nodes: RegionNode[],
    options: { onToggleRegion: (regionId: PrismaRegion) => void },
  ) {
    this.container = container;
    this.onToggleRegion = options.onToggleRegion;

    this.hudLayer = document.createElement('div');
    this.hudLayer.className = 'pointer-events-none absolute inset-0 overflow-hidden z-10';
    this.container.appendChild(this.hudLayer);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030508, 0.014);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 140);
    this.applyResponsiveCameraPose(width, height, true);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x030508, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.className = 'block w-full h-full outline-none';
    this.container.appendChild(this.renderer.domElement);

    // Subtle, crisp neon bloom without blown-out glare
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.28, 0.3, 0.55);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.minPolarAngle = 0.25;
    this.controls.minDistance = 9;
    this.controls.maxDistance = 44;
    this.controls.target.set(0, 0.6, -1.6);
    this.controls.addEventListener('start', () => {
      this.userHasOrbited = true;
    });

    this.setupLightingAndFloor();
    this.starField = this.buildSubtleDust();
    this.scene.add(this.starField);

    const pc = this.buildCenterPc();
    this.pcOrbitRing = pc.orbitRing;
    this.pcOrbitMat = pc.orbitMat;
    this.pcScreenMat = pc.screenMat;
    this.scene.add(pc.group);

    this.pcHudEl = this.createPcHud();
    this.hudLayer.appendChild(this.pcHudEl);

    for (const node of nodes) {
      this.createRegionNode(node);
    }

    this.bindPointerEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.animate();
  }

  private applyResponsiveCameraPose(width: number, height: number, immediate: boolean): void {
    const aspect = Math.max(0.55, width / Math.max(1, height));
    const tanHalfVFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // Account for front nodes (z = +2.8, ~3.9 units closer to camera) so all 6 nodes & labels fit at any aspect ratio
    const minDistanceForWidth = 10.6 / (tanHalfVFov * aspect) + 3.9;
    const totalDist = Math.max(19.0, minDistanceForWidth);
    const pitch = 0.5; // ~28.6 deg elevation
    const x = 0;
    const y = 0.6 + Math.sin(pitch) * totalDist;
    const z = -1.6 + Math.cos(pitch) * totalDist;

    if (immediate || !this.userHasOrbited) {
      this.camera.position.set(x, y, z);
    }
  }

  private setupLightingAndFloor(): void {
    this.scene.add(new THREE.AmbientLight(0x8aa8c4, 0.75));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(8, 16, 10);
    this.scene.add(keyLight);

    // Minimal clean cyber grid floor
    const grid = new THREE.GridHelper(44, 34, 0x16323e, 0x0b161c);
    grid.position.y = 0;
    this.scene.add(grid);
  }

  private buildSubtleDust(): THREE.Points {
    const count = 110;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 38;
      positions[i * 3 + 1] = Math.random() * 10 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 38;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.08,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  private buildCenterPc() {
    const group = new THREE.Group();

    // Minimal hexagonal base pad
    const padGeo = new THREE.CylinderGeometry(1.15, 1.32, 0.14, 6);
    const pad = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({ color: 0x0a1017, metalness: 0.75, roughness: 0.3 }),
    );
    pad.position.y = 0.07;
    group.add(pad);

    const padEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(padGeo),
      new THREE.LineBasicMaterial({ color: 0xf3eb2c, transparent: true, opacity: 0.6 }),
    );
    padEdges.position.copy(pad.position);
    group.add(padEdges);

    // Sleek minimal PC monitor + tower silhouette
    const monitorGeo = new THREE.BoxGeometry(1.18, 0.72, 0.08);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.35,
    });
    const monitor = new THREE.Mesh(monitorGeo, screenMat);
    monitor.position.set(0, 0.78, 0.08);
    group.add(monitor);

    const monitorEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(monitorGeo),
      new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 }),
    );
    monitorEdges.position.copy(monitor.position);
    group.add(monitorEdges);

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.3, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x111923, metalness: 0.7, roughness: 0.3 }),
    );
    stand.position.set(0, 0.28, 0.08);
    group.add(stand);

    // Single thin orbital ring around PC
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0xf3eb2c,
      transparent: true,
      opacity: 0.45,
    });
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.02, 8, 64), orbitMat);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.position.y = 0.16;
    group.add(orbitRing);

    return { group, orbitRing, orbitMat, screenMat };
  }

  private createPcHud() {
    const root = document.createElement('div');
    root.className =
      'topo-pc-pill rounded-md border border-[#f3eb2c]/50 bg-black/80 backdrop-blur-md px-2.5 py-1 text-center';

    const title = document.createElement('div');
    title.className = 'font-fira text-[10px] font-bold tracking-[0.16em] text-[#f3eb2c] uppercase';
    title.textContent = 'YOU';

    root.append(title);
    return root;
  }

  private createRegionNode(region: RegionNode): void {
    const coords = REGION_COORDS_3D[region.id];
    const position = new THREE.Vector3(coords[0], coords[1], coords[2]);
    const group = new THREE.Group();
    group.position.copy(position);

    const baseColor = 0x00ffff;

    // Sleek minimal hexagonal server node sitting cleanly on grid plane
    const rackGeo = new THREE.CylinderGeometry(0.46, 0.56, 1.1, 6);
    const rack = new THREE.Mesh(
      rackGeo,
      new THREE.MeshStandardMaterial({ color: 0x091017, metalness: 0.78, roughness: 0.28 }),
    );
    rack.position.y = 0.55;
    group.add(rack);

    const edgeMat = new THREE.LineBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.55,
    });
    const rackEdges = new THREE.LineSegments(new THREE.EdgesGeometry(rackGeo), edgeMat);
    rackEdges.position.copy(rack.position);
    group.add(rackEdges);

    // Small crisp diamond status beacon on top
    const beaconMat = new THREE.MeshBasicMaterial({ color: baseColor });
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.21, 0), beaconMat);
    beacon.position.y = 1.45;
    group.add(beacon);

    // Clean ground ring
    const haloGeo = new THREE.RingGeometry(0.78, 0.9, 32);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.position.y = 0.02;
    group.add(haloRing);

    // Raycast hit target
    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitMesh.position.y = 1.0;
    hitMesh.userData = { regionId: region.id };
    group.add(hitMesh);
    this.hitMeshes.push(hitMesh);

    this.scene.add(group);

    // Single clean curved fiber wire from PC -> Node
    const start = new THREE.Vector3(0, 0.6, 0);
    const end = new THREE.Vector3(position.x, 0.75, position.z);
    const mid = new THREE.Vector3(position.x * 0.5, 2.05, position.z * 0.5);
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1b3644,
      transparent: true,
      opacity: 0.5,
    });
    const wireMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.03, 8, false), wireMat);
    this.scene.add(wireMesh);

    // Directional 3D capsule packet bolts
    const packetGeo = new THREE.CapsuleGeometry(0.075, 0.28, 4, 8);
    const packets: PacketVisual[] = [];
    for (let i = 0; i < PACKETS_PER_WIRE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(packetGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      packets.push({
        mesh,
        material: mat,
        t: i / PACKETS_PER_WIRE,
        direction: -1,
      });
    }

    // Compact HTML HUD badge
    const hudEl = document.createElement('button');
    hudEl.type = 'button';
    hudEl.className =
      'topo-hud-pill cursor-pointer rounded-md border border-white/15 bg-black/80 backdrop-blur-md px-2 py-0.5 text-left hover:border-[#f3eb2c]/80';
    hudEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggleRegion(region.id);
    });

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center gap-1.5 whitespace-nowrap';

    const code = document.createElement('span');
    code.className = 'font-fira text-[10px] font-bold text-white';
    code.textContent = region.shortCode;

    const tag = document.createElement('span');
    tag.className = 'font-fira text-[9px] text-[#858585] hidden sm:inline';
    tag.textContent = region.id;

    topRow.append(code, tag);

    const hudPingEl = document.createElement('span');
    hudPingEl.className = 'block font-fira text-[9px] text-[#00ffff] whitespace-nowrap';
    hudPingEl.textContent = '-- ms';

    const hudRateEl = document.createElement('span');
    hudRateEl.className = 'hidden font-fira text-[9px] font-bold whitespace-nowrap';
    hudRateEl.textContent = '';

    hudEl.append(topRow, hudPingEl, hudRateEl);
    this.hudLayer.appendChild(hudEl);

    const defaultState: NodeVisualState = {
      selected: false,
      reachable: null,
      isLocalFallback: false,
      hasUrl: Boolean(region.url),
      status: 'idle',
      latencyMs: null,
      downloadMbps: 0,
      uploadMbps: 0,
    };

    this.regionNodes.set(region.id, {
      region,
      position,
      beacon,
      beaconMat,
      edgeMat,
      haloMat,
      hitMesh,
      curve,
      wireMat,
      packets,
      hudEl,
      hudPingEl,
      hudRateEl,
      state: defaultState,
    });
  }

  private bindPointerEvents(): void {
    let downX = 0;
    let downY = 0;

    const updatePointer = (event: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      updatePointer(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
      const hitId = (hits[0]?.object.userData?.regionId as PrismaRegion | undefined) ?? null;
      this.hoveredRegion = hitId;
      this.renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;
      updatePointer(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
      const hitId = hits[0]?.object.userData?.regionId as PrismaRegion | undefined;
      if (hitId) {
        this.onToggleRegion(hitId);
      }
    });
  }

  updateNodeState(regionId: PrismaRegion, patch: Partial<NodeVisualState>): void {
    const entry = this.regionNodes.get(regionId);
    if (!entry) return;
    entry.state = { ...entry.state, ...patch };
    this.syncNodeVisual(entry);
  }

  private syncNodeVisual(entry: RegionSceneNode): void {
    const s = entry.state;

    if (s.status === 'downloading') {
      entry.wireMat.color.setHex(0x00ffff);
      entry.wireMat.opacity = 0.95;
      entry.edgeMat.color.setHex(0x00ffff);
      entry.edgeMat.opacity = 0.95;
      entry.beaconMat.color.setHex(0x00ffff);
      entry.haloMat.color.setHex(0x00ffff);
      entry.haloMat.opacity = 0.85;
    } else if (s.status === 'uploading') {
      entry.wireMat.color.setHex(0xf3eb2c);
      entry.wireMat.opacity = 0.95;
      entry.edgeMat.color.setHex(0xf3eb2c);
      entry.edgeMat.opacity = 0.95;
      entry.beaconMat.color.setHex(0xf3eb2c);
      entry.haloMat.color.setHex(0xf3eb2c);
      entry.haloMat.opacity = 0.85;
    } else if (s.status === 'probing') {
      entry.wireMat.color.setHex(0x7ffeff);
      entry.wireMat.opacity = 0.75;
      entry.edgeMat.color.setHex(0x00ffff);
      entry.edgeMat.opacity = 0.8;
      entry.beaconMat.color.setHex(0xffffff);
      entry.haloMat.color.setHex(0x00ffff);
      entry.haloMat.opacity = 0.65;
    } else if (s.status === 'error') {
      entry.wireMat.color.setHex(0xff3b5c);
      entry.wireMat.opacity = 0.55;
      entry.edgeMat.color.setHex(0xff3b5c);
      entry.edgeMat.opacity = 0.7;
      entry.beaconMat.color.setHex(0xff3b5c);
      entry.haloMat.color.setHex(0xff3b5c);
      entry.haloMat.opacity = 0.45;
    } else if (s.selected) {
      entry.wireMat.color.setHex(0xf3eb2c);
      entry.wireMat.opacity = 0.72;
      entry.edgeMat.color.setHex(0xf3eb2c);
      entry.edgeMat.opacity = 0.88;
      entry.beaconMat.color.setHex(0xf3eb2c);
      entry.haloMat.color.setHex(0xf3eb2c);
      entry.haloMat.opacity = 0.65;
    } else {
      entry.wireMat.color.setHex(s.hasUrl || s.isLocalFallback ? 0x1b3644 : 0x171a20);
      entry.wireMat.opacity = s.hasUrl || s.isLocalFallback ? 0.45 : 0.22;
      entry.edgeMat.color.setHex(0x00ffff);
      entry.edgeMat.opacity = s.hasUrl || s.isLocalFallback ? 0.42 : 0.2;
      entry.beaconMat.color.setHex(0x00ffff);
      entry.haloMat.color.setHex(0x00ffff);
      entry.haloMat.opacity = 0.18;
    }

    if (s.status === 'downloading') {
      entry.hudEl.className =
        'topo-hud-pill cursor-pointer rounded-md border border-[#00ffff] bg-black/90 backdrop-blur-md px-2 py-0.5 text-left';
      entry.hudRateEl.className = 'block font-fira text-[9px] font-bold text-[#00ffff] whitespace-nowrap';
      entry.hudRateEl.textContent = `↓ ${s.downloadMbps.toFixed(2)} Mbps`;
    } else if (s.status === 'uploading') {
      entry.hudEl.className =
        'topo-hud-pill cursor-pointer rounded-md border border-[#f3eb2c] bg-black/90 backdrop-blur-md px-2 py-0.5 text-left';
      entry.hudRateEl.className = 'block font-fira text-[9px] font-bold text-[#f3eb2c] whitespace-nowrap';
      entry.hudRateEl.textContent = `↑ ${s.uploadMbps.toFixed(2)} Mbps`;
    } else if (s.status === 'probing') {
      entry.hudEl.className =
        'topo-hud-pill cursor-pointer rounded-md border border-[#00ffff]/75 bg-black/85 backdrop-blur-md px-2 py-0.5 text-left';
      entry.hudRateEl.className = 'block font-fira text-[9px] font-bold text-white whitespace-nowrap';
      entry.hudRateEl.textContent = 'PROBING...';
    } else if (s.selected) {
      entry.hudEl.className =
        'topo-hud-pill cursor-pointer rounded-md border border-[#f3eb2c]/80 bg-black/85 backdrop-blur-md px-2 py-0.5 text-left';
      entry.hudRateEl.className = 'hidden';
    } else {
      entry.hudEl.className =
        'topo-hud-pill cursor-pointer rounded-md border border-white/15 bg-black/75 backdrop-blur-md px-2 py-0.5 text-left hover:border-[#f3eb2c]/70';
      entry.hudRateEl.className = 'hidden';
    }

    if (s.latencyMs !== null) {
      entry.hudPingEl.textContent = `${s.latencyMs.toFixed(1)} ms`;
      entry.hudPingEl.className = 'block font-fira text-[9px] text-[#00ffff] whitespace-nowrap';
    } else if (!s.hasUrl && !s.isLocalFallback) {
      entry.hudPingEl.textContent = 'UNDEPLOYED';
      entry.hudPingEl.className = 'block font-fira text-[9px] text-[#777] whitespace-nowrap';
    } else if (s.reachable === false) {
      entry.hudPingEl.textContent = 'OFFLINE';
      entry.hudPingEl.className = 'block font-fira text-[9px] text-[#ff3b5c] whitespace-nowrap';
    } else {
      entry.hudPingEl.textContent = '';
      entry.hudPingEl.className = 'hidden';
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.applyResponsiveCameraPose(width, height, false);
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  private projectToScreen(pos: THREE.Vector3, width: number, height: number) {
    const projected = pos.clone().project(this.camera);
    const visible = projected.z >= -1 && projected.z <= 1;
    return {
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
      visible,
    };
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.lastFrameMs) / 1000);
    this.lastFrameMs = nowMs;
    const elapsed = nowMs * 0.001;

    let anyDownloading = false;
    let anyUploading = false;
    let anyProbing = false;

    for (const entry of this.regionNodes.values()) {
      const s = entry.state;
      if (s.status === 'downloading') anyDownloading = true;
      if (s.status === 'uploading') anyUploading = true;
      if (s.status === 'probing') anyProbing = true;

      const isHovered = this.hoveredRegion === entry.region.id;
      const isActive =
        s.status === 'downloading' || s.status === 'uploading' || s.status === 'probing';
      entry.beacon.rotation.y += dt * (isActive ? 2.8 : 0.8);
      entry.beacon.position.y = 1.45 + Math.sin(elapsed * 2.0 + entry.position.x) * 0.08;
      const targetScale = isHovered ? 1.25 : isActive ? 1.15 : 1.0;
      SCALE_VEC.setScalar(targetScale);
      entry.beacon.scale.lerp(SCALE_VEC, 0.14);

      let activeCount = 0;
      let packetDir: 1 | -1 = -1;
      let packetColor = 0x00ffff;
      let packetSpeed = 0.45;
      let packetScale = 1.0;

      if (s.status === 'downloading') {
        packetDir = -1; // Node -> PC
        packetColor = 0x00ffff;
        const factor = Math.min(1, Math.log10(Math.max(1, s.downloadMbps) + 1) / 2.8);
        activeCount = Math.max(5, Math.round(5 + factor * (PACKETS_PER_WIRE - 5)));
        packetSpeed = 0.7 + factor * 1.4;
        packetScale = 1.0 + factor * 0.35;
      } else if (s.status === 'uploading') {
        packetDir = 1; // PC -> Node
        packetColor = 0xf3eb2c;
        const factor = Math.min(1, Math.log10(Math.max(1, s.uploadMbps) + 1) / 2.8);
        activeCount = Math.max(5, Math.round(5 + factor * (PACKETS_PER_WIRE - 5)));
        packetSpeed = 0.7 + factor * 1.4;
        packetScale = 1.0 + factor * 0.35;
      } else if (s.status === 'probing') {
        packetDir = 1;
        packetColor = 0xffffff;
        activeCount = 3;
        packetSpeed = 1.4;
        packetScale = 0.9;
      }

      for (let i = 0; i < entry.packets.length; i++) {
        const p = entry.packets[i];
        if (i >= activeCount) {
          p.mesh.visible = false;
          continue;
        }

        p.mesh.visible = true;
        p.material.color.setHex(packetColor);
        p.mesh.scale.setScalar(packetScale);

        if (s.status === 'probing') {
          p.t += dt * packetSpeed * p.direction;
          if (p.t >= 1) {
            p.t = 1;
            p.direction = -1;
          } else if (p.t <= 0) {
            p.t = 0;
            p.direction = 1;
          }
        } else {
          p.t += dt * packetSpeed * packetDir;
          if (p.t > 1) p.t -= 1;
          if (p.t < 0) p.t += 1;
        }

        const clampedT = Math.max(0.001, Math.min(0.999, p.t));
        const pos = entry.curve.getPointAt(clampedT);
        const tangent = entry.curve.getTangentAt(clampedT);
        if (packetDir === -1 && s.status !== 'probing') {
          tangent.negate();
        } else if (s.status === 'probing' && p.direction === -1) {
          tangent.negate();
        }
        p.mesh.position.copy(pos);
        p.mesh.quaternion.setFromUnitVectors(UP_VEC, tangent.normalize());
      }
    }

    const pcActive = anyDownloading || anyUploading || anyProbing;
    this.pcOrbitRing.rotation.z += dt * (pcActive ? 1.8 : 0.45);
    const activeHex = anyUploading && !anyDownloading ? 0xf3eb2c : 0x00ffff;
    this.pcOrbitMat.color.setHex(activeHex);
    this.pcScreenMat.color.setHex(activeHex);
    this.pcScreenMat.opacity = pcActive ? 0.55 : 0.3;

    this.starField.rotation.y += dt * 0.015;

    this.controls.update();
    this.composer.render();

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const pcScreen = this.projectToScreen(new THREE.Vector3(0, 0.05, 0), width, height);
    this.pcHudEl.style.display = pcScreen.visible ? 'block' : 'none';
    this.pcHudEl.style.left = `${pcScreen.x}px`;
    this.pcHudEl.style.top = `${pcScreen.y}px`;

    for (const entry of this.regionNodes.values()) {
      const anchor = new THREE.Vector3(entry.position.x, 1.9, entry.position.z);
      const pt = this.projectToScreen(anchor, width, height);
      entry.hudEl.style.display = pt.visible ? 'block' : 'none';
      entry.hudEl.style.left = `${pt.x}px`;
      entry.hudEl.style.top = `${pt.y}px`;
    }
  };

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
