"use client";

import { Liff } from "@line/liff";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type LiffContextType = {
  liff: Liff | null;
  liffError: string | null;
  isLoggedIn: boolean;
  profile: any | null;
};

const LiffContext = createContext<LiffContextType>({
  liff: null,
  liffError: null,
  isLoggedIn: false,
  profile: null,
});

export const useLiff = () => useContext(LiffContext);

export const LiffProvider = ({ children }: { children: ReactNode }) => {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error("LIFF ID is not set in environment variables.");
        }

        const liffModule = await import("@line/liff");
        const liffInstance = liffModule.default;

        await liffInstance.init({ liffId });
        console.log("LIFF init succeeded.");
        setLiff(liffInstance);

        if (liffInstance.isLoggedIn()) {
          setIsLoggedIn(true);
          const userProfile = await liffInstance.getProfile();
          setProfile(userProfile);
        }
      } catch (error: any) {
        console.error("LIFF init failed.", error);
        setLiffError(error.toString());
      }
    };

    initializeLiff();
  }, []);

  const value = {
    liff,
    liffError,
    isLoggedIn,
    profile,
  };

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
};
