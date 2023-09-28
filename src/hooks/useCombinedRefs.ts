import { useEffect, useRef } from "react";

export const useCombinedRefs = () => <T>(...refs: any[]) => {

    const targetRef = useRef<T>(null);

    refs.forEach(ref => { 

      if (!ref) return 

      if (typeof ref === 'function' ) { 
        
          ref(targetRef.current);

      } else { 

        ref.current = targetRef.current;

      } 
    });

    return targetRef;
  
  }