export const useCopyToClipboard = () => {
    const copyToClipboard = async (value: string): Promise<boolean> => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                // Современный API
                await navigator.clipboard.writeText(value);
                return true;
            } else {
                // Резервный метод (Safari и старые браузеры)
                const textArea = document.createElement('textarea');
                textArea.value = value;
                textArea.style.position = 'absolute';
                textArea.style.opacity = '0';
                textArea.style.pointerEvents = 'none';

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand?.('copy');
                document.body.removeChild(textArea);

                if (!successful) {
                    throw new Error('Fallback copy command failed');
                }
                return true;
            }
        } catch (error) {
            console.error('Failed to copy text: ', error);
            return false;
        }
    };

    return copyToClipboard;
};
