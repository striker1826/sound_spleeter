import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge Runtime 사용
export const maxDuration = 60; // 최대 실행 시간을 60초로 설정

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string; track: string }> }
) {
  const { filename, track } = await params;

  try {
    const response = await fetch(
      `http://192.168.219.101:5000/audio/${filename}/${track}`,
      {
        headers: {
          Accept: "audio/wav",
        },
        // 타임아웃 설정
        signal: AbortSignal.timeout(30000), // 30초 타임아웃
      }
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      },
    });
  } catch (error) {
    console.error("Audio fetch error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "오디오 파일을 가져오는 중 오류가 발생했습니다.",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
        },
      }
    );
  }
}
