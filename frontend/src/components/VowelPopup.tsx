import React, { useState } from "react";

interface VowelPopupProps {
    baseLetter: string;
    predictions: string[];
    onSelect: (value: string) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const VowelPopup: React.FC<VowelPopupProps> = ({
                                                   baseLetter,
                                                   predictions,
                                                   onSelect,
                                                   onClose,
                                                   position,
                                               }) => {
    const [visibleStartIndex, setVisibleStartIndex] = useState(0);
    const batchSize = 5;
    const isMoreAvailable = visibleStartIndex + batchSize < predictions.length;

    const visibleOptions = predictions.slice(
        visibleStartIndex,
        visibleStartIndex + batchSize
    );
    const allOptions = [baseLetter, ...visibleOptions];

    if (isMoreAvailable) {
        allOptions.push("More");
    }

    const radius = 80;
    const angleStep = (2 * Math.PI) / allOptions.length;

    const handleClick = (option: string) => {
        if (option === "More") {
            setVisibleStartIndex((prev) => prev + batchSize);
        } else {
            onSelect(option);
            onClose();
        }
    };

    return (
        <div
            style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                width: 2 * radius,
                height: 2 * radius,
                borderRadius: "50%",
                backgroundColor: "#f0f8ff",
                zIndex: 1000,
            }}
        >
            {allOptions.map((option, i) => {
                const angle = angleStep * i;
                const x = radius + radius * 0.6 * Math.cos(angle) - 20;
                const y = radius + radius * 0.6 * Math.sin(angle) - 20;
                const bg =
                    option === baseLetter ? "#d0e7ff" : option === "More" ? "#ffe066" : "#b3ffd9";
                return (
                    <button
                        key={i}
                        onClick={() => handleClick(option)}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: bg,
                            fontSize: 16,
                            border: "1px solid #ccc",
                            cursor: "pointer",
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
