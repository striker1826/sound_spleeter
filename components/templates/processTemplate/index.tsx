"use client";

import AudioPlayer from "@/components/molecules/AudioPlayer";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CiPause1 } from "react-icons/ci";
import { FaPause } from "react-icons/fa";
type Track = "vocals" | "drums" | "bass" | "other";

const ProcessTemplate = () => {
  const { data: session } = useSession();
  const providerAccountId = session?.providerAccountId;
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedFilename, setProcessedFilename] = useState<string | null>(
    "질풍가도-유영석"
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
  const [progress, setProgress] = useState(0);

  // Web Audio API 관련 refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<{ [key: string]: AudioBuffer }>({});
  const gainNodesRef = useRef<{ [key: string]: GainNode }>({});
  const sourceNodesRef = useRef<{
    [key: string]: AudioBufferSourceNode | null;
  }>({});

  // AudioContext 초기화
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    const tracks = ["vocals", "drums", "bass", "other"];

    tracks.forEach((track) => {
      const gainNode = audioContextRef.current!.createGain();
      gainNode.connect(audioContextRef.current!.destination);
      gainNodesRef.current[track] = gainNode;
    });

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // 오디오 파일 로드
  const loadAudio = async (track: string) => {
    try {
      setIsAudioLoaded(true);
      const filenameWithoutExt = processedFilename!.replace(/\.[^/.]+$/, "");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/audio/${encodeURIComponent(
          filenameWithoutExt
        )}/${track}`
      );
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current!.decodeAudioData(
        arrayBuffer
      );
      audioBuffersRef.current[track] = audioBuffer;
      if (track === "vocals") {
        setDuration(audioBuffer.duration);
      }
    } catch (error) {
      console.error(`Failed to load ${track}:`, error);
    } finally {
      setIsAudioLoaded(false);
    }
  };

  // processedFilename이 변경될 때 모든 트랙 로드
  useEffect(() => {
    if (!processedFilename || !audioContextRef.current) return;

    const loadAllTracks = async () => {
      try {
        await Promise.all(tracks.map((track) => loadAudio(track)));
        console.log("All tracks loaded successfully");
      } catch (error) {
        console.error("Error loading tracks:", error);
        setError("트랙 로딩 중 오류가 발생했습니다.");
      }
    };

    loadAllTracks();
  }, [processedFilename]);

  // 모든 트랙 재생 시작
  const startPlayback = () => {
    tracks.forEach((track) => {
      // 이전 소스 노드 정리
      if (sourceNodesRef.current[track]) {
        sourceNodesRef.current[track]!.stop();
        sourceNodesRef.current[track]!.disconnect();
      }
      // 새로운 소스 노드 생성
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffersRef.current[track];
      source.connect(gainNodesRef.current[track]);
      source.start(0, currentTime);
      sourceNodesRef.current[track] = source;
    });
  };

  // 모든 트랙 정지
  const stopPlayback = () => {
    Object.values(sourceNodesRef.current).forEach((source) => {
      if (source) {
        source.stop();
        source.disconnect();
      }
    });
    sourceNodesRef.current = {};
  };

  // 시간 업데이트
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 0.1;
          if (newTime >= duration) {
            stopPlayback();
            setIsPlaying(false);
            return 0;
          }
          return newTime;
        });
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, duration]);

  const handleFileUpload = async (
    file: File | React.ChangeEvent<HTMLInputElement>
  ) => {
    const uploadFile = file instanceof File ? file : file.target.files?.[0];
    if (!uploadFile) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      const formData = new FormData();
      const userPrefix = `${providerAccountId}_`;
      formData.append("file", uploadFile, userPrefix + uploadFile.name);

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
      const filename = data.filename;
      if (!data.filename) {
        throw new Error("서버에서 파일 이름을 받지 못했습니다.");
      }

      // setProcessedFilename(data.filename);
      // setTrackVolumes(data.audio_files.tracks || {});
      setError(null);

      // 파일 업로드 완료 후 1초 후에 SSE 연결 시작
      setTimeout(() => {
        const eventSource = new EventSource(
          `${process.env.NEXT_PUBLIC_API_URL}/process/${encodeURIComponent(
            data.filename
          )}`,
          { withCredentials: false }
        );

        eventSource.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Progress update:", data);
            setProgress(data.progress || 0);
            setProgress(data.progress);
            if (data.progress === 100) {
              eventSource.close();
              setIsProcessing(false);

              await new Promise((resolve) => setTimeout(resolve, 2000));
              console.log("filename", filename);
              setProcessedFilename(filename);
              router.refresh();
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
      if (currentTime === 0) {
        setCurrentTime(0);
      }
      startPlayback();
    } else {
      stopPlayback();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime);
  };

  const handleTimeChangeEnd = () => {
    // 모든 트랙의 시간을 즉시 업데이트
    if (sourceNodesRef.current) {
      if (isPlaying) {
        startPlayback();
      } else {
        stopPlayback();
      }
    }
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
      // AudioContext를 재사용하기 위해 상수로 선언
      const audioContext = new AudioContext();

      // 각 트랙을 순차적으로 로드하고 디코딩
      const trackBuffers = await Promise.all(
        tracks.map(async (track) => {
          try {
            const filenameWithoutExt = processedFilename.replace(
              /\.[^/.]+$/,
              ""
            );
            const response = await fetch(
              `${
                process.env.NEXT_PUBLIC_API_URL
              }/audio/${providerAccountId}_${encodeURIComponent(
                filenameWithoutExt
              )}/${track}`
            );
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.error(`트랙 ${track} 로딩 중 오류:`, error);
            throw new Error(`트랙 ${track}을 디코딩할 수 없습니다.`);
          }
        })
      );

      // 가장 긴 트랙의 길이를 기준으로 OfflineAudioContext 생성
      const maxLength = Math.max(
        ...trackBuffers.map((buffer) => buffer.length)
      );
      const offlineContext = new OfflineAudioContext(
        2, // 스테레오 출력
        maxLength,
        trackBuffers[0].sampleRate
      );

      // 각 트랙을 오프라인 컨텍스트에 연결
      tracks.forEach((track, index) => {
        const source = offlineContext.createBufferSource();
        const gainNode = offlineContext.createGain();

        source.buffer = trackBuffers[index];
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

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // 파일 타입 체크
    if (!file.type.startsWith("audio/")) {
      setError("오디오 파일만 업로드 가능합니다.");
      return;
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB를 초과할 수 없습니다.");
      return;
    }

    // 파일 업로드 처리
    await handleFileUpload(file);
  };

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-[8px] p-[32px] w-[400px]">
            <h3 className="text-[#fff] text-[20px] font-bold mb-[16px] text-center">
              파일 처리 중
            </h3>
            <div className="w-full bg-[#374151] rounded-full h-2">
              <div
                className="bg-[#000] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#9CA3AF] text-[14px] mt-[8px] text-center">
              {progress}% 완료
            </p>
          </div>
        </div>
      )}

      {isAudioLoaded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-[8px] p-[32px] w-[400px]">
            <h3 className="text-[#fff] text-[20px] font-bold text-center">
              오디오 정보를 가져오는 중입니다!
            </h3>
          </div>
        </div>
      )}

      <div className="w-full bg-[#1F2937] py-[16px] px-[32px] flex justify-between items-center">
        <Image src={"/imgs/logo.png"} alt="logo" width={32} height={32} />
        {session?.accessToken ? (
          <button
            className="bg-[#000] px-[16px] py-[12px] rounded-[4px] text-[#fff] text-[16px] leading-[24px]"
            onClick={() => signOut()}
          >
            로그아웃
          </button>
        ) : (
          <button
            className="bg-[#000] px-[16px] py-[12px] rounded-[4px] text-[#fff] text-[16px] leading-[24px]"
            onClick={() => signIn("kakao")}
          >
            로그인
          </button>
        )}
      </div>
      <div className="flex flex-col justify-center items-center bg-[#111827] w-full pt-[32px] px-[32px] pb-[64px]">
        <div className="w-full rounded-[8px] px-[24px] bg-[#1F2937]">
          <h2 className="mt-[24px] text-[#fff] text-[30px] font-bold leading-[36px] text-center">
            움원 분리 도구
          </h2>
          <p className="mt-[16px] text-[#9CA3AF] text-[16px] leading-[24px] text-center">
            음악 파일을 업로드하여 보컬, 드럼, 베이스, 기타 악기를 분리하세요
          </p>

          <div
            className={`mt-[32px] flex flex-col justify-center items-center rounded-[8px] border-dashed border-[#4B5563] border-[2px] transition-colors duration-200 ${
              isDragging ? "bg-[#374151] border-[#6B7280]" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Image
              className="mt-[56px]"
              src={"/imgs/cloud.png"}
              alt="upload"
              width={45}
              height={31.5}
            />
            <p className="mt-[16px] text-[#9CA3AF] text-[16px] leading-[28px]">
              파일을 여기에 드래그하거나
            </p>
            <label className="mt-[8px] bg-[#000] text-[#fff] py-[8px] px-[16px] rounded-[4px] text-[16px] leading-[24px] cursor-pointer">
              파일 선택하기
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </label>
            <p className="mt-[40px] mb-[56px] text-[#6B7280] text-[14px] leading-[20px]">
              지원 형식: MP3, WAV (최대 10MB)
            </p>
          </div>

          <div className="mt-[32px] rounded-[8px] w-full bg-[#374151] py-[16px] px-[16px]">
            <h3 className="text-[#fff] truncate">
              {processedFilename?.split("_").slice(1).join("_")}
            </h3>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
              onMouseUp={handleTimeChangeEnd}
              onTouchEnd={handleTimeChangeEnd}
              className="flex-1 cursor-pointer w-full mt-[16px]"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-200">
                {formatTime(currentTime)}
              </span>
              <span className="text-sm text-gray-200">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {!isAudioLoaded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] mt-[32px]">
              {processedFilename &&
                tracks.map((track) => (
                  <div key={track} data-track={track}>
                    <AudioPlayer
                      track={track}
                      gainNode={gainNodesRef.current[track]}
                    />
                  </div>
                ))}
            </div>
          )}

          <div className="w-full flex justify-center items-center gap-[24px] mt-[32px] mb-[24px]">
            <button
              className=" bg-[#000] px-[16px] py-[12px] rounded-[4px]"
              onClick={handlePlayAll}
            >
              {isPlaying ? (
                <FaPause color="#fff" />
              ) : (
                <Image
                  src={"/imgs/play.png"}
                  alt="play"
                  width={12}
                  height={12}
                />
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-[8px] rounded-[4px] px-[24px] py-[8px] bg-[#000] text-[#fff] text-[16px] leading-[24px]"
            >
              <Image
                src={"/imgs/download.png"}
                alt="download"
                width={16}
                height={16}
              />
              다운로드
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProcessTemplate;
