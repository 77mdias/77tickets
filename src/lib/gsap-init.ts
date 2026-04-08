// src/lib/gsap-init.ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/**
 * Register ScrollTrigger exactly once.
 * Call this inside useEffect only — never at module scope.
 */
export function registerGsap(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}
