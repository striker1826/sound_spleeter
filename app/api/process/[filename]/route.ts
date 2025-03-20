import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}:5000/process/${filename}`,
      {
        headers: {
          Accept: "text/event-stream",
        },
      }
    );

    if (!response.ok) {
      throw new Error("처리 요청 실패");
    }

    // SSE 응답을 스트림으로 변환
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

            // Uint8Array를 문자열로 변환
            const text = new TextDecoder().decode(value);
            controller.enqueue(new TextEncoder().encode(text));
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
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json(
      { status: "error", message: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
