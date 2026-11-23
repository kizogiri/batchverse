const CITY_TIMEZONE_MAP: Record<string, string> = {
  kathmandu: 'Asia/Kathmandu',
  pokhara: 'Asia/Kathmandu',
  lalitpur: 'Asia/Kathmandu',
  irving: 'America/Chicago',
  dallas: 'America/Chicago',
  austin: 'America/Chicago',
  houston: 'America/Chicago',
  chicago: 'America/Chicago',
  'new york': 'America/New_York',
  boston: 'America/New_York',
  atlanta: 'America/New_York',
  toronto: 'America/Toronto',
  vancouver: 'America/Vancouver',
  'san francisco': 'America/Los_Angeles',
  seattle: 'America/Los_Angeles',
  'los angeles': 'America/Los_Angeles',
  london: 'Europe/London',
  manchester: 'Europe/London',
  dublin: 'Europe/Dublin',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  munich: 'Europe/Berlin',
  amsterdam: 'Europe/Amsterdam',
  zurich: 'Europe/Zurich',
  dubai: 'Asia/Dubai',
  'abu dhabi': 'Asia/Dubai',
  doha: 'Asia/Qatar',
  riyadh: 'Asia/Riyadh',
  mumbai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  'new delhi': 'Asia/Kolkata',
  bengaluru: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  hyderabad: 'Asia/Kolkata',
  pune: 'Asia/Kolkata',
  singapore: 'Asia/Singapore',
  bangkok: 'Asia/Bangkok',
  tokyo: 'Asia/Tokyo',
  osaka: 'Asia/Tokyo',
  seoul: 'Asia/Seoul',
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  brisbane: 'Australia/Brisbane',
  perth: 'Australia/Perth',
  auckland: 'Pacific/Auckland',
};

const COUNTRY_TIMEZONE_FALLBACK: Record<string, string> = {
  nepal: 'Asia/Kathmandu',
  usa: 'America/Chicago',
  'united states': 'America/New_York',
  us: 'America/New_York',
  canada: 'America/Toronto',
  uk: 'Europe/London',
  'united kingdom': 'Europe/London',
  england: 'Europe/London',
  australia: 'Australia/Sydney',
  uae: 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  japan: 'Asia/Tokyo',
  india: 'Asia/Kolkata',
  singapore: 'Asia/Singapore',
  germany: 'Europe/Berlin',
  france: 'Europe/Paris',
  'new zealand': 'Pacific/Auckland',
  qatar: 'Asia/Qatar',
  'south korea': 'Asia/Seoul',
};

const COUNTRY_FLAGS: Record<string, string> = {
  nepal: '🇳🇵',
  usa: '🇺🇸',
  'united states': '🇺🇸',
  us: '🇺🇸',
  canada: '🇨🇦',
  uk: '🇬🇧',
  'united kingdom': '🇬🇧',
  england: '🇬🇧',
  australia: '🇦🇺',
  uae: '🇦🇪',
  'united arab emirates': '🇦🇪',
  japan: '🇯🇵',
  india: '🇮🇳',
  singapore: '🇸🇬',
  germany: '🇩🇪',
  france: '🇫🇷',
  'new zealand': '🇳🇿',
  qatar: '🇶🇦',
  'south korea': '🇰🇷',
  netherlands: '🇳🇱',
  switzerland: '🇨🇭',
  ireland: '🇮🇪',
  thailand: '🇹🇭',
};

export function resolveCountryFlag(country: string, explicitFlag?: string): string {
  if (explicitFlag && explicitFlag.trim().length > 0) {
    return explicitFlag;
  }
  const normalized = country.trim().toLowerCase();
  if (COUNTRY_FLAGS[normalized]) {
    return COUNTRY_FLAGS[normalized];
  }
  for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (normalized.includes(key)) {
      return flag;
    }
  }
  return '🌍';
}

export function resolveTimezone(city: string, country: string): string | null {
  const cityKey = city.trim().toLowerCase().split(',')[0].trim();
  if (CITY_TIMEZONE_MAP[cityKey]) {
    return CITY_TIMEZONE_MAP[cityKey];
  }
  for (const [key, tz] of Object.entries(CITY_TIMEZONE_MAP)) {
    if (cityKey.includes(key)) {
      return tz;
    }
  }
  const countryKey = country.trim().toLowerCase();
  if (COUNTRY_TIMEZONE_FALLBACK[countryKey]) {
    return COUNTRY_TIMEZONE_FALLBACK[countryKey];
  }
  for (const [key, tz] of Object.entries(COUNTRY_TIMEZONE_FALLBACK)) {
    if (countryKey.includes(key)) {
      return tz;
    }
  }
  return null;
}

export function getLocalTimeInfo(city: string, country: string, now: Date = new Date()): {
  timeString: string;
  zoneLabel: string;
  isDaytime: boolean;
} {
  const tz = resolveTimezone(city, country);
  if (!tz) {
    const localTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);
    return {
      timeString: localTime,
      zoneLabel: 'Local Ref',
      isDaytime: true,
    };
  }

  try {
    const timeString = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);

    const hour24 = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false,
      }).format(now)
    );

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(now);
    const tzShort = parts.find((p) => p.type === 'timeZoneName')?.value ?? tz.split('/')[1] ?? '';

    return {
      timeString,
      zoneLabel: tzShort,
      isDaytime: hour24 >= 6 && hour24 < 19,
    };
  } catch {
    return {
      timeString: '12:00 PM',
      zoneLabel: 'UTC',
      isDaytime: true,
    };
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const AVATAR_PALETTES = [
  'bg-emerald-800 text-amber-50',
  'bg-amber-700 text-amber-50',
  'bg-stone-700 text-stone-50',
  'bg-teal-800 text-teal-50',
  'bg-sky-800 text-sky-50',
  'bg-rose-800 text-rose-50',
  'bg-indigo-800 text-indigo-50',
  'bg-orange-800 text-orange-50',
];

export function getAvatarColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function getSeatZoneLabel(seatIndex: number, totalSeats: number): string {
  const rowIndex = Math.floor(seatIndex / 4);
  const totalRows = Math.ceil(totalSeats / 4);
  if (rowIndex === 0) return 'Front Bench';
  if (rowIndex === totalRows - 1) return 'Backbencher';
  return `Bench Row ${rowIndex + 1}`;
}
