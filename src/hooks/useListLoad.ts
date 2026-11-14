import { useEffect, useMemo, useRef, useState } from "react";
import { useLoading } from "./useLoading";
import { getShownEntry, isFresh, LoadCacheKey, useResolvedCache } from "../cache/LoadCache";

interface OffsetCountProps {

    offset: number;
    count: number

}

interface NextLoadProps {
    reset?: boolean;
}

export interface ListLoadProps<T, D> {

    count: number;
    payload?: D,
    load: (props: OffsetCountProps, payload?: D) => Promise<T[]>;

    // Caching (works only inside LoadCacheProvider, see cache/LoadCache.tsx).
    // The loaded list is shown instantly and reloaded in the background as one request
    // of the same length, so the scroll position is kept. Payload and count are part of the key.
    cacheKey?: LoadCacheKey;
    // Time (ms) during which the cached list is not reloaded on mount. Defaults to the provider's staleTime.
    staleTime?: number;
}

interface ListCacheValue<T> {
    list: T[];
    offset: number;
    hasMore: boolean;
}

export type UseListLoadReturn<T, D> = ReturnType<typeof useListLoad<T, D>>;


export const useListLoad = <T, D>({ load, count, payload, cacheKey, staleTime }: ListLoadProps<T, D>) => {

    const cache = useResolvedCache(cacheKey, payload, staleTime, count);
    const cacheId = cache?.key;

    // Shown entry only: a list marked by invalidate() is loaded honestly
    const readCache = () => (cache ? getShownEntry(cache.store, cache.key)?.value as ListCacheValue<T> | undefined : undefined);

    const [list, setList] = useState<T[]>(() => {
        const cached = readCache();
        return cached ? [...cached.list] : [];
    });
    const [error, setError] = useState<any>();

    const [hasMore, setHasMore] = useState(() => readCache()?.hasMore ?? false);
    const { loading, enableLoading, disableLoading } = useLoading({
        initialValue: true
    });
    const [offset, setOffset] = useState(() => readCache()?.offset ?? 0);

    const isEmpty = useMemo(
        () => list.length == 0,
        [list]
    );

    // With a cached (even empty) list there is nothing to preload — only a background refresh
    const hasCacheEntry = !!cache && !!getShownEntry(cache.store, cache.key);

    const preloading = useMemo(
        () => isEmpty && loading && !hasCacheEntry,
        [loading, isEmpty, hasCacheEntry]
    );

    // Only the latest request may update the state (cached mode)
    const requestRef = useRef(0);

    // Local item changes are written to the cache after render
    const [cacheVersion, setCacheVersion] = useState(0);
    const touchCache = () => {
        if (cache) setCacheVersion((v) => v + 1);
    };

    useEffect(() => {
        if (!cache || cacheVersion === 0) return;
        cache.store.set(cache.key, { list, offset, hasMore } as ListCacheValue<T>);
    }, [cacheVersion]);

    const reset = () => {

        setOffset(0);
        setList([]);
        setHasMore(false);

    }

    const insertItem = (index: number, item: T) =>{

        setList((prevList) => {

            return [
                ...prevList.slice(0, index),
                item,
                ...prevList.slice(index),
            ]

        });

        setOffset((oldOffset) => {
            return oldOffset + 1;
        });

        touchCache();

    }

    const replaceItem = (index: number, item: T) => {

        setList((prevList) => {

            prevList[index] = item;

            return [...prevList];
        });

        touchCache();

    }

    const removeItem = (index: number) => {

        setList((prevList) => {
            return prevList.filter((value, i) => i != index);
        });

        setOffset((oldOffset) => {
            return oldOffset - 1;
        });

        touchCache();

    }

    const prependItem = (item: T) =>{

        setList((prevList) => {
            return [item, ...prevList];
        });

        setOffset((oldOffset) => {
            return oldOffset + 1;
        });

        touchCache();

    }

    const appendItem = (item: T) =>{

        setList((prevList) => {
            return [...prevList, item];
        });

        setOffset((oldOffset) => {
            return oldOffset + 1;
        });

        touchCache();

    }

    // Cached mode: reloads from the start without clearing the list on screen
    const revalidate = async (size: number) => {

        if (!cache) return;

        const { store, key } = cache;
        const requestId = ++requestRef.current;

        setError(undefined);
        enableLoading();

        try {

            const data = await store.fetch(key + "#" + size, () => load({ offset: 0, count: size }, payload));

            if (requestId !== requestRef.current) return;

            const value: ListCacheValue<T> = { list: data, offset: data.length, hasMore: data.length == size };

            store.set(key, value);
            setList(data);
            setOffset(value.offset);
            setHasMore(value.hasMore);

        } catch (e) {

            if (requestId !== requestRef.current) return;

            setError(e);

        } finally {

            if (requestId === requestRef.current) {
                disableLoading();
            }

        }

    }

    const nextLoad = async (props?: NextLoadProps) => {

        if (cache && props?.reset) {
            await revalidate(count);
            return;
        }

        if(props?.reset){
            reset();
        }

        if(loading && list.length > 0){
            return;
        }

        const requestId = ++requestRef.current;

        setError(undefined);
        enableLoading();

        try {

            const data = await load(

                {
                    offset: props?.reset ? 0 : offset,
                    count,
                },

                payload
            );

            if (cache && requestId !== requestRef.current) return;

            if(props?.reset){

                setList(data);
                setOffset(data.length);

            } else {

                setList([
                    ...list,
                    ...data
                ]);

                setOffset(list.length + data.length);

            }

            setHasMore(data.length == count);

            if (cache) {
                const nextList = props?.reset ? data : [...list, ...data];
                cache.store.set(cache.key, { list: nextList, offset: nextList.length, hasMore: data.length == count } as ListCacheValue<T>);
            }

        } catch (e) {

            if (cache && requestId !== requestRef.current) return;

            setError(e);

        } finally {

            if (!cache || requestId === requestRef.current) {
                disableLoading();
            }

        }

    }

    const revalidateRef = useRef(revalidate);
    revalidateRef.current = revalidate;

    useEffect(() => {

        if (cache) {

            const cached = readCache();

            if (cached) {

                setList([...cached.list]);
                setOffset(cached.offset);
                setHasMore(cached.hasMore);

                if (isFresh(cache.store, cache.key, cache.staleTime)) {
                    disableLoading();
                    return;
                }

                revalidate(Math.max(count, cached.list.length));
                return;

            }

        }

        nextLoad({
            reset: true
        });

    }, [payload, cacheId]);

    // invalidate() from useLoadCache reloads mounted hooks
    useEffect(() => {

        if (!cache) {
            return;
        }

        return cache.store.subscribe(cache.key, () => {
            // The list is on screen: reload as many items as are shown (the entry is already marked stale)
            const cached = cache.store.get(cache.key)?.value as ListCacheValue<T> | undefined;
            revalidateRef.current(Math.max(count, cached?.list.length ?? 0));
        });

    }, [cacheId]);

    return {
        list,
        loading,
        error,
        isEmpty,
        preloading,
        hasMore,
        nextLoad,

        insertItem,
        replaceItem,
        removeItem,
        appendItem,
        prependItem,

    }

}
