import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

async function downloadAudio(videoId: string) {
  try {
    // 영상 정보 가져오기
    const info = await ytdl.getInfo(videoId);
    const title = info.videoDetails.title;

    // 스트림 생성
    const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      quality: "highestaudio",
      filter: "audioonly",
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Origin: "https://www.youtube.com",
          Referer: "https://www.youtube.com/",
        },
      },
    });

    // 스트림을 버퍼로 변환
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return {
      buffer: Buffer.concat(chunks),
      title: title,
    };
  } catch (error) {
    console.error("오디오 다운로드 중 오류:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "유효하지 않은 YouTube URL입니다." },
        { status: 400 }
      );
    }

    // 오디오 다운로드
    const { buffer, title } = await downloadAudio(videoId);

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(title)}.mp3"`
    );

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("YouTube 처리 중 오류 발생:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "영상 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
