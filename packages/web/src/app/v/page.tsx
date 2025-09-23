"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import piexif from "piexifjs";
import { verifyMessage } from "ethers";
import { decodeReply } from "@/lib/utils";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  verified: boolean;
  data: any; // To store parsed data from CardDialog
  extractedMessage?: string;
  signerAddress?: string;
  error?: string;
}

import { useTranslations } from "next-intl";

export default function VerifyPage() {
  const t = useTranslations("VerifyPage");
  const [files, setFiles] = useState<FileInfo[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type === "image/jpeg") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          // Placeholder for reading data from CardDialog and verification
          const fileDataUrl = e.target?.result as string;
          let verified = false;
          let extractedMessage = "";
          let signerAddress = "";
          let error = "";

          try {
            const exifObj = piexif.load(fileDataUrl);
            const userComment = exifObj?.Exif?.[piexif.ExifIFD.UserComment];

            if (userComment) {
              const decodedComment = Buffer.from(userComment).toString("utf8");
              const { message: encodedMessage, signature } =
                JSON.parse(decodedComment);

              // Decode the message
              const decoded = decodeReply(encodedMessage);
              extractedMessage = decoded.message; // The actual message
              console.log({ extractedMessage });
              const expectedSignerAddress = decoded.signer; // The signer address

              // Verify the signature
              signerAddress = verifyMessage(
                `data:${encodedMessage}`,
                signature
              );

              console.log({
                expectedSignerAddress,
                signerAddress,
                signature,
                encodedMessage,
              });
              // For now, we consider it verified if we can extract and verify the signature
              verified = signerAddress === expectedSignerAddress;
            } else {
              error = t("noExifComment");
            }
          } catch (err: any) {
            console.error("Error processing file:", err);
            error = t("errorProcessingFile", { message: err.message });
            verified = false;
          }

          setFiles((prevFiles) => [
            ...prevFiles,
            {
              name: file.name,
              size: file.size,
              type: file.type,
              verified: verified,
              data: fileDataUrl,
              extractedMessage: extractedMessage,
              signerAddress: signerAddress,
              error: error,
            },
          ]);
        };
        reader.readAsDataURL(file); // Read as Data URL for piexif
      } else {
        alert(t("onlyJpegAllowed"));
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>

      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 p-8 text-center cursor-pointer rounded-md mb-4"
      >
        <input {...getInputProps()} />
        {isDragActive ? <p>{t("dropFiles")}</p> : <p>{t("dragOrClick")}</p>}
        <p className="text-sm text-gray-500 mt-2">{t("onlyJpegAllowed")}</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="hidden md:grid md:grid-cols-7 md:gap-4 font-bold border-b pb-2">
            <div>{t("fileName")}</div>
            <div>{t("size")}</div>
            <div>{t("type")}</div>
            <div>{t("verified")}</div>
            <div>{t("message")}</div>
            <div>{t("signerAddress")}</div>
            <div>{t("error")}</div>
          </div>
          {files.map((file, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 md:grid md:grid-cols-7 md:gap-4"
            >
              <div className="md:hidden font-bold">{t("fileName")}</div>
              <div className="break-all">{file.name}</div>

              <div className="md:hidden font-bold mt-2">{t("size")}</div>
              <div>{file.size}</div>

              <div className="md:hidden font-bold mt-2">{t("type")}</div>
              <div>{file.type}</div>

              <div className="md:hidden font-bold mt-2">{t("verified")}</div>
              <div>
                {file.verified ? (
                  <span className="text-green-500">{t("yes")}</span>
                ) : (
                  <span className="text-red-500">{t("no")}</span>
                )}
              </div>

              <div className="md:hidden font-bold mt-2">{t("message")}</div>
              <div className="break-all text-sm">
                {file.extractedMessage || t("notAvailable")}
              </div>

              <div className="md:hidden font-bold mt-2">
                {t("signerAddress")}
              </div>
              <div className="break-all text-sm">
                {file.signerAddress || t("notAvailable")}
              </div>

              <div className="md:hidden font-bold mt-2">{t("error")}</div>
              <div className="break-all text-sm text-red-500">
                {file.error || t("notAvailable")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
