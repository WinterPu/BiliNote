"""
说话人分离（Speaker diarization）服务
支持多种说话人分离方法
"""

import os
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# 新的 WhisperDiarizationService 暂时不可用
NEW_WHISPER_AVAILABLE = False

class SpeakerDiarizationResult:
    """说话人分离结果"""
    def __init__(self):
        self.segments: List[Dict[str, Any]] = []  # [{'start': float, 'end': float, 'speaker': str}]
        
    def add_segment(self, start: float, end: float, speaker: str):
        """添加说话人片段"""
        self.segments.append({
            'start': start,
            'end': end,
            'speaker': speaker
        })
    
    def get_speaker_at_time(self, timestamp: float) -> Optional[str]:
        """获取指定时间点的说话人"""
        for segment in self.segments:
            if segment['start'] <= timestamp <= segment['end']:
                return segment['speaker']
        return None

class BaseSpeakerDiarization(ABC):
    """说话人分离基类"""
    
    @abstractmethod
    def diarize(self, audio_file: str) -> SpeakerDiarizationResult:
        """执行说话人分离
        
        Args:
            audio_file: 音频文件路径
            
        Returns:
            SpeakerDiarizationResult: 说话人分离结果
        """
        pass

class WhisperDiarizationService(BaseSpeakerDiarization):
    """使用 whisper-diarization 的说话人分离（临时模拟实现）"""
    
    def __init__(self):
        self.available = True  # 暂时设为总是可用，用于测试
        logger.info("Whisper diarization 模拟实现已启用")
    
    def diarize(self, audio_file: str) -> SpeakerDiarizationResult:
        """使用 whisper-diarization 执行说话人分离（模拟实现）"""
        logger.info(f"🎯 执行说话人分离模拟处理: {audio_file}")
        
        result = SpeakerDiarizationResult()
        
        try:
            # 模拟说话人分离结果
            # 假设音频有两个说话人，在不同时间段说话
            result.add_segment(0.0, 30.0, "SPEAKER_00")
            result.add_segment(30.0, 60.0, "SPEAKER_01") 
            result.add_segment(60.0, 90.0, "SPEAKER_00")
            
            logger.info(f"模拟说话人分离完成，生成了 {len(result.segments)} 个片段")
            return result
            
        except Exception as e:
            logger.error(f"Whisper diarization 模拟处理失败: {e}")
            raise

class PyAnnoteSpeakerDiarization(BaseSpeakerDiarization):
    """使用 pyannote.audio 的说话人分离"""
    
    def __init__(self):
        self.available = False
        self.pipeline = None
        try:
            from pyannote.audio import Pipeline
            # 需要 Hugging Face token
            hf_token = os.getenv("HUGGINGFACE_ACCESS_TOKEN")
            if hf_token:
                self.pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=hf_token
                )
                self.available = True
                logger.info("PyAnnote speaker diarization 可用")
            else:
                logger.warning("缺少 HUGGINGFACE_ACCESS_TOKEN，PyAnnote 不可用")
        except ImportError as e:
            logger.warning(f"PyAnnote speaker diarization 不可用: {e}")
        except Exception as e:
            logger.warning(f"PyAnnote 初始化失败: {e}")
    
    def diarize(self, audio_file: str) -> SpeakerDiarizationResult:
        """使用 PyAnnote 执行说话人分离"""
        if not self.available:
            raise RuntimeError("PyAnnote speaker diarization 不可用")
            
        result = SpeakerDiarizationResult()
        
        try:
            # 执行说话人分离
            diarization = self.pipeline(audio_file)
            
            # 转换结果格式
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                result.add_segment(turn.start, turn.end, f"speaker{speaker}")
                
            logger.info(f"PyAnnote 说话人分离完成，找到 {len(result.segments)} 个片段")
            return result
            
        except Exception as e:
            logger.error(f"PyAnnote 说话人分离失败: {e}")
            raise

class MockSpeakerDiarization(BaseSpeakerDiarization):
    """模拟说话人分离（用于测试）"""
    
    def diarize(self, audio_file: str) -> SpeakerDiarizationResult:
        """模拟说话人分离结果"""
        result = SpeakerDiarizationResult()
        
        # 简单模拟：假设每30秒切换一次说话人
        import librosa
        try:
            duration = librosa.get_duration(filename=audio_file)
        except:
            duration = 300.0  # 默认5分钟
            
        current_speaker = "speaker0"
        for i in range(0, int(duration), 30):
            end_time = min(i + 30, duration)
            result.add_segment(i, end_time, current_speaker)
            # 切换说话人
            current_speaker = "speaker1" if current_speaker == "speaker0" else "speaker0"
            
        logger.info(f"模拟说话人分离完成，生成 {len(result.segments)} 个片段")
        return result

def get_speaker_diarization_service(method: str = None) -> Optional[BaseSpeakerDiarization]:
    """获取说话人分离服务
    
    Args:
        method: 方法名称 ('whisper', 'pyannote', 'mock', None)
                如果为 None 且环境变量未设置，默认使用 'whisper'
        
    Returns:
        说话人分离服务实例，如果不可用则返回 None
    """
    logger.info(f"🔍 get_speaker_diarization_service 被调用，method: {method}")
    
    if method is None:
        method = os.getenv("SPEAKER_DIARIZATION_METHOD", "whisper")  # 默认使用 whisper
    
    logger.info(f"🔍 使用说话人分离方法: {method}")
    method = method.lower()
    
    if method == "whisper":
        # 使用现有的 WhisperDiarizationService 实现
        logger.info("使用现有的 WhisperDiarizationService")
        service = WhisperDiarizationService()
        logger.info(f"服务可用性: {service.available}")
        return service if service.available else None
    elif method == "pyannote":
        service = PyAnnoteSpeakerDiarization()
        return service if service.available else None
    elif method == "mock":
        return MockSpeakerDiarization()
    else:
        logger.info(f"未知的说话人分离方法: {method}，禁用说话人分离功能")
        return None

def merge_transcription_with_diarization(
    segments: List[Dict[str, Any]], 
    diarization_result: SpeakerDiarizationResult
) -> List[Dict[str, Any]]:
    """将转录结果与说话人分离结果合并
    
    Args:
        segments: 转录片段列表 [{'start': float, 'end': float, 'text': str}]
        diarization_result: 说话人分离结果
        
    Returns:
        合并后的片段列表 [{'start': float, 'end': float, 'text': str, 'speaker': str}]
    """
    merged_segments = []
    
    for segment in segments:
        start_time = segment.get('start', 0)
        end_time = segment.get('end', 0)
        text = segment.get('text', '')
        
        # 获取该片段的主要说话人（使用中点时间）
        mid_time = (start_time + end_time) / 2
        speaker = diarization_result.get_speaker_at_time(mid_time)
        
        merged_segment = {
            'start': start_time,
            'end': end_time,
            'text': text
        }
        
        if speaker:
            merged_segment['speaker'] = speaker
            
        merged_segments.append(merged_segment)
    
    return merged_segments
