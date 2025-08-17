import React, { useState, useMemo } from "react";

interface VowelPopupProps {
    predictions: string[];                 // full list (up to ~10)
    onSelect: (value: string) => void;     // choose a vowel form
    onClose: () => void;
    position: { top: number; left: number };
}

/**
 * Gaze-friendly popup:
 * - Max 6 buttons per page: 5 suggestions + 1 control (More/Back)
 * - Large circular layout with big hit targets
 * - Page 1: items[0..4] + "More" (if >5 exist)
 * - Page 2: items[5..9] + "Back"
 */
const VowelPopup: React.FC<VowelPopupProps> = ({
                                                   predictions,
                                                   onSelect,
                                                   onClose,
                                                   position,
                                               }) => {
    const PAGE_SIZE = 5;
    const [page, setPage] = useState<0 | 1>(0);

    const hasSecondPage = predictions.length > PAGE_SIZE;

    const pageItems = useMemo(() => {
        const start = page === 0 ? 0 : PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return predictions.slice(start, end);
    }, [predictions, page]);

    const controlLabel = useMemo(() => {
        if (!hasSecondPage) return null;
        return page === 0 ? "More" : "Back";
    }, [hasSecondPage, page]);

    // Visuals tuned for gaze
    const radius = 170;             // popup radius (px)
    const innerRadius = radius * 0.62;
    const buttonSize = 82;          // target size
    const fontSize = 28;

    // Arrange up to 6 items evenly around a circle
    const options = controlLabel ? [...pageItems, controlLabel] : pageItems;
    const angleStep = (2 * Math.PI) / Math.max(options.length, 1);

    const handleClick = (option: string) => {
        if (option === "More") {
            setPage(1);
            return;
        }
        if (option === "Back") {
            setPage(0);
            return;
        }
        onSelect(option);
        onClose();
    };

    return (
        <div
            data-vowel-popup  // 👈 marks this region for shorter dwell timing
            style={{
                position: "absolute",
                top: position.top - radius + buttonSize / 2,   // roughly center on key
                left: position.left - radius + buttonSize / 2,
                width: radius * 2,
                height: radius * 2,
                borderRadius: "50%",
                background: "rgba(240, 248, 255, 0.96)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                border: "2px solid #bcd8ff",
                zIndex: 1000,
            }}
        >
            {options.map((option, i) => {
                const angle = angleStep * i - Math.PI / 2; // start at top
                const x = radius + innerRadius * Math.cos(angle) - buttonSize / 2;
                const y = radius + innerRadius * Math.sin(angle) - buttonSize / 2;

                const isControl = option === "More" || option === "Back";
                const bg = isControl ? "#ffe08a" : "#b3ffd9";

                return (
                    <button
                        key={`${option}-${i}`}
                        onClick={() => handleClick(option)}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: buttonSize,
                            height: buttonSize,
                            borderRadius: "50%",
                            backgroundColor: bg,
                            border: "2px solid #888",
                            fontSize,
                            fontWeight: 600,
                            cursor: "pointer",
                            outline: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                        }}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
};

export default VowelPopup;
