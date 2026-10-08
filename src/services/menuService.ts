import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Category, MenuItem } from '../types';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from '../data/seedData';

const LOCAL_STORAGE_CAT_KEY = 'chaiden_menu_card_exact_v4_cats';
const LOCAL_STORAGE_ITEMS_KEY = 'chaiden_menu_card_exact_v4_items';

// BroadcastChannel for instant cross-tab / cross-window synchronization
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('chaiden_menu_sync_channel');
  } catch {
    broadcastChannel = null;
  }
}

// In-memory Reactive Listener Sets
type ItemsListener = (items: MenuItem[]) => void;
type CatsListener = (cats: Category[]) => void;

const itemsListeners = new Set<ItemsListener>();
const catsListeners = new Set<CatsListener>();

function notifyItemsListeners(items: MenuItem[]) {
  itemsListeners.forEach((listener) => {
    try {
      listener(items);
    } catch (e) {
      console.error('Error notifying items listener:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chaiden_items_changed', { detail: items }));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'ITEMS_UPDATED', items });
      } catch (err) {
        console.warn('Broadcast channel postMessage notice:', err);
      }
    }
  }
}

function notifyCatsListeners(cats: Category[]) {
  catsListeners.forEach((listener) => {
    try {
      listener(cats);
    } catch (e) {
      console.error('Error notifying cats listener:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chaiden_cats_changed', { detail: cats }));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'CATS_UPDATED', cats });
      } catch (err) {
        console.warn('Broadcast channel postMessage notice:', err);
      }
    }
  }
}

/**
 * Intelligent self-healing merge:
 * Ensures all 9 canonical categories exist, while preserving any user customizations.
 */
export function getLocalCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CAT_KEY);
    const storedList: Category[] = raw ? JSON.parse(raw) : [];

    const mergedMap = new Map<string, Category>();

    // 1. Seed with canonical categories
    INITIAL_CATEGORIES.forEach((cat) => {
      mergedMap.set(cat.id, { ...cat });
    });

    // 2. Overlay any stored customized categories
    storedList.forEach((cat) => {
      if (mergedMap.has(cat.id)) {
        mergedMap.set(cat.id, { ...mergedMap.get(cat.id)!, ...cat });
      } else {
        mergedMap.set(cat.id, cat);
      }
    });

    const result = Array.from(mergedMap.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    return result;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function saveLocalCategories(cats: Category[], notify = true) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CAT_KEY, JSON.stringify(cats));
    if (notify) {
      notifyCatsListeners(cats);
    }
  } catch (e) {
    console.error('saveLocalCategories error:', e);
  }
}

/**
 * Intelligent self-healing merge:
 * Guarantees all items for COLD COFFEE'S, MILK'S, LASSI'S, FLAVORED MILK'S, COOLER'S & MOJITO'S
 * and TEA'S, SHAKES, etc. are ALWAYS present, while preserving any price changes!
 */
export function getLocalItems(): MenuItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
    const storedList: MenuItem[] = raw ? JSON.parse(raw) : [];

    const mergedMap = new Map<string, MenuItem>();

    // 1. Seed with initial menu items
    INITIAL_MENU_ITEMS.forEach((item) => {
      mergedMap.set(item.id, { ...item });
    });

    // 2. Overlay stored items (preserves user-edited prices and details)
    storedList.forEach((item) => {
      if (mergedMap.has(item.id)) {
        mergedMap.set(item.id, { ...mergedMap.get(item.id)!, ...item });
      } else {
        mergedMap.set(item.id, item);
      }
    });

    const result = Array.from(mergedMap.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    return result;
  } catch {
    return INITIAL_MENU_ITEMS;
  }
}

export function saveLocalItems(items: MenuItem[], notify = true) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
    if (notify) {
      notifyItemsListeners(items);
    }
  } catch (e) {
    console.error('saveLocalItems error:', e);
  }
}

let isSeeding = false;

/**
 * Ensures Firestore has all categories and items.
 * Upserts missing categories and items directly.
 */
export async function seedInitialMenuIfEmpty(): Promise<void> {
  if (isSeeding) return;
  isSeeding = true;
  try {
    // 1. Check & upsert categories
    const catSnapshot = await getDocs(collection(db, 'categories'));
    const existingCatIds = new Set<string>();
    catSnapshot.forEach((d) => existingCatIds.add(d.id));

    const missingCats = INITIAL_CATEGORIES.filter((c) => !existingCatIds.has(c.id));
    if (missingCats.length > 0) {
      console.log(`Seeding ${missingCats.length} missing categories to Firestore...`);
      const batch = writeBatch(db);
      for (const cat of missingCats) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      await batch.commit();
    }

    // 2. Check & upsert items
    const itemSnapshot = await getDocs(collection(db, 'menuItems'));
    const existingItemIds = new Set<string>();
    itemSnapshot.forEach((d) => existingItemIds.add(d.id));

    const missingItems = INITIAL_MENU_ITEMS.filter((i) => !existingItemIds.has(i.id));
    if (missingItems.length > 0) {
      console.log(`Seeding ${missingItems.length} missing menu items to Firestore...`);
      const chunkSize = 25;
      for (let i = 0; i < missingItems.length; i += chunkSize) {
        const chunk = missingItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(doc(db, 'menuItems', item.id), item);
        }
        await batch.commit();
      }
    }
  } catch (error) {
    console.warn('Firestore seeding notice (using self-healing local fallback):', error);
  } finally {
    isSeeding = false;
  }
}

/**
 * Real-time Categories Subscription
 */
export function subscribeCategories(
  onData: (categories: Category[]) => void,
  onError?: (err: unknown) => void
): () => void {
  // Prime with self-healing local categories immediately
  const initial = getLocalCategories();
  onData(initial);

  catsListeners.add(onData);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_CAT_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onData(parsed);
      } catch {}
    }
  };

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<Category[]>;
    if (custom.detail) {
      onData(custom.detail);
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'CATS_UPDATED' && Array.isArray(event.data.cats)) {
      onData(event.data.cats);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    window.addEventListener('chaiden_cats_changed', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
  }

  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Category[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Category);
          });

          // Merge with canonical categories so none are dropped
          const mergedMap = new Map<string, Category>();
          INITIAL_CATEGORIES.forEach((c) => mergedMap.set(c.id, c));
          list.forEach((c) => mergedMap.set(c.id, { ...(mergedMap.get(c.id) || {}), ...c }));

          const finalCats = Array.from(mergedMap.values()).sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          saveLocalCategories(finalCats, false);
          onData(finalCats);
        } else {
          seedInitialMenuIfEmpty();
        }
      },
      (error) => {
        console.warn('Categories snapshot listener notice:', error);
        if (onError) onError(error);
        onData(getLocalCategories());
      }
    );
  } catch (err) {
    if (onError) onError(err);
  }

  return () => {
    catsListeners.delete(onData);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('chaiden_cats_changed', handleCustomEvent);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
    }
    unsubscribeFirestore();
  };
}

/**
 * Real-time Menu Items Subscription
 * Guarantees every single item is loaded, and any price change propagates instantly!
 */
export function subscribeMenuItems(
  onData: (items: MenuItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  // Prime with self-healing local items immediately
  const initial = getLocalItems();
  onData(initial);

  itemsListeners.add(onData);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_ITEMS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onData(parsed);
      } catch {}
    }
  };

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<MenuItem[]>;
    if (custom.detail) {
      onData(custom.detail);
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'ITEMS_UPDATED' && Array.isArray(event.data.items)) {
      onData(event.data.items);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    window.addEventListener('chaiden_items_changed', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
  }

  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(
      collection(db, 'menuItems'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: MenuItem[] = [];
          snapshot.forEach((d) => {
            remoteList.push({ id: d.id, ...d.data() } as MenuItem);
          });

          // Intelligent merge: canonical items + remote updates
          const mergedMap = new Map<string, MenuItem>();
          INITIAL_MENU_ITEMS.forEach((item) => mergedMap.set(item.id, { ...item }));
          remoteList.forEach((item) => {
            if (mergedMap.has(item.id)) {
              mergedMap.set(item.id, { ...mergedMap.get(item.id)!, ...item });
            } else {
              mergedMap.set(item.id, item);
            }
          });

          const finalList = Array.from(mergedMap.values()).sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          saveLocalItems(finalList, false);
          onData(finalList);
        } else {
          seedInitialMenuIfEmpty();
        }
      },
      (error) => {
        console.warn('MenuItems snapshot listener notice:', error);
        if (onError) onError(error);
        onData(getLocalItems());
      }
    );
  } catch (err) {
    if (onError) onError(err);
  }

  return () => {
    itemsListeners.delete(onData);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('chaiden_items_changed', handleCustomEvent);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
    }
    unsubscribeFirestore();
  };
}

export async function addCategory(cat: Omit<Category, 'id'>): Promise<string> {
  const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newCat: Category = { ...cat, id, createdAt: new Date().toISOString() };

  const current = getLocalCategories();
  saveLocalCategories([...current, newCat], true);

  try {
    await setDoc(doc(db, 'categories', id), newCat, { merge: true });
  } catch (error) {
    console.warn('Firestore add category notice:', error);
  }
  return id;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const current = getLocalCategories();
  const next = current.map((c) =>
    c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
  );
  saveLocalCategories(next, true);

  try {
    await setDoc(doc(db, 'categories', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn('Firestore update category notice:', error);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const current = getLocalCategories();
  saveLocalCategories(current.filter((c) => c.id !== id), true);

  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    console.warn('Firestore delete category notice:', error);
  }
}

export async function addMenuItem(item: Omit<MenuItem, 'id'>): Promise<string> {
  const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newItem: MenuItem = { ...item, id, createdAt: new Date().toISOString() };

  const current = getLocalItems();
  saveLocalItems([...current, newItem], true);

  try {
    await setDoc(doc(db, 'menuItems', id), newItem, { merge: true });
  } catch (error) {
    console.warn('Firestore add menu item notice:', error);
  }
  return id;
}

/**
 * AUTOMATIC PRICE & ITEM UPDATE:
 * Updates the item in local storage and broadcasts via BroadcastChannel and CustomEvent (0ms latency).
 * Also writes to Firestore using setDoc({ merge: true }) so any customer viewing the menu
 * on phone or browser gets the new price automatically in real-time!
 */
export async function updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<void> {
  const current = getLocalItems();
  const itemIndex = current.findIndex((item) => item.id === id);
  if (itemIndex === -1) {
    console.warn(`Item ${id} not found to update`);
    return;
  }

  const updatedItem: MenuItem = {
    ...current[itemIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const next = [...current];
  next[itemIndex] = updatedItem;

  // 1. Immediately save locally and broadcast to all local listeners & browser tabs
  saveLocalItems(next, true);

  // 2. Safely sync to Firestore with merge: true so it works whether doc already existed or not
  try {
    await setDoc(doc(db, 'menuItems', id), updatedItem, { merge: true });
  } catch (error) {
    console.warn('Firestore update menu item remote sync notice:', error);
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  const current = getLocalItems();
  saveLocalItems(current.filter((item) => item.id !== id), true);

  try {
    await deleteDoc(doc(db, 'menuItems', id));
  } catch (error) {
    console.warn('Firestore delete menu item notice:', error);
  }
}

export async function resetMenuToDefaults(): Promise<void> {
  saveLocalCategories(INITIAL_CATEGORIES, true);
  saveLocalItems(INITIAL_MENU_ITEMS, true);

  try {
    const batch = writeBatch(db);
    for (const c of INITIAL_CATEGORIES) {
      batch.set(doc(db, 'categories', c.id), c);
    }
    for (const item of INITIAL_MENU_ITEMS) {
      batch.set(doc(db, 'menuItems', item.id), item);
    }
    await batch.commit();
  } catch (error) {
    console.warn('Reset to defaults remote sync notice:', error);
  }
}
