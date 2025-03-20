"use client";

import { useState, useEffect, useRef } from "react";
import AudioPlayer from "../components/AudioPlayer";
import { Howl } from "howler";

type Track = "vocals" | "drums" | "bass" | "other";

interface ProcessResponse {
  status: "success" | "error";
  message?: string;
  error?: string;
  audio_files?: {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
    name: string;
  };
}

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedFilename, setProcessedFilename] = useState<string | null>(
    "DAY6_HAPPY_Lyric_Video"
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackVolumes, setTrackVolumes] = useState<Record<Track, number>>({
    vocals: 1,
    drums: 1,
    bass: 1,
    other: 1,
  });
  const tracks: Track[] = ["vocals", "drums", "bass", "other"];
  const soundRefs = useRef<Record<string, Howl | null>>({});
  const [progress, setProgress] = useState(0);
  const [progressing, setProgressing] = useState(false);
  const [progressData, setProgressData] = useState<{}>({});

  useEffect(() => {
    if (progressing) {
      setProcessedFilename(null);
    }
  }, [progressing]);

  // 재생 시간 업데이트를 위한 인터벌
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prevTime) => {
          const nextTime = prevTime + 0.1;
          if (nextTime >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return nextTime;
        });
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, duration]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "파일 업로드 중 오류가 발생했습니다."
        );
      }

      const data = await response.json();
      console.log("Upload response:", data);

      if (!data.audio_files?.name) {
        throw new Error("서버에서 파일 이름을 받지 못했습니다.");
      }

      setProcessedFilename(data.audio_files.name);
      setTrackVolumes(data.audio_files.tracks || {});
      setError(null);

      // 파일 업로드 완료 후 1초 후에 SSE 연결 시작
      setTimeout(() => {
        const eventSource = new EventSource(
          `${process.env.NEXT_PUBLIC_API_URL}/process/${encodeURIComponent(
            data.audio_files.name
          )}`,
          { withCredentials: false }
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Progress update:", data);
            setProgress(data.progress || 0);

            if (data.progress === 100) {
              eventSource.close();
              setProgressing(false);
              setIsProcessing(false);
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE error:", error);
          eventSource.close();
          setIsProcessing(false);
          setError("진행 상태를 가져오는 중 오류가 발생했습니다.");
        };
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      setError("파일 업로드 중 오류가 발생했습니다.");
      setIsProcessing(false);
    }
  };

  const handlePlayAll = () => {
    if (!isPlaying) {
      // 재생 시작 시에만 시간을 0으로 초기화
      if (currentTime === 0) {
        setCurrentTime(0);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime);
  };

  const handleTimeChangeEnd = () => {
    // 모든 트랙의 시간을 즉시 업데이트
    if (soundRefs.current) {
      Object.values(soundRefs.current).forEach((sound) => {
        if (sound) {
          sound.seek(currentTime);
        }
      });
    }
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    if (!processedFilename) {
      setError("파일이 선택되지 않았습니다.");
      return;
    }

    try {
      // 먼저 첫 번째 트랙을 로드하여 정확한 길이와 샘플 레이트를 가져옴
      const firstTrackResponse = await fetch(
        `/api/audio/${encodeURIComponent(processedFilename)}/${tracks[0]}`
      );
      const firstTrackBuffer = await firstTrackResponse.arrayBuffer();
      const firstTrackAudio = await new AudioContext().decodeAudioData(
        firstTrackBuffer
      );

      // 정확한 길이와 샘플 레이트로 OfflineAudioContext 생성
      const offlineContext = new OfflineAudioContext(
        firstTrackAudio.numberOfChannels,
        firstTrackAudio.length,
        firstTrackAudio.sampleRate
      );

      // 각 트랙을 오프라인 컨텍스트에 연결
      const loadPromises = tracks.map(async (track) => {
        const response = await fetch(
          `/api/audio/${encodeURIComponent(processedFilename)}/${track}`
        );
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);

        const source = offlineContext.createBufferSource();
        const gainNode = offlineContext.createGain();

        source.buffer = audioBuffer;
        // 각 트랙의 현재 볼륨 값을 가져옴
        const trackElement = document.querySelector(`[data-track="${track}"]`);
        const volumeInput = trackElement?.querySelector(
          'input[type="range"]'
        ) as HTMLInputElement;
        const volume = volumeInput ? parseFloat(volumeInput.value) : 1;
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        source.start(0);
      });

      await Promise.all(loadPromises);

      // 오디오 렌더링
      const renderedBuffer = await offlineContext.startRendering();

      // WAV 파일로 변환
      const wavData = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wavData], { type: "audio/wav" });

      // 다운로드
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${processedFilename}_mixed.wav`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      setError(
        err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다."
      );
    }
  };

  // AudioBuffer를 WAV 형식으로 변환하는 유틸리티 함수
  const audioBufferToWav = (buffer: AudioBuffer): Uint8Array => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const wav = new ArrayBuffer(44 + buffer.length * blockAlign);
    const view = new DataView(wav);

    // WAV 헤더 작성
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + buffer.length * blockAlign, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, buffer.length * blockAlign, true);

    // 오디오 데이터 작성
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, buffer.getChannelData(channel)[i])
        );
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        offset += 2;
      }
    }

    return new Uint8Array(wav);
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">오디오 분리기</h1>

      <div className="mb-4">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="mb-2"
          disabled={isProcessing}
        />
        {isProcessing && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-1">처리 중...</div>
          </div>
        )}
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>

      {processedFilename && (
        <>
          <div className="mb-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handlePlayAll}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                {isPlaying ? "일시정지" : "재생"}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) =>
                      handleTimeChange(parseFloat(e.target.value))
                    }
                    onMouseUp={handleTimeChangeEnd}
                    onTouchEnd={handleTimeChangeEnd}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div key={track} data-track={track}>
                <AudioPlayer
                  filename={processedFilename}
                  track={track}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayStateChange={(playing) => {
                    if (!playing) {
                      setIsPlaying(false);
                    }
                  }}
                  onTimeChange={handleTimeChange}
                  onDurationChange={handleDurationChange}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              현재 믹스 다운로드
            </button>
          </div>
        </>
      )}
    </main>
  );
}
