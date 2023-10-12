import { useBoolean } from "./useBoolean";

interface Props {
    initialValue: boolean;
}

export const useLoading = (props?: Props) => {

    const { value, enable, disable } = useBoolean(props?.initialValue);

    return {
        loading: value,
        enableLoading: enable,
        disableLoading: disable
    }

}