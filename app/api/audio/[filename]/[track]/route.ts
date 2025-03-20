import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string; track: string } }
) {
  try {
    const response = await fetch(
      `http://192.168.219.101:5000/audio/${params.filename}/${params.track}`
    );

    if (!response.ok) {
      throw new Error("오디오 파일 요청 실패");
    }

    // 오디오 파일을 스트림으로 변환
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("Stream reading error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "audio/wav",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Audio fetch error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "오디오 파일을 가져오는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
