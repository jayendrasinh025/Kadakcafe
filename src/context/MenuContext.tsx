import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  MenuCategory,
  MenuItem,
  PrivateFeedbackNote,
  RestaurantSettings,
  RestaurantTable,
  WaiterCallAlert,
} from '../types/menu';
import {
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_RESTAURANT_SETTINGS,
  INITIAL_TABLES,
} from '../data/kadakSampleData';
import {
  reorderCategoryItems as reorderCategoryItemsUtil,
  reorderList,
  validateCategoryInput,
  validateMenuItemInput,
} from '../utils/menuLogic';

const STORAGE_KEYS = {
  SETTINGS: 'menustudio_settings_v1',
  CATEGORIES: 'menustudio_categories_v1',
  ITEMS: 'menustudio_items_v1',
  TABLES: 'menustudio_tables_v1',
  WAITER_CALLS: 'menustudio_waiter_calls_v1',
  FEEDBACK: 'menustudio_feedback_v1',
  OWNER_SESSION: 'menustudio_owner_unlocked_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Storage quota warning:', err);
  }
}

interface MenuContextValue {
  settings: RestaurantSettings;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: RestaurantTable[];
  waiterCalls: WaiterCallAlert[];
  feedbackNotes: PrivateFeedbackNote[];
  user: User | null;
  isOwnerAuthenticated: boolean;
  authLoading: boolean;
  activeTableNumber: string | null;
  setActiveTableNumber: (table: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  unlockDemoOwnerSession: () => void;
  signOutOwner: () => Promise<void>;
  updateSettings: (partial: Partial<RestaurantSettings>) => Promise<void>;
  addCategory: (name: string) => Promise<{ ok: boolean; error?: string }>;
  updateCategory: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ ok: boolean; error?: string }>;
  moveCategory: (id: string, direction: 'up' | 'down') => Promise<void>;
  addMenuItem: (
    item: Omit<MenuItem, 'id' | 'sortOrder' | 'ownerId' | 'updatedAt'>
  ) => Promise<{ ok: boolean; error?: string }>;
  updateMenuItem: (
    id: string,
    updates: Partial<Omit<MenuItem, 'id' | 'ownerId' | 'updatedAt'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteMenuItem: (id: string) => Promise<void>;
  moveMenuItem: (categoryId: string, itemId: string, direction: 'up' | 'down') => Promise<void>;
  toggleItemAvailability: (id: string) => Promise<void>;
  addTable: (tableNumber: string, label: string) => Promise<{ ok: boolean; error?: string }>;
  deleteTable: (id: string) => Promise<void>;
  recordScan: (tableNumber?: string | null) => void;
  triggerWaiterCall: (tableNumber: string, reason: string) => void;
  resolveWaiterCall: (id: string) => void;
  submitPrivateFeedback: (note: { tableNumber: string; guestName?: string; message: string }) => void;
  resetDemoData: () => Promise<void>;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RestaurantSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_RESTAURANT_SETTINGS)
  );
  const [categories, setCategories] = useState<MenuCategory[]>(() =>
    loadFromStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES)
  );
  const [items, setItems] = useState<MenuItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.ITEMS, INITIAL_MENU_ITEMS)
  );
  const [tables, setTables] = useState<RestaurantTable[]>(() =>
    loadFromStorage(STORAGE_KEYS.TABLES, INITIAL_TABLES)
  );
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallAlert[]>(() =>
    loadFromStorage(STORAGE_KEYS.WAITER_CALLS, [])
  );
  const [feedbackNotes, setFeedbackNotes] = useState<PrivateFeedbackNote[]>(() =>
    loadFromStorage(STORAGE_KEYS.FEEDBACK, [])
  );

  const [user, setUser] = useState<User | null>(null);
  const [demoOwnerUnlocked, setDemoOwnerUnlocked] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.OWNER_SESSION, true)
  );
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeTableNumber, setActiveTableNumber] = useState<string | null>(null);

  // Sync local storage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ITEMS, items);
  }, [items]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TABLES, tables);
  }, [tables]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.WAITER_CALLS, waiterCalls);
  }, [waiterCalls]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FEEDBACK, feedbackNotes);
  }, [feedbackNotes]);

  // Listen to storage events across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        setSettings(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.CATEGORIES && e.newValue) {
        setCategories(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.ITEMS && e.newValue) {
        setItems(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.TABLES && e.newValue) {
        setTables(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Subscribe to Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        testFirestoreConnection();
      }
    });
    return () => unsubAuth();
  }, []);

  // Only attach Firestore onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (authLoading || !user) return;

    const unsubSettings = onSnapshot(
      collection(db, 'restaurant_settings'),
      (snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          setSettings((prev) => ({
            ...prev,
            id: snap.docs[0].id,
            name: String(docData.name ?? prev.name),
            tagline: String(docData.tagline ?? prev.tagline),
            logoUrl: docData.logoUrl ? String(docData.logoUrl) : '',
            brandColor: String(docData.brandColor ?? prev.brandColor),
            accentColor: String(docData.accentColor ?? prev.accentColor),
            isOpen: Boolean(docData.isOpen ?? prev.isOpen),
            openingHours: String(docData.openingHours ?? prev.openingHours),
            contactNumber: String(docData.contactNumber ?? prev.contactNumber),
            whatsappNumber: String(docData.whatsappNumber ?? prev.whatsappNumber),
            googleReviewUrl: String(docData.googleReviewUrl ?? prev.googleReviewUrl),
            secondaryActionType: docData.secondaryActionType ?? prev.secondaryActionType,
            scanCount: Number(docData.scanCount ?? prev.scanCount),
            ownerId: String(docData.ownerId ?? prev.ownerId),
            updatedAt: new Date().toISOString(),
          }));
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'restaurant_settings');
        } catch {
          // Handled and logged by handleFirestoreError
        }
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'menu_categories'),
      (snap) => {
        if (!snap.empty) {
          const loaded: MenuCategory[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data.name),
                slug: String(data.slug),
                sortOrder: Number(data.sortOrder ?? 0),
                ownerId: String(data.ownerId ?? 'demo-owner'),
                updatedAt: new Date().toISOString(),
              };
            })
            .sort((a, b) => a.sortOrder - b.sortOrder);
          setCategories(loaded);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'menu_categories');
        } catch {
          // Handled and logged
        }
      }
    );

    const unsubItems = onSnapshot(
      collection(db, 'menu_items'),
      (snap) => {
        if (!snap.empty) {
          const loaded: MenuItem[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                categoryId: String(data.categoryId),
                name: String(data.name),
                description: String(data.description ?? ''),
                price: Number(data.price ?? 0),
                isVeg: Boolean(data.isVeg),
                isBestseller: Boolean(data.isBestseller),
                isChefsPick: Boolean(data.isChefsPick),
                isAvailable: Boolean(data.isAvailable ?? true),
                imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
                sortOrder: Number(data.sortOrder ?? 0),
                ownerId: String(data.ownerId ?? 'demo-owner'),
                updatedAt: new Date().toISOString(),
              };
            })
            .sort((a, b) => a.sortOrder - b.sortOrder);
          setItems(loaded);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'menu_items');
        } catch {
          // Handled and logged
        }
      }
    );

    const unsubTables = onSnapshot(
      collection(db, 'tables'),
      (snap) => {
        if (!snap.empty) {
          const loaded: RestaurantTable[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                tableNumber: String(data.tableNumber),
                label: String(data.label ?? ''),
                scans: Number(data.scans ?? 0),
                ownerId: String(data.ownerId ?? 'demo-owner'),
                updatedAt: new Date().toISOString(),
              };
            })
            .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));
          setTables(loaded);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'tables');
        } catch {
          // Handled and logged
        }
      }
    );

    return () => {
      unsubSettings();
      unsubCategories();
      unsubItems();
      unsubTables();
    };
  }, [authLoading, user]);

  // Helper to sync a document to Firestore if authenticated
  const syncDocToFirestore = useCallback(
    async (collectionName: string, docId: string, payload: Record<string, unknown>) => {
      if (!auth.currentUser) return;
      const path = `${collectionName}/${docId}`;
      try {
        await setDoc(doc(db, collectionName, docId), {
          ...payload,
          ownerId: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, path);
        } catch {
          // Logged via handleFirestoreError
        }
      }
    },
    []
  );

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleAuthProvider);
    setDemoOwnerUnlocked(true);
    saveToStorage(STORAGE_KEYS.OWNER_SESSION, true);
  };

  const unlockDemoOwnerSession = () => {
    setDemoOwnerUnlocked(true);
    saveToStorage(STORAGE_KEYS.OWNER_SESSION, true);
  };

  const signOutOwner = async () => {
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
    setDemoOwnerUnlocked(false);
    saveToStorage(STORAGE_KEYS.OWNER_SESSION, false);
  };

  const updateSettings = async (partial: Partial<RestaurantSettings>) => {
    const next: RestaurantSettings = {
      ...settings,
      ...partial,
      name: (partial.name ?? settings.name).slice(0, 100),
      tagline: (partial.tagline ?? settings.tagline).slice(0, 160),
      openingHours: (partial.openingHours ?? settings.openingHours).slice(0, 100),
      contactNumber: (partial.contactNumber ?? settings.contactNumber).slice(0, 30),
      whatsappNumber: (partial.whatsappNumber ?? settings.whatsappNumber).slice(0, 30),
      googleReviewUrl: (partial.googleReviewUrl ?? settings.googleReviewUrl).slice(0, 500),
      updatedAt: new Date().toISOString(),
    };
    setSettings(next);

    const firestorePayload: Record<string, unknown> = {
      name: next.name,
      tagline: next.tagline,
      brandColor: next.brandColor,
      accentColor: next.accentColor,
      isOpen: next.isOpen,
      openingHours: next.openingHours,
      contactNumber: next.contactNumber,
      whatsappNumber: next.whatsappNumber,
      googleReviewUrl: next.googleReviewUrl,
      secondaryActionType: next.secondaryActionType,
      scanCount: next.scanCount,
    };
    if (next.logoUrl) {
      firestorePayload.logoUrl = next.logoUrl.slice(0, 150000);
    }
    await syncDocToFirestore('restaurant_settings', 'default', firestorePayload);
  };

  const addCategory = async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const validation = validateCategoryInput(name);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
    const id = `cat-${validation.slug}-${Date.now().toString(36)}`;
    const newCat: MenuCategory = {
      id,
      name: name.trim().slice(0, 60),
      slug: validation.slug.slice(0, 60),
      sortOrder: categories.length,
      ownerId: auth.currentUser?.uid ?? 'demo-owner',
      updatedAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    await syncDocToFirestore('menu_categories', id, {
      name: newCat.name,
      slug: newCat.slug,
      sortOrder: newCat.sortOrder,
    });
    return { ok: true };
  };

  const updateCategory = async (id: string, name: string): Promise<{ ok: boolean; error?: string }> => {
    const validation = validateCategoryInput(name);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
    let updatedTarget: MenuCategory | null = null;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        updatedTarget = {
          ...c,
          name: name.trim().slice(0, 60),
          slug: validation.slug.slice(0, 60),
          updatedAt: new Date().toISOString(),
        };
        return updatedTarget;
      })
    );
    if (updatedTarget) {
      const cat = updatedTarget as MenuCategory;
      await syncDocToFirestore('menu_categories', id, {
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
      });
    }
    return { ok: true };
  };

  const deleteCategory = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (categories.length <= 1) {
      return { ok: false, error: 'At least one menu category must remain.' };
    }
    const remainingCategories = categories
      .filter((c) => c.id !== id)
      .map((c, idx) => ({ ...c, sortOrder: idx }));
    const fallbackCategoryId = remainingCategories[0].id;

    // Reassign or remove items in deleted category so no items are orphaned
    setCategories(remainingCategories);
    setItems((prev) =>
      prev.map((item) => (item.categoryId === id ? { ...item, categoryId: fallbackCategoryId } : item))
    );

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'menu_categories', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `menu_categories/${id}`);
        } catch {
          // Logged
        }
      }
    }
    return { ok: true };
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    const next = reorderList(categories, id, direction);
    setCategories(next);
    if (auth.currentUser) {
      const batch = writeBatch(db);
      for (const cat of next) {
        batch.set(doc(db, 'menu_categories', cat.id), {
          name: cat.name,
          slug: cat.slug,
          sortOrder: cat.sortOrder,
          ownerId: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
        });
      }
      try {
        await batch.commit();
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'menu_categories');
        } catch {
          // Logged
        }
      }
    }
  };

  const addMenuItem = async (
    input: Omit<MenuItem, 'id' | 'sortOrder' | 'ownerId' | 'updatedAt'>
  ): Promise<{ ok: boolean; error?: string }> => {
    const validation = validateMenuItemInput(input);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
    const categoryItemsCount = items.filter((i) => i.categoryId === input.categoryId).length;
    const id = `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: MenuItem = {
      id,
      categoryId: input.categoryId,
      name: input.name.trim().slice(0, 100),
      description: input.description.trim().slice(0, 300),
      price: Math.round(Number(input.price)),
      isVeg: Boolean(input.isVeg),
      isBestseller: Boolean(input.isBestseller),
      isChefsPick: Boolean(input.isChefsPick),
      isAvailable: Boolean(input.isAvailable),
      imageUrl: input.imageUrl?.trim() ? input.imageUrl.trim().slice(0, 150000) : undefined,
      sortOrder: categoryItemsCount,
      ownerId: auth.currentUser?.uid ?? 'demo-owner',
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, newItem]);

    const payload: Record<string, unknown> = {
      categoryId: newItem.categoryId,
      name: newItem.name,
      description: newItem.description,
      price: newItem.price,
      isVeg: newItem.isVeg,
      isBestseller: newItem.isBestseller,
      isChefsPick: newItem.isChefsPick,
      isAvailable: newItem.isAvailable,
      sortOrder: newItem.sortOrder,
    };
    if (newItem.imageUrl) {
      payload.imageUrl = newItem.imageUrl;
    }
    await syncDocToFirestore('menu_items', id, payload);
    return { ok: true };
  };

  const updateMenuItem = async (
    id: string,
    updates: Partial<Omit<MenuItem, 'id' | 'ownerId' | 'updatedAt'>>
  ): Promise<{ ok: boolean; error?: string }> => {
    const existing = items.find((i) => i.id === id);
    if (!existing) {
      return { ok: false, error: 'Menu item not found.' };
    }
    const merged: MenuItem = {
      ...existing,
      ...updates,
      name: (updates.name ?? existing.name).trim().slice(0, 100),
      description: (updates.description ?? existing.description).trim().slice(0, 300),
      price: Math.round(Number(updates.price ?? existing.price)),
      updatedAt: new Date().toISOString(),
    };
    const validation = validateMenuItemInput(merged);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
    setItems((prev) => prev.map((item) => (item.id === id ? merged : item)));

    const payload: Record<string, unknown> = {
      categoryId: merged.categoryId,
      name: merged.name,
      description: merged.description,
      price: merged.price,
      isVeg: merged.isVeg,
      isBestseller: merged.isBestseller,
      isChefsPick: merged.isChefsPick,
      isAvailable: merged.isAvailable,
      sortOrder: merged.sortOrder,
    };
    if (merged.imageUrl) {
      payload.imageUrl = merged.imageUrl.slice(0, 150000);
    }
    await syncDocToFirestore('menu_items', id, payload);
    return { ok: true };
  };

  const deleteMenuItem = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'menu_items', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `menu_items/${id}`);
        } catch {
          // Logged
        }
      }
    }
  };

  const moveMenuItem = async (categoryId: string, itemId: string, direction: 'up' | 'down') => {
    const next = reorderCategoryItemsUtil(items, categoryId, itemId, direction);
    setItems(next);
    if (auth.currentUser) {
      const catItems = next.filter((i) => i.categoryId === categoryId);
      const batch = writeBatch(db);
      for (const item of catItems) {
        const payload: Record<string, unknown> = {
          categoryId: item.categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          isVeg: item.isVeg,
          isBestseller: item.isBestseller,
          isChefsPick: item.isChefsPick,
          isAvailable: item.isAvailable,
          sortOrder: item.sortOrder,
          ownerId: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
        };
        if (item.imageUrl) payload.imageUrl = item.imageUrl;
        batch.set(doc(db, 'menu_items', item.id), payload);
      }
      try {
        await batch.commit();
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'menu_items');
        } catch {
          // Logged
        }
      }
    }
  };

  const toggleItemAvailability = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    await updateMenuItem(id, { isAvailable: !target.isAvailable });
  };

  const addTable = async (
    tableNumber: string,
    label: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanNum = tableNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanNum || cleanNum.length > 20) {
      return {
        ok: false,
        error: 'Table number is required (letters, numbers, hyphens only, max 20 chars).',
      };
    }
    if (tables.some((t) => t.tableNumber.toLowerCase() === cleanNum.toLowerCase())) {
      return { ok: false, error: `Table ${cleanNum} already exists.` };
    }
    const id = `table-${cleanNum.toLowerCase()}`;
    const newTable: RestaurantTable = {
      id,
      tableNumber: cleanNum,
      label: label.trim().slice(0, 80) || `Table ${cleanNum}`,
      scans: 0,
      ownerId: auth.currentUser?.uid ?? 'demo-owner',
      updatedAt: new Date().toISOString(),
    };
    setTables((prev) =>
      [...prev, newTable].sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
      )
    );
    await syncDocToFirestore('tables', id, {
      tableNumber: newTable.tableNumber,
      label: newTable.label,
      scans: newTable.scans,
    });
    return { ok: true };
  };

  const deleteTable = async (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'tables', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `tables/${id}`);
        } catch {
          // Logged
        }
      }
    }
  };

  const recordScan = useCallback((tableNumber?: string | null) => {
    setSettings((prev) => ({
      ...prev,
      scanCount: prev.scanCount + 1,
    }));
    if (tableNumber) {
      setTables((prev) =>
        prev.map((t) =>
          t.tableNumber.toLowerCase() === tableNumber.trim().toLowerCase()
            ? { ...t, scans: t.scans + 1 }
            : t
        )
      );
    }
  }, []);

  const triggerWaiterCall = (tableNumber: string, reason: string) => {
    const alert: WaiterCallAlert = {
      id: `call-${Date.now()}`,
      tableNumber: tableNumber.trim() || 'Counter',
      reason: reason.trim() || 'Waiter assistance requested',
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    setWaiterCalls((prev) => [alert, ...prev]);
  };

  const resolveWaiterCall = (id: string) => {
    setWaiterCalls((prev) => prev.map((c) => (c.id === id ? { ...c, resolved: true } : c)));
  };

  const submitPrivateFeedback = (note: {
    tableNumber: string;
    guestName?: string;
    message: string;
  }) => {
    const entry: PrivateFeedbackNote = {
      id: `fb-${Date.now()}`,
      tableNumber: note.tableNumber.trim() || 'Walk-in',
      guestName: note.guestName?.trim() || 'Guest',
      message: note.message.trim(),
      createdAt: new Date().toISOString(),
    };
    setFeedbackNotes((prev) => [entry, ...prev]);
  };

  const resetDemoData = async () => {
    setSettings(INITIAL_RESTAURANT_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setItems(INITIAL_MENU_ITEMS);
    setTables(INITIAL_TABLES);
    setWaiterCalls([]);
    setFeedbackNotes([]);
  };

  return (
    <MenuContext.Provider
      value={{
        settings,
        categories,
        items,
        tables,
        waiterCalls,
        feedbackNotes,
        user,
        isOwnerAuthenticated: Boolean(user) || demoOwnerUnlocked,
        authLoading,
        activeTableNumber,
        setActiveTableNumber,
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
        recordScan,
        triggerWaiterCall,
        resolveWaiterCall,
        submitPrivateFeedback,
        resetDemoData,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return ctx;
}
