// src/utils/validators.ts
// ============================================================
// MÓDULO CENTRAL DE VALIDACIONES DE RED Y DATOS DE ENTRADA
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  formatted?: string;
  numericValue?: number;
}

/**
 * Valida formato de correo electrónico
 * Requiere presencia de @, usuario válido y dominio con extensión.
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { valid: false, error: 'El correo electrónico es obligatorio.' };
  }

  const clean = email.trim();

  if (!clean.includes('@')) {
    return {
      valid: false,
      error: 'El correo debe incluir el carácter "@" (ej. usuario@dominio.com).',
    };
  }

  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      valid: false,
      error: 'Formato de correo incompleto (ej. usuario@dominio.com).',
    };
  }

  const domain = parts[1];
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return {
      valid: false,
      error: 'El dominio del correo debe tener una extensión válida (ej. .com, .net, .edu).',
    };
  }

  // Regex estricto estándar RFC 5322 simplificado
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return {
      valid: false,
      error: 'El correo contiene caracteres no permitidos o formato inválido.',
    };
  }

  return { valid: true, formatted: clean.toLowerCase() };
}

/**
 * Valida longitud mínima de contraseña
 */
export function validatePassword(password: string, minLength = 6): ValidationResult {
  if (!password) {
    return { valid: false, error: 'La contraseña es obligatoria.' };
  }
  if (password.length < minLength) {
    return {
      valid: false,
      error: `La contraseña debe tener al menos ${minLength} caracteres.`,
    };
  }
  return { valid: true };
}

/**
 * Valida dirección IPv4
 * Debe tener exactamente 4 octetos numéricos entre 0 y 255.
 */
export function validateIPv4(ip: string): ValidationResult {
  if (!ip || !ip.trim()) {
    return { valid: false, error: 'La dirección IPv4 es obligatoria.' };
  }

  const clean = ip.trim();

  // Debe contener puntos
  const octets = clean.split('.');
  if (octets.length !== 4) {
    return {
      valid: false,
      error: `La dirección IPv4 debe tener exactamente 4 octetos separados por puntos (tiene ${octets.length}). Ej: 192.168.1.1`,
    };
  }

  for (let i = 0; i < 4; i++) {
    const octet = octets[i];
    if (octet === '') {
      return {
        valid: false,
        error: `El octeto #${i + 1} está vacío.`,
      };
    }

    // Comprobar que solo contiene dígitos
    if (!/^\d+$/.test(octet)) {
      return {
        valid: false,
        error: `El octeto #${i + 1} ("${octet}") contiene caracteres no numéricos.`,
      };
    }

    // Evitar números con ceros a la izquierda salvo el '0' exacto
    if (octet.length > 1 && octet.startsWith('0')) {
      return {
        valid: false,
        error: `El octeto #${i + 1} ("${octet}") no debe tener ceros a la izquierda.`,
      };
    }

    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) {
      return {
        valid: false,
        error: `El octeto #${i + 1} (${num}) está fuera de rango. Debe estar entre 0 y 255.`,
      };
    }
  }

  return { valid: true, formatted: clean };
}

/**
 * Valida valor CIDR (prefijo de máscara de red)
 */
export function validateCIDR(
  cidr: string | number,
  min = 1,
  max = 32
): ValidationResult {
  if (cidr === undefined || cidr === null || cidr === '') {
    return { valid: false, error: 'El valor CIDR es obligatorio.' };
  }

  const str = String(cidr).trim();
  if (!/^\d+$/.test(str)) {
    return { valid: false, error: 'El CIDR debe ser un número entero (ej. 24).' };
  }

  const num = parseInt(str, 10);
  if (num < min || num > max) {
    return {
      valid: false,
      error: `El CIDR /${num} está fuera de rango. Debe ser entre /${min} y /${max}.`,
    };
  }

  return { valid: true, numericValue: num };
}

/**
 * Convierte una IPv4 a un número entero de 32 bits (sin signo)
 */
function ipToLong(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

/**
 * Convierte un número entero de 32 bits a string IPv4
 */
function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join('.');
}

/**
 * Valida y calcula la coherencia de una dirección IP de red con su máscara CIDR
 */
export function validateNetworkAndCidr(ip: string, cidr: number | string): ValidationResult {
  const ipVal = validateIPv4(ip);
  if (!ipVal.valid) return ipVal;

  const cidrVal = validateCIDR(cidr, 1, 30);
  if (!cidrVal.valid) return cidrVal;

  const cidrNum = cidrVal.numericValue!;
  const ipLong = ipToLong(ip.trim());
  const mask = cidrNum === 0 ? 0 : (~0 << (32 - cidrNum)) >>> 0;
  const netLong = (ipLong & mask) >>> 0;
  const canonicalNetIp = longToIp(netLong);

  // Si la IP ingresada no es la dirección base de la red, advertir / indicar la dirección de red calculada
  if (canonicalNetIp !== ip.trim()) {
    return {
      valid: true,
      formatted: canonicalNetIp,
      error: `Nota: La dirección base de red para ${ip}/${cidrNum} es ${canonicalNetIp}.`,
    };
  }

  return { valid: true, formatted: ip.trim(), numericValue: cidrNum };
}

/**
 * Valida si una subred pertenece jerárquicamente a la red principal padre
 */
export function validateSubnetAgainstParent(
  parentIp: string,
  parentCidr: number,
  subnetIp: string,
  subnetCidr: number
): ValidationResult {
  const subIpVal = validateIPv4(subnetIp);
  if (!subIpVal.valid) return subIpVal;

  const subCidrVal = validateCIDR(subnetCidr, 1, 32);
  if (!subCidrVal.valid) return subCidrVal;

  if (subnetCidr < parentCidr) {
    return {
      valid: false,
      error: `La máscara de la subred (/${subnetCidr}) no puede ser más amplia que la de la red principal (/${parentCidr}). Debe ser mayor o igual a /${parentCidr}.`,
    };
  }

  const parentLong = ipToLong(parentIp);
  const parentMask = parentCidr === 0 ? 0 : (~0 << (32 - parentCidr)) >>> 0;
  const parentNet = (parentLong & parentMask) >>> 0;

  const subLong = ipToLong(subnetIp);
  const subNetInParent = (subLong & parentMask) >>> 0;

  if (subNetInParent !== parentNet) {
    return {
      valid: false,
      error: `La dirección de subred ${subnetIp} no pertenece al rango de la red principal ${parentIp}/${parentCidr}.`,
    };
  }

  return { valid: true };
}

/**
 * Valida dirección física MAC (6 pares hexadecimales)
 * Formatos aceptados: XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX o XXXXXXXXXXXX
 * Retorna la versión estandarizada XX:XX:XX:XX:XX:XX en mayúsculas
 */
export function validateMAC(mac: string): ValidationResult {
  if (!mac || !mac.trim()) {
    return { valid: false, error: 'La dirección MAC es obligatoria.' };
  }

  // Eliminar espacios
  let clean = mac.trim().toUpperCase();

  // Si viene con guiones, reemplazar por dos puntos
  clean = clean.replace(/-/g, ':');

  // Si viene como string continuo de 12 caracteres hex
  if (/^[0-9A-F]{12}$/.test(clean)) {
    const formatted = clean.match(/.{1,2}/g)!.join(':');
    return { valid: true, formatted };
  }

  // Comprobar formato XX:XX:XX:XX:XX:XX
  const parts = clean.split(':');
  if (parts.length !== 6) {
    return {
      valid: false,
      error: `La dirección MAC debe contener 6 pares hexadecimales (ej. AA:BB:CC:DD:EE:FF). Actualmente tiene ${parts.length} bloques.`,
    };
  }

  for (let i = 0; i < 6; i++) {
    const p = parts[i];
    if (p.length !== 2) {
      return {
        valid: false,
        error: `El bloque #${i + 1} ("${p}") de la MAC debe tener exactamente 2 dígitos hexadecimales.`,
      };
    }
    if (!/^[0-9A-F]{2}$/.test(p)) {
      return {
        valid: false,
        error: `El bloque #${i + 1} ("${p}") contiene caracteres inválidos. Solo se permiten dígitos hexadecimales (0-9, A-F).`,
      };
    }
  }

  return { valid: true, formatted: clean };
}

/**
 * Helper para autoformatear MAC mientras se escribe
 */
export function formatMACInput(text: string): string {
  // Limpiar caracteres no hexadecimales
  const raw = text.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 12);
  const parts = raw.match(/.{1,2}/g);
  return parts ? parts.join(':') : raw;
}

/**
 * Valida coordenadas GPS
 */
export function validateGPS(lat: string | number, lng: string | number): ValidationResult {
  const latStr = String(lat ?? '').trim();
  const lngStr = String(lng ?? '').trim();

  if (!latStr) {
    return { valid: false, error: 'La latitud GPS es obligatoria.' };
  }
  if (!lngStr) {
    return { valid: false, error: 'La longitud GPS es obligatoria.' };
  }

  const latNum = parseFloat(latStr);
  const lngNum = parseFloat(lngStr);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return {
      valid: false,
      error: 'La latitud debe ser un valor numérico entre -90 y 90 (ej. 19.4326).',
    };
  }

  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return {
      valid: false,
      error: 'La longitud debe ser un valor numérico entre -180 y 180 (ej. -99.1332).',
    };
  }

  return { valid: true, numericValue: latNum };
}

/**
 * Valida fecha en formato YYYY-MM-DD
 */
export function validateDate(dateStr: string): ValidationResult {
  if (!dateStr || !dateStr.trim()) {
    return { valid: false, error: 'La fecha es obligatoria.' };
  }

  const clean = dateStr.trim();
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  if (!dateRegex.test(clean)) {
    return {
      valid: false,
      error: 'La fecha debe tener el formato YYYY-MM-DD (ej. 2026-09-15).',
    };
  }

  const [year, month, day] = clean.split('-').map(x => parseInt(x, 10));
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return {
      valid: false,
      error: `La fecha ${clean} no es un día válido en el calendario.`,
    };
  }

  return { valid: true, formatted: clean };
}

/**
 * Valida campo de texto obligatorio no vacío
 */
export function validateRequired(
  val: string,
  minLength = 1,
  fieldName = 'Este campo'
): ValidationResult {
  if (!val || !val.trim()) {
    return { valid: false, error: `${fieldName} es obligatorio.` };
  }
  if (val.trim().length < minLength) {
    return {
      valid: false,
      error: `${fieldName} debe tener al menos ${minLength} caracteres.`,
    };
  }
  return { valid: true, formatted: val.trim() };
}
