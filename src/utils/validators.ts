// src/utils/validators.ts
// ============================================================
// MÓDULO CENTRAL DE VALIDACIONES DE RED Y DATOS DE ENTRADA
// ============================================================

/**
 * Representa el resultado unificado de una operación de validación.
 *
 * @property valid - Indica si la validación fue exitosa (`true`) o falló (`false`).
 * @property error - Mensaje descriptivo del error en caso de que la validación falle.
 * @property formatted - Valor resultante procesado o estandarizado (ej. en minúsculas, con `trim` o formato con dos puntos).
 * @property numericValue - Valor numérico procesado (ej. para máscaras CIDR, octetos o coordenadas GPS).
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  formatted?: string;
  numericValue?: number;
}

/**
 * Valida la estructura y formato de un correo electrónico.
 *
 * @param email - Correo electrónico a validar.
 * 
 * @returns Objeto {@link ValidationResult} con el estado y el correo estandarizado en minúsculas (`toLowerCase`).
 *
 * @example
 * validateEmail('Usuario@Dominio.COM'); 
 * // { valid: true, formatted: 'usuario@dominio.com' }
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Ingresa tu correo electrónico.' };
  }

  const clean = email.trim();

  if (!clean.includes('@')) {
    return {
      valid: false,
      error: 'Incluye un "@" en la dirección (ej. usuario@dominio.com).',
    };
  }

  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      valid: false,
      error: 'Ingresa un usuario y un dominio válidos (ej. usuario@dominio.com).',
    };
  }

  const domain = parts[1];
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return {
      valid: false,
      error: 'El dominio debe incluir una extensión válida (ej. .com, .org).',
    };
  }

  // Regex estricto estándar RFC 5322 simplificado
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return {
      valid: false,
      error: 'El correo contiene caracteres no válidos o un formato incorrecto.',
    };
  }

  return { valid: true, formatted: clean.toLowerCase() };
}

/**
 * Valida que la contraseña cumpla con la longitud mínima requerida.
 *
 * @param password - Contraseña a evaluar.
 * @param minLength - Cantidad mínima de caracteres exigida (por defecto: 6).
 * 
 * @returns Objeto {@link ValidationResult} con el estado de la validación.
 *
 * @example
 * validatePassword('secret123', 8); 
 * // { valid: true }
 */
export function validatePassword(password: string, minLength = 6): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Ingresa una contraseña para continuar.' };
  }
  if (password.length < minLength) {
    return {
      valid: false,
      error: `La contraseña es demasiado corta. Debe incluir al menos ${minLength} caracteres.`,
    };
  }
  return { valid: true };
}

/**
 * Valida que una cadena coincida con el formato de una dirección IPv4 legítima (4 bloques de 0 a 255).
 *
 * @param ip - Cadena de texto a evaluar como dirección IPv4.
 * 
 * @returns Objeto {@link ValidationResult} con el estado y la IP limpia sin espacios.
 *
 * @example
 * validateIPv4('192.168.1.1'); 
 * // { valid: true, formatted: '192.168.1.1' }
 */
export function validateIPv4(ip: string): ValidationResult {
  if (!ip || !ip.trim()) {
    return { valid: false, error: 'Ingresa una dirección IPv4 (ej. 192.168.1.1).' };
  }

  const clean = ip.trim();

  // Debe contener puntos
  const octets = clean.split('.');
  if (octets.length !== 4) {
    return {
      valid: false,
      error: `Formato IPv4 incorrecto. Debe tener 4 bloques separados por puntos (ej. 192.168.1.1).`,
    };
  }

  for (let i = 0; i < 4; i++) {
    const octet = octets[i];
    if (octet === '') {
      return {
        valid: false,
        error: `El bloque #${i + 1} está vacío.`,
      };
    }

    // Comprobar que solo contiene dígitos
    if (!/^\d+$/.test(octet)) {
      return {
        valid: false,
        error: `El bloque #${i + 1} ("${octet}") debe contener solo números.`,
      };
    }

    // Evitar números con ceros a la izquierda salvo el '0' exacto
    if (octet.length > 1 && octet.startsWith('0')) {
      return {
        valid: false,
        error: `El bloque #${i + 1} ("${octet}") no debe incluir ceros a la izquierda.`,
      };
    }

    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) {
      return {
        valid: false,
        error: `El bloque #${i + 1} (${num}) está fuera del rango permitido (0 a 255).`,
      };
    }
  }

  return { valid: true, formatted: clean };
}

/**
 * Valida un prefijo de máscara de red CIDR dentro de un rango numérico.
 *
 * @param cidr - Valor numérico o texto que representa el prefijo CIDR.
 * @param min - Límite mínimo permitido (por defecto: 1).
 * @param max - Límite máximo permitido (por defecto: 32).
 * 
 * @returns Objeto {@link ValidationResult} con el estado y el valor entero parsed.
 *
 * @example
 * validateCIDR(24); 
 * // { valid: true, numericValue: 24 }
 */
export function validateCIDR(
  cidr: string | number,
  min = 1,
  max = 32
): ValidationResult {
  if (cidr === undefined || cidr === null || cidr === '') {
    return { valid: false, error: 'Ingresa un valor para la máscara CIDR (ej. 24).' };
  }

  const str = String(cidr).trim();
  if (!/^\d+$/.test(str)) {
    return { valid: false, error: 'La máscara CIDR debe ser un número entero sin símbolos ni decimales (ej. 24).' };
  }

  const num = parseInt(str, 10);
  if (num < min || num > max) {
    return {
      valid: false,
      error: `La máscara /${num} es inválida. Debe estar en el rango de /${min} a /${max}.`,
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
 * Convierte un entero numérico de 32 bits sin signo a su representación de cadena IPv4.
 *
 * @param long - Entero de 32 bits que representa la IP.
 * 
 * @returns Dirección IPv4 en notación decimal punteada.
 *
 * @example
 * longToIp(3232235777); // '192.168.1.1'
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
 * Valida la coherencia de una dirección IP de red con su máscara CIDR y calcula su dirección base canónica.
 *
 * @param ip - Dirección IPv4 de la red.
 * @param cidr - Prefijo CIDR de la red (rango permitido: 1 a 30).
 * 
 * @returns Objeto {@link ValidationResult} con el estado, la IP base de red calculada y advertencia si aplica.
 *
 * @example
 * validateNetworkAndCidr('192.168.1.50', 24); 
 * // { valid: true, formatted: '192.168.1.0', error: 'Nota: La dirección base de red para 192.168.1.50/24 es 192.168.1.0.' }
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
 * Valida si una subred dada pertenece jerárquicamente al rango de una red principal (padre).
 *
 * @param parentIp - Dirección IP de la red principal.
 * @param parentCidr - Máscara CIDR de la red principal.
 * @param subnetIp - Dirección IP de la subred a evaluar.
 * @param subnetCidr - Máscara CIDR de la subred a evaluar.
 * 
 * @returns Objeto {@link ValidationResult} indicando si la subred está contenida en la red padre.
 *
 * @example
 * validateSubnetAgainstParent('10.0.0.0', 16, '10.0.1.0', 24);
 * // { valid: true }
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
 * Valida y estandariza una dirección física MAC.
 * Soporta formatos con `:`, `-` o de 12 caracteres continuos.
 *
 * @param mac - Dirección MAC a validar (ej. 'AA:BB:CC:DD:EE:FF', 'AA-BB...', 'AABBCCDDEEFF').
 * 
 * @returns Objeto {@link ValidationResult} con el estado y la MAC formateada en mayúsculas (XX:XX:XX:XX:XX:XX).
 *
 * @example
 * validateMAC('aabbccddeeff'); 
 * // { valid: true, formatted: 'AA:BB:CC:DD:EE:FF' }
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
 * Valida un par de coordenadas geográficas (latitud y longitud).
 *
 * @param lat - Latitud en grados (-90 a 90).
 * @param lng - Longitud en grados (-180 a 180).
 * 
 * @returns Objeto {@link ValidationResult} indicando si las coordenadas son válidas.
 *
 * @example
 * validateGPS(19.4326, -99.1332); 
 * // { valid: true, numericValue: 19.4326 }
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
      error: 'La latitud debe estar en el rango de -90 a 90 grados.',
    };
  }

  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return {
      valid: false,
      error: 'La longitud debe estar en el rango de -180 a 180 grados.',
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
 * Valida que un campo de texto no esté vacío y cumpla con una longitud mínima.
 *
 * @param val - Texto a validar.
 * @param minLength - Longitud mínima requerida (por defecto: 1).
 * @param fieldName - Nombre del campo para el mensaje de error (por defecto: 'Este campo').
 * 
 * @returns Objeto {@link ValidationResult} con el estado de la validación o el texto formateado (`trim`).
 *
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
