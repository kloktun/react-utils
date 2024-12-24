import { useState, useEffect } from "react";

export function useWindowScroll() {

	const [scrollX, setScrollX] = useState<number>(0);
	const [scrollY, setScrollY] = useState<number>(0);

	useEffect(() => {
		const handleScroll = () => {
			const { scrollX: windowScrollX, scrollY: windowScrollY } = window;

			setScrollX(windowScrollX);
			setScrollY(windowScrollY);
		};

		handleScroll(); // Initial check

		window.addEventListener("resize", handleScroll);
		window.addEventListener("scroll", handleScroll);

		return () => {
			window.removeEventListener("resize", handleScroll);
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	return {
		scrollX,
		scrollY,
	};
}