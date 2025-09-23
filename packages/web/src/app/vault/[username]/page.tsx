"use server";

import VaultContent from "./ClientDynamicImport";

export default async function VaultPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await Promise.resolve(params);

  return <VaultContent username={username} />;
}
