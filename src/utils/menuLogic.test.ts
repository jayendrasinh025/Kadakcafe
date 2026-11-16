import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterMenuItems,
  reorderList,
  validateMenuItemInput,
  validateCategoryInput,
  formatPriceINR,
  buildTableMenuUrl,
  resolveSecondaryAction,
} from './menuLogic';
import { MenuItem } from '../types/menu';

const sampleItems: MenuItem[] = [
  {
    id: 'item-1',
    categoryId: 'cat-chai',
    name: 'Kadak Cutting Masala Chai',
    description: 'Slow-brewed Assam tea with crushed ginger and green cardamom.',
    price: 35,
    isVeg: true,
    isBestseller: true,
    isChefsPick: false,
    isAvailable: true,
    sortOrder: 0,
    ownerId: 'demo-owner',
    updatedAt: '2026-11-15T00:00:00Z',
  },
  {
    id: 'item-2',
    categoryId: 'cat-chai',
    name: 'Irani Sulemani Chai',
    description: 'Light amber spiced black tea finished with a hint of lemon.',
    price: 40,
    isVeg: true,
    isBestseller: false,
    isChefsPick: true,
    isAvailable: false,
    sortOrder: 1,
    ownerId: 'demo-owner',
    updatedAt: '2026-11-15T00:00:00Z',
  },
  {
    id: 'item-3',
    categoryId: 'cat-snacks',
    name: 'Keema Pav',
    description: 'Spiced minced mutton cooked on tawa served with buttered pav.',
    price: 195,
    isVeg: false,
    isBestseller: true,
    isChefsPick: true,
    isAvailable: true,
    sortOrder: 0,
    ownerId: 'demo-owner',
    updatedAt: '2026-11-15T00:00:00Z',
  },
];

test('filterMenuItems filters by active category and excludes unavailable items by default', () => {
  const result = filterMenuItems(sampleItems, 'cat-chai', '');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'item-1');
});

test('filterMenuItems searches across all categories by name or description when query is provided', () => {
  const byName = filterMenuItems(sampleItems, 'cat-chai', 'keema');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 'item-3');

  const byDesc = filterMenuItems(sampleItems, 'cat-snacks', 'cardamom');
  assert.equal(byDesc.length, 1);
  assert.equal(byDesc[0].id, 'item-1');
});

test('reorderList moves items up and down and normalizes sortOrder', () => {
  const list = [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
  ];
  const movedDown = reorderList(list, 'a', 'down');
  assert.deepEqual(
    movedDown.map((x) => x.id),
    ['b', 'a', 'c']
  );
  assert.deepEqual(
    movedDown.map((x) => x.sortOrder),
    [0, 1, 2]
  );

  const movedUp = reorderList(movedDown, 'c', 'up');
  assert.deepEqual(
    movedUp.map((x) => x.id),
    ['b', 'c', 'a']
  );
});

test('validateMenuItemInput rejects empty names and negative prices', () => {
  assert.equal(
    validateMenuItemInput({ name: '   ', description: 'Good', price: 50, categoryId: 'cat-1' }).valid,
    false
  );
  assert.equal(
    validateMenuItemInput({ name: 'Chai', description: 'Good', price: -10, categoryId: 'cat-1' }).valid,
    false
  );
  assert.equal(
    validateMenuItemInput({ name: 'Chai', description: 'Good', price: 45, categoryId: 'cat-1' }).valid,
    true
  );
});

test('validateCategoryInput creates clean slug', () => {
  const res = validateCategoryInput('Chai & Coffee');
  assert.equal(res.valid, true);
  assert.equal(res.slug, 'chai-coffee');
});

test('buildTableMenuUrl and formatPriceINR format accurately', () => {
  assert.equal(buildTableMenuUrl('https://kadakcafe.in/', '01'), 'https://kadakcafe.in/?table=01');
  assert.equal(formatPriceINR(195), '₹195');
});

test('resolveSecondaryAction returns expected action metadata', () => {
  const waiter = resolveSecondaryAction(
    {
      secondaryActionType: 'waiter',
      whatsappNumber: '919820144500',
      contactNumber: '+919820144500',
      name: 'Kadak Café',
    },
    '02'
  );
  assert.equal(waiter.type, 'waiter');
  assert.equal(waiter.label, 'Call Waiter');

  const whatsapp = resolveSecondaryAction(
    {
      secondaryActionType: 'whatsapp',
      whatsappNumber: '+91 98201 44500',
      contactNumber: '+919820144500',
      name: 'Kadak Café',
    },
    '02'
  );
  assert.equal(whatsapp.type, 'whatsapp');
  assert.ok(whatsapp.href?.startsWith('https://wa.me/919820144500'));
});
