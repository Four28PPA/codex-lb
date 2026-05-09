import { create } from "zustand";

export type TimeFormatPreference = "12h";

type TimeFormatState = {
  timeFormat: TimeFormatPreference;
  setTimeFormat: () => void;
};

export function getTimeFormatPreference(): TimeFormatPreference {
  return "12h";
}

export const useTimeFormatStore = create<TimeFormatState>((set) => ({
  timeFormat: "12h",
  setTimeFormat: () => set({ timeFormat: "12h" }),
}));
