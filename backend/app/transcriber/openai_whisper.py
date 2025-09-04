import whisper
## python -c "import whisper; print(whisper.available_models())"
# 可用的 Whisper 模型选项如下：
# ['tiny.en', 'tiny', 'base.en', 'base', 'small.en', 'small', 'medium.en', 'medium', 'large-v1', 'large-v2', 'large-v3', 'large', 'large-v3-turbo', 'turbo']
from app.transcriber.base import Transcriber
from app.models.transcriber_model import TranscriptSegment, TranscriptResult
from app.utils.logger import get_logger
from events import transcription_finished

logger = get_logger(__name__)

class OpenAIWhisperTranscriber(Transcriber):
    """
    OpenAI 官方 Whisper 模型的转录器封装
    """
    def __init__(self, model_size="base", device="cuda"):
        self.model_size = model_size
        # 自动判断 device，兼容 Mac MPS、CUDA、CPU
        import torch
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA 不可用，自动切换为 CPU")
            device = "cpu"
        elif device == "mps":
            # Mac MPS 兼容性处理
            if not hasattr(torch, "has_mps") or not torch.has_mps:
                logger.warning("MPS 不可用，自动切换为 CPU")
                device = "cpu"
            else:
                try:
                    # 部分 torch 版本 mps 设备不支持 current_device
                    _ = torch.device("mps")
                except Exception as e:
                    logger.warning(f"MPS 初始化失败: {e}，自动切换为 CPU")
                    device = "cpu"
        self.device = device
        self.model = whisper.load_model(model_size, device=device)

    def transcript(self, file_path: str) -> TranscriptResult:
        """
        对指定音频文件进行转录，返回 TranscriptResult
        :param file_path: 音频文件路径
        :return: TranscriptResult
        """
        logger.info(f"OpenAI Whisper 开始处理文件: {file_path}")
        try:
            result = self.model.transcribe(file_path)
            logger.info("OpenAI Whisper 识别完成，处理结果...")
            segments = []
            full_text = result.get('text', '').strip()
            for seg in result.get('segments', []):
                segments.append(TranscriptSegment(
                    start=seg.get('start', 0),
                    end=seg.get('end', 0),
                    text=seg.get('text', '').strip()
                ))
            transcript_result = TranscriptResult(
                language=result.get('language', 'unknown'),
                full_text=full_text,
                segments=segments,
                raw=result
            )
            # 可选：触发完成事件
            # self.on_finish(file_path, transcript_result)
            return transcript_result
        except Exception as e:
            logger.error(f"OpenAI Whisper 处理失败: {str(e)}")
            raise

    def on_finish(self, video_path: str, result: TranscriptResult) -> None:
        """
        转录完成的回调
        """
        logger.info(f"OpenAI Whisper 转写完成: {video_path}")
        transcription_finished.send({
            "file_path": video_path,
        })
