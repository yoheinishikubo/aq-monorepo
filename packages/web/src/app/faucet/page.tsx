"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/contexts/WalletProvider";
import { requestFaucet } from "@/app/actions";

export default function FaucetPage() {
  const { connected, signer, connectWallet } = useWallet();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const onGetTokens = async () => {
    if (!connected || !signer?.address || submitting) return;
    setSubmitting(true);
    try {
      await requestFaucet(signer.address);
      toast({
        title: "Success",
        description: "Requested test tokens successfully.",
      });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast({
        title: "Failed",
        description: "Could not request test tokens.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Faucet</h1>
        <p className="text-gray-300 mb-6">Get all tokens for testing.</p>

        {!connected ? (
          <Button variant="outlineDark" onClick={connectWallet}>
            Connect Wallet
          </Button>
        ) : null}

        <div className="mt-4">
          <Button onClick={onGetTokens} disabled={!connected || submitting}>
            {submitting ? "Requesting..." : "Get Tokens"}
          </Button>
        </div>
      </div>
    </div>
  );
}

