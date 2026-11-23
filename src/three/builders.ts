import * as THREE from 'three';
import { StudentSeat, TeacherProfile } from '@/src/types/classroom';
import {
  createRowMarkerTexture,
  createSeatNameplateTexture,
  createTeacherPortraitTexture,
  createWallClockTexture,
  SeatTextureState,
} from './textures';

export interface SharedClassroomMaterials {
  oakDesk: THREE.MeshStandardMaterial;
  oakFrame: THREE.MeshStandardMaterial;
  oakDark: THREE.MeshStandardMaterial;
  steelFrame: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  floor: THREE.MeshLambertMaterial;
  wall: THREE.MeshLambertMaterial;
  wainscot: THREE.MeshLambertMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  pendantShade: THREE.MeshStandardMaterial;
  bulbEmissive: THREE.MeshStandardMaterial;
  chalkWhite: THREE.MeshLambertMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  notebookColors: THREE.MeshLambertMaterial[];
  pencilYellow: THREE.MeshLambertMaterial;
}

export interface SeatInteractiveHandle {
  seatId: string;
  seatNumber: number;
  isOccupied: boolean;
  instanceIndex: number;
  baseX: number;
  baseStandY: number;
  baseZ: number;
  currentLift: number;
  cardMesh: THREE.Mesh;
  cardMaterial: THREE.MeshBasicMaterial;
  baseRingColor: THREE.Color;
  hitbox: THREE.Mesh;
}

export interface TeacherInteractiveHandle {
  teacherId: string;
  easelGroup: THREE.Group;
  cardMaterial: THREE.MeshBasicMaterial;
  baseY: number;
  hitbox: THREE.Mesh;
}

export const CLICKABLE_LAYER = 1;

const BOOK_PALETTE_HEX = ['#15803D', '#B91C1C', '#1D4ED8', '#D97706', '#7E22CE'];

const _instPos = new THREE.Vector3();
const _instEuler = new THREE.Euler();
const _instQuat = new THREE.Quaternion();
const _instScale = new THREE.Vector3();
const _instMat = new THREE.Matrix4();
const _instColor = new THREE.Color();

interface InstanceTransform {
  x: number;
  y: number;
  z: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  colorHex?: string;
}

function buildInstancedMesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  transforms: InstanceTransform[],
  opts: { castShadow?: boolean; receiveShadow?: boolean; renderOrder?: number } = {}
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    _instPos.set(t.x, t.y, t.z);
    _instEuler.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
    _instQuat.setFromEuler(_instEuler);
    _instScale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    _instMat.compose(_instPos, _instQuat, _instScale);
    mesh.setMatrixAt(i, _instMat);
    if (t.colorHex) {
      _instColor.set(t.colorHex);
      mesh.setColorAt(i, _instColor);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = Boolean(opts.castShadow);
  mesh.receiveShadow = Boolean(opts.receiveShadow);
  if (opts.renderOrder !== undefined) mesh.renderOrder = opts.renderOrder;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

function freezeStaticGroup(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    obj.matrixAutoUpdate = false;
  });
}

function markHitbox(mesh: THREE.Mesh, userData: Record<string, unknown>) {
  mesh.userData = userData;
  mesh.layers.enable(CLICKABLE_LAYER);
}

function addContactShadow(
  parent: THREE.Group,
  width: number,
  depth: number,
  material: THREE.MeshBasicMaterial,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  y = 0.008
) {
  const geo = trackGeo(new THREE.PlaneGeometry(width, depth));
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 1;
  parent.add(mesh);
}

export function buildClassroomArchitecture(
  mats: SharedClassroomMaterials,
  maxAnisotropy: number
): {
  group: THREE.Group;
  disposables: {
    geometries: THREE.BufferGeometry[];
    textures: THREE.Texture[];
    materials: THREE.Material[];
  };
} {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // Floor slab (14.4m wide x 17.5m deep)
  const floorMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(14.4, 0.16, 17.5)), mats.floor);
  floorMesh.position.set(0, -0.08, 1.3);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  const frontWallZ = -6.3;
  const leftWallX = -6.8;
  const rightWallX = 6.8;
  const wallHeight = 5.0;

  // Front Wall
  const frontWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(13.8, wallHeight, 0.24)), mats.wall);
  frontWall.position.set(0, wallHeight / 2, frontWallZ - 0.12);
  group.add(frontWall);

  // Rich Heritage Green Wainscoting + Warm Oak Chair Rail
  const frontWainscot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(13.6, 1.18, 0.06)), mats.wainscot);
  frontWainscot.position.set(0, 0.59, frontWallZ + 0.02);
  group.add(frontWainscot);

  const frontChairRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(13.64, 0.1, 0.11)), mats.oakFrame);
  frontChairRail.position.set(0, 1.2, frontWallZ + 0.04);
  group.add(frontChairRail);

  const frontBaseboard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(13.64, 0.14, 0.09)), mats.oakDark);
  frontBaseboard.position.set(0, 0.07, frontWallZ + 0.04);
  group.add(frontBaseboard);

  // Left Sunlit Wall
  const leftWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, wallHeight, 15.6)), mats.wall);
  leftWall.position.set(leftWallX - 0.12, wallHeight / 2, 1.4);
  group.add(leftWall);

  const leftWainscot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 1.18, 15.4)), mats.wainscot);
  leftWainscot.position.set(leftWallX + 0.02, 0.59, 1.4);
  group.add(leftWainscot);

  const leftChairRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.1, 15.44)), mats.oakFrame);
  leftChairRail.position.set(leftWallX + 0.04, 1.2, 1.4);
  group.add(leftChairRail);

  // 3 Sunlit Multi-Pane Schoolhouse Windows (Instanced for low draw calls)
  const windowZs = [-2.6, 1.1, 4.8];
  const winW = 2.45;
  const winH = 2.35;
  const winCenterY = 2.68;
  const winPaneGeo = trackGeo(new THREE.PlaneGeometry(winW - 0.16, winH - 0.16));
  const winFrameHGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.11, winW + 0.1));
  const winFrameVGeo = trackGeo(new THREE.BoxGeometry(0.12, winH, 0.11));
  const winMullionVGeo = trackGeo(new THREE.BoxGeometry(0.07, winH - 0.12, 0.055));
  const winMullionHGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.055, winW - 0.12));
  const winSillGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.07, winW + 0.24));

  const glassInst: InstanceTransform[] = [];
  const frameHInst: InstanceTransform[] = [];
  const frameVInst: InstanceTransform[] = [];
  const mullionVInst: InstanceTransform[] = [];
  const mullionHInst: InstanceTransform[] = [];
  const sillInst: InstanceTransform[] = [];

  for (const wz of windowZs) {
    const baseX = leftWallX + 0.03;
    glassInst.push({ x: baseX + 0.01, y: winCenterY, z: wz, ry: Math.PI / 2 });
    frameHInst.push({ x: baseX + 0.05, y: winCenterY + winH / 2, z: wz });
    frameHInst.push({ x: baseX + 0.05, y: winCenterY - winH / 2, z: wz });
    frameVInst.push({ x: baseX + 0.05, y: winCenterY, z: wz - winW / 2 });
    frameVInst.push({ x: baseX + 0.05, y: winCenterY, z: wz + winW / 2 });
    mullionVInst.push({ x: baseX + 0.04, y: winCenterY, z: wz });
    mullionHInst.push({ x: baseX + 0.04, y: winCenterY + 0.22, z: wz });
    sillInst.push({ x: baseX + 0.11, y: winCenterY - winH / 2 - 0.04, z: wz });
  }

  group.add(
    buildInstancedMesh(winPaneGeo, mats.windowGlass, glassInst),
    buildInstancedMesh(winFrameHGeo, mats.oakFrame, frameHInst),
    buildInstancedMesh(winFrameVGeo, mats.oakFrame, frameVInst),
    buildInstancedMesh(winMullionVGeo, mats.oakFrame, mullionVInst),
    buildInstancedMesh(winMullionHGeo, mats.oakFrame, mullionHInst),
    buildInstancedMesh(winSillGeo, mats.oakDesk, sillInst)
  );

  // Right Side Wall (classroom door + bookshelf + brass globe)
  const rightWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, wallHeight, 15.6)), mats.wall);
  rightWall.position.set(rightWallX + 0.12, wallHeight / 2, 1.4);
  group.add(rightWall);

  const rightWainscot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 1.18, 15.4)), mats.wainscot);
  rightWainscot.position.set(rightWallX - 0.02, 0.59, 1.4);
  group.add(rightWainscot);

  const rightChairRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.1, 15.44)), mats.oakFrame);
  rightChairRail.position.set(rightWallX - 0.04, 1.2, 1.4);
  group.add(rightChairRail);

  // Classroom Wooden Door
  const doorGroup = new THREE.Group();
  doorGroup.position.set(rightWallX - 0.03, 0, -4.2);

  const doorLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 2.38, 1.14)), mats.oakFrame);
  doorLeaf.position.set(-0.02, 1.19, 0);
  const doorTopFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.1, 1.32)), mats.oakDark);
  doorTopFrame.position.set(-0.04, 2.42, 0);
  const doorLeftJamb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 2.46, 0.1)), mats.oakDark);
  doorLeftJamb.position.set(-0.04, 1.23, -0.61);
  const doorRightJamb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 2.46, 0.1)), mats.oakDark);
  doorRightJamb.position.set(-0.04, 1.23, 0.61);
  const doorGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.72, 0.58)), mats.windowGlass);
  doorGlass.position.set(-0.03, 1.76, 0);
  const doorLowerPanel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.85, 0.78)), mats.oakDark);
  doorLowerPanel.position.set(-0.03, 0.64, 0);
  const doorHandle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.04, 0.16)), mats.brass);
  doorHandle.position.set(-0.09, 1.05, 0.42);
  doorGroup.add(doorLeaf, doorTopFrame, doorLeftJamb, doorRightJamb, doorGlass, doorLowerPanel, doorHandle);
  group.add(doorGroup);

  // Wooden Bookshelf + Instanced Books + Globe
  const shelfGroup = new THREE.Group();
  shelfGroup.position.set(rightWallX - 0.36, 0, 1.6);

  const shelfBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 1.78, 2.1)), mats.oakDark);
  shelfBack.position.set(0.24, 0.89, 0);
  const shelfLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 1.78, 0.07)), mats.oakFrame);
  shelfLeft.position.set(0, 0.89, -1.02);
  const shelfRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 1.78, 0.07)), mats.oakFrame);
  shelfRight.position.set(0, 0.89, 1.02);
  shelfGroup.add(shelfBack, shelfLeft, shelfRight);

  const plankGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.05, 2.02));
  const plankInst: InstanceTransform[] = [0.06, 0.52, 0.98, 1.42, 1.78].map((sy) => ({
    x: 0,
    y: sy,
    z: 0,
  }));
  shelfGroup.add(
    buildInstancedMesh(plankGeo, mats.oakDesk, plankInst, { castShadow: true, receiveShadow: true })
  );

  // All ~40 books rendered in a SINGLE InstancedMesh draw call!
  const bookGeo = trackGeo(new THREE.BoxGeometry(0.26, 0.28, 0.065));
  const instBookMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF' });
  materials.push(instBookMat);

  const bookInst: InstanceTransform[] = [];
  let bookIdx = 0;
  for (const by of [0.68, 1.14, 1.58]) {
    for (let bz = -0.84; bz <= 0.78; bz += 0.11) {
      if (bookIdx % 7 === 3) {
        bookIdx++;
        continue;
      }
      const scaleH = 0.86 + ((bookIdx * 17) % 5) * 0.07;
      bookInst.push({
        x: -0.04,
        y: by - (1 - scaleH) * 0.14,
        z: bz,
        rx: bookIdx % 9 === 0 ? 0.14 : 0,
        sy: scaleH,
        colorHex: BOOK_PALETTE_HEX[bookIdx % BOOK_PALETTE_HEX.length],
      });
      bookIdx++;
    }
  }
  shelfGroup.add(buildInstancedMesh(bookGeo, instBookMat, bookInst));

  // Classroom Globe
  const globeGroup = new THREE.Group();
  globeGroup.position.set(-0.04, 1.81, -0.45);
  const globeBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.04, 16)), mats.oakDark);
  globeBase.position.y = 0.02;
  const globeStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 10)), mats.brass);
  globeStem.position.y = 0.09;
  const globeArc = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.21, 0.012, 8, 24, Math.PI * 1.15)), mats.brass);
  globeArc.position.y = 0.31;
  globeArc.rotation.z = -Math.PI * 0.58;
  const globeMat = new THREE.MeshStandardMaterial({
    color: '#1D6F8A',
    roughness: 0.38,
    metalness: 0.08,
  });
  materials.push(globeMat);
  const globeSphere = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.175, 20, 16)), globeMat);
  globeSphere.position.y = 0.31;
  globeGroup.add(globeBase, globeStem, globeArc, globeSphere);
  shelfGroup.add(globeGroup);

  addContactShadow(shelfGroup, 1.0, 2.5, mats.contactShadow, trackGeo, 0.009);
  group.add(shelfGroup);

  // Analog Wall Clock
  const clockGroup = new THREE.Group();
  clockGroup.position.set(4.95, 3.45, frontWallZ + 0.07);
  const clockBezel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 28)), mats.oakDark);
  clockBezel.rotation.x = Math.PI / 2;
  const clockBrassTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.34, 0.018, 10, 28)), mats.brass);
  clockBrassTrim.position.z = 0.04;
  const clockTex = createWallClockTexture(maxAnisotropy);
  textures.push(clockTex);
  const clockFaceMat = new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false });
  materials.push(clockFaceMat);
  const clockFace = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.33, 28)), clockFaceMat);
  clockFace.position.z = 0.045;
  clockGroup.add(clockBezel, clockBrassTrim, clockFace);
  group.add(clockGroup);

  // Exposed Timber Ceiling Beams + 9 Schoolhouse Pendant Lights (Instanced: 4 draw calls total!)
  const beamGeo = trackGeo(new THREE.BoxGeometry(13.6, 0.18, 0.22));
  const rodGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 8));
  const shadeGeo = trackGeo(new THREE.ConeGeometry(0.28, 0.18, 16, 1, true));
  const bulbGeo = trackGeo(new THREE.SphereGeometry(0.085, 12, 10));

  const beamInst: InstanceTransform[] = [];
  const rodInst: InstanceTransform[] = [];
  const shadeInst: InstanceTransform[] = [];
  const bulbInst: InstanceTransform[] = [];

  for (const bz of [-4.2, -0.4, 3.4]) {
    beamInst.push({ x: 0, y: 4.92, z: bz });
    for (const lx of [-3.2, 0, 3.2]) {
      rodInst.push({ x: lx, y: 4.82 - 0.29, z: bz });
      shadeInst.push({ x: lx, y: 4.82 - 0.62, z: bz });
      bulbInst.push({ x: lx, y: 4.82 - 0.69, z: bz });
    }
  }

  group.add(
    buildInstancedMesh(beamGeo, mats.oakDark, beamInst),
    buildInstancedMesh(rodGeo, mats.brass, rodInst),
    buildInstancedMesh(shadeGeo, mats.pendantShade, shadeInst),
    buildInstancedMesh(bulbGeo, mats.bulbEmissive, bulbInst)
  );

  freezeStaticGroup(group);

  return { group, disposables: { geometries, textures, materials } };
}

export function buildChalkboardAssembly(
  mats: SharedClassroomMaterials,
  chalkboardMaterial: THREE.MeshBasicMaterial
): {
  group: THREE.Group;
  hitbox: THREE.Mesh;
  geometries: THREE.BufferGeometry[];
} {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  group.position.set(0, 2.68, -6.22);

  const boardW = 6.4;
  const boardH = 2.52;

  const boardBacking = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(boardW, boardH, 0.05)), mats.oakDark);
  boardBacking.position.z = 0.03;
  group.add(boardBacking);

  const boardFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(boardW, boardH)), chalkboardMaterial);
  boardFace.position.z = 0.06;
  markHitbox(boardFace, { kind: 'chalkboard' });
  group.add(boardFace);

  const topFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(boardW + 0.24, 0.13, 0.12)), mats.oakFrame);
  topFrame.position.set(0, boardH / 2 + 0.065, 0.06);
  const botFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(boardW + 0.24, 0.13, 0.12)), mats.oakFrame);
  botFrame.position.set(0, -boardH / 2 - 0.065, 0.06);
  const leftFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.13, boardH, 0.12)), mats.oakFrame);
  leftFrame.position.set(-boardW / 2 - 0.065, 0, 0.06);
  const rightFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.13, boardH, 0.12)), mats.oakFrame);
  rightFrame.position.set(boardW / 2 + 0.065, 0, 0.06);
  group.add(topFrame, botFrame, leftFrame, rightFrame);

  const tray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(boardW + 0.16, 0.055, 0.22)), mats.oakDesk);
  tray.position.set(0, -boardH / 2 - 0.11, 0.14);
  tray.castShadow = true;
  group.add(tray);

  const chalkGeo = trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 8));
  const chalkInst: InstanceTransform[] = [-0.95, -0.78, 0.86].map((cx, i) => ({
    x: cx,
    y: -boardH / 2 - 0.072,
    z: 0.18,
    ry: (i - 1) * 0.15,
    rz: Math.PI / 2,
  }));
  group.add(buildInstancedMesh(chalkGeo, mats.chalkWhite, chalkInst));

  const dusterPad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.032, 0.085)), mats.steelFrame);
  dusterPad.position.set(1.55, -boardH / 2 - 0.065, 0.17);
  const dusterTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.21, 0.036, 0.08)), mats.oakDark);
  dusterTop.position.set(1.55, -boardH / 2 - 0.032, 0.17);
  group.add(dusterPad, dusterTop);

  const lightBar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 4.0, 12)), mats.brass);
  lightBar.rotation.z = Math.PI / 2;
  lightBar.position.set(0, boardH / 2 + 0.34, 0.36);
  const bracketGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.04, 0.38));
  group.add(
    buildInstancedMesh(bracketGeo, mats.brass, [
      { x: -1.45, y: boardH / 2 + 0.34, z: 0.18 },
      { x: 1.45, y: boardH / 2 + 0.34, z: 0.18 },
    ])
  );
  group.add(lightBar);

  freezeStaticGroup(group);

  return { group, hitbox: boardFace, geometries };
}

export function buildTeacherPodiumStage(
  teachers: TeacherProfile[],
  mats: SharedClassroomMaterials,
  maxAnisotropy: number,
  cardTintHex: string,
  onRedraw: () => void
): {
  group: THREE.Group;
  teacherHandles: TeacherInteractiveHandle[];
  cleanup: () => void;
} {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const cancelFns: (() => void)[] = [];
  const teacherHandles: TeacherInteractiveHandle[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const stageZ = -4.95;
  const stageW = 7.4;
  const stageD = 1.65;
  const stageH = 0.18;

  const staticPodium = new THREE.Group();

  const platform = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(stageW, stageH, stageD)), mats.oakFrame);
  platform.position.set(0, stageH / 2, stageZ);
  platform.receiveShadow = true;
  platform.castShadow = true;
  staticPodium.add(platform);

  const nosing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(stageW + 0.02, 0.035, 0.045)), mats.brass);
  nosing.position.set(0, stageH - 0.012, stageZ + stageD / 2 + 0.01);
  staticPodium.add(nosing);

  addContactShadow(staticPodium, stageW + 0.6, stageD + 0.5, mats.contactShadow, trackGeo, 0.008);

  // Teacher Lectern
  const lectern = new THREE.Group();
  lectern.position.set(-2.85, stageH, stageZ + 0.16);

  const lBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.06, 0.46)), mats.oakDark);
  lBase.position.y = 0.03;
  const lColumn = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.96, 0.24)), mats.oakFrame);
  lColumn.position.y = 0.54;
  lColumn.castShadow = true;
  const lFrontTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.72, 0.03)), mats.oakDark);
  lFrontTrim.position.set(0, 0.56, 0.13);
  const lTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.05, 0.52)), mats.oakDesk);
  lTop.position.set(0, 1.05, 0.03);
  lTop.rotation.x = 0.24;
  lTop.castShadow = true;
  const lLip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.74, 0.045, 0.03)), mats.brass);
  lLip.position.set(0, 0.99, 0.27);
  const lBookLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.025, 0.3)), mats.chalkWhite);
  lBookLeft.position.set(-0.13, 1.09, 0.02);
  lBookLeft.rotation.set(0.24, 0, -0.06);
  const lBookRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.025, 0.3)), mats.chalkWhite);
  lBookRight.position.set(0.13, 1.09, 0.02);
  lBookRight.rotation.set(0.24, 0, 0.06);
  lectern.add(lBase, lColumn, lFrontTrim, lTop, lLip, lBookLeft, lBookRight);
  staticPodium.add(lectern);

  freezeStaticGroup(staticPodium);
  group.add(staticPodium);

  // Subject Teacher Portrait Easels
  const count = teachers.length;
  if (count > 0) {
    const spacing = Math.min(1.55, 5.0 / Math.max(count, 1));
    const startX = 0.55 - ((count - 1) * spacing) / 2;

    const frameOuterGeo = trackGeo(new THREE.BoxGeometry(1.02, 1.24, 0.07));
    const cardFaceGeo = trackGeo(new THREE.PlaneGeometry(0.92, 1.15));
    const easelFootGeo = trackGeo(new THREE.BoxGeometry(0.78, 0.065, 0.36));
    const easelPropGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.9, 0.06));
    const hitGeo = trackGeo(new THREE.BoxGeometry(1.12, 1.35, 0.45));
    const invisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
    materials.push(invisibleHitMat);

    teachers.forEach((teacher, idx) => {
      const easelGroup = new THREE.Group();
      const ex = startX + idx * spacing;
      easelGroup.position.set(ex, stageH, stageZ + 0.12);

      const foot = new THREE.Mesh(easelFootGeo, mats.oakDark);
      foot.position.set(0, 0.032, 0);
      foot.castShadow = true;

      const backProp = new THREE.Mesh(easelPropGeo, mats.oakDark);
      backProp.position.set(0, 0.48, -0.2);
      backProp.rotation.x = 0.32;

      const frameOuter = new THREE.Mesh(frameOuterGeo, mats.oakFrame);
      frameOuter.position.set(0, 0.67, 0.02);
      frameOuter.rotation.x = -0.1;
      frameOuter.castShadow = true;

      const { texture, cancelAsync } = createTeacherPortraitTexture(teacher, maxAnisotropy, onRedraw);
      textures.push(texture);
      cancelFns.push(cancelAsync);

      const faceMat = new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(cardTintHex),
        toneMapped: false,
      });
      materials.push(faceMat);

      const faceMesh = new THREE.Mesh(cardFaceGeo, faceMat);
      faceMesh.position.set(0, 0.67, 0.06);
      faceMesh.rotation.x = -0.1;

      const hitbox = new THREE.Mesh(hitGeo, invisibleHitMat);
      hitbox.position.set(0, 0.67, 0.05);
      markHitbox(hitbox, { kind: 'teacher', teacherId: teacher.id });

      easelGroup.add(foot, backProp, frameOuter, faceMesh, hitbox);
      group.add(easelGroup);

      teacherHandles.push({
        teacherId: teacher.id,
        easelGroup,
        cardMaterial: faceMat,
        baseY: stageH,
        hitbox,
      });
    });
  }

  return {
    group,
    teacherHandles,
    cleanup: () => {
      cancelFns.forEach((fn) => fn());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

export interface BenchGridOptions {
  seats: StudentSeat[];
  searchQuery: string;
  movingSeatId: string | null;
  canModifySeat: (seatId: string) => boolean;
  mats: SharedClassroomMaterials;
  maxAnisotropy: number;
  cardTintHex: string;
  onRedraw: () => void;
}

export function buildStudentBenchGrid({
  seats,
  searchQuery,
  movingSeatId,
  canModifySeat,
  mats,
  maxAnisotropy,
  cardTintHex,
  onRedraw,
}: BenchGridOptions): {
  group: THREE.Group;
  seatHandles: Map<string, SeatInteractiveHandle>;
  ringInstMesh: THREE.InstancedMesh | null;
  standBaseInstMesh: THREE.InstancedMesh | null;
  standFrameInstMesh: THREE.InstancedMesh | null;
  cleanup: () => void;
} {
  const group = new THREE.Group();
  const seatHandles = new Map<string, SeatInteractiveHandle>();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const cancelFns: (() => void)[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const benchWidth = 7.6;
  const deskDepth = 0.64;
  const deskY = 0.76;
  const seatY = 0.45;
  const rowSpacing = 1.98;
  const firstRowZ = -2.2;

  const deskTopGeo = trackGeo(new THREE.BoxGeometry(benchWidth, 0.058, deskDepth));
  const underShelfGeo = trackGeo(new THREE.BoxGeometry(benchWidth - 0.16, 0.032, 0.4));
  const modestyGeo = trackGeo(new THREE.BoxGeometry(benchWidth - 0.14, 0.34, 0.036));
  const benchPlankGeo = trackGeo(new THREE.BoxGeometry(benchWidth, 0.05, 0.36));
  const backrestGeo = trackGeo(new THREE.BoxGeometry(benchWidth, 0.16, 0.038));
  const legDeskGeo = trackGeo(new THREE.BoxGeometry(0.055, deskY, 0.055));
  const legBenchGeo = trackGeo(new THREE.BoxGeometry(0.05, seatY, 0.05));
  const backPostGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.38, 0.045));
  const tieBarGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.045, 0.94));
  const footRailGeo = trackGeo(new THREE.BoxGeometry(benchWidth - 0.2, 0.036, 0.036));
  const dividerGeo = trackGeo(new THREE.BoxGeometry(0.025, 0.012, deskDepth - 0.08));
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(benchWidth + 0.65, 1.55));

  const standBaseGeo = trackGeo(new THREE.BoxGeometry(1.42, 0.05, 0.24));
  const standFrameGeo = trackGeo(new THREE.BoxGeometry(1.5, 1.0, 0.05));
  const standCardGeo = trackGeo(new THREE.PlaneGeometry(1.42, 0.94));
  const ringGeo = trackGeo(new THREE.BoxGeometry(1.6, 0.026, 0.46));
  const hitGeo = trackGeo(new THREE.BoxGeometry(1.78, 1.25, 1.18));
  const notebookGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.024, 0.28));
  const pencilGeo = trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8));
  const rowPlaqueGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.26, 0.66));
  const invisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const instNotebookMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF' });
  const instRingMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false });
  materials.push(invisibleHitMat, instNotebookMat, instRingMat);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const seatsPerBench = 4;
  const totalRows = Math.ceil(seats.length / seatsPerBench);
  const seatXs = [-2.82, -0.94, 0.94, 2.82];

  // Collect all repeated bench & seat stand transforms into InstancedMeshes (~220 meshes -> 16 draw calls!)
  const shadowInst: InstanceTransform[] = [];
  const deskTopInst: InstanceTransform[] = [];
  const underShelfInst: InstanceTransform[] = [];
  const modestyInst: InstanceTransform[] = [];
  const benchPlankInst: InstanceTransform[] = [];
  const backrestInst: InstanceTransform[] = [];
  const dividerInst: InstanceTransform[] = [];
  const legDeskInst: InstanceTransform[] = [];
  const legBenchInst: InstanceTransform[] = [];
  const backPostInst: InstanceTransform[] = [];
  const tieBarInst: InstanceTransform[] = [];
  const footRailInst: InstanceTransform[] = [];
  const notebookInst: InstanceTransform[] = [];
  const pencilInst: InstanceTransform[] = [];
  const ringInst: InstanceTransform[] = [];
  const standBaseInst: InstanceTransform[] = [];
  const standFrameInst: InstanceTransform[] = [];

  let seatInstanceIndex = 0;

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    const rowSeats = seats.slice(rowIdx * seatsPerBench, rowIdx * seatsPerBench + seatsPerBench);
    const rowZ = firstRowZ + rowIdx * rowSpacing;

    shadowInst.push({ x: 0, y: 0.008, z: rowZ, rx: -Math.PI / 2 });
    deskTopInst.push({ x: 0, y: deskY, z: rowZ - 0.24 });
    underShelfInst.push({ x: 0, y: deskY - 0.16, z: rowZ - 0.28 });
    modestyInst.push({ x: 0, y: deskY - 0.22, z: rowZ - 0.52 });
    benchPlankInst.push({ x: 0, y: seatY, z: rowZ + 0.42 });
    backrestInst.push({ x: 0, y: seatY + 0.31, z: rowZ + 0.61, rx: -0.14 });

    for (const divX of [-1.88, 0, 1.88]) {
      dividerInst.push({ x: divX, y: deskY + 0.032, z: rowZ - 0.24 });
    }

    for (const lx of [-3.58, 0, 3.58]) {
      legDeskInst.push({ x: lx, y: deskY / 2, z: rowZ - 0.46 });
      legDeskInst.push({ x: lx, y: deskY / 2, z: rowZ - 0.02 });
      legBenchInst.push({ x: lx, y: seatY / 2, z: rowZ + 0.48 });
      backPostInst.push({ x: lx, y: seatY + 0.19, z: rowZ + 0.59, rx: -0.14 });
      tieBarInst.push({ x: lx, y: 0.14, z: rowZ + 0.02 });
    }

    footRailInst.push({ x: 0, y: 0.14, z: rowZ - 0.22 });

    // Aisle Row Plaque (glare-free crisp badge)
    const plaqueLabel =
      rowIdx === 0
        ? 'Row 1 · Front'
        : rowIdx === totalRows - 1
          ? `Row ${rowIdx + 1} · Back`
          : `Row ${rowIdx + 1}`;
    const plaqueTex = createRowMarkerTexture(plaqueLabel, maxAnisotropy);
    textures.push(plaqueTex);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, toneMapped: false });
    materials.push(plaqueMat);
    const plaqueMesh = new THREE.Mesh(rowPlaqueGeo, plaqueMat);
    plaqueMesh.position.set(-benchWidth / 2 - 0.025, deskY - 0.24, rowZ - 0.22);
    plaqueMesh.matrixAutoUpdate = false;
    plaqueMesh.updateMatrix();
    group.add(plaqueMesh);

    rowSeats.forEach((seat, colIdx) => {
      const sx = seatXs[colIdx] ?? 0;
      const isOccupied = seat.occupant !== null;
      const idx = seatInstanceIndex++;

      let isMatch = false;
      if (normalizedQuery && seat.occupant) {
        const o = seat.occupant;
        isMatch =
          o.fullName.toLowerCase().includes(normalizedQuery) ||
          (o.nickname?.toLowerCase().includes(normalizedQuery) ?? false) ||
          o.city.toLowerCase().includes(normalizedQuery) ||
          o.country.toLowerCase().includes(normalizedQuery) ||
          o.profession.toLowerCase().includes(normalizedQuery);
      }
      const isDimmed = Boolean(normalizedQuery) && !isMatch;
      const isOwned = isOccupied && canModifySeat(seat.id);
      const isMovingSource = movingSeatId === seat.id;
      const isMoveTarget = Boolean(movingSeatId) && !isOccupied;

      const state: SeatTextureState = {
        isMatch,
        isDimmed,
        isOwned,
        isMoveTarget,
        isMovingSource,
      };

      const ringColorHex = isMovingSource
        ? '#F59E0B'
        : isMoveTarget
          ? '#10B981'
          : isMatch
            ? '#F59E0B'
            : isOwned
              ? '#15803D'
              : '#7A4C24';
      const baseRingColor = new THREE.Color(ringColorHex);

      const baseStandY = deskY + 0.05;
      const standZ = rowZ - 0.26;

      ringInst.push({ x: sx, y: deskY + 0.038, z: rowZ - 0.24, colorHex: ringColorHex });
      standBaseInst.push({ x: sx, y: baseStandY + 0.025, z: standZ + 0.02 });
      standFrameInst.push({ x: sx, y: baseStandY + 0.52, z: standZ, rx: -0.18 });

      const { texture, cancelAsync } = createSeatNameplateTexture(
        seat,
        state,
        maxAnisotropy,
        onRedraw
      );
      textures.push(texture);
      cancelFns.push(cancelAsync);

      const cardMat = new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(cardTintHex),
        toneMapped: false,
      });
      materials.push(cardMat);

      const cardFace = new THREE.Mesh(standCardGeo, cardMat);
      cardFace.position.set(sx, baseStandY + 0.52, standZ + 0.032);
      cardFace.rotation.x = -0.18;
      cardFace.matrixAutoUpdate = false;
      cardFace.updateMatrix();
      group.add(cardFace);

      if (isOccupied) {
        notebookInst.push({
          x: sx + 0.72,
          y: deskY + 0.044,
          z: rowZ - 0.12,
          ry: ((seat.seatNumber % 3) - 1) * 0.14,
          colorHex: BOOK_PALETTE_HEX[(seat.seatNumber - 1) % BOOK_PALETTE_HEX.length],
        });
        pencilInst.push({
          x: sx - 0.72,
          y: deskY + 0.038,
          z: rowZ - 0.08,
          ry: 0.28,
          rz: Math.PI / 2,
        });
      }

      const hitbox = new THREE.Mesh(hitGeo, invisibleHitMat);
      hitbox.position.set(sx, deskY + 0.45, rowZ - 0.05);
      hitbox.matrixAutoUpdate = false;
      hitbox.updateMatrix();
      markHitbox(hitbox, {
        kind: 'seat',
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        isOccupied,
      });
      group.add(hitbox);

      seatHandles.set(seat.id, {
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        isOccupied,
        instanceIndex: idx,
        baseX: sx,
        baseStandY,
        baseZ: standZ,
        currentLift: 0,
        cardMesh: cardFace,
        cardMaterial: cardMat,
        baseRingColor,
        hitbox,
      });
    });
  }

  let ringInstMesh: THREE.InstancedMesh | null = null;
  let standBaseInstMesh: THREE.InstancedMesh | null = null;
  let standFrameInstMesh: THREE.InstancedMesh | null = null;

  if (totalRows > 0) {
    group.add(
      buildInstancedMesh(shadowGeo, mats.contactShadow, shadowInst, { renderOrder: 1 }),
      buildInstancedMesh(deskTopGeo, mats.oakDesk, deskTopInst, {
        castShadow: true,
        receiveShadow: true,
      }),
      buildInstancedMesh(underShelfGeo, mats.oakFrame, underShelfInst),
      buildInstancedMesh(modestyGeo, mats.oakFrame, modestyInst, { castShadow: true }),
      buildInstancedMesh(benchPlankGeo, mats.oakDesk, benchPlankInst, {
        castShadow: true,
        receiveShadow: true,
      }),
      buildInstancedMesh(backrestGeo, mats.oakFrame, backrestInst, { castShadow: true }),
      buildInstancedMesh(dividerGeo, mats.oakDark, dividerInst),
      buildInstancedMesh(legDeskGeo, mats.steelFrame, legDeskInst),
      buildInstancedMesh(legBenchGeo, mats.steelFrame, legBenchInst),
      buildInstancedMesh(backPostGeo, mats.steelFrame, backPostInst),
      buildInstancedMesh(tieBarGeo, mats.steelFrame, tieBarInst),
      buildInstancedMesh(footRailGeo, mats.steelFrame, footRailInst)
    );
  }

  if (ringInst.length > 0) {
    ringInstMesh = buildInstancedMesh(ringGeo, instRingMat, ringInst);
    standBaseInstMesh = buildInstancedMesh(standBaseGeo, mats.oakDark, standBaseInst, {
      castShadow: true,
    });
    standFrameInstMesh = buildInstancedMesh(standFrameGeo, mats.oakDark, standFrameInst, {
      castShadow: true,
    });
    ringInstMesh.frustumCulled = false;
    standBaseInstMesh.frustumCulled = false;
    standFrameInstMesh.frustumCulled = false;
    group.add(ringInstMesh, standBaseInstMesh, standFrameInstMesh);
  }

  if (notebookInst.length > 0) {
    group.add(
      buildInstancedMesh(notebookGeo, instNotebookMat, notebookInst, { castShadow: true }),
      buildInstancedMesh(pencilGeo, mats.pencilYellow, pencilInst)
    );
  }

  return {
    group,
    seatHandles,
    ringInstMesh,
    standBaseInstMesh,
    standFrameInstMesh,
    cleanup: () => {
      cancelFns.forEach((fn) => fn());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
