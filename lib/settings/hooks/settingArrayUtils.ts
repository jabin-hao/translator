export function appendUniqueItem<T>(items: T[], item: T) {
  return items.includes(item) ? items : [...items, item];
}

export function removeItem<T>(items: T[], item: T) {
  return items.filter((current) => current !== item);
}
