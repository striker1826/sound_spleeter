import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface YouTubeInputProps {
  onFileUpload: (file: File) => void;
}

export default function YouTubeInput({ onFileUpload }: YouTubeInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingDots = useLoadingDots([loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/youtube`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "변환 중 오류가 발생했습니다.");
      }

      // 오디오 데이터를 Blob으로 변환
      const audioBlob = await response.blob();

      // JSON 응답에서 파일 이름 가져오기
      const responseData = JSON.parse(
        response.headers.get("X-Response-Data") || '{"filename": "audio.mp3"}'
      );
      console.log(
        "All headers:",
        Object.fromEntries(response.headers.entries())
      );

      const fileName = responseData.filename;

      // Blob을 File 객체로 변환
      const audioFile = new File([audioBlob], fileName, {
        type: "audio/mpeg",
      });

      // 파일 업로드 처리
      onFileUpload(audioFile);
      toast.success("오디오 파일 변환 완료!");
    } catch (error) {
      console.error("YouTube 변환 중 오류:", error);
      setError(
        error instanceof Error ? error.message : "변환 중 오류가 발생했습니다."
      );
      toast.error(
        error instanceof Error ? error.message : "변환 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-[8px] p-[32px] w-[400px]">
            <p className="text-[#fff] text-[20px] text-center whitespace-pre-line">
              오디오를 추출하는 중입니다{loadingDots}
            </p>
            <p className="mt-[16px] text-[#9CA3AF] text-[14px] mt-[8px] text-center">
              약 10초 정도 소요됩니다.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube URL을 입력하세요"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "처리 중..." : "변환하기"}
          </button>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>
      </form>
    </>
  );
}
