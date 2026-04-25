import mongoose from 'mongoose';

export const NAME_REGEX = /^[A-Za-zĂÂÎȘŞȚŢăâîșşțţ'\- ]+$/u;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_TOKEN_REGEX = /^[a-f0-9]{64}$/i;

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

export function collapseWhitespace(value) {
  if (!isString(value)) {
    return value;
  }

  return value.replace(/\s+/g, ' ').trim();
}

export function ensureSafeString(value, fieldName, options = {}) {
  const {
    minLength = 1,
    maxLength = 255,
    trim = true,
    pattern,
    allowEmpty = false,
  } = options;

  if (!isString(value)) {
    throw new Error(`${fieldName} trebuie sa fie text simplu.`);
  }

  const normalizedValue = trim ? collapseWhitespace(value) : String(value);

  if (!allowEmpty && !normalizedValue) {
    throw new Error(`${fieldName} este obligatoriu.`);
  }

  if (normalizedValue.length < minLength) {
    throw new Error(`${fieldName} trebuie sa contina cel putin ${minLength} caractere.`);
  }

  if (normalizedValue.length > maxLength) {
    throw new Error(`${fieldName} poate avea cel mult ${maxLength} caractere.`);
  }

  if (pattern && normalizedValue && !pattern.test(normalizedValue)) {
    throw new Error(`${fieldName} are un format invalid.`);
  }

  return normalizedValue;
}

export function normalizeEmail(value) {
  return ensureSafeString(value, 'Email', {
    minLength: 5,
    maxLength: 120,
    pattern: EMAIL_REGEX,
  }).toLowerCase();
}

export function normalizeName(value, fieldName) {
  return ensureSafeString(value, fieldName, {
    minLength: 2,
    maxLength: 50,
    pattern: NAME_REGEX,
  });
}

export function ensurePasswordCandidate(value) {
  if (!isString(value)) {
    throw new Error('Parola trebuie sa fie text simplu.');
  }

  if (value.length < 8) {
    throw new Error('Parola trebuie sa contina cel putin 8 caractere.');
  }

  if (value.length > 72) {
    throw new Error('Parola poate avea cel mult 72 de caractere.');
  }

  if (/\s/.test(value)) {
    throw new Error('Parola nu poate contine spatii.');
  }

  return value;
}

export function validateStrongPassword(value) {
  const password = ensurePasswordCandidate(value);

  if (!/[a-z]/.test(password)) {
    throw new Error('Parola trebuie sa contina cel putin o litera mica.');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Parola trebuie sa contina cel putin o litera mare.');
  }

  if (!/[0-9]/.test(password)) {
    throw new Error('Parola trebuie sa contina cel putin o cifra.');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Parola trebuie sa contina cel putin un caracter special.');
  }

  return password;
}

export function ensureTokenString(value, fieldName = 'Token') {
  return ensureSafeString(value, fieldName, {
    minLength: 64,
    maxLength: 64,
    pattern: HEX_TOKEN_REGEX,
  });
}

export function ensureObjectId(value, fieldName = 'ID') {
  const objectId = ensureSafeString(value, fieldName, {
    minLength: 24,
    maxLength: 24,
  });

  if (!mongoose.Types.ObjectId.isValid(objectId)) {
    throw new Error(`${fieldName} invalid.`);
  }

  return objectId;
}

export function normalizeOptionalText(value, fieldName, maxLength = 500) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return ensureSafeString(value, fieldName, {
    minLength: 0,
    maxLength,
    allowEmpty: true,
  });
}
