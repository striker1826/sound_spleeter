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
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

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
          preload: true,
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
          onend: () => {
            if (onPlayStateChange) {
              onPlayStateChange(false);
            }
            if (onTimeChange) {
              onTimeChange(0);
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
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [filename, track]);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      if (soundRef.current?.playing()) {
        if (onTimeChange) {
          onTimeChange(soundRef.current.seek() as number);
        }
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (soundRef.current) {
      soundRef.current.seek(time);
      if (onTimeChange) {
        onTimeChange(time);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (soundRef.current) {
      soundRef.current.volume(newVolume);
      setVolume(newVolume);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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
        <div className="text-gray-600">{track} Loading...</div>
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
            <span className="text-sm text-[#fff]">볼륨:</span>
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
