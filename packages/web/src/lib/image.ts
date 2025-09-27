import piexif from "piexifjs";
import { formatDisplayBalance } from "./utils";

// Helper function to wrap text on canvas
function isCjk(text: string) {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uff00-\uffef]/.test(
    text
  );
}

function getAdjustedFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number
): { fontSize: number; lineCount: number } {
  let fontSize = 100; // Starting font size
  const cjk = isCjk(text);
  const separator = cjk ? "" : " ";
  do {
    context.font = `${fontSize}px sans-serif`;
    const words = text.split(separator);
    let line = "";
    let lineCount = 1;
    for (const word of words) {
      let testLine = line + word + separator;
      let metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        lineCount++;
        line = word + separator;
      } else {
        line = testLine;
      }
    }
    const testY = lineCount * fontSize * 1.2;
    if (testY <= maxHeight) {
      return { fontSize, lineCount };
    }
    fontSize -= 5;
  } while (fontSize > 10);

  context.font = `${fontSize}px sans-serif`;
  const words = text.split(separator);
  let line = "";
  let lineCount = 1;
  for (const word of words) {
    let testLine = line + word + separator;
    let metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      lineCount++;
      line = word + separator;
    } else {
      line = testLine;
    }
  }
  return { fontSize, lineCount };
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number
) {
  context.font = `${fontSize}px sans-serif`;
  const cjk = isCjk(text);
  const separator = cjk ? "" : " ";
  const words = text.split(separator);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const wordWidth = context.measureText(word).width;
    if (wordWidth > maxWidth) {
      if (line.length > 0) {
        context.fillText(line, x, currentY);
        line = "";
        currentY += lineHeight;
      }
      let tempWord = "";
      for (const char of word) {
        const testLine = tempWord + char;
        if (context.measureText(testLine).width > maxWidth) {
          context.fillText(tempWord, x, currentY);
          tempWord = char;
          currentY += lineHeight;
        } else {
          tempWord = testLine;
        }
      }
      line = tempWord + separator;
    } else {
      const testLine = line + word + separator;
      if (context.measureText(testLine).width > maxWidth && line.length > 0) {
        context.fillText(line, x, currentY);
        line = word + separator;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
  }
  context.fillText(line, x, currentY);
  return currentY;
}

export async function createReplyCard(
  message: string,
  username: string,
  contractAddress: string,
  tokenId: string,
  replyTo: string = "0xb5339eaf9b49b8804e540736205f74fe0d24dc88",
  value: bigint = BigInt(0),
  mintedAt: number = Date.now(),
  repliedAt: number = Date.now()
): Promise<string | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Background
    ctx.fillStyle = "#933659";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Icon
    const img = new Image();
    img.src = "/aq-white.svg";
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    ctx.drawImage(img, 30, 30, 60, 60);

    const qrImg = new Image();
    qrImg.src = "/aq-qr.svg";
    await new Promise((resolve) => {
      qrImg.onload = resolve;
    });
    ctx.drawImage(qrImg, 1050, 480, 120, 120);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // To
    ctx.fillStyle = "white";
    ctx.font = "40px sans-serif";
    ctx.fillText(`From: @${username}`, 600, 80);
    ctx.font = "32px sans-serif";
    ctx.fillText(`To: ${replyTo}`, 600, 140);

    // Message
    const maxMessageHeight = 240;
    const { fontSize: adjustedFontSize, lineCount } = getAdjustedFontSize(
      ctx,
      message,
      900,
      maxMessageHeight
    );
    const lineHeight = adjustedFontSize * 1.2;
    const totalTextHeight = (lineCount - 1) * lineHeight;

    wrapText(
      ctx,
      message,
      600,
      320 - totalTextHeight / 2,
      900,
      lineHeight,
      adjustedFontSize
    );

    // Contract and Token ID
    ctx.font = "21px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText(
      `Value: ${formatDisplayBalance(value, "6", 3, "en-US")} USDt`,
      600,
      490
    );
    ctx.fillText(`Contract: ${contractAddress}`, 600, 518);
    ctx.fillText(`Token ID: ${tokenId}`, 600, 546);
    ctx.fillText(
      ` Minted At: ${new Date(mintedAt)
        .toUTCString()
        .replace(/\d+/g, (match) => match.padStart(2, "0"))}`,
      600,
      574
    );
    ctx.fillText(
      `Replied At: ${new Date(repliedAt)
        .toUTCString()
        .replace(/\d+/g, (match) => match.padStart(2, "0"))}`,
      600,
      602
    );

    return canvas.toDataURL("image/jpeg");
  }
  return null;
}

export function embedMessageInJpeg(
  dataUrl: string,
  encodedMessage: string,
  signature: string
): string {
  const exifMessage = JSON.stringify({
    message: encodedMessage,
    signature,
  });
  const exifObj = {
    Exif: {
      [piexif.ExifIFD.UserComment]: exifMessage,
    },
  };
  const exifBytes = piexif.dump(exifObj);
  return piexif.insert(exifBytes, dataUrl);
}
