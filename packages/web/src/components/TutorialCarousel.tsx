"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "./ui/button";
import { X, HelpCircle } from "lucide-react";

export function TutorialCarousel({
  slides: tutorialSlides,
}: {
  slides: { title: string; description: string }[];
}) {
  const t = useTranslations("TutorialCarousel");
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [showTutorial, setShowTutorial] = React.useState(false);

  React.useEffect(() => {
    const key = `hasVisited:${window.location.pathname}`;
    const hasVisited = localStorage.getItem(key);
    if (!hasVisited) {
      setShowTutorial(true);
      localStorage.setItem(key, "true");
    }
  }, []);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  if (!showTutorial) {
    return (
      <Button
        onClick={handleOpenTutorial}
        variant="ghost"
        size="icon"
        className=" text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative bg-gray-800 border border-gray-700 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-lg text-white mx-auto">
        <div className="relative">
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {tutorialSlides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardContent className="flex flex-col items-center justify-center p-6 aspect-[16/10] sm:aspect-video">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                          {slide.title}
                        </h3>
                        <p className="text-center text-gray-300 text-sm sm:text-base md:text-lg">
                          {slide.description}
                        </p>
                        {index === tutorialSlides.length - 1 && (
                          <Button
                            onClick={handleCloseTutorial}
                            className="mt-4 bg-gradient-to-r from-purple-400 to-pink-600 text-white"
                          >
                            {t("closeButton")}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center px-12 space-x-4">
              <CarouselPrevious className="relative translate-y-0 left-0 top-0 bg-gray-700/50 text-white p-2 rounded-full hover:bg-gray-600/75 transition-colors" />
              <div className="flex-grow h-1 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-600 transition-all duration-300"
                  style={{
                    width: count > 0 ? `${(current / count) * 100}%` : "0%",
                  }}
                />
              </div>
              <CarouselNext className="relative translate-y-0 right-0 top-0 bg-gray-700/50 text-white p-2 rounded-full hover:bg-gray-600/75 transition-colors" />
            </div>
          </Carousel>
        </div>
        <Button
          onClick={handleCloseTutorial}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
