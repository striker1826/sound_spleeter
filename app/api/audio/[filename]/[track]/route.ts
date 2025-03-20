import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { filename: string; track: string } }
) {
  try {
    const { filename, track } = params;
    const response = await fetch(
      `http://192.168.219.101:5000/audio/${filename}/${track}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "오디오 로딩 중 오류가 발생했습니다." },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "오디오 로딩 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
