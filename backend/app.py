from flask import Flask, request, send_file
from flask_cors import CORS
import os
import subprocess
import tempfile
import uuid

app = Flask(__name__)
CORS(app)

@app.route("/youtube", methods=["POST"])
def download_youtube():
    try:
        data = request.get_json()
        video_id = data.get("videoId")
        
        if not video_id:
            return {"error": "비디오 ID가 필요합니다."}, 400

        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = os.path.join(temp_dir, f"{video_id}.mp3")
            
            # yt-dlp 명령어 실행
            command = [
                "yt-dlp",
                "-f", "bestaudio[ext=m4a]",
                "--extract-audio",
                "--audio-format", "mp3",
                "--audio-quality", "0",
                "-o", output_path,
                f"https://www.youtube.com/watch?v={video_id}"
            ]
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            if result.returncode != 0:
                print("yt-dlp 오류:", result.stderr)
                return {"error": "오디오 다운로드 실패"}, 500
            
            # 파일이 생성되었는지 확인
            if not os.path.exists(output_path):
                return {"error": "오디오 파일 생성 실패"}, 500
            
            # 파일 전송
            return send_file(
                output_path,
                mimetype="audio/mpeg",
                as_attachment=True,
                download_name=f"{video_id}.mp3"
            )
            
    except Exception as e:
        print("YouTube 다운로드 중 오류:", str(e))
        return {"error": str(e)}, 500 