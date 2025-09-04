import os
import shutil
import sqlite3
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.delete("/cache/all")
async def clear_all_cache():
    """清空所有缓存数据"""
    try:
        result = {}
        total_cleared = 0
        
        # 清理数据库缓存（清空某些表的数据，但保留结构）
        try:
            db_path = os.getenv("DATABASE_PATH", "bili_note.db")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                # 统计要删除的记录数
                cursor.execute("SELECT COUNT(*) FROM note_results")
                record_count = cursor.fetchone()[0]
                # 清空笔记结果表（但保留其他配置数据）
                cursor.execute("DELETE FROM note_results WHERE 1=1")
                conn.commit()
                conn.close()
                result["database"] = f"已清理 {record_count} 条记录"
                total_cleared += record_count
            else:
                result["database"] = "数据库文件不存在"
        except Exception as e:
            logger.error(f"清理数据库缓存失败: {e}")
            result["database"] = f"清理失败: {str(e)}"
        
        # 清理截图缓存
        try:
            screenshot_dir = os.getenv('OUT_DIR', './static/screenshots')
            if os.path.exists(screenshot_dir):
                files = [f for f in os.listdir(screenshot_dir) if os.path.isfile(os.path.join(screenshot_dir, f))]
                total_size = sum(os.path.getsize(os.path.join(screenshot_dir, f)) for f in files)
                for filename in files:
                    file_path = os.path.join(screenshot_dir, filename)
                    os.unlink(file_path)
                size_mb = total_size / (1024*1024) if total_size > 1024*1024 else total_size / 1024
                size_unit = "MB" if total_size > 1024*1024 else "KB"
                result["screenshots"] = f"已清理 {len(files)} 个文件 ({size_mb:.2f} {size_unit})"
                total_cleared += len(files)
            else:
                result["screenshots"] = "截图目录不存在"
        except Exception as e:
            logger.error(f"清理截图缓存失败: {e}")
            result["screenshots"] = f"清理失败: {str(e)}"
        
        # 清理上传文件
        try:
            uploads_dir = "uploads"
            if os.path.exists(uploads_dir):
                files = [f for f in os.listdir(uploads_dir) if os.path.isfile(os.path.join(uploads_dir, f))]
                total_size = sum(os.path.getsize(os.path.join(uploads_dir, f)) for f in files)
                for filename in files:
                    file_path = os.path.join(uploads_dir, filename)
                    os.unlink(file_path)
                size_mb = total_size / (1024*1024) if total_size > 1024*1024 else total_size / 1024
                size_unit = "MB" if total_size > 1024*1024 else "KB"
                result["uploads"] = f"已清理 {len(files)} 个文件 ({size_mb:.2f} {size_unit})"
                total_cleared += len(files)
            else:
                result["uploads"] = "上传目录不存在"
        except Exception as e:
            logger.error(f"清理上传文件失败: {e}")
            result["uploads"] = f"清理失败: {str(e)}"
        
        # 清理笔记结果文件
        try:
            note_results_dir = "note_results"
            if os.path.exists(note_results_dir):
                files = [f for f in os.listdir(note_results_dir) if os.path.isfile(os.path.join(note_results_dir, f))]
                total_size = sum(os.path.getsize(os.path.join(note_results_dir, f)) for f in files)
                for filename in files:
                    file_path = os.path.join(note_results_dir, filename)
                    os.unlink(file_path)
                size_mb = total_size / (1024*1024) if total_size > 1024*1024 else total_size / 1024
                size_unit = "MB" if total_size > 1024*1024 else "KB"
                result["note_results"] = f"已清理 {len(files)} 个文件 ({size_mb:.2f} {size_unit})"
                total_cleared += len(files)
            else:
                result["note_results"] = "笔记结果目录不存在"
        except Exception as e:
            logger.error(f"清理笔记结果失败: {e}")
            result["note_results"] = f"清理失败: {str(e)}"
        
        return {
            "message": f"缓存清理完成，共处理 {total_cleared} 项", 
            "details": result,
            "summary": {
                "total_items_cleared": total_cleared,
                "categories_processed": len(result)
            }
        }
        
    except Exception as e:
        logger.error(f"清理缓存时发生错误: {e}")
        raise HTTPException(status_code=500, detail=f"清理缓存失败: {str(e)}")

@router.delete("/cache/database")
async def clear_database_cache():
    """清理数据库缓存"""
    try:
        db_path = os.getenv("DATABASE_PATH", "bili_note.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM note_results WHERE 1=1")
            conn.commit()
            conn.close()
            return {"message": "数据库缓存已清理"}
        else:
            return {"message": "数据库文件不存在"}
    except Exception as e:
        logger.error(f"清理数据库缓存失败: {e}")
        raise HTTPException(status_code=500, detail=f"清理数据库缓存失败: {str(e)}")

@router.delete("/cache/screenshots")
async def clear_screenshots_cache():
    """清理截图缓存"""
    try:
        screenshot_dir = os.getenv('OUT_DIR', './static/screenshots')
        if os.path.exists(screenshot_dir):
            for filename in os.listdir(screenshot_dir):
                file_path = os.path.join(screenshot_dir, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            return {"message": "截图缓存已清理"}
        else:
            return {"message": "截图目录不存在"}
    except Exception as e:
        logger.error(f"清理截图缓存失败: {e}")
        raise HTTPException(status_code=500, detail=f"清理截图缓存失败: {str(e)}")

@router.delete("/cache/uploads")
async def clear_uploads_cache():
    """清理上传文件缓存"""
    try:
        uploads_dir = "uploads"
        if os.path.exists(uploads_dir):
            for filename in os.listdir(uploads_dir):
                file_path = os.path.join(uploads_dir, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            return {"message": "上传文件缓存已清理"}
        else:
            return {"message": "上传目录不存在"}
    except Exception as e:
        logger.error(f"清理上传文件缓存失败: {e}")
        raise HTTPException(status_code=500, detail=f"清理上传文件缓存失败: {str(e)}")

@router.delete("/cache/note-results")
async def clear_note_results_cache():
    """清理笔记结果文件缓存"""
    try:
        note_results_dir = "note_results"
        if os.path.exists(note_results_dir):
            for filename in os.listdir(note_results_dir):
                file_path = os.path.join(note_results_dir, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            return {"message": "笔记结果文件已清理"}
        else:
            return {"message": "笔记结果目录不存在"}
    except Exception as e:
        logger.error(f"清理笔记结果文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"清理笔记结果文件失败: {str(e)}")

@router.get("/cache/info")
async def get_cache_info():
    """获取缓存信息"""
    try:
        info = {}
        total_size = 0
        total_files = 0
        
        # 数据库信息
        try:
            db_path = os.getenv("DATABASE_PATH", "bili_note.db")
            if os.path.exists(db_path):
                size = os.path.getsize(db_path)
                # 获取笔记记录数量
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM note_results")
                record_count = cursor.fetchone()[0]
                conn.close()
                
                info["database"] = {
                    "exists": True,
                    "size": f"{size / (1024*1024):.2f} MB" if size > 1024*1024 else f"{size / 1024:.2f} KB",
                    "recordCount": record_count
                }
                total_size += size
            else:
                info["database"] = {"exists": False, "size": "0 KB", "recordCount": 0}
        except Exception as e:
            info["database"] = {"error": str(e)}
        
        # 截图缓存信息
        try:
            screenshot_dir = os.getenv('OUT_DIR', './static/screenshots')
            if os.path.exists(screenshot_dir):
                files = [f for f in os.listdir(screenshot_dir) if os.path.isfile(os.path.join(screenshot_dir, f))]
                total_dir_size = sum(os.path.getsize(os.path.join(screenshot_dir, f)) for f in files)
                info["screenshots"] = {
                    "count": len(files),
                    "size": f"{total_dir_size / (1024*1024):.2f} MB" if total_dir_size > 1024*1024 else f"{total_dir_size / 1024:.2f} KB"
                }
                total_size += total_dir_size
                total_files += len(files)
            else:
                info["screenshots"] = {"count": 0, "size": "0 KB"}
        except Exception as e:
            info["screenshots"] = {"error": str(e)}
        
        # 上传文件信息
        try:
            uploads_dir = "uploads"
            if os.path.exists(uploads_dir):
                files = [f for f in os.listdir(uploads_dir) if os.path.isfile(os.path.join(uploads_dir, f))]
                total_dir_size = sum(os.path.getsize(os.path.join(uploads_dir, f)) for f in files)
                info["uploads"] = {
                    "count": len(files),
                    "size": f"{total_dir_size / (1024*1024):.2f} MB" if total_dir_size > 1024*1024 else f"{total_dir_size / 1024:.2f} KB"
                }
                total_size += total_dir_size
                total_files += len(files)
            else:
                info["uploads"] = {"count": 0, "size": "0 KB"}
        except Exception as e:
            info["uploads"] = {"error": str(e)}
        
        # 笔记结果文件信息
        try:
            note_results_dir = "note_results"
            if os.path.exists(note_results_dir):
                files = [f for f in os.listdir(note_results_dir) if os.path.isfile(os.path.join(note_results_dir, f))]
                total_dir_size = sum(os.path.getsize(os.path.join(note_results_dir, f)) for f in files)
                info["note_results"] = {
                    "count": len(files),
                    "size": f"{total_dir_size / (1024*1024):.2f} MB" if total_dir_size > 1024*1024 else f"{total_dir_size / 1024:.2f} KB"
                }
                total_size += total_dir_size
                total_files += len(files)
            else:
                info["note_results"] = {"count": 0, "size": "0 KB"}
        except Exception as e:
            info["note_results"] = {"error": str(e)}
        
        # 添加总计信息
        info["summary"] = {
            "total_size": f"{total_size / (1024*1024):.2f} MB" if total_size > 1024*1024 else f"{total_size / 1024:.2f} KB",
            "total_files": total_files,
            "database_records": info.get("database", {}).get("recordCount", 0)
        }
        
        return info
        
    except Exception as e:
        logger.error(f"获取缓存信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取缓存信息失败: {str(e)}")
