/**
 * One canonical list of business categories.
 *
 * Onboarding and the builder used to keep separate lists that disagreed:
 * onboarding wrote `foodtruck` and `service`, the builder's dropdown offered
 * `food_truck` and `services`, and `events` / `other` existed only in
 * onboarding. So a food truck would finish setup, open the builder, and find
 * its category blank — and saving the form then wiped the real value.
 *
 * Everything reads from CATEGORIES. Legacy values are mapped, never dropped.
 */

export type CategoryId =
  | 'cafe' | 'restaurant' | 'bar' | 'food_truck'
  | 'salon' | 'wellness' | 'fitness'
  | 'retail' | 'online' | 'services' | 'events' | 'other';

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'cafe',        label: 'Café' },
  { id: 'restaurant',  label: 'Restaurant' },
  { id: 'bar',         label: 'Bar / Nightlife' },
  { id: 'food_truck',  label: 'Food Truck' },
  { id: 'salon',       label: 'Salon / Beauty' },
  { id: 'wellness',    label: 'Wellness / Spa' },
  { id: 'fitness',     label: 'Fitness / Gym' },
  { id: 'retail',      label: 'Retail Shop' },
  { id: 'online',      label: 'Online Business' },
  { id: 'services',    label: 'Professional Services' },
  { id: 'events',      label: 'Events / Venue' },
  { id: 'other',       label: 'Something else' },
];

/** Values written by older versions of onboarding, mapped to what we use now. */
const ALIASES: Record<string, CategoryId> = {
  foodtruck: 'food_truck',
  'food-truck': 'food_truck',
  service: 'services',
  beauty: 'salon',
  spa: 'wellness',
  gym: 'fitness',
  shop: 'retail',
  venue: 'events',
};

const VALID = new Set<string>(CATEGORIES.map((c) => c.id));

/**
 * Turn whatever is stored into a category we can display, without ever
 * silently discarding an owner's answer. Unrecognised values become null so
 * the UI can show "not set" rather than pretending they picked the first item.
 */
export function normalizeCategory(value: string | null | undefined): CategoryId | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (VALID.has(key)) return key as CategoryId;
  return ALIASES[key] ?? null;
}

export function categoryLabel(value: string | null | undefined): string | null {
  const id = normalizeCategory(value);
  return id ? (CATEGORIES.find((c) => c.id === id)?.label ?? null) : null;
}
