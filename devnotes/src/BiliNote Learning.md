
* 使用 FFMpeg 去视频Video 提取为 音频Audio




## Key Module
* BiliNote/backend/app/services/note.py


## Transcriber
* BiliNote/backend/app/transcriber/transcriber_provider.py
```
get_transcriber 根据类型选择对应的transcriber
```



## Speaker Diarization
### Pyannote
注意Hugging Face 的Access Token 要把之前授权的两个Repo
1. Accept [`pyannote/segmentation-3.0`](https://hf.co/pyannote/segmentation-3.0) user conditions
2. Accept [`pyannote/speaker-diarization-3.1`](https://hf.co/pyannote/speaker-diarization-3.1) user conditions
这两个Repo 给予Permissions


## AI 风格
参考： backend/app/gpt/prompt_builder.py