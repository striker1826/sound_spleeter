export default function ProcessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="w-full">{children}</div>
    </div>
  );
}
