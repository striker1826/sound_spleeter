import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";

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

        console.log(`Fetching audio: ${filename}/${track}`);
        const response = await fetch(
          `http://192.168.219.101:5000/audio/${filename}/${track}`
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

        soundRef.current = new Howl({
          src: [url],
          html5: true,
          format: ["wav"],
          preload: true,
          volume: volume,
          onload: () => {
            console.log("Audio loaded successfully");
            setIsLoading(false);
            if (soundRef.current) {
              onDurationChange(soundRef.current.duration());
              soundRef.current.seek(currentTime);
            }
          },
          onloaderror: (id, error) => {
            console.error("Audio load error:", error);
            setError("오디오 로딩 중 오류가 발생했습니다.");
            setIsLoading(false);
          },
          onend: () => {
            onPlayStateChange(false);
            onTimeChange(0);
            isPlayingRef.current = false;
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

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">{track} 트랙</div>
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
          className="w-32"
        />
        <span className="text-sm text-gray-600">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
