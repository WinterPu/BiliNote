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

  const handleSegmentClick = (index: number) => {
    setActiveSegment(index)
    // Here you could add functionality to play the audio from this segment
  }

  const generateContent = (format: DisplayFormat): string => {
    if (!task?.transcript?.segments) return ''
    
    const segments = task.transcript.segments
    
    switch (format) {
      case 'text':
        return segments.map(segment => segment.text).join('\n\n')
      
      case 'markdown':
        return segments.map(segment => 
          `## ${formatTime(segment.start)}\n\n${segment.text}`
        ).join('\n\n')
      
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
        {task.transcript.segments.map((segment, index) => (
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
          </div>
        ))}
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
