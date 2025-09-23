"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TutorialCarousel } from "@/components/TutorialCarousel";

export default function ClientComponent() {
  const t = useTranslations("Index");
  const tc = useTranslations("TutorialCarousel");

  const [username, setUsername] = useState("@DoeJane15619");
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePreviewClick = () => {
    let processedUsername = username;
    // If username doesn't start with @, add it for validation
    if (!processedUsername.startsWith("@")) {
      processedUsername = "@" + processedUsername;
    }

    // Basic validation for Twitter username: allows optional @ and contains alphanumeric characters or underscores
    const twitterUsernameRegex = /^@[a-zA-Z0-9_]{1,15}$/;
    if (twitterUsernameRegex.test(processedUsername)) {
      setError("");
      router.push(`/p/${processedUsername.substring(1)}`); // Remove '@' before navigating
    } else {
      setError(
        "Please enter a valid Twitter username (e.g., elonmusk or @elonmusk)."
      );
    }
  };

  const tutorialSlides = [
    {
      title: tc("slide1Title"),
      description: tc("slide1Description"),
    },
    {
      title: tc("slide2Title"),
      description: tc("slide2Description"),
    },
    {
      title: tc("slide3Title"),
      description: tc("slide3Description"),
    },
    {
      title: tc("slide4Title"),
      description: tc("slide4Description"),
    },
    {
      title: tc("slide5Title"),
      description: tc("slide5Description"),
    },
    {
      title: tc("slide6Title"),
      description: tc("slide6Description"),
    },
  ];

  return (
    <div className="w-full max-w-sm space-y-4 flex flex-col items-center mb-10">
      <Input
        type="text"
        id="username"
        placeholder="@username"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handlePreviewClick();
          }
        }}
        className="h-12 text-lg"
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex items-center justify-center text-2xl font-bold mb-4">
        <Button onClick={handlePreviewClick} className="w-full h-12 text-lg">
          {t("previewProfile")}
        </Button>
        <TutorialCarousel slides={tutorialSlides} />
      </div>
    </div>
  );
}
