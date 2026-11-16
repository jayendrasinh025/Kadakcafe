import { MenuCategory, MenuItem, RestaurantSettings } from '../types/menu';

/**
 * Filters and sorts menu items for the customer menu or admin dashboard.
 * When searchQuery is non-empty, searches across all categories (or active category if strictCategory=true)
 * matching food name or description case-insensitively.
 */
export function filterMenuItems(
  items: MenuItem[],
  activeCategoryId: string,
  searchQuery: string,
  options?: { includeUnavailable?: boolean; strictCategoryWhenSearching?: boolean }
): MenuItem[] {
  const query = searchQuery.trim().toLowerCase();
  const includeUnavailable = options?.includeUnavailable ?? false;
  const strictCategory = options?.strictCategoryWhenSearching ?? false;

  return items
    .filter((item) => {
      if (!includeUnavailable && !item.isAvailable) {
        return false;
      }
      if (query.length > 0) {
        if (strictCategory && activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
          return false;
        }
        const nameMatch = item.name.toLowerCase().includes(query);
        const descMatch = item.description.toLowerCase().includes(query);
        return nameMatch || descMatch;
      }
      if (activeCategoryId === 'all') {
        return true;
      }
      return item.categoryId === activeCategoryId;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Reorders an array of items or categories by moving the target id 'up' or 'down'
 * and normalizing sortOrder indices (0, 1, 2, ...).
 */
export function reorderList<T extends { id: string; sortOrder: number }>(
  list: T[],
  targetId: string,
  direction: 'up' | 'down'
): T[] {
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = sorted.findIndex((entry) => entry.id === targetId);
  if (index === -1) return sorted;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return sorted;
  }

  const copy = [...sorted];
  const temp = copy[index];
  copy[index] = copy[swapIndex];
  copy[swapIndex] = temp;

  return copy.map((entry, idx) => ({
    ...entry,
    sortOrder: idx,
  }));
}

/**
 * Reorders items within a single category while preserving items in other categories.
 */
export function reorderCategoryItems(
  allItems: MenuItem[],
  categoryId: string,
  itemId: string,
  direction: 'up' | 'down'
): MenuItem[] {
  const categoryItems = allItems
    .filter((item) => item.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const otherItems = allItems.filter((item) => item.categoryId !== categoryId);

  const reorderedCategoryItems = reorderList(categoryItems, itemId, direction);
  return [...otherItems, ...reorderedCategoryItems];
}

/**
 * Validates a menu item form submission according to blueprint constraints.
 */
export function validateMenuItemInput(input: {
  name: string;
  description: string;
  price: number | string;
  categoryId: string;
}): { valid: boolean; error?: string } {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { valid: false, error: 'Item name is required.' };
  }
  if (trimmedName.length > 100) {
    return { valid: false, error: 'Item name must be 100 characters or fewer.' };
  }
  if (input.description.trim().length > 300) {
    return { valid: false, error: 'Description must be 300 characters or fewer.' };
  }
  const numericPrice = typeof input.price === 'string' ? Number(input.price) : input.price;
  if (Number.isNaN(numericPrice) || numericPrice < 0 || numericPrice > 100000) {
    return { valid: false, error: 'Price must be a valid amount between ₹0 and ₹1,00,000.' };
  }
  if (!input.categoryId.trim()) {
    return { valid: false, error: 'Please select a valid category.' };
  }
  return { valid: true };
}

/**
 * Validates a category input.
 */
export function validateCategoryInput(name: string): { valid: boolean; error?: string; slug: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Category name is required.', slug: '' };
  }
  if (trimmed.length > 60) {
    return { valid: false, error: 'Category name must be 60 characters or fewer.', slug: '' };
  }
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
  return { valid: true, slug };
}

/**
 * Formats a price in Indian Rupees (INR).
 */
export function formatPriceINR(price: number): string {
  return `₹${Math.round(price).toLocaleString('en-IN')}`;
}

/**
 * Builds the QR URL for a specific restaurant table.
 */
export function buildTableMenuUrl(origin: string, tableNumber: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanTable = encodeURIComponent(tableNumber.trim());
  return `${cleanOrigin}/?table=${cleanTable}`;
}

/**
 * Computes the action URL or behavior for the configurable second button in the bottom bar.
 */
export function resolveSecondaryAction(
  settings: Pick<RestaurantSettings, 'secondaryActionType' | 'whatsappNumber' | 'contactNumber' | 'name'>,
  tableNumber?: string | null
): {
  type: 'waiter' | 'whatsapp' | 'call' | 'disabled';
  label: string;
  href?: string;
} {
  switch (settings.secondaryActionType) {
    case 'disabled':
      return { type: 'disabled', label: '' };
    case 'whatsapp': {
      const digits = settings.whatsappNumber.replace(/[^0-9]/g, '');
      const tableText = tableNumber ? ` (Table ${tableNumber})` : '';
      const text = encodeURIComponent(`Hi ${settings.name}${tableText}, I need assistance at my table.`);
      return {
        type: 'whatsapp',
        label: 'WhatsApp Café',
        href: `https://wa.me/${digits}?text=${text}`,
      };
    }
    case 'call': {
      const cleanPhone = settings.contactNumber.replace(/[^0-9+]/g, '');
      return {
        type: 'call',
        label: 'Call Restaurant',
        href: `tel:${cleanPhone}`,
      };
    }
    case 'waiter':
    default:
      return {
        type: 'waiter',
        label: 'Call Waiter',
      };
  }
}

/**
 * Groups filtered items by category when searching across the menu.
 */
export function groupItemsByCategory(
  categories: MenuCategory[],
  items: MenuItem[]
): Array<{ category: MenuCategory; items: MenuItem[] }> {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  return sortedCategories
    .map((category) => ({
      category,
      items: items
        .filter((item) => item.categoryId === category.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((group) => group.items.length > 0);
}
