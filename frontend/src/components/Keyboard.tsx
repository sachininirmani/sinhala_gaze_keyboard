import React, { useState, useRef } from "react";
import axios from "axios";
import VowelPopup from "./VowelPopup";

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
    padding: "12px",
    fontSize: "20px",
    backgroundColor: "#fff5cc",
    border: "1px solid #ccc",
    borderRadius: 4,
};

const Keyboard: React.FC = () => {
    const [typedText, setTypedText] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSecondStage, setIsSecondStage] = useState(false);
    const [showNumbers, setShowNumbers] = useState(false);
    const [showPunctuation, setShowPunctuation] = useState(false);
    const [vowelPopup, setVowelPopup] = useState<{
        base: string;
        options: string[];
        position: { top: number; left: number };
    } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

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
                params: { prefix, current: char }, // send current letter explicitly
            });

            if (Array.isArray(vowelRes.data) && vowelRes.data.length > 0 && containerRef.current) {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setVowelPopup({
                    base: char,
                    options: vowelRes.data, // slice handled inside popup via paging
                    position: {
                        top: rect.top - containerRef.current.offsetTop,
                        left: rect.left - containerRef.current.offsetLeft,
                    },
                });
            } else {
                setVowelPopup(null);
            }
        } catch (err) {
            setVowelPopup(null);
        }
    };

    const handleClick = async (char: string, e: React.MouseEvent) => {
        const updatedText = typedText + char;
        setTypedText(updatedText);

        const words = updatedText.trim().split(" ");
        const lastPrefix = words[words.length - 1]; // entire word including current char

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
        <div ref={containerRef} style={{ padding: 20, position: "relative" }}>
            <div style={{ marginBottom: 10 }}>
                <strong>Typed Text:</strong> {typedText}
            </div>

            {/* word suggestions row */}
            <div style={{ marginBottom: 15, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {suggestions.map((word, index) => (
                    <button
                        key={index}
                        onClick={() => handleSuggestionClick(word)}
                        style={{
                            padding: "12px",
                            fontSize: "20px",
                            backgroundColor: "#e6f0ff",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                        }}
                    >
                        {word}
                    </button>
                ))}
            </div>

            {/* keyboard grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 8,
                    marginBottom: 15,
                }}
            >
                {getCurrentLayout()
                    .flat()
                    .map((char, index) => (
                        <button
                            key={index}
                            onClick={(e) => handleClick(char, e)}
                            style={{ padding: "12px", fontSize: "20px" }}
                        >
                            {char}
                        </button>
                    ))}
            </div>

            {/* controls */}
            <div style={{ display: "flex", gap: 10 }}>
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
            </div>

            {/* popup */}
            {vowelPopup && (
                <VowelPopup
                    baseLetter={vowelPopup.base}
                    predictions={vowelPopup.options}
                    onSelect={handleVowelSelect}
                    onClose={() => setVowelPopup(null)}
                    position={vowelPopup.position}
                />
            )}
        </div>
    );
};

export default Keyboard;
