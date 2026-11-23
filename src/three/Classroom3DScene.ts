import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ClassroomData, StudentSeat, TeacherProfile } from '@/src/types/classroom';
import {
  buildChalkboardAssembly,
  buildClassroomArchitecture,
  buildStudentBenchGrid,
  buildTeacherPodiumStage,
  CLICKABLE_LAYER,
  SeatInteractiveHandle,
  SharedClassroomMaterials,
  TeacherInteractiveHandle,
} from './builders';
import {
  createChalkboardCanvasTexture,
  createContactShadowTexture,
  createFloorTileTexture,
  createOakWoodTexture,
  createWallPlasterTexture,
  updateChalkboardCanvasTexture,
} from './textures';

export type CameraPresetId =
  | 'overview'
  | 'frontBench'
  | 'backbenchers'
  | 'teacherView'
  | 'topDown';

export type LightingMoodId = 'morning' | 'afternoon' | 'evening';

export type HoverTargetInfo =
  | { kind: 'seat'; seat: StudentSeat }
  | { kind: 'teacher'; teacher: TeacherProfile }
  | { kind: 'chalkboard' }
  | null;

export interface Classroom3DCallbacks {
  onSelectSeat: (seatId: string) => void;
  onSelectTeacher: (teacherId: string) => void;
  onClickChalkboard: () => void;
  onHoverChange: (info: HoverTargetInfo) => void;
}

export interface ClassroomSyncPayload {
  classroom: ClassroomData;
  searchQuery: string;
  movingSeatId: string | null;
  canModifySeat: (seatId: string) => boolean;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [5.4, 4.85, 7.6], target: [-0.1, 1.05, -0.75] },
  frontBench: { pos: [2.2, 2.55, 1.6], target: [0, 1.35, -3.5] },
  backbenchers: { pos: [0.0, 2.4, 8.1], target: [0, 1.45, -3.6] },
  teacherView: { pos: [0.2, 2.55, -4.2], target: [0, 0.9, 2.6] },
  topDown: { pos: [0.0, 12.8, 3.3], target: [0, 0.45, 0.2] },
};

const LIGHTING_MOODS: Record<
  LightingMoodId,
  {
    bg: string;
    sunColor: string;
    sunIntensity: number;
    sunPos: [number, number, number];
    hemiSky: string;
    hemiGround: string;
    hemiIntensity: number;
    fillColor: string;
    fillIntensity: number;
    windowColor: string;
    windowEmissive: string;
    windowEmissiveIntensity: number;
    bulbEmissiveIntensity: number;
    envIntensity: number;
    exposure: number;
    cardTint: string;
    boardTint: string;
  }
> = {
  morning: {
    bg: '#CFE2F3',
    sunColor: '#FFF3D6',
    sunIntensity: 2.15,
    sunPos: [-9.5, 9.2, 3.0],
    hemiSky: '#B9DCFF',
    hemiGround: '#8B6B47',
    hemiIntensity: 0.62,
    fillColor: '#FFF0D4',
    fillIntensity: 0.55,
    windowColor: '#93D5FF',
    windowEmissive: '#7CC8FF',
    windowEmissiveIntensity: 0.72,
    bulbEmissiveIntensity: 0.3,
    envIntensity: 0.48,
    exposure: 1.0,
    cardTint: '#FFFFFF',
    boardTint: '#FFFFFF',
  },
  afternoon: {
    bg: '#E8CBA5',
    sunColor: '#FFC069',
    sunIntensity: 2.35,
    sunPos: [-10.5, 5.8, 4.4],
    hemiSky: '#FFD59E',
    hemiGround: '#7C5332',
    hemiIntensity: 0.58,
    fillColor: '#FFD699',
    fillIntensity: 0.5,
    windowColor: '#FFCA7A',
    windowEmissive: '#FFB85C',
    windowEmissiveIntensity: 0.85,
    bulbEmissiveIntensity: 0.75,
    envIntensity: 0.46,
    exposure: 1.0,
    cardTint: '#FFF6EA',
    boardTint: '#FFF6E8',
  },
  evening: {
    bg: '#162235',
    sunColor: '#8FB2F0',
    sunIntensity: 0.75,
    sunPos: [-9.0, 8.5, 2.0],
    hemiSky: '#3B5680',
    hemiGround: '#4A3422',
    hemiIntensity: 0.65,
    fillColor: '#FFCA7A',
    fillIntensity: 1.45,
    windowColor: '#1E3A5F',
    windowEmissive: '#1D3B64',
    windowEmissiveIntensity: 0.5,
    bulbEmissiveIntensity: 2.4,
    envIntensity: 0.34,
    exposure: 1.0,
    cardTint: '#EDE5D7',
    boardTint: '#F2EFE6',
  },
};

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const isSw = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
    const loseExt = gl.getExtension('WEBGL_lose_context');
    loseExt?.loseContext();
    return isSw;
  } catch {
    return false;
  }
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(pointer: coarse)').matches ||
    Math.min(window.innerWidth, window.innerHeight) < 768
  );
}

export class Classroom3DScene {
  private container: HTMLElement;
  private callbacks: Classroom3DCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private warmFillLight: THREE.PointLight;
  private fog: THREE.Fog;
  private currentMood: LightingMoodId = 'morning';

  private mats: SharedClassroomMaterials;
  private baseTextures: THREE.Texture[] = [];
  private baseGeometries: THREE.BufferGeometry[] = [];
  private baseMaterials: THREE.Material[] = [];

  private chalkboardTexture: THREE.CanvasTexture;
  private chalkboardMaterial: THREE.MeshBasicMaterial;
  private chalkboardHitbox: THREE.Mesh;

  private podiumGroup: THREE.Group | null = null;
  private podiumCleanup: (() => void) | null = null;
  private teacherHandles: TeacherInteractiveHandle[] = [];

  private benchGroup: THREE.Group | null = null;
  private benchCleanup: (() => void) | null = null;
  private seatHandles = new Map<string, SeatInteractiveHandle>();
  private ringInstMesh: THREE.InstancedMesh | null = null;
  private standBaseInstMesh: THREE.InstancedMesh | null = null;
  private standFrameInstMesh: THREE.InstancedMesh | null = null;
  private clickableMeshes: THREE.Object3D[] = [];

  private latestClassroom: ClassroomData | null = null;
  private lastChalkboardSig = '';
  private lastTeachersSig = '';
  private lastSeatsSig = '';

  // Snappy cubic-eased camera preset glide (zero per-frame allocations)
  private camAnimActive = false;
  private camAnimStart = 0;
  private camAnimDuration = 460;
  private readonly camFromPos = new THREE.Vector3();
  private readonly camToPos = new THREE.Vector3();
  private readonly camFromTarget = new THREE.Vector3();
  private readonly camToTarget = new THREE.Vector3();

  // Coalesced on-demand render pipeline (zero frame-queue backlog!)
  private rafId: number | null = null;
  private softwareTimerId: number | null = null;
  private restoreDprTimerId: number | null = null;
  private renderBusy = false;
  private renderDirty = false;
  private baseDpr = 1;
  private currentDpr = 1;
  private slowFrameAvgMs = 0;
  private isAnimatingHover = false;
  private isPointerDragging = false;
  private lastFrameTime = performance.now();
  private disposed = false;
  private contextLost = false;

  // Flat-list high-speed raycasting
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private hoveredSeatId: string | null = null;
  private hoveredTeacherId: string | null = null;
  private hoveredChalkboard = false;
  private lastHoverCheck = 0;
  private pointerDownPos = { x: 0, y: 0 };

  // Direct 1:1 frame-coalesced rotated mobile landscape touch controls (zero coasting lag!)
  private isRotatedLandscape = false;
  private rotatedPointers = new Map<number, { lx: number; ly: number }>();
  private rotatedPinchDist = 0;
  private rotatedDragMoved = false;
  private pendingOrbitLx = 0;
  private pendingOrbitLy = 0;
  private pendingPinchScale = 1;
  private pendingPanLx = 0;
  private pendingPanLy = 0;
  private readonly scratchOffset = new THREE.Vector3();
  private readonly scratchSpherical = new THREE.Spherical();
  private readonly scratchRight = new THREE.Vector3();
  private readonly scratchUp = new THREE.Vector3();
  private readonly scratchPan = new THREE.Vector3();
  private readonly scratchPos = new THREE.Vector3();
  private readonly scratchScale = new THREE.Vector3(1, 1, 1);
  private readonly scratchMat = new THREE.Matrix4();
  private readonly standFrameQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-0.18, 0, 0)
  );
  private readonly identityQuat = new THREE.Quaternion();

  private readonly hoverColor = new THREE.Color('#F59E0B');

  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    callbacks: Classroom3DCallbacks,
    initialData: ClassroomSyncPayload,
    isRotatedLandscape = false
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();
    this.isRotatedLandscape = isRotatedLandscape;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const touchDevice = isTouchDevice();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !touchDevice,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });

    // Crisp but lightweight DPR cap prevents GPU command-buffer backup on Retina/4K/mobile screens
    const dprCap = this.isSoftwareGl ? 1 : touchDevice ? 1.15 : 1.35;
    this.baseDpr = Math.min(window.devicePixelRatio || 1, dprCap);
    this.currentDpr = this.baseDpr;
    this.renderer.setPixelRatio(this.currentDpr);
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = LIGHTING_MOODS.morning.exposure;

    // Bake shadows only when scene/lighting changes — NEVER re-render shadow map while orbiting!
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = touchDevice ? THREE.BasicShadowMap : THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    const initMood = LIGHTING_MOODS.morning;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initMood.bg);
    this.fog = new THREE.Fog(initMood.bg, 22, 52);
    this.scene.fog = this.fog;

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = this.pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = initMood.envIntensity;
    roomEnv.dispose();

    // Camera & Direct 1:1 Zero-Lag OrbitControls (enableDamping=false eliminates rubber-band delay!)
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.15, 75);
    const initPreset = CAMERA_PRESETS.overview;
    this.camera.position.set(...initPreset.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...initPreset.target);
    this.controls.enabled = !this.isRotatedLandscape;
    this.controls.enableDamping = false;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minPolarAngle = 0.12;
    this.controls.minDistance = 2.6;
    this.controls.maxDistance = 19.5;
    this.controls.panSpeed = 1.05;
    this.controls.rotateSpeed = 0.95;
    this.controls.zoomSpeed = 1.2;
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.camAnimActive = false;
      this.isPointerDragging = true;
      this.clearHoverOnDrag();
      this.maybeLowerInteractionDpr();
    });
    this.controls.addEventListener('end', () => {
      this.isPointerDragging = false;
      this.scheduleRestoreDpr();
    });
    this.controls.addEventListener('change', () => {
      if (!this.camAnimActive) {
        this.requestRender();
      }
    });

    // Studio Classroom Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(
      initMood.hemiSky,
      initMood.hemiGround,
      initMood.hemiIntensity
    );
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(initMood.sunColor, initMood.sunIntensity);
    this.sunLight.position.set(...initMood.sunPos);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowSize = touchDevice ? 512 : 1024;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 28;
    this.sunLight.shadow.camera.left = -9.5;
    this.sunLight.shadow.camera.right = 9.5;
    this.sunLight.shadow.camera.top = 9.5;
    this.sunLight.shadow.camera.bottom = -9.5;
    this.scene.add(this.sunLight);

    this.warmFillLight = new THREE.PointLight(
      initMood.fillColor,
      initMood.fillIntensity,
      26,
      1.15
    );
    this.warmFillLight.position.set(0.5, 4.1, 0.4);
    this.scene.add(this.warmFillLight);

    // Rich Procedural Textures & Performance-Tuned Materials (Lambert for matte walls/floor, PBR for oak/brass/steel)
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const oakDeskTex = createOakWoodTexture(maxAniso, 'desk');
    const oakFrameTex = createOakWoodTexture(maxAniso, 'frame');
    const oakDarkTex = createOakWoodTexture(maxAniso, 'dark');
    const floorTex = createFloorTileTexture(maxAniso);
    const wallTex = createWallPlasterTexture(maxAniso);
    const shadowTex = createContactShadowTexture();
    this.baseTextures.push(oakDeskTex, oakFrameTex, oakDarkTex, floorTex, wallTex, shadowTex);

    this.mats = {
      oakDesk: new THREE.MeshStandardMaterial({ map: oakDeskTex, roughness: 0.46, metalness: 0.04 }),
      oakFrame: new THREE.MeshStandardMaterial({ map: oakFrameTex, roughness: 0.54, metalness: 0.05 }),
      oakDark: new THREE.MeshStandardMaterial({ map: oakDarkTex, roughness: 0.6, metalness: 0.06 }),
      steelFrame: new THREE.MeshStandardMaterial({ color: '#1F2937', roughness: 0.34, metalness: 0.78 }),
      brass: new THREE.MeshStandardMaterial({ color: '#D4A03E', roughness: 0.25, metalness: 0.88 }),
      floor: new THREE.MeshLambertMaterial({ map: floorTex }),
      wall: new THREE.MeshLambertMaterial({ map: wallTex }),
      wainscot: new THREE.MeshLambertMaterial({ color: '#244A3A' }),
      windowGlass: new THREE.MeshStandardMaterial({
        color: initMood.windowColor,
        emissive: new THREE.Color(initMood.windowEmissive),
        emissiveIntensity: initMood.windowEmissiveIntensity,
        roughness: 0.14,
        metalness: 0.05,
      }),
      pendantShade: new THREE.MeshStandardMaterial({
        color: '#163D2D',
        roughness: 0.32,
        metalness: 0.38,
        side: THREE.DoubleSide,
      }),
      bulbEmissive: new THREE.MeshStandardMaterial({
        color: '#FFFBEB',
        emissive: new THREE.Color('#FFD27A'),
        emissiveIntensity: initMood.bulbEmissiveIntensity,
        roughness: 0.2,
      }),
      chalkWhite: new THREE.MeshLambertMaterial({ color: '#FFFFFF' }),
      contactShadow: new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      }),
      notebookColors: [
        new THREE.MeshLambertMaterial({ color: '#15803D' }),
        new THREE.MeshLambertMaterial({ color: '#B91C1C' }),
        new THREE.MeshLambertMaterial({ color: '#1D4ED8' }),
        new THREE.MeshLambertMaterial({ color: '#D97706' }),
        new THREE.MeshLambertMaterial({ color: '#7E22CE' }),
      ],
      pencilYellow: new THREE.MeshLambertMaterial({ color: '#FACC15' }),
    };

    this.baseMaterials.push(
      this.mats.oakDesk,
      this.mats.oakFrame,
      this.mats.oakDark,
      this.mats.steelFrame,
      this.mats.brass,
      this.mats.floor,
      this.mats.wall,
      this.mats.wainscot,
      this.mats.windowGlass,
      this.mats.pendantShade,
      this.mats.bulbEmissive,
      this.mats.chalkWhite,
      this.mats.contactShadow,
      this.mats.pencilYellow,
      ...this.mats.notebookColors
    );

    // Build Instanced Static Classroom Architecture
    const arch = buildClassroomArchitecture(this.mats, maxAniso);
    this.scene.add(arch.group);
    this.baseGeometries.push(...arch.disposables.geometries);
    this.baseTextures.push(...arch.disposables.textures);
    this.baseMaterials.push(...arch.disposables.materials);

    // Build Glare-Free Emerald Chalkboard Assembly
    this.chalkboardTexture = createChalkboardCanvasTexture(
      initialData.classroom.chalkboard,
      initialData.classroom.label,
      maxAniso
    );
    this.chalkboardMaterial = new THREE.MeshBasicMaterial({
      map: this.chalkboardTexture,
      color: new THREE.Color(initMood.boardTint),
      toneMapped: false,
    });
    this.baseTextures.push(this.chalkboardTexture);
    this.baseMaterials.push(this.chalkboardMaterial);

    const cb = buildChalkboardAssembly(this.mats, this.chalkboardMaterial);
    this.chalkboardHitbox = cb.hitbox;
    this.scene.add(cb.group);
    this.baseGeometries.push(...cb.geometries);

    this.raycaster.layers.set(CLICKABLE_LAYER);

    // Sync initial live classroom content
    this.syncClassroomData(initialData);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp, { passive: true });
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerCancel, { passive: true });
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.markShadowsDirty();
    this.requestRender();
  }

  private markShadowsDirty() {
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  private rebuildClickableList() {
    const list: THREE.Object3D[] = [this.chalkboardHitbox];
    for (let i = 0; i < this.teacherHandles.length; i++) {
      list.push(this.teacherHandles[i].hitbox);
    }
    this.seatHandles.forEach((h) => list.push(h.hitbox));
    this.clickableMeshes = list;
  }

  public setRotatedLandscape(rotated: boolean) {
    if (this.disposed || this.isRotatedLandscape === rotated) return;
    this.isRotatedLandscape = rotated;
    this.controls.enabled = !rotated;
    this.rotatedPointers.clear();
    this.rotatedPinchDist = 0;
    this.pendingOrbitLx = 0;
    this.pendingOrbitLy = 0;
    this.pendingPinchScale = 1;
    this.pendingPanLx = 0;
    this.pendingPanLy = 0;
    this.isPointerDragging = false;
    if (!rotated) {
      this.controls.update();
    } else {
      this.camera.lookAt(this.controls.target);
    }
    this.handleResize();
  }

  private clearHoverOnDrag() {
    if (this.hoveredSeatId || this.hoveredTeacherId || this.hoveredChalkboard) {
      this.hoveredSeatId = null;
      this.hoveredTeacherId = null;
      this.hoveredChalkboard = false;
      this.isAnimatingHover = true;
      this.renderer.domElement.style.cursor = 'grabbing';
      this.callbacks.onHoverChange(null);
    }
  }

  private maybeLowerInteractionDpr() {
    if (this.restoreDprTimerId !== null) {
      window.clearTimeout(this.restoreDprTimerId);
      this.restoreDprTimerId = null;
    }
    // Only lower interaction DPR if this device is software WebGL or actually measured slow frames
    if (this.isSoftwareGl || this.slowFrameAvgMs > 16) {
      const targetDpr = Math.min(this.baseDpr, 0.8);
      if (this.currentDpr !== targetDpr) {
        this.currentDpr = targetDpr;
        this.renderer.setPixelRatio(this.currentDpr);
      }
    }
  }

  private scheduleRestoreDpr() {
    if (this.currentDpr === this.baseDpr) return;
    if (this.restoreDprTimerId !== null) {
      window.clearTimeout(this.restoreDprTimerId);
    }
    this.restoreDprTimerId = window.setTimeout(() => {
      this.restoreDprTimerId = null;
      if (this.disposed || this.isPointerDragging) return;
      if (this.currentDpr !== this.baseDpr) {
        this.currentDpr = this.baseDpr;
        this.renderer.setPixelRatio(this.currentDpr);
        this.requestRender();
      }
    }, 120);
  }

  public syncClassroomData(payload: ClassroomSyncPayload) {
    if (this.disposed) return;
    this.latestClassroom = payload.classroom;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const cardTint = LIGHTING_MOODS[this.currentMood].cardTint;
    let geometryChanged = false;

    // 1. Update Chalkboard texture if changed
    const cbSig = JSON.stringify([
      payload.classroom.label,
      payload.classroom.chalkboard.title,
      payload.classroom.chalkboard.year,
      payload.classroom.chalkboard.announcement,
    ]);
    if (cbSig !== this.lastChalkboardSig) {
      this.lastChalkboardSig = cbSig;
      updateChalkboardCanvasTexture(
        this.chalkboardTexture,
        payload.classroom.chalkboard,
        payload.classroom.label
      );
      this.requestRender();
    }

    // 2. Rebuild Teacher Podium Easels if changed
    const teachersSig = JSON.stringify(
      payload.classroom.teachers.map((t) => [t.id, t.name, t.subject, t.yearsTaught, t.photoUrl ?? ''])
    );
    if (teachersSig !== this.lastTeachersSig) {
      this.lastTeachersSig = teachersSig;
      if (this.podiumGroup) this.scene.remove(this.podiumGroup);
      if (this.podiumCleanup) this.podiumCleanup();

      const podium = buildTeacherPodiumStage(
        payload.classroom.teachers,
        this.mats,
        maxAniso,
        cardTint,
        () => this.requestRender()
      );
      this.podiumGroup = podium.group;
      this.podiumCleanup = podium.cleanup;
      this.teacherHandles = podium.teacherHandles;
      this.scene.add(this.podiumGroup);
      geometryChanged = true;
    }

    // 3. Rebuild Student Benches if seats, search, move state, or ownership changed
    const seatsSig = JSON.stringify([
      payload.searchQuery.trim().toLowerCase(),
      payload.movingSeatId ?? '',
      payload.classroom.seats.map((s) => [
        s.id,
        s.seatNumber,
        payload.canModifySeat(s.id) ? 1 : 0,
        s.occupant
          ? [
              s.occupant.fullName,
              s.occupant.nickname ?? '',
              s.occupant.city,
              s.occupant.country,
              s.occupant.countryFlag ?? '',
              s.occupant.profession,
              s.occupant.photoUrl ? s.occupant.photoUrl.slice(0, 64) + s.occupant.photoUrl.length : '',
            ]
          : null,
      ]),
    ]);

    if (seatsSig !== this.lastSeatsSig) {
      this.lastSeatsSig = seatsSig;
      if (this.benchGroup) this.scene.remove(this.benchGroup);
      if (this.benchCleanup) this.benchCleanup();

      const grid = buildStudentBenchGrid({
        seats: payload.classroom.seats,
        searchQuery: payload.searchQuery,
        movingSeatId: payload.movingSeatId,
        canModifySeat: payload.canModifySeat,
        mats: this.mats,
        maxAnisotropy: maxAniso,
        cardTintHex: cardTint,
        onRedraw: () => this.requestRender(),
      });
      this.benchGroup = grid.group;
      this.benchCleanup = grid.cleanup;
      this.seatHandles = grid.seatHandles;
      this.ringInstMesh = grid.ringInstMesh;
      this.standBaseInstMesh = grid.standBaseInstMesh;
      this.standFrameInstMesh = grid.standFrameInstMesh;
      this.scene.add(this.benchGroup);
      geometryChanged = true;
    }

    if (geometryChanged) {
      this.rebuildClickableList();
      this.markShadowsDirty();
      this.requestRender();
    }
  }

  public setCameraPreset(presetId: CameraPresetId) {
    const preset = CAMERA_PRESETS[presetId];
    if (!preset) return;

    if (this.isSoftwareGl) {
      this.camera.position.set(...preset.pos);
      this.controls.target.set(...preset.target);
      if (!this.isRotatedLandscape) this.controls.update();
      else this.camera.lookAt(this.controls.target);
      this.camAnimActive = false;
    } else {
      this.camFromPos.copy(this.camera.position);
      this.camToPos.set(...preset.pos);
      this.camFromTarget.copy(this.controls.target);
      this.camToTarget.set(...preset.target);
      this.camAnimStart = performance.now();
      this.camAnimActive = true;
    }
    this.requestRender();
  }

  public setLightingMood(moodId: LightingMoodId) {
    const m = LIGHTING_MOODS[moodId];
    if (!m) return;
    this.currentMood = moodId;

    this.scene.background = new THREE.Color(m.bg);
    this.fog.color.set(m.bg);
    this.scene.environmentIntensity = m.envIntensity;

    this.sunLight.color.set(m.sunColor);
    this.sunLight.intensity = m.sunIntensity;
    this.sunLight.position.set(...m.sunPos);

    this.hemiLight.color.set(m.hemiSky);
    this.hemiLight.groundColor.set(m.hemiGround);
    this.hemiLight.intensity = m.hemiIntensity;

    this.warmFillLight.color.set(m.fillColor);
    this.warmFillLight.intensity = m.fillIntensity;

    this.mats.windowGlass.color.set(m.windowColor);
    this.mats.windowGlass.emissive.set(m.windowEmissive);
    this.mats.windowGlass.emissiveIntensity = m.windowEmissiveIntensity;
    this.mats.bulbEmissive.emissiveIntensity = m.bulbEmissiveIntensity;

    this.chalkboardMaterial.color.set(m.boardTint);
    this.seatHandles.forEach((h) => h.cardMaterial.color.set(m.cardTint));
    this.teacherHandles.forEach((h) => h.cardMaterial.color.set(m.cardTint));

    this.renderer.toneMappingExposure = m.exposure;
    this.markShadowsDirty();
    this.requestRender();
  }

  public requestRender = () => {
    if (this.disposed || this.contextLost) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.lastFrameTime = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  };

  private finishFrame(needsAnotherFrame: boolean) {
    const done = () => {
      this.renderBusy = false;
      if (this.disposed || this.contextLost) return;
      if (needsAnotherFrame || this.renderDirty) {
        this.renderDirty = false;
        this.requestRender();
      }
    };

    if (!this.isSoftwareGl) {
      done();
      return;
    }

    // Software WebGL fence-sync: wait for CPU draw to finish so input never queues behind stale frames
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (sync) {
        gl.flush();
        const poll = () => {
          this.softwareTimerId = null;
          if (this.disposed) {
            gl.deleteSync(sync);
            return;
          }
          const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            this.softwareTimerId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            const pauseMs = this.isPointerDragging ? 12 : 48;
            this.softwareTimerId = window.setTimeout(done, pauseMs);
          }
        };
        this.softwareTimerId = window.setTimeout(poll, 5);
        return;
      }
    }
    this.softwareTimerId = window.setTimeout(() => {
      this.softwareTimerId = null;
      done();
    }, this.isPointerDragging ? 16 : 64);
  }

  private applyPendingRotatedTransforms(): boolean {
    const hasOrbit = Math.abs(this.pendingOrbitLx) > 0.001 || Math.abs(this.pendingOrbitLy) > 0.001;
    const hasPinchPan =
      Math.abs(this.pendingPinchScale - 1) > 0.0005 ||
      Math.abs(this.pendingPanLx) > 0.001 ||
      Math.abs(this.pendingPanLy) > 0.001;

    if (!hasOrbit && !hasPinchPan) return false;

    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);

    this.scratchOffset.copy(this.camera.position).sub(this.controls.target);
    this.scratchSpherical.setFromVector3(this.scratchOffset);

    if (hasOrbit) {
      const dTheta = -(this.pendingOrbitLx / width) * Math.PI * 1.65;
      const dPhi = -(this.pendingOrbitLy / height) * Math.PI * 1.2;
      this.scratchSpherical.theta += dTheta;
      this.scratchSpherical.phi += dPhi;
      this.pendingOrbitLx = 0;
      this.pendingOrbitLy = 0;
    }

    if (hasPinchPan) {
      if (this.pendingPinchScale > 0 && Number.isFinite(this.pendingPinchScale)) {
        this.scratchSpherical.radius = THREE.MathUtils.clamp(
          this.scratchSpherical.radius / this.pendingPinchScale,
          this.controls.minDistance,
          this.controls.maxDistance
        );
      }

      if (Math.abs(this.pendingPanLx) > 0.001 || Math.abs(this.pendingPanLy) > 0.001) {
        const panScale = (this.scratchSpherical.radius / height) * 1.2;
        this.camera.matrixWorld.extractBasis(this.scratchRight, this.scratchUp, this.scratchPan);
        this.scratchPan
          .set(0, 0, 0)
          .addScaledVector(this.scratchRight, -this.pendingPanLx * panScale)
          .addScaledVector(this.scratchUp, this.pendingPanLy * panScale);

        this.controls.target.add(this.scratchPan);
        this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -6.2, 6.2);
        this.controls.target.y = THREE.MathUtils.clamp(this.controls.target.y, 0.2, 4.2);
        this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -5.5, 6.5);
      }

      this.pendingPinchScale = 1;
      this.pendingPanLx = 0;
      this.pendingPanLy = 0;
    }

    this.scratchSpherical.phi = THREE.MathUtils.clamp(
      this.scratchSpherical.phi,
      this.controls.minPolarAngle,
      this.controls.maxPolarAngle
    );
    this.scratchSpherical.makeSafe();

    this.scratchOffset.setFromSpherical(this.scratchSpherical);
    this.camera.position.copy(this.controls.target).add(this.scratchOffset);
    this.camera.lookAt(this.controls.target);

    return false;
  }

  private tick = () => {
    this.rafId = null;
    if (this.disposed || this.contextLost) {
      this.renderBusy = false;
      return;
    }

    this.renderDirty = false;
    const now = performance.now();
    const dt = Math.min(Math.max((now - this.lastFrameTime) / 1000, 0.001), 0.033);
    this.lastFrameTime = now;

    let keepLooping = false;

    // 1. Snappy cubic-eased camera preset glide
    if (this.camAnimActive) {
      const rawT = Math.min((now - this.camAnimStart) / this.camAnimDuration, 1);
      const eased = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      this.camera.position.lerpVectors(this.camFromPos, this.camToPos, eased);
      this.controls.target.lerpVectors(this.camFromTarget, this.camToTarget, eased);
      this.camera.lookAt(this.controls.target);

      if (rawT >= 1) {
        this.camAnimActive = false;
      } else {
        keepLooping = true;
      }
    }

    // 2. Direct 1:1 rotated mobile camera transform (OrbitControls handles desktop directly with enableDamping=false)
    if (this.isRotatedLandscape) {
      this.applyPendingRotatedTransforms();
    }

    // 3. Smooth hover lift on desk nameplates & teacher easels (desktop mouse only, skipped during drag)
    if (this.isAnimatingHover) {
      let anyHoverMoving = false;
      let instMatricesDirty = false;
      let instColorsDirty = false;

      this.seatHandles.forEach((handle) => {
        const isHov = handle.seatId === this.hoveredSeatId;
        const targetLift = isHov ? 0.085 : 0;
        const nextLift = this.isSoftwareGl
          ? targetLift
          : THREE.MathUtils.damp(handle.currentLift, targetLift, 18, dt);
        const resolvedLift = Math.abs(nextLift - targetLift) > 0.0015 ? nextLift : targetLift;
        if (resolvedLift !== targetLift) anyHoverMoving = true;

        if (resolvedLift !== handle.currentLift) {
          handle.currentLift = resolvedLift;
          instMatricesDirty = true;

          // Update cardFace mesh matrix
          handle.cardMesh.position.set(
            handle.baseX,
            handle.baseStandY + 0.52 + resolvedLift,
            handle.baseZ + 0.032
          );
          handle.cardMesh.updateMatrix();

          // Update instanced standBase & standFrame matrices for just this 1 seat
          if (this.standBaseInstMesh) {
            this.scratchPos.set(
              handle.baseX,
              handle.baseStandY + 0.025 + resolvedLift,
              handle.baseZ + 0.02
            );
            this.scratchMat.compose(this.scratchPos, this.identityQuat, this.scratchScale);
            this.standBaseInstMesh.setMatrixAt(handle.instanceIndex, this.scratchMat);
          }
          if (this.standFrameInstMesh) {
            this.scratchPos.set(
              handle.baseX,
              handle.baseStandY + 0.52 + resolvedLift,
              handle.baseZ
            );
            this.scratchMat.compose(this.scratchPos, this.standFrameQuat, this.scratchScale);
            this.standFrameInstMesh.setMatrixAt(handle.instanceIndex, this.scratchMat);
          }
        }

        if (this.ringInstMesh) {
          this.ringInstMesh.setColorAt(
            handle.instanceIndex,
            isHov ? this.hoverColor : handle.baseRingColor
          );
          instColorsDirty = true;
        }
      });

      if (instMatricesDirty) {
        if (this.standBaseInstMesh) this.standBaseInstMesh.instanceMatrix.needsUpdate = true;
        if (this.standFrameInstMesh) this.standFrameInstMesh.instanceMatrix.needsUpdate = true;
      }
      if (instColorsDirty && this.ringInstMesh?.instanceColor) {
        this.ringInstMesh.instanceColor.needsUpdate = true;
      }

      this.teacherHandles.forEach((handle) => {
        const isHov = handle.teacherId === this.hoveredTeacherId;
        const targetY = isHov ? handle.baseY + 0.075 : handle.baseY;
        const nextY = this.isSoftwareGl
          ? targetY
          : THREE.MathUtils.damp(handle.easelGroup.position.y, targetY, 18, dt);
        if (Math.abs(nextY - targetY) > 0.0015) {
          anyHoverMoving = true;
          handle.easelGroup.position.y = nextY;
        } else {
          handle.easelGroup.position.y = targetY;
        }
      });

      this.isAnimatingHover = anyHoverMoving;
      if (anyHoverMoving) keepLooping = true;
    }

    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    const renderMs = performance.now() - t0;
    this.slowFrameAvgMs = this.slowFrameAvgMs === 0 ? renderMs : this.slowFrameAvgMs * 0.7 + renderMs * 0.3;

    this.finishFrame(keepLooping);
  };

  private toRotatedLocal(event: PointerEvent): { lx: number; ly: number } {
    return { lx: event.clientY, ly: -event.clientX };
  }

  private raycastAtEvent(event: PointerEvent): THREE.Intersection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    if (this.isRotatedLandscape) {
      this.pointerNdc.x = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      this.pointerNdc.y = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    } else {
      this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    // Flat non-recursive hit test (~24 proxy boxes instead of traversing ~400 scene nodes)
    const hits = this.raycaster.intersectObjects(this.clickableMeshes, false);
    return hits.length > 0 ? hits[0] : null;
  }

  private handlePointerMove = (event: PointerEvent) => {
    // Frame-coalesced 1:1 rotated-landscape touch orbit / pinch-zoom
    if (this.isRotatedLandscape && this.rotatedPointers.has(event.pointerId)) {
      const next = this.toRotatedLocal(event);
      const prev = this.rotatedPointers.get(event.pointerId)!;

      if (this.rotatedPointers.size === 1) {
        const dlx = next.lx - prev.lx;
        const dly = next.ly - prev.ly;
        if (Math.abs(dlx) > 0.2 || Math.abs(dly) > 0.2) {
          this.rotatedDragMoved = true;
          this.camAnimActive = false;
          this.pendingOrbitLx += dlx;
          this.pendingOrbitLy += dly;
          this.requestRender();
        }
        this.rotatedPointers.set(event.pointerId, next);
      } else if (this.rotatedPointers.size === 2) {
        const entries = Array.from(this.rotatedPointers.entries());
        const other = entries.find(([id]) => id !== event.pointerId)?.[1];
        if (other) {
          const prevMidX = (prev.lx + other.lx) * 0.5;
          const prevMidY = (prev.ly + other.ly) * 0.5;
          const nextMidX = (next.lx + other.lx) * 0.5;
          const nextMidY = (next.ly + other.ly) * 0.5;
          const newDist = Math.hypot(next.lx - other.lx, next.ly - other.ly);
          const scale = this.rotatedPinchDist > 5 ? newDist / this.rotatedPinchDist : 1;
          this.rotatedPinchDist = newDist;
          this.rotatedDragMoved = true;
          this.camAnimActive = false;
          this.pendingPinchScale *= scale;
          this.pendingPanLx += nextMidX - prevMidX;
          this.pendingPanLy += nextMidY - prevMidY;
          this.requestRender();
        }
        this.rotatedPointers.set(event.pointerId, next);
      }
      return;
    }

    // Never run hover raycasting during drags or on touchscreens
    if (this.isPointerDragging || event.pointerType === 'touch') return;

    const now = performance.now();
    if (now - this.lastHoverCheck < 56) return;
    this.lastHoverCheck = now;

    const hit = this.raycastAtEvent(event);
    const data = hit?.object.userData as
      | { kind: 'seat'; seatId: string }
      | { kind: 'teacher'; teacherId: string }
      | { kind: 'chalkboard' }
      | undefined;

    const nextSeat = data?.kind === 'seat' ? data.seatId : null;
    const nextTeacher = data?.kind === 'teacher' ? data.teacherId : null;
    const nextBoard = data?.kind === 'chalkboard';

    if (
      nextSeat !== this.hoveredSeatId ||
      nextTeacher !== this.hoveredTeacherId ||
      nextBoard !== this.hoveredChalkboard
    ) {
      this.hoveredSeatId = nextSeat;
      this.hoveredTeacherId = nextTeacher;
      this.hoveredChalkboard = nextBoard;
      this.isAnimatingHover = true;
      this.renderer.domElement.style.cursor =
        nextSeat || nextTeacher || nextBoard ? 'pointer' : 'grab';

      if (nextSeat && this.latestClassroom) {
        const seat = this.latestClassroom.seats.find((s) => s.id === nextSeat);
        this.callbacks.onHoverChange(seat ? { kind: 'seat', seat } : null);
      } else if (nextTeacher && this.latestClassroom) {
        const teacher = this.latestClassroom.teachers.find((t) => t.id === nextTeacher);
        this.callbacks.onHoverChange(teacher ? { kind: 'teacher', teacher } : null);
      } else if (nextBoard) {
        this.callbacks.onHoverChange({ kind: 'chalkboard' });
      } else {
        this.callbacks.onHoverChange(null);
      }

      this.requestRender();
    }
  };

  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDownPos.x = event.clientX;
    this.pointerDownPos.y = event.clientY;
    this.isPointerDragging = true;

    if (this.isRotatedLandscape) {
      this.maybeLowerInteractionDpr();
      this.rotatedPointers.set(event.pointerId, this.toRotatedLocal(event));
      if (this.rotatedPointers.size === 1) {
        this.rotatedDragMoved = false;
      } else if (this.rotatedPointers.size === 2) {
        const pts = Array.from(this.rotatedPointers.values());
        this.rotatedPinchDist = Math.hypot(pts[0].lx - pts[1].lx, pts[0].ly - pts[1].ly);
        this.rotatedDragMoved = true;
      }
      try {
        this.renderer.domElement.setPointerCapture(event.pointerId);
      } catch {
        // Ignore if capture is unsupported
      }
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    const wasRotatedDrag = this.isRotatedLandscape && this.rotatedDragMoved;
    if (this.isRotatedLandscape) {
      this.rotatedPointers.delete(event.pointerId);
      if (this.rotatedPointers.size === 0) {
        this.isPointerDragging = false;
        this.rotatedPinchDist = 0;
        this.scheduleRestoreDpr();
      }
      try {
        this.renderer.domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    } else {
      this.isPointerDragging = false;
      this.renderer.domElement.style.cursor = 'grab';
      this.scheduleRestoreDpr();
    }

    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (wasRotatedDrag || dx * dx + dy * dy > 64) return;

    const hit = this.raycastAtEvent(event);
    if (!hit) return;

    const data = hit.object.userData as
      | { kind: 'seat'; seatId: string }
      | { kind: 'teacher'; teacherId: string }
      | { kind: 'chalkboard' }
      | undefined;

    if (data?.kind === 'seat') {
      this.callbacks.onSelectSeat(data.seatId);
    } else if (data?.kind === 'teacher') {
      this.callbacks.onSelectTeacher(data.teacherId);
    } else if (data?.kind === 'chalkboard') {
      this.callbacks.onClickChalkboard();
    }
  };

  private handlePointerCancel = (event: PointerEvent) => {
    if (this.isRotatedLandscape) {
      this.rotatedPointers.delete(event.pointerId);
      if (this.rotatedPointers.size === 0) {
        this.isPointerDragging = false;
        this.rotatedPinchDist = 0;
        this.scheduleRestoreDpr();
      }
    } else {
      this.isPointerDragging = false;
      this.renderer.domElement.style.cursor = 'grab';
      this.scheduleRestoreDpr();
    }
  };

  private handlePointerLeave = (event: PointerEvent) => {
    if (!this.isRotatedLandscape && event.buttons === 0) {
      this.isPointerDragging = false;
    }
    if (this.hoveredSeatId || this.hoveredTeacherId || this.hoveredChalkboard) {
      this.hoveredSeatId = null;
      this.hoveredTeacherId = null;
      this.hoveredChalkboard = false;
      this.isAnimatingHover = true;
      this.renderer.domElement.style.cursor = 'grab';
      this.callbacks.onHoverChange(null);
      this.requestRender();
    }
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestRender();
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.renderBusy = false;
    this.renderDirty = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.softwareTimerId !== null) {
      window.clearTimeout(this.softwareTimerId);
      this.softwareTimerId = null;
    }
    if (this.restoreDprTimerId !== null) {
      window.clearTimeout(this.restoreDprTimerId);
      this.restoreDprTimerId = null;
    }
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    this.markShadowsDirty();
    this.requestRender();
  };

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.softwareTimerId !== null) {
      window.clearTimeout(this.softwareTimerId);
      this.softwareTimerId = null;
    }
    if (this.restoreDprTimerId !== null) {
      window.clearTimeout(this.restoreDprTimerId);
      this.restoreDprTimerId = null;
    }
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.controls.dispose();
    this.podiumCleanup?.();
    this.benchCleanup?.();
    this.baseGeometries.forEach((g) => g.dispose());
    this.baseMaterials.forEach((m) => m.dispose());
    this.baseTextures.forEach((t) => t.dispose());
    this.envRenderTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
