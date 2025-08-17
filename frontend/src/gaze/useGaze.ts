// src/gaze/useGaze.ts
import { useEffect, useRef, useState } from "react";

export type Gaze = { x: number; y: number; valid: boolean; ts: number };

type Affine = { a11: number; a12: number; a21: number; a22: number; b1: number; b2: number };

function loadAffine(): Affine | null {
    try {
        const raw = localStorage.getItem("gazeCalibAffine");
        if (!raw) return null;
        const a = JSON.parse(raw);
        if (
            typeof a?.a11 === "number" &&
            typeof a?.a12 === "number" &&
            typeof a?.a21 === "number" &&
            typeof a?.a22 === "number" &&
            typeof a?.b1 === "number" &&
            typeof a?.b2 === "number"
        ) {
            return a as Affine;
        }
    } catch {}
    return null;
}

type Manual = { topBiasPx?: number }; // 0 by default

function loadManual(): Manual {
    try {
        const raw = localStorage.getItem("gazeManual");
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

/** Top-anchored bias: shift up by topBiasPx at the very top, fade to 0 at the bottom. */
function applyTopAnchoredBias(yPx: number, screenH: number, topBiasPx: number) {
    // scale factor from top (1 at top → full bias; 0 at bottom → no bias)
    const fade = 1 - yPx / screenH;
    const yAdj = yPx - topBiasPx * fade; // negative = move up
    return Math.max(0, Math.min(screenH, yAdj));
}


function applyAffine(x: number, y: number, A: Affine | null) {
    if (!A) return { x, y };
    const x2 = A.a11 * x + A.a12 * y + A.b1;
    const y2 = A.a21 * x + A.a22 * y + A.b2;
    return {
        x: Math.max(0, Math.min(1, x2)),
        y: Math.max(0, Math.min(1, y2)),
    };
}

export function useGaze(wsUrl = "ws://127.0.0.1:7777") {
    const [gaze, setGaze] = useState<Gaze>({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        valid: false,
        ts: 0,
    });
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let cancelled = false;
        let cleanupMouse: (() => void) | undefined;

        function attachMouseFallback() {
            const handler = (e: MouseEvent) =>
                setGaze({
                    x: e.clientX,
                    y: e.clientY,
                    valid: true,
                    ts: performance.now() / 1000,
                });
            window.addEventListener("mousemove", handler);
            return () => window.removeEventListener("mousemove", handler);
        }

        const A = loadAffine();

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onmessage = (ev) => {
                const g = JSON.parse(ev.data) as { x: number; y: number; valid: boolean; ts: number }; // normalized 0..1

                // existing affine (if any)
                const adj = A ? { x: A.a11 * g.x + A.a12 * g.y + A.b1, y: A.a21 * g.x + A.a22 * g.y + A.b2 } : { x: g.x, y: g.y };

                const W = window.innerWidth;
                const H = window.innerHeight;

                // to pixels
                let xPx = adj.x * W;
                let yPx = adj.y * H;

                //  manual top-anchored Y bias
                const { topBiasPx = 0 } = loadManual();
                yPx = applyTopAnchoredBias(yPx, H, topBiasPx);

                setGaze({ x: xPx, y: yPx, valid: g.valid, ts: g.ts });
            };

            ws.onerror = () => {
                if (!cancelled && !cleanupMouse) cleanupMouse = attachMouseFallback();
            };
            ws.onclose = () => {
                if (!cancelled && !cleanupMouse) cleanupMouse = attachMouseFallback();
            };
        } catch {
            cleanupMouse = attachMouseFallback();
        }

        return () => {
            cancelled = true;
            wsRef.current?.close();
            cleanupMouse?.();
        };
    }, [wsUrl]);

    return gaze; // pixels
}
