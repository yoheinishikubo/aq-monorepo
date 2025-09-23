import ClientDynamicImport from "./ClientDynamicImport";
export default async function AccountPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <div className="flex flex-col items-center bg-gray-900">
      <ClientDynamicImport username={username} />
    </div>
  );
}
