"""
Windows PC 后端服务 - 调用智能台灯API并返回结果给Mac
"""

import base64
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

LAMP_BASE = "http://192.168.199.10:60010"


@app.route("/photo")
def get_photo():
    """获取台灯拍摄的照片并返回base64给客户端"""
    try:
        response = requests.get(f"{LAMP_BASE}/skill-take-photo", timeout=30)
        response.raise_for_status()

        img_base64 = base64.b64encode(response.content).decode("utf-8")
        return jsonify({"image": img_base64})

    except requests.exceptions.Timeout:
        return jsonify({"error": "连接台灯超时"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"调用台灯API失败: {str(e)}"}), 502


@app.route("/tts")
def tts():
    """语音播报，参数: ?content=你好中国"""
    content = request.args.get("content", "")
    if not content:
        return jsonify({"error": "缺少 content 参数"}), 400
    try:
        response = requests.get(
            f"{LAMP_BASE}/skill-tts-chinese",
            params={"content": content},
            timeout=30,
        )
        response.raise_for_status()
        return jsonify({"status": "ok"})
    except requests.exceptions.Timeout:
        return jsonify({"error": "连接台灯超时"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"调用台灯TTS失败: {str(e)}"}), 502


@app.route("/play-audio", methods=["POST"])
def play_audio():
    """播放音频，上传MP3文件: multipart/form-data, 字段名 file"""
    if "file" not in request.files:
        return jsonify({"error": "缺少 file 字段"}), 400
    f = request.files["file"]
    try:
        response = requests.post(
            f"{LAMP_BASE}/skill-play-audio",
            files={"file": (f.filename, f.stream, f.content_type or "audio/mpeg")},
            timeout=60,
        )
        response.raise_for_status()
        return jsonify({"status": "ok"})
    except requests.exceptions.Timeout:
        return jsonify({"error": "连接台灯超时"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"调用台灯播放音频失败: {str(e)}"}), 502


@app.route("/health")
def health():
    """健康检查"""
    return {"status": "ok"}


if __name__ == "__main__":
    # 监听所有网络接口，端口 5000
    # Windows防火墙可能会弹出提示，允许即可
    app.run(host="0.0.0.0", port=5000, debug=False)
