"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

const SignInButton = () => {
  return (
    <button
      onClick={() => signIn("kakao")}
      className="w-full relative flex items-center h-[60px] justify-center gap-2 bg-[#FEE500] text-[#000000] py-[12px] px-[16px] rounded-[4px] hover:bg-[#FEE500]/90 transition-colors"
    >
      <Image src="/imgs/kakao.png" alt="Kakao" fill />
    </button>
  );
};

export default SignInButton;
