import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Trash2, RefreshCw, Image, Upload, FileText, Database } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getApiBaseUrl } from '@/utils/screenshotUtils'

interface CacheInfo {
  database?: { exists: boolean; size: string; error?: string }
  screenshots?: { count: number; size: string; error?: string }
  uploads?: { count: number; size: string; error?: string }
  note_results?: { count: number; size: string; error?: string }
}

const Cache: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState<string | null>(null)

  const fetchCacheInfo = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${getApiBaseUrl()}/cache/info`)
      if (response.ok) {
        const data = await response.json()
        setCacheInfo(data)
      } else {
        toast.error('无法连接到后端服务')
      }
    } catch (error) {
      toast.error('网络错误')
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = async (type: string) => {
    setIsClearing(type)
    try {
      const endpoint = type === 'all' ? '/cache/all' : `/cache/${type}`
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        // 重新获取缓存信息
        fetchCacheInfo()
      } else {
        const error = await response.json()
        toast.error(error.detail || "未知错误")
      }
    } catch (error) {
      toast.error("网络错误")
    } finally {
      setIsClearing(null)
    }
  }

  useEffect(() => {
    fetchCacheInfo()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">缓存管理</h1>
          <p className="text-muted-foreground">管理应用程序的各种缓存数据</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchCacheInfo}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 一键清空所有缓存 */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">一键清空</CardTitle>
          </div>
          <CardDescription>
            清空所有缓存数据，包括数据库记录、截图、上传文件等。此操作不可恢复。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing === 'all'}>
                {isClearing === 'all' ? '清理中...' : '清空所有缓存'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认清空所有缓存？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除所有缓存数据，包括：
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>数据库中的笔记记录</li>
                    <li>所有截图文件</li>
                    <li>上传的文件</li>
                    <li>笔记结果文件</li>
                  </ul>
                  <strong className="text-destructive">此操作不可恢复！</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => clearCache('all')}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  确认清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* 分类缓存管理 */}
      <div className="grid gap-4">
        {/* 数据库缓存 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <CardTitle>数据库缓存</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {cacheInfo.database?.error ? (
                  <span className="text-destructive">错误: {cacheInfo.database.error}</span>
                ) : (
                  <span>大小: {cacheInfo.database?.size || '未知'}</span>
                )}
              </div>
            </div>
            <CardDescription>
              清理数据库中的笔记记录，但保留配置信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'database'}>
                  {isClearing === 'database' ? '清理中...' : '清理数据库缓存'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理数据库缓存？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除数据库中的所有笔记记录，但会保留模型配置等设置信息。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('database')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* 截图缓存 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image className="h-5 w-5" />
                <CardTitle>截图缓存</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {cacheInfo.screenshots?.error ? (
                  <span className="text-destructive">错误: {cacheInfo.screenshots.error}</span>
                ) : (
                  <span>{cacheInfo.screenshots?.count || 0} 个文件, {cacheInfo.screenshots?.size || '0 KB'}</span>
                )}
              </div>
            </div>
            <CardDescription>
              清理视频截图文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'screenshots'}>
                  {isClearing === 'screenshots' ? '清理中...' : '清理截图缓存'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理截图缓存？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除所有截图文件，可能影响已生成笔记中的图片显示。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('screenshots')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* 上传文件缓存 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <CardTitle>上传文件缓存</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {cacheInfo.uploads?.error ? (
                  <span className="text-destructive">错误: {cacheInfo.uploads.error}</span>
                ) : (
                  <span>{cacheInfo.uploads?.count || 0} 个文件, {cacheInfo.uploads?.size || '0 KB'}</span>
                )}
              </div>
            </div>
            <CardDescription>
              清理用户上传的文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'uploads'}>
                  {isClearing === 'uploads' ? '清理中...' : '清理上传文件'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理上传文件？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除所有用户上传的文件。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('uploads')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* 笔记结果文件 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <CardTitle>笔记结果文件</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {cacheInfo.note_results?.error ? (
                  <span className="text-destructive">错误: {cacheInfo.note_results.error}</span>
                ) : (
                  <span>{cacheInfo.note_results?.count || 0} 个文件, {cacheInfo.note_results?.size || '0 KB'}</span>
                )}
              </div>
            </div>
            <CardDescription>
              清理生成的笔记结果文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'note-results'}>
                  {isClearing === 'note-results' ? '清理中...' : '清理笔记文件'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理笔记结果文件？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除所有生成的笔记结果文件，包括Markdown文件、转录文件等。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('note-results')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Cache
