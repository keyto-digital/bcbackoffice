import { getCustomUser } from "@/lib/authUser";

export type StoreAccessScope =
  | "OWN_STORE"
  | "ALL_STORES";

export interface CustomUserStoreAccess {
  id: string;

  name?: string;
  username?: string;
  role?: string;

  entity_id?: string | null;

  default_store_id?: string | null;

  store_access_scope?: StoreAccessScope;
}

/**
 * Ambil data user login beserta akses store.
 */
export function getCurrentUserStoreAccess():
  | CustomUserStoreAccess
  | null {
  const user = getCustomUser();

  if (!user) {
    return null;
  }

  return user as CustomUserStoreAccess;
}

/**
 * Ambil default store user login.
 */
export function getDefaultStoreId(): string | null {
  const user = getCurrentUserStoreAccess();

  return user?.default_store_id ?? null;
}

/**
 * Ambil scope akses store.
 *
 * Default OWN_STORE untuk keamanan.
 */
export function getStoreAccessScope(): StoreAccessScope {
  const user = getCurrentUserStoreAccess();

  return (
    user?.store_access_scope ??
    "OWN_STORE"
  );
}

/**
 * True jika user hanya boleh mengakses
 * default store miliknya.
 */
export function isOwnStoreUser(): boolean {
  return (
    getStoreAccessScope() ===
    "OWN_STORE"
  );
}

/**
 * True jika user boleh mengakses
 * seluruh store.
 */
export function hasAllStoresAccess(): boolean {
  return (
    getStoreAccessScope() ===
    "ALL_STORES"
  );
}

/**
 * Mengecek apakah user boleh mengakses
 * store tertentu.
 */
export function canAccessStore(
  storeId: string | null | undefined,
): boolean {
  if (!storeId) {
    return false;
  }

  if (hasAllStoresAccess()) {
    return true;
  }

  return (
    storeId === getDefaultStoreId()
  );
}

/**
 * Mengembalikan daftar store yang dapat diakses.
 *
 * ALL_STORES = null
 * OWN_STORE  = array berisi default store
 */
export function getAccessibleStoreIds():
  | string[]
  | null {
  if (hasAllStoresAccess()) {
    return null;
  }

  const defaultStoreId =
    getDefaultStoreId();

  if (!defaultStoreId) {
    return [];
  }

  return [defaultStoreId];
}

/**
 * Helper sederhana untuk query berdasarkan store.
 *
 * ALL_STORES = null
 * OWN_STORE  = default_store_id
 */
export function getStoreFilterId(): string | null {
  if (hasAllStoresAccess()) {
    return null;
  }

  return getDefaultStoreId();
}