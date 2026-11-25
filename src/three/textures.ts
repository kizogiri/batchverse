import * as THREE from 'three';
import { ChalkboardConfig, StudentSeat, TeacherProfile } from '@/src/types/classroom';
import { formatNicknameQuoted } from '@/src/utils/nickname';

// Persistent decoded image cache so switching grades or searching never flashes or stutters
const loadedImageCache = new Map<string, HTMLImageElement>();

function loadCachedImage(url: string, onLoad: (img: HTMLImageElement) => void): () => void {
  const existing = loadedImageCache.get(url);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    onLoad(existing);
    return () => {};
  }

  let cancelled = false;
  const img = existing ?? new Image();
  img.crossOrigin = 'anonymous';
  const handleLoad = () => {
    loadedImageCache.set(url, img);
    if (!cancelled) onLoad(img);
  };
  img.addEventListener('load', handleLoad, { once: true });
  if (!existing) {
    img.src = url;
  }
  return () => {
    cancelled = true;
    img.removeEventListener('load', handleLoad);
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTES: [string, string][] = [
  ['#14532D', '#FEF9C3'],
  ['#9A3412', '#FFEDD5'],
  ['#1E40AF', '#DBEAFE'],
  ['#6B21A8', '#F3E8FF'],
  ['#0F766E', '#CCFBF1'],
  ['#9F1239', '#FFE4E6'],
  ['#3F6212', '#ECFCCB'],
  ['#B45309', '#FEF3C7'],
];

function getPaletteForName(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }
  lines.push(current);

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }
  const last = lines[lines.length - 1];
  if (ctx.measureText(last).width > maxWidth) {
    let trimmed = last;
    while (trimmed.length > 3 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    lines[lines.length - 1] = `${trimmed}…`;
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function createOakWoodTexture(
  maxAnisotropy: number,
  variant: 'desk' | 'frame' | 'dark' = 'desk'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  const rand = mulberry32(variant === 'desk' ? 1042 : variant === 'frame' ? 2088 : 3099);

  // Rich, warm, saturated honey-oak and walnut wood palettes
  const palettes = {
    desk: { base: '#C27D3E', mid: '#A96329', dark: '#7C4115', light: '#D69554' },
    frame: { base: '#8B4F22', mid: '#733D16', dark: '#4B250A', light: '#A66533' },
    dark: { base: '#573116', mid: '#45240E', dark: '#2E1607', light: '#6F4020' },
  };
  const pal = palettes[variant];

  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.055) * 0.5 + Math.cos(y * 0.017) * 0.5;
    ctx.fillStyle = wave > 0.2 ? pal.light : wave < -0.2 ? pal.mid : pal.base;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(0, y, 512, 2);
  }

  for (let i = 0; i < 460; i++) {
    const y = rand() * 512;
    const h = 0.8 + rand() * 2.2;
    ctx.fillStyle = rand() > 0.38 ? pal.dark : pal.light;
    ctx.globalAlpha = 0.12 + rand() * 0.16;
    ctx.fillRect(0, y, 512, h);
  }

  for (let k = 0; k < 3; k++) {
    const kx = 80 + rand() * 350;
    const ky = 60 + rand() * 390;
    const rx = 18 + rand() * 26;
    const ry = 5 + rand() * 7;
    ctx.strokeStyle = pal.dark;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 1.8;
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, rx * ring * 0.55, ry * ring * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(maxAnisotropy, 4);
  return texture;
}

export function createFloorTileTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(8871);

  // Warm sunlit sandstone & schoolhouse parquet-terrazzo checker for real depth & color contrast
  const tileTints = ['#E4D3B7', '#D9C4A3', '#DCC8A8', '#E2D0B2'];
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      ctx.fillStyle = tileTints[ty * 2 + tx];
      ctx.fillRect(tx * 256, ty * 256, 256, 256);
    }
  }

  const speckColors = ['#C2A983', '#AD916A', '#EFE2CC', '#967B57', '#F7EFE0'];
  for (let i = 0; i < 1400; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const size = 1.2 + rand() * 3.4;
    ctx.fillStyle = speckColors[Math.floor(rand() * speckColors.length)];
    ctx.globalAlpha = 0.35 + rand() * 0.35;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;

  // Crisp grout seams
  ctx.strokeStyle = '#B59B78';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(512, 0);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 512);
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 8);
  texture.anisotropy = Math.min(maxAnisotropy, 4);
  return texture;
}

export function createWallPlasterTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  const rand = mulberry32(4219);

  // Warm sunlit buttercream wall plaster
  ctx.fillStyle = '#F7EEDB';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 4;
    ctx.fillStyle = rand() > 0.5 ? '#EFE2C9' : '#FCF6E8';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.anisotropy = Math.min(maxAnisotropy, 4);
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 122);
  grad.addColorStop(0, 'rgba(32, 20, 10, 0.42)');
  grad.addColorStop(0.55, 'rgba(32, 20, 10, 0.2)');
  grad.addColorStop(1, 'rgba(32, 20, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createChalkboardCanvasTexture(
  chalkboard: ChalkboardConfig,
  gradeLabel: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 436;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 4);
  updateChalkboardCanvasTexture(texture, chalkboard, gradeLabel);
  return texture;
}

export function updateChalkboardCanvasTexture(
  texture: THREE.CanvasTexture,
  chalkboard: ChalkboardConfig,
  gradeLabel: string
) {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(canvas.width / 1280, 0, 0, canvas.height / 544, 0, 0);
  const rand = mulberry32(9911);

  // Deep vibrant schoolhouse emerald slate
  const grad = ctx.createRadialGradient(640, 240, 70, 640, 272, 700);
  grad.addColorStop(0, '#1B4D3A');
  grad.addColorStop(0.65, '#143D2E');
  grad.addColorStop(1, '#0E2D22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 544);

  // Gentle chalk smudge clouds
  for (let i = 0; i < 36; i++) {
    const x = 80 + rand() * 1120;
    const y = 50 + rand() * 440;
    const rx = 30 + rand() * 85;
    const ry = 10 + rand() * 26;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp double chalk frame
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.42)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 28, 24, 1224, 496, 12);
  ctx.stroke();

  // Top eyebrow: Grade + Batch Year
  ctx.fillStyle = '#FDE68A';
  ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const eyebrow = [gradeLabel.toUpperCase(), chalkboard.year].filter(Boolean).join('  ·  ');
  ctx.fillText(eyebrow, 640, 86);

  // Main chalkboard headline (crisp white chalk)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 58px Georgia, "Times New Roman", serif';
  const titleLines = wrapTextLines(ctx, chalkboard.title || 'BatchVerse Classroom', 1120, 2);
  let yCursor = titleLines.length === 1 ? 182 : 158;
  for (const line of titleLines) {
    ctx.fillText(line, 640, yCursor);
    yCursor += 66;
  }

  // Warm gold divider line
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.58)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(320, yCursor + 8);
  ctx.lineTo(960, yCursor + 8);
  ctx.stroke();

  // Announcement copy
  ctx.fillStyle = '#ECFDF5';
  ctx.font = 'italic 32px Georgia, "Times New Roman", serif';
  const announcementText =
    chalkboard.announcement?.trim() ||
    'Click any vacant wooden desk to claim your seat and connect with classmates.';
  const bodyLines = wrapTextLines(ctx, announcementText, 1080, 3);
  let bodyY = yCursor + 64;
  for (const line of bodyLines) {
    ctx.fillText(line, 640, bodyY);
    bodyY += 46;
  }

  texture.needsUpdate = true;
}

export interface SeatTextureState {
  isMatch: boolean;
  isDimmed: boolean;
  isOwned: boolean;
  isMoveTarget: boolean;
  isMovingSource: boolean;
}

function drawCircularPortrait(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  name: string,
  img: HTMLImageElement | null,
  ringColor: string
) {
  // Subtle drop shadow behind avatar circle for pop
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy + 5, radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW = radius * 2;
    let drawH = radius * 2;
    if (aspect > 1) {
      drawW = drawH * aspect;
    } else {
      drawH = drawW / aspect;
    }
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  } else {
    const [bg, fg] = getPaletteForName(name);
    ctx.fillStyle = bg;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = fg;
    ctx.font = `800 ${Math.round(radius * 0.82)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(name), cx, cy + 3);
  }
  ctx.restore();

  // Crisp inner white halo + outer vibrant ring
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.stroke();
}

export function createSeatNameplateTexture(
  seat: StudentSeat,
  state: SeatTextureState,
  maxAnisotropy: number,
  onRedraw: () => void
): { texture: THREE.CanvasTexture; cancelAsync: () => void } {
  // Optimized texture resolution: 512x342 for occupied student cards, 384x256 for vacant cards
  const canvas = document.createElement('canvas');
  if (seat.occupant) {
    canvas.width = 512;
    canvas.height = 342;
  } else {
    canvas.width = 384;
    canvas.height = 256;
  }
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 4);

  const seatNumLabel = `#${String(seat.seatNumber).padStart(2, '0')}`;

  const renderCard = (img: HTMLImageElement | null) => {
    ctx.setTransform(canvas.width / 768, 0, 0, canvas.height / 512, 0, 0);
    ctx.clearRect(0, 0, 768, 512);

    if (!seat.occupant) {
      // Rich, clearly distinguishable Vacant Desk Card
      ctx.fillStyle = state.isMoveTarget ? '#065F46' : '#26352E';
      ctx.fillRect(0, 0, 768, 512);

      // Inner warm card panel
      ctx.fillStyle = state.isMoveTarget ? '#ECFDF5' : '#F6EFE0';
      drawRoundedRect(ctx, 20, 20, 728, 472, 22);
      ctx.fill();

      // Bold dashed border
      ctx.save();
      ctx.setLineDash([20, 14]);
      ctx.strokeStyle = state.isMoveTarget ? '#059669' : '#8C6239';
      ctx.lineWidth = 7;
      drawRoundedRect(ctx, 38, 38, 692, 436, 16);
      ctx.stroke();
      ctx.restore();

      // Seat number badge
      ctx.fillStyle = state.isMoveTarget ? '#047857' : '#1E3A2F';
      drawRoundedRect(ctx, 244, 72, 280, 68, 16);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.font = '800 38px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`SEAT ${seatNumLabel}`, 384, 108);

      // Plus icon circle
      ctx.fillStyle = state.isMoveTarget ? '#059669' : '#D97706';
      ctx.beginPath();
      ctx.arc(384, 256, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(354, 256);
      ctx.lineTo(414, 256);
      ctx.moveTo(384, 226);
      ctx.lineTo(384, 286);
      ctx.stroke();

      // Bold label
      ctx.fillStyle = state.isMoveTarget ? '#064E3B' : '#1C1917';
      ctx.font = '800 46px system-ui, -apple-system, sans-serif';
      ctx.fillText(state.isMoveTarget ? 'CLICK TO MOVE HERE' : 'CLAIM THIS SEAT', 384, 392);

      if (state.isDimmed) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.56)';
        ctx.fillRect(0, 0, 768, 512);
      }
      texture.needsUpdate = true;
      return;
    }

    // Occupied Student Alumni ID Placard — High-Contrast & Vivid
    const occ = seat.occupant;
    ctx.fillStyle = state.isMatch ? '#FEF3C7' : '#FFFFFF';
    ctx.fillRect(0, 0, 768, 512);

    // Rich top school header band
    const bandColor = state.isMovingSource
      ? '#B45309'
      : state.isMatch
        ? '#D97706'
        : state.isOwned
          ? '#0F5132'
          : '#18362B';
    ctx.fillStyle = bandColor;
    ctx.fillRect(0, 0, 768, 100);

    // Subtle gold accent stripe under header band
    ctx.fillStyle = state.isMatch ? '#F59E0B' : '#D97706';
    ctx.fillRect(0, 100, 768, 8);

    // Seat Number (Bold & Crisp)
    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 38px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SEAT ${seatNumLabel}`, 32, 52);

    // Status Tag on top-right
    ctx.textAlign = 'right';
    ctx.font = '800 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const headerRight = state.isMovingSource
      ? 'MOVING...'
      : state.isMatch
        ? '★ MATCH'
        : state.isOwned
          ? '★ YOUR SEAT'
          : 'CLASSMATE';
    ctx.fillText(headerRight, 736, 52);

    // LARGE Circular Profile Photo / Initials on the left
    const ringColor = state.isMatch ? '#F59E0B' : state.isOwned ? '#059669' : '#B45309';
    drawCircularPortrait(ctx, 162, 304, 118, occ.fullName, img, ringColor);

    // Bold High-Contrast Text Stack on the right
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 50px Georgia, "Times New Roman", serif';
    const nameLines = wrapTextLines(ctx, occ.fullName, 430, 2);
    let ty = 136;
    for (const line of nameLines) {
      ctx.fillText(line, 314, ty);
      ty += 56;
    }

    const formattedNick = formatNicknameQuoted(occ.nickname);
    if (formattedNick) {
      ctx.fillStyle = '#B45309';
      ctx.font = 'italic 700 34px system-ui, -apple-system, sans-serif';
      const nick = wrapTextLines(ctx, formattedNick, 430, 1)[0] ?? '';
      ctx.fillText(nick, 314, ty + 4);
      ty += 44;
    }

    // Profession
    ctx.fillStyle = '#334155';
    ctx.font = '700 30px system-ui, -apple-system, sans-serif';
    const profLine = wrapTextLines(ctx, occ.profession, 430, 1)[0] ?? '';
    ctx.fillText(profLine, 314, Math.max(ty + 10, 294));

    // High-contrast City + Country Flag bar at bottom
    ctx.fillStyle = '#1E293B';
    drawRoundedRect(ctx, 312, 388, 424, 78, 16);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 32px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    const locStr = `${occ.countryFlag ? `${occ.countryFlag} ` : ''}${occ.city}, ${occ.country}`;
    const fittedLoc = wrapTextLines(ctx, locStr, 392, 1)[0] ?? locStr;
    ctx.fillText(fittedLoc, 332, 427);

    // Bold Outer Border Frame
    ctx.strokeStyle = state.isMatch ? '#F59E0B' : state.isOwned ? '#059669' : '#18362B';
    ctx.lineWidth = state.isMatch ? 18 : 12;
    ctx.strokeRect(6, 6, 756, 500);

    if (state.isDimmed) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
      ctx.fillRect(0, 0, 768, 512);
    }

    texture.needsUpdate = true;
  };

  let cancelAsync = () => {};
  const photoUrl = seat.occupant?.photoUrl;
  const cachedImg = photoUrl ? loadedImageCache.get(photoUrl) : null;

  if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
    renderCard(cachedImg);
  } else {
    renderCard(null);
    if (photoUrl) {
      cancelAsync = loadCachedImage(photoUrl, (img) => {
        renderCard(img);
        onRedraw();
      });
    }
  }

  return { texture, cancelAsync };
}

export function createTeacherPortraitTexture(
  teacher: TeacherProfile,
  maxAnisotropy: number,
  onRedraw: () => void
): { texture: THREE.CanvasTexture; cancelAsync: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 4);

  const renderCard = (img: HTMLImageElement | null) => {
    ctx.setTransform(canvas.width / 512, 0, 0, canvas.height / 640, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 640);

    // Deep emerald faculty header
    ctx.fillStyle = '#143D2E';
    ctx.fillRect(0, 0, 512, 114);
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, 114, 512, 8);

    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 30px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subjLine = wrapTextLines(ctx, teacher.subject.toUpperCase(), 464, 1)[0] ?? teacher.subject;
    ctx.fillText(subjLine, 256, 58);

    // Large vivid portrait
    drawCircularPortrait(ctx, 256, 276, 126, teacher.name, img, '#D97706');

    // Bold dark Teacher Name
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 42px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nameLines = wrapTextLines(ctx, teacher.name, 456, 2);
    let y = 430;
    for (const line of nameLines) {
      ctx.fillText(line, 256, y);
      y += 48;
    }

    // Years badge
    ctx.fillStyle = '#1E293B';
    drawRoundedRect(ctx, 116, 548, 280, 54, 14);
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.font = '700 26px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(teacher.yearsTaught || 'Faculty Mentor', 256, 575);

    // Outer gold frame border
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 626);

    texture.needsUpdate = true;
  };

  let cancelAsync = () => {};
  const photoUrl = teacher.photoUrl;
  const cachedImg = photoUrl ? loadedImageCache.get(photoUrl) : null;

  if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
    renderCard(cachedImg);
  } else {
    renderCard(null);
    if (photoUrl) {
      cancelAsync = loadCachedImage(photoUrl, (img) => {
        renderCard(img);
        onRedraw();
      });
    }
  }

  return { texture, cancelAsync };
}

export function createRowMarkerTexture(
  rowLabel: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#143D2E';
  ctx.fillRect(0, 0, 320, 112);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 312, 104);

  ctx.fillStyle = '#FEF08A';
  ctx.font = '800 32px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rowLabel.toUpperCase(), 160, 56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 4);
  return texture;
}

export function createWallClockTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4A2B11';
  ctx.lineWidth = 10;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 3 === 0;
    const r1 = isMajor ? 88 : 98;
    const r2 = 112;
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = isMajor ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(angle) * r1, 128 + Math.sin(angle) * r1);
    ctx.lineTo(128 + Math.cos(angle) * r2, 128 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#0F172A';
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(86, 98);
  ctx.stroke();

  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(176, 86);
  ctx.stroke();

  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.arc(128, 128, 9, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 4);
  return texture;
}
