export default function SettingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-white shadow-md p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
