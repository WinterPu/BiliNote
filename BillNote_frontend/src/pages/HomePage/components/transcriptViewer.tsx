"use client"

import { useTaskStore } from "@/store/taskStore"
import { useEffect, useState, useRef } from "react"
import { Play, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import {ScrollArea} from "@/components/ui/scroll-area.tsx"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { convertToAbsoluteScreenshotPath } from "@/utils/screenshotUtils"

interface Segment {
  start: number
  end: number
  text: string
  speaker?: string
}

interface Task {
  transcript?: {
    segments?: Segment[]
  }
  markdown?: string | any[]
  audioMeta?: {
    title?: string
  }
}

type DisplayFormat = 'timestamp' | 'text' | 'markdown'

const TranscriptViewer = () => {
  const getCurrentTask = useTaskStore((state) => state.getCurrentTask)
  const currentTaskId = useTaskStore((state) => state.currentTaskId)
  const [task, setTask] = useState<Task | null>(null)
  const [activeSegment, setActiveSegment] = useState<number | null>(null)
  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>('timestamp')
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setTask(getCurrentTask())
  }, [currentTaskId, getCurrentTask])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // 从任务的 markdown 内容中提取截图信息和对应的时间戳
  const extractScreenshotTimestamps = () => {
    if (!task?.markdown) {
      console.log('没有找到 markdown 内容')
      return new Map()
    }
    
    let markdownContent = ''
    if (typeof task.markdown === 'string') {
      markdownContent = task.markdown
    } else if (Array.isArray(task.markdown) && task.markdown.length > 0) {
      markdownContent = task.markdown[0].content || ''
    }

    console.log('Markdown 内容前500字符:', markdownContent.substring(0, 500))

    const timestampToScreenshot = new Map<number, string>()
    
    // 直接查找所有截图，格式：*![](/static/screenshots/screenshot_XXX.jpg)
    const screenshotRegex = /\*!\[\]\((\/static\/screenshots\/[^)]+)\)/g
    let match
    
    while ((match = screenshotRegex.exec(markdownContent)) !== null) {
      const screenshotPath = match[1]
      console.log('找到截图路径:', screenshotPath)
      
      // 如果没有特定的时间戳关联，我们可以根据截图文件名中的索引来估算时间
      // screenshot_002_xxx.jpg -> 大致对应第2个时间点
      const indexMatch = screenshotPath.match(/screenshot_(\d+)_/)
      if (indexMatch && task?.transcript?.segments) {
        const screenshotIndex = parseInt(indexMatch[1])
        const segments = task.transcript.segments
        
        // 根据截图索引分配到转录片段
        if (screenshotIndex < segments.length) {
          const segment = segments[screenshotIndex]
          const timestamp = Math.floor(segment.start)
          timestampToScreenshot.set(timestamp, screenshotPath)
          console.log(`截图 ${screenshotIndex} 关联到时间戳 ${timestamp}s:`, screenshotPath)
        }
      }
    }
    
    // 如果上面的方法没找到，尝试更宽松的匹配：任何图片都关联到开始的几个时间点
    if (timestampToScreenshot.size === 0) {
      const allScreenshots = Array.from(markdownContent.matchAll(/!\[\]\((\/static\/screenshots\/[^)]+)\)/g))
      console.log('找到所有截图:', allScreenshots.length)
      
      if (allScreenshots.length > 0 && task?.transcript?.segments) {
        const segments = task.transcript.segments
        allScreenshots.forEach((match, index) => {
          if (index < segments.length) {
            const screenshotPath = match[1]
            const timestamp = Math.floor(segments[index].start)
            timestampToScreenshot.set(timestamp, screenshotPath)
            console.log(`截图 ${index} 关联到时间戳 ${timestamp}s:`, screenshotPath)
          }
        })
      }
    }
    
    console.log('提取到的截图时间戳映射:', timestampToScreenshot)
    return timestampToScreenshot
  }

  // 根据时间戳获取最接近的截图
  const getScreenshotForTime = (timeInSeconds: number) => {
    const screenshotMap = extractScreenshotTimestamps()
    if (screenshotMap.size === 0) {
      console.log('没有截图时间戳映射')
      return null
    }

    // 找到最接近的时间戳
    let closestTime = -1
    let minDiff = Infinity
    
    for (const [timestamp] of screenshotMap) {
      const diff = Math.abs(timestamp - timeInSeconds)
      if (diff < minDiff) {
        minDiff = diff
        closestTime = timestamp
      }
    }
    
    console.log(`寻找时间 ${timeInSeconds}s 的截图，最接近的是 ${closestTime}s，差距 ${minDiff}s`)
    
    // 放宽时间差限制到60秒，这样更多片段能匹配到截图
    if (minDiff > 60 || closestTime === -1) return null
    
    const result = screenshotMap.get(closestTime)
    console.log('返回截图路径:', result)
    return result
  }

  const handleSegmentClick = (index: number) => {
    setActiveSegment(index)
    // Here you could add functionality to play the audio from this segment
  }

  const generateContent = (format: DisplayFormat): string => {
    if (!task?.transcript?.segments) return ''
    
    const segments = task.transcript.segments
    const taskTitle = task.audioMeta?.title || '转录内容'
    
    switch (format) {
      case 'text':
        return segments.map(segment => segment.text).join('\n\n')
      
      case 'markdown':
        let markdownContent = `# ${taskTitle}\n\n`
        markdownContent += `> 转录结果 - 共 ${segments.length} 个片段\n\n`
        
        markdownContent += segments.map(segment => {
          let content = `## ${formatTime(segment.start)}\n\n`
          
          // 添加说话人信息（如果有）
          if (segment.speaker) {
            content += `**说话人**: ${segment.speaker}\n\n`
          }
          
          content += segment.text
          
          // 为 markdown 格式添加截图，使用绝对路径
          const screenshot = getScreenshotForTime(segment.start)
          if (screenshot) {
            // 使用公共函数转换为绝对路径
            const absoluteScreenshotPath = convertToAbsoluteScreenshotPath(screenshot)
            content += `\n\n![截图 ${formatTime(segment.start)}](${absoluteScreenshotPath})`
            content += `\n\n*截图时间: ${formatTime(segment.start)}*`
          }
          
          return content
        }).join('\n\n---\n\n')
        
        // 添加生成信息
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
        markdownContent += `\n\n---\n\n*生成时间: ${now}*`
        
        return markdownContent
      
      case 'timestamp':
      default:
        return segments.map(segment => 
          `${formatTime(segment.start)} - ${segment.text}`
        ).join('\n\n')
    }
  }

  const handleDownload = () => {
    if (!task?.transcript?.segments) return
    
    const content = generateContent(displayFormat)
    const formatNames = {
      timestamp: '时间戳',
      text: '纯文本',
      markdown: 'Markdown'
    }
    
    const filename = `transcript_${formatNames[displayFormat]}_${new Date().toISOString().slice(0, 10)}.${displayFormat === 'markdown' ? 'md' : 'txt'}`
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const renderTimestampView = () => {
    if (!task?.transcript?.segments?.length) return null
    
    return (
      <div className="space-y-1">
        {task.transcript.segments.map((segment, index) => (
          <div
            key={index}
            ref={(el) => { segmentRefs.current[index] = el }}
            className={cn(
              "group grid grid-cols-[80px_1fr] gap-2 rounded-md p-2 transition-colors hover:bg-slate-50",
              activeSegment === index && "bg-slate-100",
            )}
            onClick={() => handleSegmentClick(index)}
          >
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <button
                className="invisible rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 group-hover:visible"
                onClick={(e) => {
                  e.stopPropagation()
                  // Add play functionality here
                }}
              >
                <Play className="h-3 w-3" />
              </button>
              <span>{formatTime(segment.start)}</span>
            </div>

            <div className="text-sm leading-relaxed text-slate-700">
              {segment.speaker && (
                <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                  {segment.speaker}
                </span>
              )}
              {segment.text}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderTextView = () => {
    if (!task?.transcript?.segments?.length) return null
    
    return (
      <div className="space-y-4">
        {task.transcript.segments.map((segment, index) => (
          <div key={index} className="text-sm leading-relaxed text-slate-700">
            {segment.speaker && (
              <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                {segment.speaker}
              </span>
            )}
            {segment.text}
          </div>
        ))}
      </div>
    )
  }

  const renderMarkdownView = () => {
    if (!task?.transcript?.segments?.length) return null
    
    return (
      <div className="space-y-4">
        {task.transcript.segments.map((segment, index) => {
          const screenshot = getScreenshotForTime(segment.start)
          
          return (
            <div key={index}>
              <h3 className="mb-2 text-sm font-semibold text-slate-600">
                {formatTime(segment.start)}
              </h3>
              <div className="text-sm leading-relaxed text-slate-700">
                {segment.speaker && (
                  <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                    {segment.speaker}
                  </span>
                )}
                {segment.text}
              </div>
              
              {/* 显示对应时间戳的截图 */}
              {screenshot && (
                <div className="mt-3 mb-2">
                  <img
                    src={screenshot}
                    alt={`截图 ${formatTime(segment.start)}`}
                    className="max-w-full rounded-lg border shadow-sm"
                    style={{ maxHeight: '300px' }}
                    onLoad={() => console.log('截图加载成功:', screenshot)}
                    onError={(e) => {
                      console.error('截图加载失败:', screenshot, e)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    截图时间: {formatTime(segment.start)}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderContent = () => {
    switch (displayFormat) {
      case 'text':
        return renderTextView()
      case 'markdown':
        return renderMarkdownView()
      case 'timestamp':
      default:
        return renderTimestampView()
    }
  }

  return (
      <div className="transcript-viewer flex h-full w-full flex-col  rounded-md border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">转写结果</h2>
          <div className="flex items-center gap-2">
            <Select value={displayFormat} onValueChange={(value: DisplayFormat) => setDisplayFormat(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="显示方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">时间戳</SelectItem>
                <SelectItem value="text">纯文本</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownload}
              disabled={!task?.transcript?.segments?.length}
            >
              <Download className="h-4 w-4 mr-1" />
              下载
            </Button>
          </div>
        </div>
        
        {!task?.transcript?.segments?.length ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">暂无转写内容</div>
        ) : (
            <>
              {displayFormat === 'timestamp' && (
                <div className="mb-3 grid grid-cols-[80px_1fr] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <div>时间</div>
                  <div>内容</div>
                </div>
              )}
              
              <ScrollArea className="w-full overflow-y-auto">
                {renderContent()}
              </ScrollArea>
            </>
        )}


        {task?.transcript?.segments && task.transcript.segments.length > 0 && (
            <div className="mt-4 flex justify-between border-t pt-3 text-xs text-slate-500">
              <span>共 {task.transcript.segments.length} 条片段</span>
              <span>总时长: {formatTime(task.transcript.segments[task.transcript.segments.length - 1]?.end || 0)}</span>
            </div>
        )}
      </div>
  )
}

export default TranscriptViewer
