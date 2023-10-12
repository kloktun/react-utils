import { useEffect } from "react"
import { useBoolean } from "./useBoolean";

interface Props {

    initialValue?: boolean;    

}

export const useUnloadConfirm = (props?: Props) => {

    const { value, enable, disable } = useBoolean(props?.initialValue);

    const handleUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        return (event.returnValue = "");
    }

    useEffect(() => {

        if(value){
            window.addEventListener("beforeunload", handleUnload);
        } else {
            window.removeEventListener("beforeunload", handleUnload);
        }

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
        }

    }, [value]);

    return {
        isUnloadConfirm: value,
        enableUnloadConfirm: enable,
        disableUnloadConfirm: disable
    }

}

