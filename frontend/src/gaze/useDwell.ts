import { useEffect, useRef, useState } from "react";

function topClickableAt(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    // Ignore our overlay (we also set pointer-events:none on it, but double-safety):
    if (el.closest("[data-gaze-overlay]")) return null;
    // Clickable: <button> or any element you mark with data-clickable
    return (el.closest("button, [data-clickable]") as HTMLElement | null);
}

export function useDwell(
    x: number,
    y: number,
    opts = {
        stabilizationMs: 120,
        stabilityRadiusPx: 90,
        dwellMs: 900,
        dwellMsPopup: 700,
        refractoryMs: 200,
    }
) {
    const [progress, setProgress] = useState(0); // 0..1
    const [target, setTarget] = useState<HTMLElement | null>(null);
    const ref = useRef({
        lastX: x, lastY: y,
        stableSince: 0,
        dwelling: false,
        dwellStart: 0,
        active: null as HTMLElement | null,
        lastClickAt: 0,
    });

    const inPopup = (el: HTMLElement | null) => !!el?.closest("[data-vowel-popup]");

    useEffect(() => {
        const now = performance.now();
        const dx = x - ref.current.lastX;
        const dy = y - ref.current.lastY;
        const dist = Math.hypot(dx, dy);

        const current = topClickableAt(x, y);
        const same = current === ref.current.active;

        if (!same) {
            ref.current.active = current;
            ref.current.stableSince = now;
            ref.current.dwelling = false;
            ref.current.dwellStart = 0;
            setProgress(0);
            setTarget(current);
        } else {
            // same target
            if (dist < opts.stabilityRadiusPx) {
                if (!ref.current.dwelling) {
                    if (now - ref.current.stableSince >= opts.stabilizationMs) {
                        ref.current.dwelling = true;
                        ref.current.dwellStart = now;
                    }
                } else {
                    const need = inPopup(current) ? opts.dwellMsPopup : opts.dwellMs;
                    const p = Math.min(1, (now - ref.current.dwellStart) / need);
                    setProgress(p);
                    if (p >= 1 && current) {
                        // refractory period to avoid double triggers
                        if (now - ref.current.lastClickAt >= opts.refractoryMs) {
                            (current as HTMLButtonElement).click?.();
                            ref.current.lastClickAt = now;
                        }
                        ref.current.dwelling = false;
                        ref.current.dwellStart = 0;
                        setProgress(0);
                    }
                }
            } else {
                // moved too much: reset
                ref.current.stableSince = now;
                ref.current.dwelling = false;
                ref.current.dwellStart = 0;
                setProgress(0);
            }
        }

        ref.current.lastX = x;
        ref.current.lastY = y;
    }, [x, y]);

    return { target, progress };
}
