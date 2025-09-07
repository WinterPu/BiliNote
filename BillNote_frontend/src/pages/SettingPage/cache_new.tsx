import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Trash2, RefreshCw, Image, Upload, FileText, Database, HardDrive, Globe, History } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getApiBaseUrl } from '@/utils/screenshotUtils'

interface CacheInfo {
  database?: { exists: boolean; size: string; error?: string; recordCount?: number }
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

  const clearAllCache = async () => {
    setIsClearing('all')
    try {
      const results = []
      
      // 清理前端缓存
      try {
        const localSize = JSON.stringify(localStorage).length
        localStorage.clear()
        results.push(`本地存储: ${(localSize / 1024).toFixed(2)} KB`)
      } catch (e) {
        results.push('本地存储: 清理失败')
      }
      
      try {
        const sessionSize = JSON.stringify(sessionStorage).length
        sessionStorage.clear()
        results.push(`会话存储: ${(sessionSize / 1024).toFixed(2)} KB`)
      } catch (e) {
        results.push('会话存储: 清理失败')
      }
      
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
          results.push(`浏览器缓存: ${cacheNames.length} 个`)
        }
      } catch (e) {
        results.push('浏览器缓存: 清理失败')
      }
      
      // 清理后端缓存
      try {
        const response = await fetch(`${getApiBaseUrl()}/cache/all`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          results.push('服务端数据: 已清理')
        } else {
          results.push('服务端数据: 清理失败')
        }
      } catch (e) {
        results.push('服务端数据: 网络错误')
      }
      
      toast.success(`全部清理完成:\\n${results.join('\\n')}`, { duration: 5000 })
      
      // 重新获取缓存信息
      setTimeout(() => {
        fetchCacheInfo()
        // 询问用户是否要刷新页面
        if (window.confirm('缓存清理完成！是否刷新页面以应用所有更改？')) {
          window.location.reload()
        }
      }, 2000)
      
    } catch (error) {
      toast.error("清理过程中发生错误")
    } finally {
      setIsClearing(null)
    }
  }

  const clearCache = async (type: string) => {
    setIsClearing(type)
    
    // 如果是前端缓存，直接处理
    if (type === 'localStorage') {
      try {
        const beforeSize = JSON.stringify(localStorage).length
        localStorage.clear()
        const clearedSize = (beforeSize / 1024).toFixed(2)
        toast.success(`本地存储已清理 (${clearedSize} KB)`)
        fetchCacheInfo()
      } catch (error) {
        toast.error('清理本地存储失败')
      }
      setIsClearing(null)
      return
    }
    
    if (type === 'sessionStorage') {
      try {
        const beforeSize = JSON.stringify(sessionStorage).length
        sessionStorage.clear()
        const clearedSize = (beforeSize / 1024).toFixed(2)
        toast.success(`会话存储已清理 (${clearedSize} KB)`)
        fetchCacheInfo()
      } catch (error) {
        toast.error('清理会话存储失败')
      }
      setIsClearing(null)
      return
    }

    if (type === 'browser') {
      try {
        // 清理页面缓存
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
          toast.success(`浏览器缓存已清理 (${cacheNames.length} 个缓存)`)
        } else {
          toast.success('浏览器不支持缓存 API')
        }
        // 询问用户是否要重新加载页面
        setTimeout(() => {
          if (window.confirm('浏览器缓存已清理，是否刷新页面以应用更改？')) {
            window.location.reload()
          }
        }, 1000)
      } catch (error) {
        toast.error('清理浏览器缓存失败')
      }
      setIsClearing(null)
      return
    }
    
    // 后端缓存处理
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
          <p className="text-muted-foreground">管理应用程序的各种缓存数据，释放存储空间</p>
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
            <CardTitle className="text-destructive">一键清空全部</CardTitle>
          </div>
          <CardDescription>
            清空所有缓存数据，包括前端本地存储、会话存储、浏览器缓存以及服务端数据缓存。此操作不可恢复。
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
                    <li>浏览器本地存储和会话存储</li>
                    <li>浏览器HTTP缓存</li>
                    <li>数据库中的笔记记录</li>
                    <li>所有截图文件</li>
                    <li>上传的文件</li>
                    <li>笔记结果文件</li>
                  </ul>
                  <strong className="text-destructive mt-2 block">此操作不可恢复！</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={clearAllCache}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  确认清空全部
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* 分类缓存管理 */}
      <div className="grid gap-4">
        {/* 前端本地存储 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5" />
                <CardTitle>本地存储 (localStorage)</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>{(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB</span>
              </div>
            </div>
            <CardDescription>
              清理浏览器本地存储的用户设置和偏好数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'localStorage'}>
                  {isClearing === 'localStorage' ? '清理中...' : '清理本地存储'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理本地存储？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除所有保存在浏览器中的用户设置和偏好，您可能需要重新配置应用。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('localStorage')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* 会话存储 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <CardTitle>会话存储 (sessionStorage)</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>{(JSON.stringify(sessionStorage).length / 1024).toFixed(2)} KB</span>
              </div>
            </div>
            <CardDescription>
              清理当前会话的临时数据和状态信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'sessionStorage'}>
                  {isClearing === 'sessionStorage' ? '清理中...' : '清理会话存储'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理会话存储？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除当前会话中的所有临时数据，某些功能状态可能需要重新设置。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('sessionStorage')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* 浏览器缓存 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <CardTitle>浏览器缓存</CardTitle>
            </div>
            <CardDescription>
              清理浏览器HTTP缓存和服务工作者缓存，提升性能和释放空间
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearing === 'browser'}>
                  {isClearing === 'browser' ? '清理中...' : '清理浏览器缓存'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清理浏览器缓存？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将清理浏览器的HTTP缓存和服务工作者缓存，可能会导致下次加载页面稍慢。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCache('browser')}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

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
              清理视频截图文件，释放存储空间
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
              清理用户上传的临时文件
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
                    此操作将删除所有用户上传的文件，请确保重要文件已备份。
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
              清理生成的笔记结果文件，释放磁盘空间
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
