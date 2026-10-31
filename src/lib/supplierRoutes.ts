export function supplierSlug(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, '-');
}

export function supplierNameFromSlug(slug: string, suppliers: string[]): string {
  const decodedSlug = decodeURIComponent(slug).toLocaleLowerCase();
  return (
    suppliers.find((supplier) => supplierSlug(supplier) === decodedSlug) ??
    decodeURIComponent(slug).replace(/-/g, ' ')
  );
}
