import os
import whisper
## python -c "import whisper; print(whisper.available_models())"
# 可用的 Whisper 模型选项如下：
# ['tiny.en', 'tiny', 'base.en', 'base', 'small.en', 'small', 'medium.en', 'medium', 'large-v1', 'large-v2', 'large-v3', 'large', 'large-v3-turbo', 'turbo']
from app.transcriber.base import Transcriber
from app.models.transcriber_model import TranscriptSegment, TranscriptResult
from app.utils.logger import get_logger
from app.services.speaker_diarization import get_speaker_diarization_service, merge_transcription_with_diarization
from events import transcription_finished

logger = get_logger(__name__)

class OpenAIWhisperTranscriber(Transcriber):
    """
    OpenAI 官方 Whisper 模型的转录器封装
    """
    def __init__(self, model_size="base", device="cuda", enable_speaker_diarization=False):
        self.model_size = model_size
        self.enable_speaker_diarization = enable_speaker_diarization
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
        
        # 验证文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"音频文件不存在: {file_path}")
        
        # 验证文件大小
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            logger.warning(f"音频文件为空: {file_path}")
            # 返回空的转录结果
            return TranscriptResult(
                language="unknown",
                full_text="",
                segments=[]
            )
        
        # 验证文件大小是否过小（小于1KB可能是无效音频）
        if file_size < 1024:
            logger.warning(f"音频文件过小可能无效 ({file_size} bytes): {file_path}")
        
        try:
            result = self.model.transcribe(file_path)
            logger.info("OpenAI Whisper 识别完成，处理结果...")
            segments = []
            full_text = result.get('text', '').strip()
            
            # 收集转录片段
            transcription_segments = []
            for seg in result.get('segments', []):
                segment_data = {
                    'start': seg.get('start', 0),
                    'end': seg.get('end', 0),
                    'text': seg.get('text', '').strip()
                }
                transcription_segments.append(segment_data)
            
            # 如果启用了说话人分离，则进行处理
            if self.enable_speaker_diarization:
                logger.info("开始说话人分离...")
                logger.info(f"说话人分离设置: {self.enable_speaker_diarization}")
                try:
                    diarization_service = get_speaker_diarization_service()
                    logger.info(f"获取到的说话人分离服务: {diarization_service}")
                    if diarization_service:
                        logger.info(f"服务可用性: {diarization_service.available}")
                        diarization_result = diarization_service.diarize(file_path)
                        transcription_segments = merge_transcription_with_diarization(
                            transcription_segments, diarization_result
                        )
                        logger.info("说话人分离完成")
                    else:
                        logger.warning("说话人分离服务不可用")
                except Exception as e:
                    logger.error(f"说话人分离失败: {e}")
                    # 继续使用原始转录结果
            
            # 转换为 TranscriptSegment 对象
            for seg_data in transcription_segments:
                segments.append(TranscriptSegment(
                    start=seg_data.get('start', 0),
                    end=seg_data.get('end', 0),
                    text=seg_data.get('text', '').strip(),
                    speaker=seg_data.get('speaker')
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
