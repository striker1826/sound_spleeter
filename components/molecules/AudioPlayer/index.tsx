import { useState } from "react";
import Image from "next/image";

interface AudioPlayerProps {
  track: "vocals" | "drums" | "bass" | "other";
  gainNode: GainNode;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, gainNode }) => {
  const [volume, setVolume] = useState(1);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    gainNode.gain.value = newVolume;
    setVolume(newVolume);
  };

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
      <div className="flex gap-4 justify-between items-center">
        <div className="flex gap-[12px] items-center">
          <Image src={matchIcon(track)} width={14} height={16} alt="vocal" />
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
        <span className="text-sm text-[#fff]">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
};

export default AudioPlayer;
