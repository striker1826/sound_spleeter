import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: {
    filename: string;
  };
};

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const response = await fetch(
      `http://192.168.219.101:5000/process/${params.filename}`,
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
