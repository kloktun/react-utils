import { useState } from "react"

export const useBoolean = (initialValue?: boolean) => {

    const [value, setValue] = useState(initialValue ?? false);

    const enable = () => setValue(true);
    const disable = () => setValue(false);
    const toggle = () => setValue((currentValue) => !currentValue);

    return {
        value,
        enable,
        disable,
        toggle
    }

}