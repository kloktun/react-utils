import { useEffect, useMemo, useState } from "react";
import { useLoading } from "./useLoading";

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
}

export type UseListLoadReturn<T, D> = ReturnType<typeof useListLoad<T, D>>;


export const useListLoad = <T, D>({ load, count, payload }: ListLoadProps<T, D>) => {

    const [list, setList] = useState<T[]>([]);
    const [error, setError] = useState<any>();

    const [hasMore, setHasMore] = useState(false);
    const { loading, enableLoading, disableLoading } = useLoading();
    const [offset, setOffset] = useState(0);

    const isEmpty = useMemo(
        () => list.length == 0,
        [list]
    );

    const preloading = useMemo(
        () => isEmpty && loading,
        [loading, isEmpty]
    );

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

    }

    const replaceItem = (index: number, item: T) => {

        setList((prevList) => {

            prevList[index] = item;

            return [...prevList];
        });

    }

    const removeItem = (index: number) => {

        setList((prevList) => {
            return prevList.filter((value, i) => i != index);
        });

        setOffset((oldOffset) => {
            return oldOffset - 1;
        });

    }

    const prependItem = (item: T) =>{

        setList((prevList) => {
            return [item, ...prevList];
        });

        setOffset((oldOffset) => {
            return oldOffset + 1;
        });

    }

    const appendItem = (item: T) =>{

        setList((prevList) => {
            return [...prevList, item];
        });

        setOffset((oldOffset) => {
            return oldOffset + 1;
        });

    }


    const nextLoad = async (props?: NextLoadProps) => {

        if(props?.reset){
            reset();
        }

        if(loading && list.length > 0){
            return;
        }

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
            
        } catch (e) {
            
            setError(e);

        } finally {

            disableLoading();

        }

    }
   
    useEffect(() => {
        
        nextLoad({
            reset: true
        });

    }, [payload]);

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

