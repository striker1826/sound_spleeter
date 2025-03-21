import { getServerSession } from "next-auth";
import { authOptions } from "../authOptions";
import { redirect } from "next/navigation";
import Image from "next/image";
import SignInButton from "./SignInButton";

const SignInPage = async () => {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/process");
  }

  return (
    <>
      <div className="w-full bg-[#1F2937] py-[16px] px-[32px] flex items-center">
        <Image src="/imgs/logo.png" alt="logo" width={32} height={32} />
      </div>
      <div className="min-h-[calc(100vh-64px)] flex flex-col justify-center items-center bg-[#111827]">
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-[#1F2937] rounded-[8px] shadow-xl p-8">
            <h2 className="text-[30px] font-bold text-white text-center mb-8">
              음원 분리 도구
            </h2>

            <p className="text-[#9CA3AF] text-center mb-8 text-[16px] leading-[24px]">
              음악 파일을 업로드하여 보컬, 드럼, 베이스, 기타 악기를 분리하세요
            </p>

            <div className="space-y-4">
              <SignInButton />
            </div>

            <div className="mt-8 text-center">
              <p className="text-[#6B7280] text-sm">
                로그인하여 음원 분리 서비스를 이용해보세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignInPage;
