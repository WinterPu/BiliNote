from app.gpt.base import GPT
from app.gpt.prompt_builder import generate_base_prompt
from app.models.gpt_model import GPTSource
from app.gpt.prompt import BASE_PROMPT, AI_SUM, SCREENSHOT, LINK
from app.gpt.utils import fix_markdown
from app.models.transcriber_model import TranscriptSegment
from datetime import timedelta
from typing import List


class UniversalGPT(GPT):
    def __init__(self, client, model: str, temperature: float = 0.7):
        self.client = client
        self.model = model
        self.temperature = temperature
        self.screenshot = False
        self.link = False

    def _format_time(self, seconds: float) -> str:
        return str(timedelta(seconds=int(seconds)))[2:]

    def _build_segment_text(self, segments: List[TranscriptSegment]) -> str:
        return "\n".join(
            f"{self._format_time(seg.start)} - {seg.text.strip()}"
            for seg in segments
        )

    def ensure_segments_type(self, segments) -> List[TranscriptSegment]:
        return [TranscriptSegment(**seg) if isinstance(seg, dict) else seg for seg in segments]

    def create_messages(self, segments: List[TranscriptSegment], **kwargs):

        content_text = generate_base_prompt(
            title=kwargs.get('title'),
            segment_text=self._build_segment_text(segments),
            tags=kwargs.get('tags'),
            _format=kwargs.get('_format'),
            style=kwargs.get('style'),
            extras=kwargs.get('extras'),
        )

        # ⛳ 检查模型是否支持视觉功能
        video_img_urls = kwargs.get('video_img_urls', [])
        supports_vision = self._model_supports_vision()
        
        # 如果模型不支持视觉但有图片URL，则记录警告并跳过图片
        if video_img_urls and not supports_vision:
            from app.utils.logger import get_logger
            logger = get_logger(__name__)
            logger.warning(f"模型 {self.model} 不支持视觉功能，跳过 {len(video_img_urls)} 张图片")
            video_img_urls = []  # 清空图片URL列表

        # ⛳ 组装 content 数组，支持 text + image_url 混合
        content = [{"type": "text", "text": content_text}]

        # 只有在模型支持视觉且有图片时才添加图片
        for url in video_img_urls:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": url,
                    "detail": "auto"
                }
            })

        #  正确格式：整体包在一个 message 里，role + content array
        messages = [{
            "role": "user",
            "content": content
        }]

        return messages
    
    def _model_supports_vision(self) -> bool:
        """检查模型是否支持视觉功能"""
        if not self.model:
            return False
        
        model_name_lower = self.model.lower()
        
        # 支持视觉的模型模式列表
        vision_patterns = [
            'gpt-4o',           # GPT-4O 系列
            'gpt-4-vision',     # GPT-4 Vision
            'gpt-4-turbo',      # GPT-4 Turbo (通常支持视觉)
            'claude-3',         # Claude 3 系列
            'gemini',           # Gemini 系列通常支持视觉
            'qwen-vl',          # Qwen Vision Language
            'llava',            # LLaVA 系列
            'vision',           # 包含vision关键词的模型
            'multimodal',       # 多模态模型
            'vlm',              # Vision Language Model
            'qwen2-vl',         # Qwen2 VL系列
            'glm-4v',           # GLM-4V 视觉模型
        ]
        
        # 检查模型名是否包含视觉相关关键词
        for pattern in vision_patterns:
            if pattern in model_name_lower:
                return True
                
        return False

    def list_models(self):
        return self.client.models.list()

    def summarize(self, source: GPTSource) -> str:
        self.screenshot = source.screenshot
        self.link = source.link
        source.segment = self.ensure_segments_type(source.segment)

        messages = self.create_messages(
            source.segment,
            title=source.title,
            tags=source.tags,
            video_img_urls=source.video_img_urls,
            _format=source._format,
            style=source.style,
            extras=source.extras
        )
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
