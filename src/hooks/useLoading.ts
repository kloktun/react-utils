import { useState } from "react";

interface Props {
    initialValue: boolean;
}

export const useLoading = (props?: Props) => {

    const [loading, setLoading] = useState(props?.initialValue);

    const enableLoading = () => {
        setLoading(true);
    }

    const disableLoading = () => {
        setLoading(false);
    }

    return {
        loading,
        enableLoading,
        disableLoading
    }

}