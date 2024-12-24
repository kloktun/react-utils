import { useState, useEffect } from "react";

type AdaptiveStateMobile = "mobile" | "tablet";
type AdaptiveState = AdaptiveStateMobile | "desktop";


export interface UseScreenSizeProps {
	breakpoints?: {
		[key in AdaptiveStateMobile]?: number;
	}
}

export function useScreenSize(props?: UseScreenSizeProps) {

	let { breakpoints } = props ?? {};
	let mobileBreakpoint = breakpoints?.mobile ?? 768;
	let tabletBreakpoint = breakpoints?.tablet ?? 1280;

	const [adaptive, setAdaptive] = useState<AdaptiveState>("desktop");
	const [width, setWidth] = useState<number>(0);
	const [height, setHeight] = useState<number>(0);

	useEffect(() => {
		const handleResize = () => {
			const { innerWidth, innerHeight } = window;

			setWidth(innerWidth);
			setHeight(innerHeight);

			if (innerWidth < mobileBreakpoint) {
				setAdaptive("mobile");
			} else if (innerWidth >= mobileBreakpoint && innerWidth < tabletBreakpoint) {
				setAdaptive("tablet");
			} else {
				setAdaptive("desktop");
			}
		};

		handleResize(); // Initial check

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	return {
		adaptive,
		width,
		height,
	};
}