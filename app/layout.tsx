import { Geist } from "next/font/google";
import "./globals.css";
import { authOptions } from "./authOptions";
import AuthProvider from "./authProvider";
import { getServerSession } from "next-auth";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata = {
  title: "오디오 트랙 플레이어",
  description: "오디오 트랙을 분리하고 재생하는 웹 애플리케이션",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ko">
      <body className={geist.className}>
        <AuthProvider session={session}>{children} </AuthProvider>
      </body>
    </html>
  );
}
