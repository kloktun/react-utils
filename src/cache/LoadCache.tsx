import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";

// In-memory cache for useLoad / useListLoad.
//
// Caching is enabled only when BOTH are present:
//   - a LoadCacheProvider with a scope (who is asking and in which language),
//   - a cacheKey on the hook.
// Without the provider the hooks behave exactly as before, even with a cacheKey:
// without a scope responses of different users / languages could be mixed up.

export type LoadCacheKey = string | ReadonlyArray<unknown>;

type Listener = () => void;

interface Entry {
    value: unknown;
    updatedAt: number;
    stale: boolean;
}

export class LoadCacheStore {

    private entries = new Map<string, Entry>();
    private inflight = new Map<string, Promise<unknown>>();
    private listeners = new Map<string, Set<Listener>>();

    get(key: string): Entry | undefined {
        return this.entries.get(key);
    }

    set(key: string, value: unknown) {
        this.entries.set(key, { value, updatedAt: Date.now(), stale: false });
    }

    // One request per key at a time: concurrent hooks with the same key share it
    fetch<T>(key: string, run: () => Promise<T>): Promise<T> {
        const existing = this.inflight.get(key);

        if (existing) {
            return existing as Promise<T>;
        }

        const promise = run().finally(() => {
            this.inflight.delete(key);
        });

        this.inflight.set(key, promise);

        return promise;
    }

    subscribe(key: string, listener: Listener) {
        let set = this.listeners.get(key);

        if (!set) {
            set = new Set();
            this.listeners.set(key, set);
        }

        set.add(listener);

        return () => {
            set!.delete(listener);
            if (set!.size === 0) this.listeners.delete(key);
        };
    }

    // Marks matching entries stale and asks mounted hooks to reload
    invalidate(match: (key: string) => boolean) {
        const keys = new Set<string>();

        this.entries.forEach((entry, key) => {
            if (match(key)) {
                entry.stale = true;
                keys.add(key);
            }
        });

        this.listeners.forEach((_, key) => {
            if (match(key)) keys.add(key);
        });

        keys.forEach((key) => this.listeners.get(key)?.forEach((listener) => listener()));
    }

    clear() {
        this.entries.clear();
        this.inflight.clear();
    }

}

interface LoadCacheContextValue {
    store: LoadCacheStore;
    scope: string;
    staleTime: number;
}

const LoadCacheContext = createContext<LoadCacheContextValue | null>(null);

interface LoadCacheProviderProps {
    // Everything that changes server responses for the same request: user id, language, etc.
    // Use a stable user id, not an access token — a refreshed token must not reset the cache.
    // When the scope changes (another account, logout, language) the cache is cleared.
    scope: string;
    // Default time (ms) during which cached data is considered fresh and is not reloaded on mount.
    // 0 — always reload in the background, but show cached data instantly.
    staleTime?: number;
    children: React.ReactNode;
}

export const LoadCacheProvider = ({ scope, staleTime = 0, children }: LoadCacheProviderProps) => {

    const store = useMemo(() => new LoadCacheStore(), []);

    const previousScope = useRef(scope);

    useEffect(() => {
        if (previousScope.current !== scope) {
            previousScope.current = scope;
            store.clear();
        }
    }, [scope]);

    const value = useMemo(() => ({ store, scope, staleTime }), [store, scope, staleTime]);

    return <LoadCacheContext.Provider value={value}>{children}</LoadCacheContext.Provider>;

};

const SEPARATOR = "\u0000";

function serialize(value: unknown): string | null {
    try {
        return JSON.stringify(value) ?? "";
    } catch {
        return null;
    }
}

export interface ResolvedCache {
    store: LoadCacheStore;
    key: string;
    staleTime: number;
}

// Full key = scope + cacheKey + payload (+ extra, e.g. page size). null — caching is off.
export function useResolvedCache(cacheKey: LoadCacheKey | undefined, payload: unknown, staleTime?: number, extra?: unknown): ResolvedCache | null {

    const context = useContext(LoadCacheContext);

    if (!context || cacheKey === undefined) {
        return null;
    }

    const parts = serialize([typeof cacheKey === "string" ? [cacheKey] : cacheKey, payload, extra]);

    // Payload that cannot be serialized (cycles, BigInt) — do not cache rather than guess
    if (parts === null) {
        return null;
    }

    return {
        store: context.store,
        key: context.scope + SEPARATOR + parts,
        staleTime: staleTime ?? context.staleTime,
    };

}

export function isFresh(store: LoadCacheStore, key: string, staleTime: number) {
    const entry = store.get(key);

    if (!entry || entry.stale) return false;

    return Date.now() - entry.updatedAt < staleTime;
}

// Controls the cache of the current scope. Without a provider the methods do nothing.
export const useLoadCache = () => {

    const context = useContext(LoadCacheContext);

    return useMemo(() => {

        // Matches every hook whose cacheKey starts with the given parts:
        // invalidate("websites") or invalidate(["websites", websiteId])
        const invalidate = (cacheKey: LoadCacheKey) => {
            if (!context) return;

            const prefixParts = typeof cacheKey === "string" ? [cacheKey] : cacheKey;
            const prefix = serialize(prefixParts);

            if (prefix === null) return;

            // '[["websites"' — the key array without its closing bracket
            const scoped = context.scope + SEPARATOR + "[" + prefix.slice(0, -1);

            context.store.invalidate((key) => key.startsWith(scoped));
        };

        const clear = () => {
            context?.store.clear();
        };

        return {
            enabled: !!context,
            invalidate,
            clear,
        };

    }, [context]);

};
