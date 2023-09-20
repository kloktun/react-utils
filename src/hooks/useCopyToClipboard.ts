export const useCopyToClipboard = () => (async (value: string) => {

    await navigator.clipboard.writeText(value);

});