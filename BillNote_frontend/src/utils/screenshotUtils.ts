/**
 * 截图路径处理工具函数
 */

/**
 * 获取截图基础 URL
 * @returns 截图基础 URL
 */
export const getScreenshotBaseURL = (): string => {
  return import.meta.env.VITE_SCREENSHOT_BASE_URL || 'http://localhost:8483/static/screenshots'
}

/**
 * 将相对截图路径转换为绝对路径
 * @param relativePath 相对路径，如 "/static/screenshots/screenshot_001_uuid.jpg"
 * @returns 绝对路径 URL
 */
export const convertToAbsoluteScreenshotPath = (relativePath: string): string => {
  if (relativePath.startsWith('http')) {
    // 已经是绝对路径，直接返回
    return relativePath
  }

  const baseURL = getScreenshotBaseURL()
  const filename = relativePath.replace(/^\/static\/screenshots\//, '')
  return `${baseURL}/${filename}`
}

/**
 * 批量处理 Markdown 内容中的截图路径，将相对路径转换为绝对路径
 * @param markdownContent 包含截图的 Markdown 内容
 * @returns 处理后的 Markdown 内容
 */
export const processMarkdownScreenshots = (markdownContent: string): string => {
  return markdownContent.replace(
    /!\[([^\]]*)\]\((\/static\/screenshots\/[^)]+)\)/g,
    (_, alt, src) => {
      const absoluteUrl = convertToAbsoluteScreenshotPath(src)
      return `![${alt}](${absoluteUrl})`
    }
  )
}
