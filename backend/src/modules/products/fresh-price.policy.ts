const DEFAULT_FRESH_PRICE_MAX_AGE_HOURS = 24;

export function freshPriceMaxAgeHours() {
  const configured = Number(process.env.FRESH_PRICE_MAX_AGE_HOURS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_FRESH_PRICE_MAX_AGE_HOURS;
}

export function isFreshPriceStale(effectiveOn: Date, now = new Date()) {
  const maxAgeMs = freshPriceMaxAgeHours() * 60 * 60 * 1000;
  return now.getTime() - effectiveOn.getTime() > maxAgeMs;
}

export function pricesMatch(left: unknown, right: unknown) {
  return Number(left) === Number(right);
}
