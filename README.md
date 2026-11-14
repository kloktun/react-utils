# @kloktun/react-utils

React hooks: `useLoad`, `useListLoad`, `useLoading`, `useBoolean`, `useClickOutside`, `useCombinedRefs`,
`useCopyToClipboard`, `usePasswordGenerator`, `useUnloadConfirm`, `useScreenSize`, `useWindowScroll`.

## Load cache (0.1+)

`useLoad` and `useListLoad` can keep loaded data between screen visits: cached data is shown instantly
and reloaded in the background (stale-while-revalidate), so returning to a screen shows no loader.

Caching is **opt-in** and works only when both are present:

1. `LoadCacheProvider` with a `scope` above the hooks;
2. `cacheKey` on the hook.

Without the provider the hooks behave exactly as in 0.0.x — even if `cacheKey` is passed.

```tsx
// scope = everything that changes server responses for the same request; null — cache off.
// Use a stable user id (not an access token) and the language.
<LoadCacheProvider scope={`${user?.id ?? "anon"}:${locale}`}>
	<App />
</LoadCacheProvider>
```

```tsx
const { list, preloading } = useListLoad({
	cacheKey: "websites",
	count: 20,
	load: ({ offset, count }) => api.getWebsites({ offset, count }),
});

const { data: website } = useLoad({
	cacheKey: ["website", domain],
	load: () => api.getWebsite(domain),
});
```

- The full key is `scope + cacheKey + payload` (`useListLoad` also adds `count`), so different payloads never share data.
- When `scope` changes (another account, logout, language) the cache is cleared.
- `staleTime` (ms, on the provider or the hook): data younger than this is not reloaded on mount. Default `0` — always reload in the background.
- `useListLoad` reloads the whole loaded list in one request (`offset: 0, count: list.length`), so the scroll position is kept. `insertItem` / `replaceItem` / `removeItem` / `appendItem` / `prependItem` update the cache too. `nextLoad({ reset: true })` reloads without clearing the list on screen.
- Requests with the same key are shared; responses of outdated requests are ignored.
- Memory only: nothing is written to localStorage.

```tsx
const { invalidate, clear } = useLoadCache();

invalidate("websites");            // reload every mounted hook whose key starts with "websites"
invalidate(["website", domain]);
clear();
```

Do not cache data that must never be shown stale: initial values of edit forms, payments.
