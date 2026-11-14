import { useEffect, useMemo, useRef, useState } from "react";
import { useLoading } from "./useLoading";
import { getShownEntry, isFresh, LoadCacheKey, useResolvedCache } from "../cache/LoadCache";

interface Props<T, D> {

    load: (payload?: D) => Promise<T>;
    payload?: D;
    manual?: boolean;

    // Caching (works only inside LoadCacheProvider, see cache/LoadCache.tsx).
    // Cached data is shown instantly and reloaded in the background.
    // The payload is part of the key automatically.
    cacheKey?: LoadCacheKey;
    // Time (ms) during which cached data is not reloaded on mount. Defaults to the provider's staleTime.
    staleTime?: number;

}

export const useLoad = <T, D>({ load: loadData, payload, manual, cacheKey, staleTime }: Props<T, D>) => {

    const cache = useResolvedCache(cacheKey, payload, staleTime);
    const cacheId = cache?.key;

    const [data, setData] = useState<T | undefined>(() => (cache ? getShownEntry(cache.store, cache.key)?.value as T | undefined : undefined));
    const [error, setError] = useState<any>();

    const { loading, enableLoading, disableLoading } = useLoading();

    const isEmpty = useMemo(() => !data, [data]);
    const preloading = useMemo(() => isEmpty && loading, [isEmpty, loading]);

    // Only the latest request may update the state (cached mode)
    const requestRef = useRef(0);

    const load = async () => {

        enableLoading();
        setError(undefined);

        // Without cache — exactly the pre-cache behavior
        if (!cache) {

            try {

                const response = await loadData(payload);

                setData(response);

            } catch (e) {

                setError(e);

            } finally {

                disableLoading();

            }

            return;

        }

        const requestId = ++requestRef.current;
        const { store, key } = cache;

        try {

            const response = await store.fetch(key, () => loadData(payload));

            if (requestId !== requestRef.current) return;

            store.set(key, response);
            setData(response);

        } catch (e) {

            if (requestId !== requestRef.current) return;

            setError(e);

        } finally {

            if (requestId === requestRef.current) {
                disableLoading();
            }

        }

    }

    const loadRef = useRef(load);
    loadRef.current = load;

    const reload = () => {
        setData(undefined);
        load();
    }

    useEffect(() => {

        if(manual){
            return;
        }

        if (cache) {

            const entry = getShownEntry(cache.store, cache.key);

            if (entry) {
                setData(entry.value as T);
            }

            if (isFresh(cache.store, cache.key, cache.staleTime)) {
                return;
            }

        }

        load();

    }, [payload, cacheId]);

    // invalidate() from useLoadCache reloads mounted hooks
    useEffect(() => {

        if (!cache || manual) {
            return;
        }

        return cache.store.subscribe(cache.key, () => loadRef.current());

    }, [cacheId, manual]);

    return {

        data,
        error,

        preloading,
        loading,
        isEmpty,

        load,
        reload,

    }

}
