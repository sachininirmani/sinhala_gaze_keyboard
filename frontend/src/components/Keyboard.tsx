import React, { useState, useRef } from "react";
import axios from "axios";
import VowelPopup from "./VowelPopup";

// 👇 gaze hooks & indicator
import { useGaze } from "../gaze/useGaze";
import { useDwell } from "../gaze/useDwell";
import GazeIndicator from "../gaze/GazeIndicator";
import QuickAffineCalibration from "../gaze/QuickAffineCalibration";
import TopBiasTuner from "../gaze/TopBiasTuner";

const firstStageLetters: string[][] = [
    ["ණ", "න", "ව", "ය", "ක", "ර"],
    ["ශ", "ම", "ත", "ල", "ස", "ද"],
    ["ච", "ප", "ට", "ග", "හ", "බ"],
    ["ජ", "අ", "ඉ", "උ", "එ", "ඒ"],
    ["ඩ", "ආ", "ඊ", "ඌ", "ඇ", "ඈ"],
];

const secondStageLetters: string[][] = [
    ["ඖ", "ථ", "භ", "ඝ", "ඛ", "ඡ"],
    ["ඓ", "ධ", "ඨ", "ඹ", "ඳ", "ඟ"],
    ["ෆ", "ළ", "ෂ", "ඵ", "ඥ", "ඓ"],
    ["ඃ", "ං", "ඤ", "ඬ", "ඣ", "ඪ"],
    ["ඍ", "ඎ", "ඏ", "ඐ", "ඞ", "ඖ"],
];

const numbers: string[][] = [
    ["1", "2", "3", "4", "5", "6"],
    ["7", "8", "9", "0", "(", ")"],
];

const punctuation: string[][] = [
    [".", ",", "!", "?", ":", ";"],
    ['"', "'", "’", "“", "”", "…"],
];

const controlButtonStyle: React.CSSProperties = {
    padding: "16px",
    fontSize: "22px",
    backgroundColor: "#fff5cc",
    border: "1px solid #ccc",
    borderRadius: 8,
};

// 👉 constants to keep the layout static
const TYPED_ROW_MIN_HEIGHT = 30;     // px (keeps this row stable)
const SUGGESTION_ROW_HEIGHT = 50;    // px (reserved from the start)

const Keyboard: React.FC = () => {
    const [typedText, setTypedText] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSecondStage, setIsSecondStage] = useState(false);
    const [showNumbers, setShowNumbers] = useState(false);
    const [showPunctuation, setShowPunctuation] = useState(false);
    const [vowelPopup, setVowelPopup] = useState<{
        options: string[];
        position: { top: number; left: number };
    } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [showCal4, setShowCal4] = useState(false);
    const [showBias, setShowBias] = useState(false);

    // receive gaze (pixels) and run dwell selection
    const gaze = useGaze("ws://127.0.0.1:7777");
    const { progress } = useDwell(gaze.x, gaze.y, {
        stabilizationMs: 120,
        stabilityRadiusPx: 90,
        dwellMs: 650,        // main keys
        dwellMsPopup: 400,   // faster inside big popup
        refractoryMs: 200,
    });

    const getCurrentLayout = () => {
        if (showNumbers) return numbers;
        if (showPunctuation) return punctuation;
        return isSecondStage ? secondStageLetters : firstStageLetters;
    };

    const fetchWordPredictions = async (prefix: string) => {
        try {
            const res = await axios.get("http://localhost:5000/predict/word", {
                params: { prefix },
            });
            setSuggestions(res.data);
        } catch (error) {
            console.error("Prediction error:", error);
        }
    };

    const fetchVowelPredictions = async (
        prefix: string,
        char: string,
        e: React.MouseEvent
    ) => {
        try {
            const vowelRes = await axios.get("http://localhost:5000/predict/vowel", {
                params: { prefix, current: char },
            });

            if (Array.isArray(vowelRes.data) && vowelRes.data.length > 0 && containerRef.current) {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setVowelPopup({
                    options: vowelRes.data, // backend can return up to 10; popup paginates to 5-per-page
                    position: {
                        top: rect.top - containerRef.current.offsetTop,
                        left: rect.left - containerRef.current.offsetLeft,
                    },
                });
            } else {
                setVowelPopup(null);
            }
        } catch {
            setVowelPopup(null);
        }
    };

    const handleClick = async (char: string, e: React.MouseEvent) => {
        const updatedText = typedText + char;
        setTypedText(updatedText);

        const words = updatedText.trim().split(" ");
        const lastPrefix = words[words.length - 1];

        await fetchWordPredictions(lastPrefix);
        await fetchVowelPredictions(lastPrefix, char, e);
    };

    const handleSuggestionClick = (word: string) => {
        const parts = typedText.trim().split(" ");
        parts[parts.length - 1] = word;
        setTypedText(parts.join(" ") + " ");
        setSuggestions([]);
        setVowelPopup(null);
    };

    const handleVowelSelect = async (vowelChunk: string) => {
        // replace just-typed base letter with selected vowel form
        const newText = typedText.slice(0, -1) + vowelChunk;
        setTypedText(newText);
        setVowelPopup(null);

        const lastWord = newText.trim().split(" ").pop() || "";
        await fetchWordPredictions(lastWord);
    };

    return (
        <div
            ref={containerRef}
            style={{
                padding: 20,
                position: "relative",
                maxWidth: 1200,
                margin: "0 auto",
            }}
        >
            {/* Typed text row (kept steady with min height) */}
            <div
                style={{
                    marginBottom: 10,
                    fontSize: 18,
                    minHeight: TYPED_ROW_MIN_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <strong>Typed Text:&nbsp;</strong> <span>{typedText}</span>
            </div>

            {/* Suggestions row — fixed height from the start; no jumping */}
            <div
                style={{
                    height: SUGGESTION_ROW_HEIGHT,         // <-- reserved space
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                    padding: "6px 4px",
                    background: "#f8fbff",
                    border: "1px solid #e1ecff",
                    borderRadius: 10,
                    overflowX: "auto",
                    overflowY: "hidden",
                    flexWrap: "nowrap",                     // keep single row
                    whiteSpace: "nowrap",
                }}
            >
                {suggestions.length === 0 ? (
                    <span style={{ color: "#94a3b8", fontStyle: "italic", paddingLeft: 6 }}>
            Suggestions will appear here…
          </span>
                ) : (
                    suggestions.map((word, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(word)}
                            style={{
                                padding: "12px 14px",
                                fontSize: "20px",
                                backgroundColor: "#e6f0ff",
                                border: "1px solid #c7dafd",
                                borderRadius: 8,
                                flex: "0 0 auto",
                            }}
                        >
                            {word}
                        </button>
                    ))
                )}
            </div>

            {/* Keyboard grid (static position; not affected by suggestions row) */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 10,
                    marginBottom: 16,
                }}
            >
                {getCurrentLayout()
                    .flat()
                    .map((char, index) => (
                        <button
                            key={index}
                            onClick={(e) => handleClick(char, e)}
                            style={{ padding: "16px", fontSize: "24px", borderRadius: 8 }}
                        >
                            {char}
                        </button>
                    ))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                    onClick={() => {
                        setIsSecondStage((prev) => !prev);
                        setVowelPopup(null);
                    }}
                    style={controlButtonStyle}
                >
                    {isSecondStage ? "⇠ First Set" : "⇢ Second Set"}
                </button>

                <button
                    onClick={() => {
                        setShowNumbers((prev) => !prev);
                        setVowelPopup(null);
                    }}
                    style={controlButtonStyle}
                >
                    {showNumbers ? "Close Numbers" : "123"}
                </button>

                <button
                    onClick={() => {
                        setShowPunctuation((prev) => !prev);
                        setVowelPopup(null);
                    }}
                    style={controlButtonStyle}
                >
                    {showPunctuation ? "Close Punctuation" : "Punctuations"}
                </button>

                <button
                    onClick={() => {
                        setTypedText((prev) => prev + " ");
                        setVowelPopup(null);
                    }}
                    style={{ ...controlButtonStyle, flex: 2 }}
                >
                    Space
                </button>

                <button
                    onClick={() => {
                        setTypedText((prev) => prev.slice(0, -1));
                        setVowelPopup(null);
                    }}
                    style={controlButtonStyle}
                >
                    ⌫ Delete
                </button>

                <button onClick={() => setShowCal4(true)} style={controlButtonStyle}>
                    Recalibrate (4-pt)
                </button>
                <button onClick={() => setShowBias(true)} style={controlButtonStyle}>
                    Top Bias
                </button>
            </div>

            {/* Vowel popup */}
            {vowelPopup && (
                <VowelPopup
                    predictions={vowelPopup.options}
                    onSelect={handleVowelSelect}
                    onClose={() => setVowelPopup(null)}
                    position={vowelPopup.position}
                />
            )}

            {showCal4 && <QuickAffineCalibration onDone={() => setShowCal4(false)} />}
            {showBias && <TopBiasTuner onClose={() => setShowBias(false)} />}

            {/* Gaze dot + dwell progress ring */}
            <GazeIndicator x={gaze.x} y={gaze.y} progress={progress} />
        </div>
    );
};

export default Keyboard;
