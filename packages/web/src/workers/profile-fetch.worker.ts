import { bannerBase, iconBase } from "@/lib/svg";
import * as Comlink from "comlink";

import { Constants } from "@/lib/utils";
import { type Metadata } from "@/types";

const WORKER_SRC = "https://unpkg.com/ffmpeg.js@3.1.9001/ffmpeg-worker-mp4.js";

let ffmpegWorker: Worker | null = null;
let statusCallback: Comlink.Remote<(message: string) => Promise<void>> | null =
  null;
let metadataCallback: Comlink.Remote<(data: string) => void> | null = null;

let metadata: Metadata = {};

const metadataBase = (
  name: string,
  description: string,
  platformAddress: string
) => {
  return {
    name,
    description,
    attributes: [
      {
        trait_type: Constants.LABEL_PLATFORM_ADDRESS,
        value: platformAddress,
      },
      {
        trait_type: Constants.LABEL_OWNER_ADDRESS,
        value: "___HERE___",
      },
      {
        trait_type: Constants.LABEL_SUPPORTED_VALUE,
        value: "___HERE___",
      },
    ],
  };
};

const convertDataURIToBinary = (dataURI: string) =>
  Uint8Array.from(atob(dataURI.replace(/^data[^,]+,/, "")), (v) =>
    v.charCodeAt(0)
  );

async function initFFmpegWorker(
  callback: Comlink.Remote<(message: string) => Promise<void>>,
  callback2: Comlink.Remote<(message: string) => Promise<void>>
) {
  // Changed type
  if (ffmpegWorker) {
    console.log("FFmpeg worker already initialized.");
    callback("FFmpeg Worker already ready.");
    return;
  }

  statusCallback = callback; // Store the callback from the main thread
  metadataCallback = callback2; // Store the metadata callback

  const res = await fetch(WORKER_SRC);
  const code = await res.text();
  const preamble = `var Module = { TOTAL_MEMORY: 268435456, ALLOW_MEMORY_GROWTH: true };`;
  const blob = new Blob([preamble, code], {
    type: "application/javascript",
  });
  ffmpegWorker = new Worker(URL.createObjectURL(blob));

  ffmpegWorker.onmessage = async ({ data: msg }) => {
    // Made async to await callback
    if (msg.type === "ready") {
      await statusCallback?.("FFmpeg Worker ready"); // Await the callback
    }
    // Potentially handle other messages from ffmpegWorker here

    if (msg.type === "done") {
      console.log("FFmpeg processing done:", msg.data);
      const out = msg.data.MEMFS.find(
        (f: any) => f.name === "icon.mp4" || f.name === "banner.mp4"
      );

      if (!out) {
        console.error("No output file found in FFmpeg processing.");
        return;
      }

      console.log("FFmpeg processing done:", out.data);

      const base64String: string = btoa(String.fromCharCode(...out.data));

      if (out.name === "icon.mp4") {
        const iconRaw = iconBase.replace(
          "icon.mp4",
          `data:video/mp4;base64,${base64String}`
        );
        metadata.image = `data:image/svg+xml,${encodeURIComponent(iconRaw)}`;
      } else if (out.name === "banner.mp4") {
        const bannerRaw = bannerBase.replace(
          "banner.mp4",
          `data:video/mp4;base64,${base64String}`
        );
        metadata.banner_image_url = `data:image/svg+xml,${encodeURIComponent(
          bannerRaw
        )}`;
      }

      console.log("Metadata after processing:", metadata);

      if (Object.keys(metadata).length === 5) {
        await metadataCallback?.(JSON.stringify(metadata)); // Await the metadata callback
        await statusCallback?.("Ready to deploy"); // Await the callback
      }

      await statusCallback?.("FFmpeg processing done"); // Await the callback
    }
  };

  console.log("FFmpeg worker initialized.");
}

async function compressImage(
  dataURI: string,
  uniqueId: string,
  currentQuality: number = 30
): Promise<void> {
  try {
    const blobInput = new Blob([convertDataURIToBinary(dataURI)]);
    const img = await createImageBitmap(blobInput);

    const offscreen = new OffscreenCanvas(img.width, img.height);
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      console.error("Could not get 2D context from OffscreenCanvas.");
      return;
    }
    ctx.drawImage(img, 0, 0);

    const blob = await offscreen.convertToBlob({
      type: "image/jpeg",
      quality: currentQuality / 100, // Convert 0-100 to 0-1
    });

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      if (uniqueId === "icon") {
        const iconRaw = iconBase.replace("___IMAGE___", `${base64String}`);
        metadata.image = `data:image/svg+xml,${encodeURIComponent(iconRaw)}`;
      } else if (uniqueId === "banner") {
        const bannerRaw = bannerBase.replace("___IMAGE___", `${base64String}`);
        metadata.banner_image_url = `data:image/svg+xml,${encodeURIComponent(
          bannerRaw
        )}`;
      }
      console.log("Metadata after browser compression:", metadata);
      if (Object.keys(metadata).length === 5) {
        statusCallback?.("Image loaded");
      }
    };
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error("Browser image compression failed:", error);
  }
}

// Simple profile-data fetcher retained from original
async function fetchProfileData(username: string) {
  console.log(`Worker: Fetching profile data for user: ${username}`);
  const res = await fetch(
    `https://profile.linker-plus.workers.dev/${username}`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = (await res.json()) as Metadata;
  console.log("Worker: Fetched user data:", data);

  if (!process.env.NEXT_PUBLIC_PLATFORM_ADDRESS) {
    return data;
  }

  metadata = metadataBase(
    `${username} - ${Date.now()}`, // DEMO
    data?.description!,
    process.env.NEXT_PUBLIC_PLATFORM_ADDRESS!
  );

  return data;
}

function compressProfileImages(metadata: Metadata) {
  compressImage(metadata?.image!, "icon");
  compressImage(metadata?.banner_image_url!, "banner");
}

function updateCreatorAddress(newAddress: string) {
  if (metadata && metadata.attributes && metadata.description) {
    const re = new RegExp(newAddress, "i");
    if (!re.test(metadata?.description!)) {
      console.warn(
        "Warning: The description does not contain the wallet address. Creator address not updated."
      );
      return;
    } else {
      statusCallback?.("Address matched");
    }

    metadata.attributes.unshift({
      trait_type: Constants.LABEL_CREATOR_ADDRESS,
      value: newAddress,
    });

    metadataCallback?.(JSON.stringify(metadata));
  }
}

// Expose both functions via Comlink
Comlink.expose({
  fetchProfileData,
  initFFmpegWorker,
  compressProfileImages,
  updateCreatorAddress,
});
