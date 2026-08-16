"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import {
  ChangeEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";

import { planTrip } from "@/services/travel.service";
import type { TripPlanResponse } from "@/types/trip-plan";

interface PromptCardProps {
  onTripGenerated: (trip: TripPlanResponse) => void;
}

export default function PromptCard({
  onTripGenerated,
}: PromptCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];

    if (!uploaded) return;

    setFile(uploaded);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;

    try {
      setLoading(true);

      const response = await planTrip({
        message: prompt,
      });

      console.log("Travel response:", response);

      onTripGenerated(response);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while generating your itinerary.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-[701px] max-md:w-[calc(100vw-48px)] min-h-[235px] overflow-hidden rounded-[44px] border-[3px] border-white bg-white/10 shadow-[0_0_4px_rgba(0,0,0,0.15)] backdrop-blur-[20px]"
    >
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="I'm planning a 7-day trip to Japan in October. I love food, hidden cafes, scenic hikes, and want to avoid crowds..."
        className="w-full resize-none bg-transparent px-8 pt-8 pr-8 text-xl font-medium leading-relaxed text-wandor-prompt placeholder:text-wandor-prompt/70 focus:outline-none max-md:text-[17px]"
        rows={4}
        maxLength={500}
      />

      <div className="absolute bottom-[22px] left-[22px] flex items-center gap-3">
        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/*,.pdf"
          onChange={handleUpload}
        />

        <button
          type="button"
          aria-label="Upload inspiration"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 backdrop-blur-[14px] transition-transform hover:scale-105"
        >
          <Upload className="h-[18px] w-[18px] text-wandor-text" />
        </button>

        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="flex max-w-[260px] items-center gap-2 rounded-full bg-white/70 px-4 py-2 backdrop-blur-md"
            >
              <span className="truncate text-sm font-medium text-black">
                {file.name}
              </span>

              <button
                type="button"
                onClick={() => {
                  setFile(null);

                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        disabled={loading || !prompt.trim()}
        onClick={handleSubmit}
        className="absolute bottom-[21px] right-[21px] flex h-14 w-[170px] items-center justify-center rounded-full bg-black text-base font-medium uppercase tracking-[0.02em] text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Planning..." : "Plan My Trip"}
      </motion.button>

      <div className="absolute right-8 top-5 text-xs font-medium text-wandor-muted">
        {prompt.length}/500
      </div>
    </motion.div>
  );
}