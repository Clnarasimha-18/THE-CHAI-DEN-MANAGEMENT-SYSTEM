import React, { useState, useEffect } from 'react';
import { Category, MenuItem } from '../types';
import { QrCode, Lock, X, Github, Linkedin, Mail } from 'lucide-react';
import { ChaiDenLogo } from './ChaiDenLogo';
import { ChaiMugHero } from './ChaiMugHero';

interface PublicMenuCardProps {
  categories: Category[];
  menuItems: MenuItem[];
  onOpenOwnerLogin: () => void;
  onOpenQrModal: () => void;
}

export const PublicMenuCard: React.FC<PublicMenuCardProps> = ({
  categories,
  menuItems: propMenuItems,
  onOpenOwnerLogin,
  onOpenQrModal,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>(propMenuItems);
  const [recentlyUpdatedPriceId, setRecentlyUpdatedPriceId] = useState<string | null>(null);

  // Sync propMenuItems into liveMenuItems
  useEffect(() => {
    setLiveMenuItems(propMenuItems);
  }, [propMenuItems]);

  // Real-time listener for zero-latency local / cross-tab price updates
  useEffect(() => {
    const handleItemsChanged = (e: Event) => {
      const custom = e as CustomEvent<MenuItem[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setLiveMenuItems(custom.detail);
      }
    };

    window.addEventListener('chaiden_items_changed', handleItemsChanged);
    return () => {
      window.removeEventListener('chaiden_items_changed', handleItemsChanged);
    };
  }, []);

  // Filter and sort active categories
  const filteredCategories = categories
    .filter((c) => c.active !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Robust category matching for 3 columns matching physical menu card
  const isCategoryMatch = (cat: Category, targetKey: string): boolean => {
    const id = (cat.id || '').toLowerCase();
    const name = (cat.name || '').toUpperCase();

    switch (targetKey) {
      case 'teas':
        return id.includes('tea') || (name.includes('TEA') && !name.includes('GREEN'));
      case 'flavored_milks':
        return id.includes('flavored') || name.includes('FLAVORED');
      case 'hot_coffees':
        return (
          id.includes('hot_coffee') ||
          (name.includes('COFFE') && name.includes('HOT')) ||
          name === "COFFE'S (HOT)" ||
          name === "COFFEE'S (HOT)"
        );
      case 'milkshakes':
        return (
          (id.includes('milkshake') || name.includes('SHAKE')) &&
          !id.includes('premium') &&
          !name.includes('PREMIUM')
        );
      case 'milks':
        return (
          (id === 'cat_milks' || name === "MILK'S" || name === 'MILKS' || name === 'MILK') &&
          !id.includes('flavored') &&
          !name.includes('FLAVORED')
        );
      case 'coolers':
        return id.includes('cooler') || name.includes('COOLER') || name.includes('MOJITO');
      case 'premium_shakes':
        return id.includes('premium') || name.includes('PREMIUM');
      case 'cold_coffees':
        return id.includes('cold_coffee') || name.includes('COLD');
      case 'lassis':
        return id.includes('lassi') || name.includes('LASSI');
      default:
        return false;
    }
  };

  // Group categories into 3 columns
  const col1Categories = filteredCategories.filter((c) =>
    ['teas', 'flavored_milks', 'hot_coffees'].some((k) => isCategoryMatch(c, k))
  );
  const col2Categories = filteredCategories.filter((c) =>
    ['milkshakes', 'milks', 'coolers'].some((k) => isCategoryMatch(c, k))
  );
  const col3Categories = filteredCategories.filter((c) =>
    ['premium_shakes', 'cold_coffees', 'lassis'].some((k) => isCategoryMatch(c, k))
  );

  // Catch any unassigned or newly added categories so NONE are ever hidden
  const assignedIds = new Set([
    ...col1Categories.map((c) => c.id),
    ...col2Categories.map((c) => c.id),
    ...col3Categories.map((c) => c.id),
  ]);
  const unassigned = filteredCategories.filter((c) => !assignedIds.has(c.id));
  unassigned.forEach((cat, idx) => {
    if (idx % 3 === 0) col1Categories.push(cat);
    else if (idx % 3 === 1) col2Categories.push(cat);
    else col3Categories.push(cat);
  });

  // Category specific decorative banner graphics matching physical card
  const categoryHeaderImages: Record<string, { image: string; alt: string }> = {
    cat_teas: {
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
      alt: "Tea's",
    },
    cat_milkshakes: {
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
      alt: 'Milk Shakes',
    },
    cat_premium_shakes: {
      image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
      alt: "Premium Shake's",
    },
    cat_flavored_milks: {
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
      alt: "Flavored Milk's",
    },
    cat_milks: {
      image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=500&q=80',
      alt: "Milk's",
    },
    cat_cold_coffees: {
      image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=500&q=80',
      alt: "Cold Coffee's",
    },
    cat_hot_coffees: {
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=80',
      alt: "Coffe's (Hot)",
    },
    cat_coolers: {
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
      alt: "Cooler's & Mojito's",
    },
    cat_lassis: {
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80',
      alt: "Lassi's",
    },
  };

  /**
   * Robust items lookup:
   * First by exact categoryId; if none found, by category key matching
   */
  const getItemsForCategory = (cat: Category): MenuItem[] => {
    let items = liveMenuItems.filter(
      (item) => item.active !== false && item.categoryId === cat.id
    );

    if (items.length === 0) {
      // Fallback matching by canonical key
      const catKey = Object.keys(categoryHeaderImages).find((k) =>
        isCategoryMatch(cat, k.replace('cat_', ''))
      );
      if (catKey) {
        items = liveMenuItems.filter(
          (item) => item.active !== false && item.categoryId === catKey
        );
      }
    }

    return items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  };

  const renderCategoryCard = (cat: Category) => {
    const items = getItemsForCategory(cat);

    if (activeCategoryFilter !== 'all' && activeCategoryFilter !== cat.id) {
      return null;
    }

    return (
      <div
        key={cat.id}
        id={`cat-section-${cat.id}`}
        className="relative bg-[#130703]/90 border border-[#dfb76c]/40 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#dfb76c]/80 flex flex-col justify-between"
      >
        {/* Subtle corner gold brackets */}
        <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-[#dfb76c] pointer-events-none" />
        <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-[#dfb76c] pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-[#dfb76c] pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-[#dfb76c] pointer-events-none" />

        {/* Category Header Ribbon (Same category-specific colors as the physical menu card) */}
        <div
          className="relative px-3 py-1.5 flex items-center justify-center border-b border-[#dfb76c]/30 shadow-md"
          style={{ backgroundColor: cat.color || '#8C4307' }}
        >
          <h3 className="font-cinzel text-base md:text-lg font-bold tracking-widest text-[#fff] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] text-center">
            {cat.name}
          </h3>
        </div>

        {/* Category Product Image if present on card */}
        {(categoryHeaderImages[cat.id] || cat.image) && !cat.id.includes('teas') && (
          <div className="px-3 pt-2 pb-1 flex justify-center">
            <div className="relative w-full max-w-[260px] h-24 sm:h-28 rounded-lg overflow-hidden border border-[#dfb76c]/30 shadow-inner group/img">
              <img
                src={categoryHeaderImages[cat.id]?.image || cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#130703]/80 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        {/* Item Rows */}
        <div className="p-3 space-y-1.5 flex-1">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group/item flex items-baseline justify-between cursor-pointer py-0.5 px-1 rounded transition-colors hover:bg-[#c59b41]/15"
              title="Click to view details"
            >
              {/* Left: Product Name & NEW badge */}
              <div className="flex items-baseline gap-1.5 min-w-0 pr-1">
                {item.isNew && (
                  <span className="text-[8px] font-black font-outfit uppercase px-1 py-0.2 text-white bg-red-600 rounded-[2px] shadow-sm flex-shrink-0">
                    NEW
                  </span>
                )}
                <span className="font-outfit font-medium text-[13.5px] sm:text-[14px] leading-tight text-[#fbf6ed] group-hover/item:text-[#dfb76c] transition-colors truncate">
                  {item.name}
                </span>
              </div>

              {/* Center: Dotted Leader */}
              <span className="dotted-leader opacity-35 group-hover/item:opacity-75 transition-opacity" />

              {/* Right: Live Updated Price */}
              <div className="flex items-baseline flex-shrink-0 pl-1">
                <span
                  className={`font-cinzel font-bold text-[13.5px] sm:text-[14px] text-[#f4d068] group-hover/item:scale-105 transition-all tracking-tight ${
                    recentlyUpdatedPriceId === item.id
                      ? 'text-emerald-400 scale-110 font-black'
                      : ''
                  }`}
                >
                  {item.price}/-
                </span>
              </div>
            </div>
          ))}

          {/* Special Inset Callout inside TEA'S: "Maska Bun with Chai ♡" */}
          {isCategoryMatch(cat, 'teas') && (() => {
            const maskaBunItem = liveMenuItems.find((i) =>
              i.name.toLowerCase().includes('maska bun')
            );
            const maskaPrice = maskaBunItem ? maskaBunItem.price : 50;

            return (
              <div className="mt-3 pt-2 border-t border-[#dfb76c]/30">
                <div
                  onClick={() => maskaBunItem && setSelectedItem(maskaBunItem)}
                  className="bg-[#1c0d06] border border-[#dfb76c]/50 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-lg cursor-pointer hover:border-[#dfb76c] transition-colors"
                  title="Click to view details"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#dfb76c] flex-shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=200&q=80"
                        alt="Maska Bun with Chai"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-cormorant italic text-sm sm:text-base font-bold text-[#fce09b] block leading-tight truncate">
                        Maska Bun with Chai ♡
                      </span>
                      <span className="text-[10px] text-[#dfb76c]/80 font-outfit block">
                        Toasted butter bun with tea
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="font-cinzel font-black text-sm sm:text-base text-white bg-red-600 px-2 py-0.5 rounded shadow">
                      {maskaPrice}/-
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0e0603] text-[#f5efe6] selection:bg-[#c59b41]/30">
      {/* Top Floating Control Bar - Search button removed as requested */}
      <header className="sticky top-0 z-30 bg-[#140703]/95 backdrop-blur-md border-b border-[#dfb76c]/30 px-3 py-2 sm:px-6 shadow-xl no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Cafe Identity with Authentic Chai Den Logo replacing CD */}
          <div className="flex items-center gap-2.5">
            <ChaiDenLogo size="sm" showSubtitle={false} />
            <div>
              <span className="font-cinzel text-sm sm:text-base font-extrabold tracking-wider text-gold-gradient block leading-none">
                THE CHAI DEN
              </span>
              <span className="text-[9px] tracking-widest text-[#dfb76c]/80 uppercase block font-outfit mt-0.5">
                PREMIUM CAFE • DIGITAL MENU
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQrModal}
              title="Show Table QR"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e0e07] border border-[#dfb76c]/40 text-xs font-outfit font-medium text-[#f5efe6] hover:bg-[#2d160b] hover:border-[#dfb76c] transition-all shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5 text-[#dfb76c]" />
              <span className="hidden sm:inline">Table QR</span>
            </button>

            <button
              onClick={onOpenOwnerLogin}
              title="Owner & Staff Login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e0e07] border border-[#dfb76c]/40 text-xs font-outfit text-[#dfb76c] hover:bg-[#2d160b] hover:border-[#dfb76c] transition-all"
            >
              <Lock className="w-3 h-3" />
              <span>Owner Login</span>
            </button>
          </div>
        </div>

        {/* Quick Category Tabs Bar */}
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-outfit uppercase tracking-wider whitespace-nowrap transition-all border ${
              activeCategoryFilter === 'all'
                ? 'bg-[#dfb76c] text-[#1c0e07] font-bold border-[#dfb76c] shadow-[0_0_12px_rgba(223,183,108,0.4)]'
                : 'bg-[#1e0e07] text-[#dfb76c]/80 border-[#dfb76c]/30 hover:border-[#dfb76c]'
            }`}
          >
            All Menu
          </button>
          {filteredCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCategoryFilter(c.id);
                const el = document.getElementById(`cat-section-${c.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-outfit tracking-wide whitespace-nowrap transition-all border ${
                activeCategoryFilter === c.id
                  ? 'bg-[#dfb76c] text-[#1c0e07] font-bold border-[#dfb76c] shadow-[0_0_12px_rgba(223,183,108,0.4)]'
                  : 'bg-[#1e0e07] text-[#dfb76c]/80 border-[#dfb76c]/30 hover:border-[#dfb76c]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER: EXACT PHYSICAL CHAI DEN MENU CARD REPRODUCTION */}
      {/* ======================================================== */}
      <main className="p-2 sm:p-5 md:p-7 flex justify-center">
        <div className="w-full max-w-[1240px] bg-[#120703] border-[3px] border-[#c59b41] rounded-2xl p-3 sm:p-6 md:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.95),0_0_45px_rgba(223,183,108,0.18)] relative overflow-hidden">
          {/* Subtle gold double borders */}
          <div className="absolute inset-2 sm:inset-3 border border-[#dfb76c]/30 rounded-xl pointer-events-none" />
          <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-[#dfb76c] pointer-events-none" />
          <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-[#dfb76c] pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-[#dfb76c] pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-[#dfb76c] pointer-events-none" />

          {/* ======================================================== */}
          {/* 1. TOP HEADER SECTION (EXACT TO PHYSICAL MENU CARD PREVIEW.JPG) */}
          {/* ======================================================== */}
          <div className="relative z-10 pt-2 pb-6 border-b border-[#dfb76c]/40">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1 sm:px-3">
              {/* Left Column: Authentic Chai Den Circular Emblem Logo with Filigree */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-shrink-0">
                <ChaiDenLogo size="xl" showSubtitle={true} />
              </div>

              {/* Center Column: Tagline in Cursive Calligraphy (Exact to preview.jpg) */}
              <div className="flex flex-col items-center justify-center text-center my-1 lg:my-0">
                <p className="font-cormorant italic text-3xl sm:text-4xl text-[#fde68a] font-semibold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  Sip Happiness,
                </p>
                <p className="font-cormorant italic text-2xl sm:text-3xl text-[#f5ebd8] leading-tight flex items-center justify-center gap-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mt-0.5">
                  <span>Live Every Moment</span>
                  <span className="text-red-400 font-serif text-2xl">♡</span>
                </p>
              </div>

              {/* Right Column: Steaming Terracotta Chai Mug with Whole Spices (Exact to preview.jpg) */}
              <div className="flex items-center justify-center lg:justify-end flex-shrink-0">
                <ChaiMugHero size="lg" />
              </div>
            </div>

            {/* Central "MENU" Badge Ribbon (Exact to preview.jpg) */}
            <div className="flex justify-center -mb-10 mt-4 relative z-20">
              <div className="bg-[#b3541e] border-2 border-[#f5e29f] px-9 py-1 rounded-md shadow-2xl">
                <h2 className="font-cinzel text-xl sm:text-2xl font-black tracking-[0.2em] text-[#fff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  MENU
                </h2>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. THE 3-COLUMN PHYSICAL CARD BODY                         */}
          {/* ======================================================== */}
          <div className="relative z-10 mt-9">
            {activeCategoryFilter !== 'all' ? (
              <div className="max-w-xl mx-auto space-y-5">
                {filteredCategories.map(renderCategoryCard)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
                {/* Column 1: TEA'S, FLAVORED MILK'S, COFFE'S (HOT) */}
                <div className="space-y-4">
                  {col1Categories.map(renderCategoryCard)}
                </div>

                {/* Column 2: MILK SHAKES, MILK'S, COOLER'S & MOJITO'S */}
                <div className="space-y-4">
                  {col2Categories.map(renderCategoryCard)}
                </div>

                {/* Column 3: PREMIUM SHAKE'S, COLD COFFEE'S, LASSI'S */}
                <div className="space-y-4">
                  {col3Categories.map(renderCategoryCard)}
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 3. BOTTOM SECTION (EXACT TO PHYSICAL MENU CARD)           */}
          {/* ======================================================== */}
          <div className="relative z-10 mt-8 pt-5 border-t border-[#dfb76c]/40 text-center">
            {/* GOOD DRINKS • GOOD TIMES • GREAT MEMORIES */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-cinzel font-bold tracking-[0.18em] text-[#f5e29f] uppercase">
              <span className="flex items-center gap-1.5">
                <span>☕</span>
                <span>GOOD DRINKS</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span>😊</span>
                <span>GOOD TIMES</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span>❤️</span>
                <span>GREAT MEMORIES</span>
              </span>
            </div>

            {/* THANK YOU! VISIT AGAIN Badge */}
            <div className="inline-block mt-3 bg-[#b3541e] border-2 border-[#dfb76c] px-6 py-1 rounded-md shadow-lg">
              <span className="font-cinzel text-xs sm:text-sm font-black tracking-widest text-white uppercase">
                THANK YOU! VISIT AGAIN
              </span>
            </div>

            {/* Developer Details & Contact Credits */}
            <div className="mt-8 pt-6 border-t border-[#dfb76c]/30 text-center">
              <div className="inline-flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#1a0c05]/95 to-[#100602]/95 border border-[#dfb76c]/40 shadow-[0_6px_25px_rgba(0,0,0,0.7)] max-w-lg mx-auto">
                <span className="text-[10px] font-outfit uppercase tracking-[3px] text-[#dfb76c]/70 font-semibold mb-1">
                  Developer & Creator
                </span>
                <h4 className="font-cinzel text-base sm:text-lg font-bold text-gold-gradient tracking-wide">
                  C Lakshmi Narasimha
                </h4>
                <p className="text-xs text-[#eedfca] font-outfit mt-0.5 tracking-wide">
                  student of iare | web developer
                </p>

                {/* Social and Contact Links with Logos */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 pt-3 border-t border-[#dfb76c]/20 w-full">
                  <a
                    href="https://github.com/Clnarasimha-18"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub Profile"
                    title="github: https://github.com/Clnarasimha-18"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#240f06] border border-[#dfb76c]/40 text-[#f5e29f] hover:bg-[#38180a] hover:border-[#dfb76c] hover:text-white transition-all text-[11.5px] font-outfit font-medium shadow-sm group"
                  >
                    <Github className="w-3.5 h-3.5 text-[#dfb76c] group-hover:scale-110 transition-transform" />
                    <span>GitHub</span>
                  </a>

                  <a
                    href="https://www.linkedin.com/in/c-lakshmi-narasimha-453392385/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn Profile"
                    title="linkedin: https://www.linkedin.com/in/c-lakshmi-narasimha-453392385/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#240f06] border border-[#dfb76c]/40 text-[#f5e29f] hover:bg-[#38180a] hover:border-[#dfb76c] hover:text-white transition-all text-[11.5px] font-outfit font-medium shadow-sm group"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-[#dfb76c] group-hover:scale-110 transition-transform" />
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href="mailto:clnarasimha08@gmail.com"
                    aria-label="Email Contact"
                    title="gmail to contact: clnarasimha08@gmail.com"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#240f06] border border-[#dfb76c]/40 text-[#f5e29f] hover:bg-[#38180a] hover:border-[#dfb76c] hover:text-white transition-all text-[11.5px] font-outfit font-medium shadow-sm group"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#dfb76c] group-hover:scale-110 transition-transform" />
                    <span>clnarasimha08@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Item Quick-Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-sm bg-[#160a04] border-2 border-[#dfb76c] rounded-2xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/60 text-[#dfb76c] hover:bg-black/90 flex items-center justify-center border border-[#dfb76c]/40 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {selectedItem.image && (
              <div className="w-full h-44 bg-black relative">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#160a04] via-transparent to-transparent" />
                {selectedItem.isNew && (
                  <span className="absolute bottom-2 left-3 text-[10px] font-bold font-outfit uppercase px-2 py-0.5 text-white bg-red-600 rounded">
                    NEW ON MENU
                  </span>
                )}
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-[#fff4db]">
                    {selectedItem.name}
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-outfit uppercase tracking-wider block mt-0.5">
                    100% Vegetarian
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-cinzel text-xl font-black text-[#f4d068]">
                    {selectedItem.price}/-
                  </span>
                </div>
              </div>

              {selectedItem.description && (
                <p className="font-cormorant text-base text-[#eadbc8] mt-2 leading-snug">
                  {selectedItem.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-[#dfb76c]/30 flex justify-between items-center text-xs text-[#dfb76c]/80 font-outfit">
                <span>The Chai Den Recipe</span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-1 rounded-full bg-[#dfb76c] text-[#1c0e07] font-bold hover:bg-[#edd085] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
