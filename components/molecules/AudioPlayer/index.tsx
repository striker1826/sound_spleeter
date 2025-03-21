import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import Image from "next/image";

interface AudioPlayerProps {
  filename: string;
  track: "vocals" | "drums" | "bass" | "other";
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayStateChange: (playing: boolean) => void;
  onTimeChange: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  filename,
  track,
  isPlaying,
  currentTime,
  duration,
  onPlayStateChange,
  onTimeChange,
  onDurationChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const soundRef = useRef<Howl | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const loadAudio = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (soundRef.current) {
          soundRef.current.stop();
          soundRef.current.unload();
        }

        const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/audio/${encodeURIComponent(
            filenameWithoutExt
          )}/${track}`,
          {
            headers: {
              Accept: "audio/wav",
            },
          }
        );
        console.log(`Response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "오디오 로딩 중 오류가 발생했습니다."
          );
        }

        const contentType = response.headers.get("content-type");
        console.log(`Content-Type: ${contentType}`);

        if (!contentType || !contentType.includes("audio/")) {
          throw new Error("올바른 오디오 형식이 아닙니다.");
        }

        const blob = await response.blob();
        console.log(`Blob size: ${blob.size} bytes`);
        const url = URL.createObjectURL(blob);
        console.log(`Created URL: ${url}`);

        soundRef.current = new Howl({
          src: [url],
          html5: true,
          format: ["wav"],
          onload: () => {
            console.log("Audio loaded successfully");
            setIsLoading(false);
            if (onDurationChange) {
              onDurationChange(soundRef.current?.duration() || 0);
            }
          },
          onloaderror: (id, error) => {
            console.error("Audio load error:", error);
            setError("오디오 로딩 중 오류가 발생했습니다.");
            setIsLoading(false);
          },
          onplay: () => {
            console.log("Audio started playing");
            isPlayingRef.current = true;
            if (onPlayStateChange) {
              onPlayStateChange(true);
            }
          },
          onpause: () => {
            console.log("Audio paused");
            isPlayingRef.current = false;
            if (onPlayStateChange) {
              onPlayStateChange(false);
            }
          },
          onstop: () => {
            console.log("Audio stopped");
            isPlayingRef.current = false;
            if (onPlayStateChange) {
              onPlayStateChange(false);
            }
          },
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "오디오 로딩 중 오류가 발생했습니다."
        );
        setIsLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
      }
    };
  }, [filename, track]);

  // 재생/일시정지 제어
  useEffect(() => {
    if (!soundRef.current) return;

    if (isPlaying && !isPlayingRef.current) {
      soundRef.current.seek(currentTime);
      soundRef.current.play();
      isPlayingRef.current = true;
    } else if (!isPlaying && isPlayingRef.current) {
      soundRef.current.pause();
      isPlayingRef.current = false;
    }
  }, [isPlaying]);

  // 시간 변경 시 seek 호출
  useEffect(() => {
    if (soundRef.current) {
      const currentSeek = soundRef.current.seek();
      if (Math.abs(currentSeek - currentTime) > 0.1) {
        soundRef.current.seek(currentTime);
      }
    }
  }, [currentTime]);

  // 볼륨 변경
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(volume);
    }
  }, [volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onTimeChange(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
      }
    };
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const matchIcon = (track: string) => {
    switch (track) {
      case "vocals":
        return "/imgs/vocal.png";
      case "drums":
        return "/imgs/drum.png";
      case "bass":
        return "/imgs/bass.png";
      case "other":
        return "/imgs/other.png";
      default:
        return "/imgs/vocal.png";
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#374151] rounded-[8px] px-[16px] pt-[16px] pb-[28px] md:pb-[16px]">
      {isLoading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <>
          <div className="flex gap-4 justify-between items-center">
            <div className="flex gap-[12px] items-center">
              <Image
                src={matchIcon(track)}
                width={14}
                height={16}
                alt="vocal"
              />
              <div className="text-[#fff] text-[16px] font-[500] leading-[24px]">
                {track}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">볼륨:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full"
            />
            <span className="text-sm text-gray-600">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioPlayer;
