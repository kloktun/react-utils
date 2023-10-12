import { useEffect, useMemo, useState } from "react";
import { useLoading } from "./useLoading";

interface Props<T, D> {

    load: (payload?: D) => Promise<T>;
    payload?: D;
    manual?: boolean;

}

export const useLoad = <T, D>({ load: loadData, payload, manual }: Props<T, D>) => {

    const [data, setData] = useState<T>();
    const [error, setError] = useState<any>();

    const { loading, enableLoading, disableLoading } = useLoading();

    const isEmpty = useMemo(() => !data, [data]);
    const preloading = useMemo(() => isEmpty && loading, [isEmpty, loading]);

    const load = async () => {

        enableLoading();
        setError(undefined);

        try {

            const response = await loadData(payload);

            setData(response);

        } catch (e) {

            setError(e);

        } finally {

            disableLoading();

        }

    }

    const reload = () => {
        setData(undefined);
        load();
    }

    useEffect(() => {

        if(manual){
            return;
        }

        load();

    }, [payload]);

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