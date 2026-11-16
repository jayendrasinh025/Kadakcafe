import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Download,
  ExternalLink,
  CheckCircle2,
  LogOut,
  RotateCcw,
  Upload,
  Lock,
  Bell,
  MessageSquare,
  X,
} from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { MenuItem, RestaurantSettings, RestaurantTable, SecondaryActionType } from '../types/menu';
import { buildTableMenuUrl, formatPriceINR } from '../utils/menuLogic';
import {
  compressImageFileToDataUrl,
  generateBrandedTableCardPng,
  generateRawTableQrPng,
  triggerDataUrlDownload,
} from '../utils/qrCardGenerator';
import { FoodThumbnail, VegIndicator } from './VegIndicator';

type AdminSection = 'overview' | 'menu' | 'categories' | 'settings';

export const OwnerDashboardView: React.FC = () => {
  const {
    settings,
    categories,
    items,
    tables,
    waiterCalls,
    feedbackNotes,
    user,
    isOwnerAuthenticated,
    signInWithGoogle,
    unlockDemoOwnerSession,
    signOutOwner,
    updateSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    moveMenuItem,
    toggleItemAvailability,
    addTable,
    deleteTable,
    resolveWaiterCall,
    resetDemoData,
  } = useMenu();

  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  // --- SECTION B: MENU MANAGEMENT STATE ---
  const [selectedMenuCatFilter, setSelectedMenuCatFilter] = useState<string>('all');
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '95',
    categoryId: sortedCategories[0]?.id ?? '',
    isVeg: true,
    isBestseller: false,
    isChefsPick: false,
    isAvailable: true,
    imageUrl: '',
  });
  const [itemFormError, setItemFormError] = useState<string | null>(null);

  // --- SECTION C: CATEGORIES STATE ---
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

  // --- SECTION D: SETTINGS & QR CODES STATE ---
  const [settingsForm, setSettingsForm] = useState<RestaurantSettings>(settings);
  const [newTableNumber, setNewTableNumber] = useState<string>('');
  const [newTableLabel, setNewTableLabel] = useState<string>('');
  const [tableError, setTableError] = useState<string | null>(null);
  const [tableQrPreviews, setTableQrPreviews] = useState<Record<string, string>>({});
  const [previewCardModalTable, setPreviewCardModalTable] = useState<RestaurantTable | null>(null);
  const [previewCardDataUrl, setPreviewCardDataUrl] = useState<string>('');

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Generate QR thumbnails for all tables
  useEffect(() => {
    let active = true;
    const generateAll = async () => {
      const map: Record<string, string> = {};
      for (const t of tables) {
        try {
          const url = buildTableMenuUrl(window.location.origin, t.tableNumber);
          map[t.id] = await QRCode.toDataURL(url, {
            width: 180,
            margin: 1,
            color: { dark: '#0F172A', light: '#FFFFFF' },
          });
        } catch {
          // ignore
        }
      }
      if (active) setTableQrPreviews(map);
    };
    generateAll();
    return () => {
      active = false;
    };
  }, [tables]);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner(null);
    }, 3500);
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemFormError(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      categoryId:
        selectedMenuCatFilter !== 'all'
          ? selectedMenuCatFilter
          : sortedCategories[0]?.id ?? '',
      isVeg: true,
      isBestseller: false,
      isChefsPick: false,
      isAvailable: true,
      imageUrl: '',
    });
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemFormError(null);
    setItemForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      categoryId: item.categoryId,
      isVeg: item.isVeg,
      isBestseller: item.isBestseller,
      isChefsPick: item.isChefsPick,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
    });
    setItemModalOpen(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemFormError(null);
    const numericPrice = Number(itemForm.price);

    if (editingItem) {
      const res = await updateMenuItem(editingItem.id, {
        name: itemForm.name,
        description: itemForm.description,
        price: numericPrice,
        categoryId: itemForm.categoryId,
        isVeg: itemForm.isVeg,
        isBestseller: itemForm.isBestseller,
        isChefsPick: itemForm.isChefsPick,
        isAvailable: itemForm.isAvailable,
        imageUrl: itemForm.imageUrl || undefined,
      });
      if (!res.ok) {
        setItemFormError(res.error || 'Could not update item.');
        return;
      }
      setItemModalOpen(false);
      showToast(`Updated "${itemForm.name}" on customer menu.`);
    } else {
      const res = await addMenuItem({
        name: itemForm.name,
        description: itemForm.description,
        price: numericPrice,
        categoryId: itemForm.categoryId,
        isVeg: itemForm.isVeg,
        isBestseller: itemForm.isBestseller,
        isChefsPick: itemForm.isChefsPick,
        isAvailable: itemForm.isAvailable,
        imageUrl: itemForm.imageUrl || undefined,
      });
      if (!res.ok) {
        setItemFormError(res.error || 'Could not add item.');
        return;
      }
      setItemModalOpen(false);
      showToast(`Added "${itemForm.name}" to customer menu.`);
    }
  };

  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 400);
      setItemForm((prev) => ({ ...prev, imageUrl: compressed }));
    } catch {
      setItemFormError('Failed to process uploaded image.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 260);
      setSettingsForm((prev) => ({ ...prev, logoUrl: compressed }));
    } catch {
      // ignore
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const res = await addCategory(newCategoryName);
    if (!res.ok) {
      setCategoryError(res.error || 'Failed to add category');
      return;
    }
    setNewCategoryName('');
    showToast(`Added category "${newCategoryName.trim()}".`);
  };

  const handleSaveCategoryEdit = async (id: string) => {
    const res = await updateCategory(id, editingCategoryName);
    if (!res.ok) {
      setCategoryError(res.error || 'Failed to update category');
      return;
    }
    setEditingCategoryId(null);
    showToast('Category updated.');
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm.name.trim()) {
      showToast('Restaurant name cannot be empty.');
      return;
    }
    await updateSettings(settingsForm);
    showToast('Restaurant settings saved and published to menu.');
  };

  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTableError(null);
    const res = await addTable(newTableNumber, newTableLabel);
    if (!res.ok) {
      setTableError(res.error || 'Invalid table number');
      return;
    }
    showToast(`Generated QR code for Table ${newTableNumber.trim()}.`);
    setNewTableNumber('');
    setNewTableLabel('');
  };

  const handleDownloadRawQr = async (table: RestaurantTable) => {
    const dataUrl = await generateRawTableQrPng(window.location.origin, table.tableNumber);
    triggerDataUrlDownload(
      dataUrl,
      `${settings.name.toLowerCase().replace(/\s+/g, '-')}-table-${table.tableNumber}-qr.png`
    );
  };

  const handleDownloadBrandedQr = async (table: RestaurantTable) => {
    const dataUrl = await generateBrandedTableCardPng(
      window.location.origin,
      table,
      settings
    );
    triggerDataUrlDownload(
      dataUrl,
      `${settings.name.toLowerCase().replace(/\s+/g, '-')}-table-${table.tableNumber}-card.png`
    );
  };

  const handleOpenBrandedPreview = async (table: RestaurantTable) => {
    setPreviewCardModalTable(table);
    const dataUrl = await generateBrandedTableCardPng(
      window.location.origin,
      table,
      settings
    );
    setPreviewCardDataUrl(dataUrl);
  };

  // Protected Login Gate
  if (!isOwnerAuthenticated) {
    return (
      <div className="min-h-screen bg-[#EEF0F6] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#1E40AF] text-[#FACC15] flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-[#0F172A]">
            Owner Admin Login
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Sign in to manage {settings.name}&apos;s menu items, categories, branding, and table QR
            codes.
          </p>

          {authError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {authError}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={async () => {
                setAuthError(null);
                try {
                  await signInWithGoogle();
                } catch (err: unknown) {
                  setAuthError(
                    err instanceof Error
                      ? err.message
                      : 'Google Sign-In popup was closed or blocked.'
                  );
                }
              }}
              className="w-full h-12 px-4 rounded-xl bg-[#1E40AF] text-white font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <span>Sign in with Google (Owner)</span>
            </button>

            <button
              type="button"
              onClick={unlockDemoOwnerSession}
              className="w-full h-11 px-4 rounded-xl bg-slate-100 text-[#0F172A] font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Continue in Demo Owner Mode
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/"
              className="text-xs font-semibold text-[#1E40AF] hover:underline"
            >
              ← Back to Customer QR Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unresolvedWaiterCalls = waiterCalls.filter((c) => !c.resolved);

  return (
    <div className="min-h-screen bg-[#EEF0F6] text-[#0F172A] pb-16">
      {/* Top Bar following the strict 3-zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <Link
            to="/admin"
            className="font-display font-extrabold text-lg text-[#0F172A] whitespace-nowrap shrink-0"
          >
            {settings.name} Admin
          </Link>

          {/* Zone 2: 4 Concise Single-Line Section Nav Links */}
          <nav
            aria-label="Owner dashboard sections"
            className="hidden md:flex items-center gap-6 text-sm font-semibold"
          >
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'menu', label: 'Menu Items' },
                { id: 'categories', label: 'Categories' },
                { id: 'settings', label: 'Settings & QR' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSection === tab.id
                    ? 'border-[#1E40AF] text-[#1E40AF]'
                    : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action (View Live Customer Menu) */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-[#1E40AF] text-white font-display font-bold text-xs flex items-center gap-1.5 hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              <span>Live Customer Menu</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Mobile Section Switcher */}
        <div className="md:hidden flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-t border-slate-200/70 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'menu', label: 'Menu Items' },
              { id: 'categories', label: 'Categories' },
              { id: 'settings', label: 'Settings & QR' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Status Toast Banner */}
        {statusBanner && (
          <div
            role="status"
            className="mb-5 px-4 py-3 rounded-2xl bg-[#0F172A] text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FACC15] shrink-0" />
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              aria-label="Close status message"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================
            SECTION A: OVERVIEW
        ============================================================ */}
        {activeSection === 'overview' && (
          <section aria-label="Restaurant Overview" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F172A]">
                  {settings.name} — Overview
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {settings.tagline} ·{' '}
                  <span className="font-semibold text-[#0F172A]">
                    {settings.isOpen ? 'Open for Guests' : 'Marked Closed'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {!user && (
                  <button
                    type="button"
                    onClick={() => signInWithGoogle().catch(() => {})}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    Connect Google Account
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await resetDemoData();
                    showToast('Reset menu to default Kadak Café sample data.');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sample Data</span>
                </button>
                <button
                  type="button"
                  onClick={signOutOwner}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock Admin</span>
                </button>
              </div>
            </div>

            {/* 4 Key Overview Metrics (No Unnecessary Charts) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5">
                <span className="text-xs font-semibold text-slate-500">Restaurant Name</span>
                <p
                  data-testid="overview-restaurant-name"
                  className="mt-2 font-display font-extrabold text-xl text-[#0F172A] truncate"
                >
                  {settings.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{settings.openingHours}</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 p-5">
                <span className="text-xs font-semibold text-slate-500">Total Menu Items</span>
                <p
                  data-testid="overview-total-items"
                  className="mt-2 font-mono-num font-bold text-3xl text-[#0F172A]"
                >
                  {items.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {items.filter((i) => i.isAvailable).length} available ·{' '}
                  {items.filter((i) => !i.isAvailable).length} unavailable
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 p-5">
                <span className="text-xs font-semibold text-slate-500">Number of Categories</span>
                <p
                  data-testid="overview-total-categories"
                  className="mt-2 font-mono-num font-bold text-3xl text-[#0F172A]"
                >
                  {categories.length}
                </p>
                <p className="mt-1 text-xs text-slate-500 truncate">
                  {sortedCategories.map((c) => c.name).join(' · ')}
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 p-5">
                <span className="text-xs font-semibold text-slate-500">QR Menu Scan Count</span>
                <p
                  data-testid="overview-scan-count"
                  className="mt-2 font-mono-num font-bold text-3xl text-[#1E40AF]"
                >
                  {settings.scanCount}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Across {tables.length} configured tables
                </p>
              </div>
            </div>

            {/* Quick Section Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveSection('menu')}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 text-left hover:border-[#1E40AF] transition-colors cursor-pointer"
              >
                <h2 className="font-display font-bold text-base text-[#0F172A]">
                  Manage Menu Items →
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Add dishes, edit INR prices, mark Bestsellers or toggle item availability.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('categories')}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 text-left hover:border-[#1E40AF] transition-colors cursor-pointer"
              >
                <h2 className="font-display font-bold text-base text-[#0F172A]">
                  Organize Categories →
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Add, rename, delete or reorder sticky category tabs on the customer menu.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('settings')}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 text-left hover:border-[#1E40AF] transition-colors cursor-pointer"
              >
                <h2 className="font-display font-bold text-base text-[#0F172A]">
                  Settings &amp; Table QR Codes →
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Customize branding, bottom action bar, and download printable table QR cards.
                </p>
              </button>
            </div>

            {/* Live Waiter Calls & Private Guest Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#1E40AF]" />
                    <h2 className="font-display font-bold text-base text-[#0F172A]">
                      Active Table Waiter Calls ({unresolvedWaiterCalls.length})
                    </h2>
                  </div>
                </div>
                {unresolvedWaiterCalls.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No active waiter calls right now. When a customer taps &ldquo;Call Waiter&rdquo;
                    on their phone, their table number appears here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {unresolvedWaiterCalls.map((call) => (
                      <li
                        key={call.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-mono-num font-bold text-sm text-[#0F172A]">
                            Table {call.tableNumber}
                          </span>
                          <span className="mx-2 text-slate-300">·</span>
                          <span className="text-xs font-medium text-slate-700">{call.reason}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => resolveWaiterCall(call.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                        >
                          Mark Attended
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-[#1E40AF]" />
                  <h2 className="font-display font-bold text-base text-[#0F172A]">
                    Private Customer Notes ({feedbackNotes.length})
                  </h2>
                </div>
                {feedbackNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No private feedback notes received yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {feedbackNotes.slice(0, 5).map((note) => (
                      <li key={note.id} className="py-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#0F172A]">{note.guestName}</span>
                          <span>·</span>
                          <span className="font-mono-num">Table {note.tableNumber}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700">{note.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            SECTION B: MENU MANAGEMENT
        ============================================================ */}
        {activeSection === 'menu' && (
          <section aria-label="Menu Management" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display font-extrabold text-2xl text-[#0F172A]">
                  Menu Management ({items.length} items)
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Add, edit, reorder, or toggle availability. All edits appear immediately on the
                  customer menu.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddItemModal}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#1E40AF] text-white font-display font-bold text-xs sm:text-sm inline-flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Food Item</span>
              </button>
            </div>

            {/* Category Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedMenuCatFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedMenuCatFilter === 'all'
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Categories ({items.length})
              </button>
              {sortedCategories.map((cat) => {
                const count = items.filter((i) => i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedMenuCatFilter(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedMenuCatFilter === cat.id
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Category-by-Category Item Lists */}
            <div className="space-y-6">
              {sortedCategories
                .filter(
                  (cat) => selectedMenuCatFilter === 'all' || cat.id === selectedMenuCatFilter
                )
                .map((cat) => {
                  const catItems = items
                    .filter((i) => i.categoryId === cat.id)
                    .sort((a, b) => a.sortOrder - b.sortOrder);

                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs"
                    >
                      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between">
                        <h2 className="font-display font-bold text-base text-[#0F172A]">
                          {cat.name}
                        </h2>
                        <span className="text-xs font-mono-num text-slate-500">
                          {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {catItems.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No items in {cat.name} yet.
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {catItems.map((item, idx) => (
                            <li
                              key={item.id}
                              className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                                !item.isAvailable ? 'bg-slate-50/80 opacity-65' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <VegIndicator isVeg={item.isVeg} className="mt-1" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display font-bold text-base text-[#0F172A]">
                                      {item.name}
                                    </span>
                                    <span className="font-mono-num font-bold text-sm text-[#1E40AF]">
                                      {formatPriceINR(item.price)}
                                    </span>
                                    {item.isBestseller && (
                                      <span className="text-xs font-semibold text-[#B45309]">
                                        · ★ Bestseller
                                      </span>
                                    )}
                                    {item.isChefsPick && (
                                      <span className="text-xs font-semibold text-[#1D4ED8]">
                                        · ✦ Chef&apos;s Pick
                                      </span>
                                    )}
                                    {!item.isAvailable && (
                                      <span className="text-xs font-semibold text-rose-700">
                                        · Sold Out / Hidden
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {item.imageUrl && (
                                  <FoodThumbnail imageUrl={item.imageUrl} name={item.name} />
                                )}
                              </div>

                              {/* Controls: Availability Toggle, Reorder Up/Down, Edit, Delete */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => toggleItemAvailability(item.id)}
                                  aria-label={`Mark ${item.name} as ${
                                    item.isAvailable ? 'unavailable' : 'available'
                                  }`}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                                    item.isAvailable
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                  }`}
                                >
                                  {item.isAvailable ? 'In Stock' : 'Unavailable'}
                                </button>

                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveMenuItem(cat.id, item.id, 'up')}
                                  aria-label={`Move ${item.name} up`}
                                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  disabled={idx === catItems.length - 1}
                                  onClick={() => moveMenuItem(cat.id, item.id, 'down')}
                                  aria-label={`Move ${item.name} down`}
                                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditItemModal(item)}
                                  aria-label={`Edit ${item.name}`}
                                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteMenuItem(item.id);
                                    showToast(`Deleted "${item.name}".`);
                                  }}
                                  aria-label={`Delete ${item.name}`}
                                  className="w-9 h-9 rounded-lg border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ============================================================
            SECTION C: CATEGORIES
        ============================================================ */}
        {activeSection === 'categories' && (
          <section aria-label="Category Management" className="max-w-3xl space-y-6">
            <div>
              <h1 className="font-display font-extrabold text-2xl text-[#0F172A]">
                Menu Categories ({categories.length})
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Add, rename, delete, or reorder category tabs displayed on the customer menu.
              </p>
            </div>

            {/* Add Category Form */}
            <form
              onSubmit={handleAddCategorySubmit}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name (e.g. Cold Beverages, Burgers)"
                aria-label="New category name"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#1E40AF] text-white font-display font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </form>

            {categoryError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {categoryError}
              </div>
            )}

            {/* Category List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {sortedCategories.map((cat, idx) => {
                  const itemCount = items.filter((i) => i.categoryId === cat.id).length;
                  const isEditing = editingCategoryId === cat.id;

                  return (
                    <li
                      key={cat.id}
                      className="p-4 sm:px-5 flex items-center justify-between gap-3"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            aria-label="Edit category name"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryEdit(cat.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#1E40AF] text-white text-xs font-semibold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="font-display font-bold text-base text-[#0F172A]">
                            {cat.name}
                          </span>
                          <span className="ml-2 text-xs font-mono-num text-slate-500">
                            · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCategory(cat.id, 'up')}
                          aria-label={`Move category ${cat.name} up`}
                          className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedCategories.length - 1}
                          onClick={() => moveCategory(cat.id, 'down')}
                          aria-label={`Move category ${cat.name} down`}
                          className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setEditingCategoryName(cat.name);
                          }}
                          aria-label={`Rename category ${cat.name}`}
                          className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await deleteCategory(cat.id);
                            if (!res.ok) {
                              setCategoryError(res.error || 'Cannot delete category');
                            } else {
                              showToast(`Deleted category "${cat.name}".`);
                            }
                          }}
                          aria-label={`Delete category ${cat.name}`}
                          className="w-9 h-9 rounded-lg border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* ============================================================
            SECTION D: SETTINGS & QR CODES
        ============================================================ */}
        {activeSection === 'settings' && (
          <section aria-label="Settings and QR Code Management" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 7 Columns: Restaurant Branding & Action Settings */}
              <form
                onSubmit={handleSaveSettingsSubmit}
                className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5"
              >
                <div>
                  <h2 className="font-display font-extrabold text-xl text-[#0F172A]">
                    Restaurant Branding &amp; Settings
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Customize your header, opening hours, Google Review link, and bottom navigation
                    actions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="setting-restaurant-name"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Restaurant Name
                    </label>
                    <input
                      id="setting-restaurant-name"
                      type="text"
                      required
                      value={settingsForm.name}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="setting-opening-hours"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Opening Hours
                    </label>
                    <input
                      id="setting-opening-hours"
                      type="text"
                      required
                      value={settingsForm.openingHours}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, openingHours: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="setting-tagline"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Restaurant Tagline
                  </label>
                  <input
                    id="setting-tagline"
                    type="text"
                    required
                    value={settingsForm.tagline}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, tagline: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* Restaurant Status & Brand Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Restaurant Status
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSettingsForm((prev) => ({ ...prev, isOpen: true }))}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                          settingsForm.isOpen
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        Open Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsForm((prev) => ({ ...prev, isOpen: false }))}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                          !settingsForm.isOpen
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        Closed
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="setting-brand-color"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Header Brand Colour
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="setting-brand-color"
                        type="color"
                        value={settingsForm.brandColor}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({ ...prev, brandColor: e.target.value }))
                        }
                        className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.brandColor}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({ ...prev, brandColor: e.target.value }))
                        }
                        aria-label="Brand hex color"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono-num text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Upload / URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Restaurant Logo (Optional — defaults to Kadak Chai Illustration)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {settingsForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm((prev) => ({ ...prev, logoUrl: '' }))}
                        className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove custom logo
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact, WhatsApp & Google Review URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="setting-contact-number"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Contact Number
                    </label>
                    <input
                      id="setting-contact-number"
                      type="text"
                      value={settingsForm.contactNumber}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, contactNumber: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono-num text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="setting-whatsapp-number"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      WhatsApp Number (with country code)
                    </label>
                    <input
                      id="setting-whatsapp-number"
                      type="text"
                      value={settingsForm.whatsappNumber}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono-num text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="setting-google-review"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Google Review URL
                  </label>
                  <input
                    id="setting-google-review"
                    type="url"
                    required
                    value={settingsForm.googleReviewUrl}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, googleReviewUrl: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* Fixed Bottom Action Bar Second Button Mode */}
                <div>
                  <label
                    htmlFor="setting-secondary-action"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Fixed Bottom Bar — Second Action Button
                  </label>
                  <select
                    id="setting-secondary-action"
                    value={settingsForm.secondaryActionType}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        secondaryActionType: e.target.value as SecondaryActionType,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="waiter">Call Waiter (In-App Table Alert)</option>
                    <option value="whatsapp">Open WhatsApp Chat</option>
                    <option value="call">Call Restaurant Phone Number</option>
                    <option value="disabled">Disabled (Show only Google Review button)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1E40AF] text-white font-display font-bold text-sm hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    Save Restaurant Settings
                  </button>
                </div>
              </form>

              {/* Right 5 Columns: Table QR Code Generator & Printable Cards */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#1E40AF]" />
                    <h2 className="font-display font-extrabold text-xl text-[#0F172A]">
                      Table QR Code Generator
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Each table QR opens your digital menu with its table identifier (e.g.{' '}
                    <code className="font-mono-num text-[#1E40AF]">/?table=01</code>).
                  </p>

                  {/* Add Custom Table Form */}
                  <form onSubmit={handleAddTableSubmit} className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(e.target.value)}
                        placeholder="Table # (e.g. 06)"
                        aria-label="New table number"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono-num text-sm"
                      />
                      <input
                        type="text"
                        value={newTableLabel}
                        onChange={(e) => setNewTableLabel(e.target.value)}
                        placeholder="Label (e.g. Patio Booth)"
                        aria-label="New table label"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    {tableError && (
                      <p className="text-xs font-semibold text-rose-600">{tableError}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Generate Table QR Code</span>
                    </button>
                  </form>
                </div>

                {/* List of Table QR Cards */}
                <div className="space-y-3">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className="bg-white rounded-3xl border border-slate-200/80 p-4 flex items-center gap-4"
                    >
                      {tableQrPreviews[table.id] ? (
                        <img
                          src={tableQrPreviews[table.id]}
                          alt={`QR Code for Table ${table.tableNumber}`}
                          className="w-20 h-20 rounded-xl border border-slate-200 p-1 shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-slate-100 shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-base text-[#0F172A]">
                            Table {table.tableNumber}
                          </span>
                          <span className="text-xs font-mono-num text-slate-500">
                            · {table.scans} scans
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{table.label}</p>
                        <p className="mt-0.5 text-[11px] font-mono-num text-[#1E40AF] truncate">
                          /?table={table.tableNumber}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadRawQr(table)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>QR PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenBrandedPreview(table)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FACC15] hover:brightness-95 text-[#0F172A] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Branded Tent Card</span>
                          </button>

                          <Link
                            to={`/?table=${encodeURIComponent(table.tableNumber)}`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                          >
                            Test Link
                          </Link>

                          <button
                            type="button"
                            onClick={() => deleteTable(table.id)}
                            aria-label={`Delete Table ${table.tableNumber}`}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Add / Edit Menu Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-modal-title"
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl border border-slate-200 my-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="item-modal-title" className="font-display font-bold text-lg text-[#0F172A]">
                {editingItem ? `Edit "${editingItem.name}"` : 'Add New Menu Item'}
              </h2>
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                aria-label="Close item modal"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div>
                <label
                  htmlFor="item-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Food Name
                </label>
                <input
                  id="item-name-input"
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Irani Mawa Cake"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="item-price-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Price in INR (₹)
                  </label>
                  <input
                    id="item-price-input"
                    type="number"
                    min="0"
                    max="100000"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="95"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono-num text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="item-category-select"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="item-category-select"
                    value={itemForm.categoryId}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="item-desc-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Short Description
                </label>
                <textarea
                  id="item-desc-input"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Rich khoya tea cake baked with crushed green cardamom..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {/* Dietary Type */}
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dietary Indicator
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setItemForm((prev) => ({ ...prev, isVeg: true }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      itemForm.isVeg
                        ? 'bg-emerald-50 border-[#15803D] text-[#15803D]'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <VegIndicator isVeg={true} />
                    <span>Vegetarian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemForm((prev) => ({ ...prev, isVeg: false }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      !itemForm.isVeg
                        ? 'bg-rose-50 border-[#B91C1C] text-[#B91C1C]'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <VegIndicator isVeg={false} />
                    <span>Non-Vegetarian</span>
                  </button>
                </div>
              </div>

              {/* Labels & Availability Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isBestseller}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, isBestseller: e.target.checked }))
                    }
                    className="rounded text-[#1E40AF]"
                  />
                  <span>★ Bestseller</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isChefsPick}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, isChefsPick: e.target.checked }))
                    }
                    className="rounded text-[#1E40AF]"
                  />
                  <span>✦ Chef&apos;s Pick</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, isAvailable: e.target.checked }))
                    }
                    className="rounded text-[#1E40AF]"
                  />
                  <span>Available Now</span>
                </label>
              </div>

              {/* Optional Food Photograph */}
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Optional Food Thumbnail
                </span>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleItemPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={itemForm.imageUrl}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="Or paste image URL (optional)"
                    aria-label="Food image URL"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {itemFormError && (
                <p className="text-xs font-semibold text-rose-600">{itemFormError}</p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1E40AF] text-white font-display font-bold text-xs hover:opacity-95 cursor-pointer"
                >
                  {editingItem ? 'Save Item Changes' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Branded QR Tent Card Modal */}
      {previewCardModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="branded-qr-modal-title"
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                id="branded-qr-modal-title"
                className="font-display font-bold text-lg text-[#0F172A]"
              >
                Printable Branded QR Card — Table {previewCardModalTable.tableNumber}
              </h2>
              <button
                type="button"
                onClick={() => setPreviewCardModalTable(null)}
                aria-label="Close QR card preview"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewCardDataUrl && (
              <div className="bg-slate-100 rounded-2xl p-3 flex items-center justify-center">
                <img
                  src={previewCardDataUrl}
                  alt={`Printable QR Tent Card for Table ${previewCardModalTable.tableNumber}`}
                  className="max-h-96 w-auto rounded-xl shadow-sm"
                />
              </div>
            )}

            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewCardModalTable(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadBrandedQr(previewCardModalTable)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1E40AF] text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Printable PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
