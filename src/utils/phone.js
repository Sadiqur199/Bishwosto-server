/**
 * Normalise a Bangladeshi phone number to E.164 (+8801XXXXXXXXX).
 * Returns '' when the number cannot be parsed.
 * Accepted inputs: 01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX.
 */
export function normalizeBdPhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  let rest;

  if (digits.startsWith('880')) rest = digits.slice(3);
  else if (digits.startsWith('0')) rest = digits.slice(1);
  else rest = digits;

  // After the 880/0 prefix we expect 10 digits starting with 1 (operator codes 13-19).
  if (!/^1[3-9]\d{8}$/.test(rest)) return '';
  return `+880${rest}`;
}

/** True when the input is a valid Bangladeshi mobile number. */
export const isValidBdPhone = (input) => Boolean(normalizeBdPhone(input));
