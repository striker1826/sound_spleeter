import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

interface AudioOptions {
  title: string;
  mimeType: string;
}

export async function processAudio(audioUrl: string, options: AudioOptions) {
  try {
    // 임시 파일 경로 생성
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input-${Date.now()}.webm`);

    // YouTube 스트림 다운로드
    const response = await fetch(audioUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
        "Sec-Fetch-Dest": "audio",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Range: "bytes=0-",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube 다운로드 응답:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText,
      });
      throw new Error(
        `오디오 다운로드 실패: ${response.status} - ${response.statusText}`
      );
    }

    const buffer = await response.arrayBuffer();
    await writeFile(inputPath, Buffer.from(buffer));

    // 기존 음원 분리 API로 파일 전송
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([buffer], { type: options.mimeType }),
      options.title
    );

    const processResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!processResponse.ok) {
      throw new Error(`음원 분리 요청 실패: ${processResponse.status}`);
    }

    const result = await processResponse.json();
    return result;
  } catch (error) {
    console.error("음원 처리 중 오류:", error);
    throw error;
  }
}
