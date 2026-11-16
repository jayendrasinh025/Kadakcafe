import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import {
  Search,
  X,
  Clock,
  Star,
  Bell,
  Phone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Send,
  SlidersHorizontal,
  QrCode,
  MapPin,
} from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import {
  buildTableMenuUrl,
  filterMenuItems,
  formatPriceINR,
  groupItemsByCategory,
  resolveSecondaryAction,
} from '../utils/menuLogic';
import { FoodThumbnail, KadakBrandIllustration, VegIndicator } from './VegIndicator';
import { MenuItem } from '../types/menu';

export const CustomerMenuView: React.FC = () => {
  const {
    settings,
    categories,
    items,
    tables,
    activeTableNumber,
    setActiveTableNumber,
    recordScan,
    triggerWaiterCall,
    submitPrivateFeedback,
  } = useMenu();

  const [searchParams, setSearchParams] = useSearchParams();
  const tableParam = searchParams.get('table');

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    () => sortedCategories[0]?.id ?? 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Waiter Call Sheet State
  const [waiterSheetOpen, setWaiterSheetOpen] = useState<boolean>(false);
  const [waiterTableInput, setWaiterTableInput] = useState<string>(tableParam || '01');
  const [waiterReason, setWaiterReason] = useState<string>('Ready to order');
  const [waiterSuccessToast, setWaiterSuccessToast] = useState<string | null>(null);

  // Private Feedback Form State
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const [feedbackName, setFeedbackName] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Desktop companion QR preview
  const [desktopQrDataUrl, setDesktopQrDataUrl] = useState<string>('');

  const scanRecordedRef = useRef<string | null>(null);

  // Keep activeCategoryId valid if categories change
  useEffect(() => {
    if (
      sortedCategories.length > 0 &&
      !sortedCategories.some((c) => c.id === activeCategoryId)
    ) {
      setActiveCategoryId(sortedCategories[0].id);
    }
  }, [sortedCategories, activeCategoryId]);

  // Sync ?table= query param and record scan once per session/table
  useEffect(() => {
    if (tableParam) {
      setActiveTableNumber(tableParam);
      setWaiterTableInput(tableParam);
    }
    const scanKey = tableParam || '__general__';
    if (scanRecordedRef.current !== scanKey) {
      scanRecordedRef.current = scanKey;
      recordScan(tableParam);
    }
  }, [tableParam, setActiveTableNumber, recordScan]);

  // Generate QR preview for the desktop table card
  useEffect(() => {
    const previewTable = activeTableNumber || tables[0]?.tableNumber || '01';
    const url = buildTableMenuUrl(window.location.origin, previewTable);
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => setDesktopQrDataUrl(dataUrl))
      .catch(() => setDesktopQrDataUrl(''));
  }, [activeTableNumber, tables]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    const base = filterMenuItems(items, activeCategoryId, searchQuery, {
      includeUnavailable: false,
      strictCategoryWhenSearching: false,
    });
    if (!vegOnly) return base;
    return base.filter((item) => item.isVeg);
  }, [items, activeCategoryId, searchQuery, vegOnly]);

  const isSearching = searchQuery.trim().length > 0;

  // Grouped search results when searching across categories
  const groupedSearchResults = useMemo(() => {
    if (!isSearching) return [];
    return groupItemsByCategory(sortedCategories, filteredItems);
  }, [isSearching, sortedCategories, filteredItems]);

  const activeCategoryObj = useMemo(
    () => sortedCategories.find((c) => c.id === activeCategoryId) ?? sortedCategories[0],
    [sortedCategories, activeCategoryId]
  );

  const secondaryAction = useMemo(
    () => resolveSecondaryAction(settings, activeTableNumber),
    [settings, activeTableNumber]
  );

  const handleWaiterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tableNum = waiterTableInput.trim() || activeTableNumber || '01';
    triggerWaiterCall(tableNum, waiterReason);
    setWaiterSheetOpen(false);
    setWaiterSuccessToast(`Waiter notified for Table ${tableNum} (${waiterReason})`);
    setTimeout(() => {
      setWaiterSuccessToast(null);
    }, 4000);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      setFeedbackError('Please enter a short note before sending.');
      return;
    }
    setFeedbackError(null);
    submitPrivateFeedback({
      tableNumber: activeTableNumber || 'Walk-in',
      guestName: feedbackName,
      message: feedbackText,
    });
    setFeedbackText('');
    setFeedbackName('');
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackOpen(false);
    }, 2500);
  };

  const handleSelectTableParam = (tableNum: string) => {
    setSearchParams({ table: tableNum });
  };

  const renderMenuItemRow = (item: MenuItem) => (
    <li
      key={item.id}
      data-testid={`menu-item-${item.id}`}
      className="py-4 px-4 sm:px-5 border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/70"
    >
      <div className="flex items-start justify-between gap-3.5">
        {/* Left column: Veg/Non-veg + Name + Unboxed Labels + Description */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <VegIndicator isVeg={item.isVeg} className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
              <h3 className="font-display font-bold text-[16px] sm:text-[17px] text-[#0F172A] leading-snug">
                {item.name}
              </h3>
              {(item.isBestseller || item.isChefsPick) && (
                <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-tight">
                  {item.isBestseller && (
                    <span className="text-[#B45309] whitespace-nowrap">★ Bestseller</span>
                  )}
                  {item.isBestseller && item.isChefsPick && (
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                  )}
                  {item.isChefsPick && (
                    <span className="text-[#1D4ED8] whitespace-nowrap">✦ Chef&apos;s Pick</span>
                  )}
                </div>
              )}
            </div>

            {item.description && (
              <p className="mt-1 text-[13.5px] text-slate-600 leading-relaxed max-w-[62ch]">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Right column: Right-aligned Price in INR + Optional Compact Thumbnail */}
        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          <div className="text-right">
            <span className="font-mono-num font-bold text-[16px] sm:text-[17px] text-[#0F172A] whitespace-nowrap">
              {formatPriceINR(item.price)}
            </span>
          </div>
          {showThumbnails && item.imageUrl && (
            <FoodThumbnail imageUrl={item.imageUrl} name={item.name} />
          )}
        </div>
      </div>
    </li>
  );

  return (
    <div className="min-h-screen bg-[#EEF0F6] text-[#0F172A] pb-24">
      {/* Main Responsive Container: Full Mobile on <1024px, Balanced 12-Col Layout on Desktop */}
      <div className="max-w-5xl mx-auto lg:px-6 lg:py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* Primary Digital QR Menu Column */}
          <main className="lg:col-span-7 xl:col-span-8 max-w-xl mx-auto lg:max-w-none w-full">
            {/* 1. DISTINCTIVE RESTAURANT HEADER */}
            <header
              style={{ backgroundColor: settings.brandColor || '#1E40AF' }}
              className="text-white rounded-b-[2rem] lg:rounded-[2rem] px-5 pt-5 pb-6 shadow-md transition-colors relative overflow-hidden"
            >
              {/* Top utility row: Table context & Owner Dashboard access */}
              <div className="flex items-center justify-between gap-4 mb-4 text-xs font-medium text-white/90">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-wide uppercase text-[#FACC15]">
                    Digital Menu
                  </span>
                  {activeTableNumber && (
                    <>
                      <span aria-hidden="true" className="text-white/40">
                        ·
                      </span>
                      <span
                        data-testid="active-table-indicator"
                        className="font-mono-num font-bold text-white whitespace-nowrap"
                      >
                        Table {activeTableNumber}
                      </span>
                    </>
                  )}
                </div>

                <Link
                  to="/admin"
                  className="text-xs font-medium text-white/90 hover:text-[#FACC15] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
                >
                  Owner Dashboard
                </Link>
              </div>

              {/* Brand Identity Row */}
              <div className="flex items-start gap-4">
                <KadakBrandIllustration logoUrl={settings.logoUrl} name={settings.name} />
                <div className="min-w-0 flex-1">
                  <h1
                    className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-white leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    {settings.name}
                  </h1>
                  <p className="mt-1 text-sm text-white/85 leading-snug">{settings.tagline}</p>

                  {/* Open/Closed Status & Opening Hours */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-white/95">
                    <span
                      className={`font-semibold ${
                        settings.isOpen ? 'text-[#FACC15]' : 'text-rose-200'
                      }`}
                    >
                      {settings.isOpen ? 'Open Now' : 'Currently Closed'}
                    </span>
                    <span aria-hidden="true" className="text-white/40">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-white/90">
                      <Clock className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
                      <span>{settings.openingHours}</span>
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {/* 2. SEARCH BAR & QUICK FILTERS */}
            <section aria-label="Search and filter menu" className="px-4 sm:px-0 mt-4">
              <div className="relative flex items-center">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chai, bun maska, sandwiches..."
                  aria-label="Search food by name or description"
                  className="w-full h-12 pl-11 pr-10 bg-white text-[#0F172A] placeholder:text-slate-400 text-sm font-medium rounded-2xl border border-slate-200/90 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>

            {/* 3. STICKY HORIZONTAL CATEGORY NAVIGATION */}
            <nav
              aria-label="Menu categories"
              className="sticky top-0 z-30 bg-[#EEF0F6]/95 backdrop-blur-md py-3 px-4 sm:px-0 mt-1 border-b border-slate-200/60"
            >
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {sortedCategories.map((category) => {
                  const isActive = !isSearching && category.id === activeCategoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(category.id);
                        if (isSearching) {
                          setSearchQuery('');
                        }
                      }}
                      className={`relative px-4 py-2.5 min-h-[44px] rounded-xl font-display font-bold text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer select-none ${
                        isActive
                          ? 'text-[#0F172A]'
                          : 'bg-white text-slate-700 hover:text-[#0F172A] border border-slate-200/80'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="activeCategoryIndicator"
                          style={{ backgroundColor: settings.accentColor || '#FACC15' }}
                          className="absolute inset-0 rounded-xl shadow-xs"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* 4. COMPACT LIST-BASED FOOD MENU */}
            <section aria-label="Food Menu" className="px-4 sm:px-0 mt-3">
              {/* Category Header Bar with Veg-Only & Photo Toggle */}
              <div className="flex items-center justify-between gap-2 mb-2.5 px-1">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#0F172A]">
                    {isSearching
                      ? `Search Results (${filteredItems.length})`
                      : activeCategoryObj?.name || 'Menu'}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVegOnly((v) => !v)}
                    aria-pressed={vegOnly}
                    className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      vegOnly
                        ? 'bg-[#15803D] text-white'
                        : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <VegIndicator isVeg={true} className="scale-90" />
                    <span>Pure Veg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowThumbnails((prev) => !prev)}
                    aria-pressed={showThumbnails}
                    title="Toggle optional food thumbnails"
                    className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200/90 hover:text-[#0F172A] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{showThumbnails ? 'Photos On' : 'Compact'}</span>
                  </button>
                </div>
              </div>

              {/* Menu Items List Card */}
              {filteredItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center my-2">
                  <p className="font-display font-bold text-base text-[#0F172A]">
                    No matching dishes found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try searching for another dish or clearing the Pure Veg filter.
                  </p>
                  {(searchQuery || vegOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setVegOnly(false);
                      }}
                      className="mt-4 px-4 py-2 bg-[#1E40AF] text-white text-xs font-semibold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : isSearching ? (
                <div className="space-y-4">
                  {groupedSearchResults.map((group) => (
                    <div
                      key={group.category.id}
                      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs"
                    >
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">
                          {group.category.name}
                        </span>
                        <span className="text-xs font-mono-num text-slate-400">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {group.items.map((item) => renderMenuItemRow(item))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs">
                  <ul>{filteredItems.map((item) => renderMenuItemRow(item))}</ul>
                </div>
              )}
            </section>

            {/* 5. YELLOW REVIEWS SECTION */}
            <section
              aria-label="Customer Reviews and Feedback"
              className="px-4 sm:px-0 mt-6 mb-6"
            >
              <div
                style={{ backgroundColor: settings.accentColor || '#FACC15' }}
                className="rounded-3xl p-6 text-[#0F172A] shadow-xs border border-amber-300/60"
              >
                {/* Five-Star Visual */}
                <div
                  className="flex items-center gap-1 text-[#0F172A]"
                  aria-label="5 out of 5 stars"
                >
                  {[...Array(5)].map((_, idx) => (
                    <Star
                      key={idx}
                      className="w-5 h-5 fill-[#0F172A] text-[#0F172A]"
                      aria-hidden="true"
                    />
                  ))}
                </div>

                <h2 className="mt-3 font-display font-extrabold text-xl sm:text-2xl text-[#0F172A]">
                  Enjoyed your visit?
                </h2>
                <p className="mt-1.5 text-sm text-[#0F172A]/85 leading-relaxed max-w-md">
                  Your review helps fellow chai &amp; bun maska lovers discover {settings.name}.
                  Share your experience directly on Google!
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={settings.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#0F172A] text-white font-display font-bold text-sm hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Write a Google Review</span>
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setFeedbackOpen((prev) => !prev)}
                    aria-expanded={feedbackOpen}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl bg-white/75 hover:bg-white text-[#0F172A] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{feedbackOpen ? 'Hide Private Note' : 'Send Private Feedback'}</span>
                  </button>
                </div>

                {/* Optional Private Feedback Form (never gates Google review) */}
                <AnimatePresence>
                  {feedbackOpen && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleFeedbackSubmit}
                      className="mt-4 pt-4 border-t border-[#0F172A]/15 space-y-3 overflow-hidden"
                    >
                      <p className="text-xs font-medium text-[#0F172A]/80">
                        Have a suggestion for our kitchen or service team? Send a direct note to
                        management:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          placeholder="Your name (optional)"
                          aria-label="Your name (optional)"
                          className="px-3.5 py-2.5 rounded-xl bg-white text-sm text-[#0F172A] placeholder:text-slate-400 border border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                        />
                        <input
                          type="text"
                          value={activeTableNumber ? `Table ${activeTableNumber}` : 'Walk-in Guest'}
                          disabled
                          aria-label="Table identifier"
                          className="px-3.5 py-2.5 rounded-xl bg-white/60 text-sm text-slate-600 font-mono-num border border-amber-400/30"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Tell us what you loved or how we can improve..."
                        aria-label="Private feedback message"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white text-sm text-[#0F172A] placeholder:text-slate-400 border border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                      />
                      {feedbackError && (
                        <p className="text-xs font-semibold text-rose-800">{feedbackError}</p>
                      )}
                      {feedbackSubmitted ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] bg-white/80 px-3.5 py-2.5 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Thank you! Your note has been shared with {settings.name}.</span>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Note to Café</span>
                        </button>
                      )}
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </main>

          {/* Desktop Companion Column: Live Table QR Simulator & Dining Details (Visible on lg+) */}
          <aside
            aria-label="Table QR Code and Restaurant Information"
            className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-6 space-y-5"
          >
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#1E40AF]" aria-hidden="true" />
                  <h2 className="font-display font-bold text-base text-[#0F172A]">
                    Table QR Preview
                  </h2>
                </div>
                <span className="font-mono-num text-xs font-semibold text-slate-500">
                  Table {activeTableNumber || tables[0]?.tableNumber || '01'}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Customers scan the table standee QR code to open this mobile menu with their table
                number pre-selected.
              </p>

              {desktopQrDataUrl && (
                <div className="mt-4 flex flex-col items-center justify-center bg-[#EEF0F6] rounded-2xl p-4 border border-slate-200/70">
                  <img
                    src={desktopQrDataUrl}
                    alt={`QR code for Table ${activeTableNumber || '01'}`}
                    className="w-36 h-36 rounded-xl bg-white p-2 shadow-2xs"
                  />
                  <span className="mt-2 font-mono-num text-xs font-bold text-[#0F172A]">
                    /?table={activeTableNumber || tables[0]?.tableNumber || '01'}
                  </span>
                </div>
              )}

              {/* Quick Table Switcher */}
              <div className="mt-4">
                <span className="block text-xs font-semibold text-slate-500 mb-2">
                  Simulate Table Scan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tables.map((t) => {
                    const isCurrent = activeTableNumber === t.tableNumber;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTableParam(t.tableNumber)}
                        className={`px-3 py-1.5 rounded-lg font-mono-num text-xs font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#1E40AF] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Table {t.tableNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Restaurant Contact & Quick Admin CTA */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Contact</span>
                  </span>
                  <span className="font-mono-num font-semibold text-[#0F172A]">
                    {settings.contactNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Dietary Info</span>
                  </span>
                  <span className="font-medium text-[#0F172A]">FSSAI Veg / Non-Veg Marked</span>
                </div>
              </div>

              <Link
                to="/admin"
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-display font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <span>Open Owner Admin Dashboard</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Waiter Notification Toast */}
      <AnimatePresence>
        {waiterSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            role="status"
            className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto bg-[#0F172A] text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 border border-slate-700"
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#FACC15] shrink-0" />
              <span>{waiterSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setWaiterSuccessToast(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Waiter Modal / Bottom Sheet */}
      <AnimatePresence>
        {waiterSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="call-waiter-title"
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border border-slate-200"
            >
              <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between">
                <h2
                  id="call-waiter-title"
                  className="font-display font-bold text-lg text-[#0F172A]"
                >
                  Call Waiter to Your Table
                </h2>
                <button
                  type="button"
                  onClick={() => setWaiterSheetOpen(false)}
                  aria-label="Close waiter request dialog"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleWaiterSubmit} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="waiter-table-number"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Table Number
                  </label>
                  <input
                    id="waiter-table-number"
                    type="text"
                    required
                    value={waiterTableInput}
                    onChange={(e) => setWaiterTableInput(e.target.value)}
                    placeholder="e.g. 01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono-num text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    How can we help?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Ready to order',
                      'Water refill',
                      'Extra cutting glasses',
                      'Bring the bill',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setWaiterReason(reason)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-colors cursor-pointer ${
                          waiterReason === reason
                            ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setWaiterSheetOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-[#1E40AF] text-white font-display font-bold text-xs hover:opacity-95 cursor-pointer"
                  >
                    Notify Waiter Now
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. FIXED BOTTOM ACTION BAR */}
      <div
        role="region"
        aria-label="Quick customer actions"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 pb-safe shadow-lg"
      >
        <div
          className={`max-w-xl mx-auto grid gap-2.5 ${
            secondaryAction.type === 'disabled' ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {/* Button 1: Review on Google */}
          <a
            href={settings.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-xl bg-[#FACC15] text-[#0F172A] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs hover:brightness-95 active:scale-[0.99] transition-all whitespace-nowrap shrink-0"
          >
            <Star className="w-4 h-4 fill-[#0F172A] text-[#0F172A] shrink-0" aria-hidden="true" />
            <span>Review on Google</span>
          </a>

          {/* Button 2: Configurable Secondary Button (Call Waiter / Open WhatsApp / Call Restaurant / Disabled) */}
          {secondaryAction.type !== 'disabled' && (
            <>
              {secondaryAction.type === 'waiter' ? (
                <button
                  type="button"
                  onClick={() => setWaiterSheetOpen(true)}
                  style={{ backgroundColor: settings.brandColor || '#1E40AF' }}
                  className="h-11 px-4 rounded-xl text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Call Waiter</span>
                </button>
              ) : (
                <a
                  href={secondaryAction.href}
                  target={secondaryAction.type === 'whatsapp' ? '_blank' : undefined}
                  rel={secondaryAction.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
                  style={{ backgroundColor: settings.brandColor || '#1E40AF' }}
                  className="h-11 px-4 rounded-xl text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs hover:opacity-95 active:scale-[0.99] transition-all whitespace-nowrap shrink-0"
                >
                  {secondaryAction.type === 'whatsapp' ? (
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{secondaryAction.label}</span>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
