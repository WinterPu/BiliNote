from fastapi.encoders import jsonable_encoder
from kombu import uuid

from app.db.models.providers import Provider
from app.db.provider_dao import (
    insert_provider,
    get_all_providers,
    get_provider_by_name,
    get_provider_by_id,
    update_provider,
    delete_provider, get_enabled_providers,
)
from app.gpt.gpt_factory import GPTFactory
from app.models.model_config import ModelConfig
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ProviderService:

    @staticmethod
    def serialize_provider(row: Provider) -> dict:
        if not row:
            return None
        row = ProviderService.provider_to_dict(row)
        return {
            "id": row.get("id"),
            "name": row.get("name"),
            "logo": row.get("logo"),
            "type":row.get("type"),
            "enabled": row.get("enabled"),
            "base_url": row.get("base_url"),
            "api_key": row.get("api_key"),
            "created_at": jsonable_encoder(row.get("created_at")),
            # "name": row[1],
            # "logo": row[2],
            # "type": row[3],
            # "api_key": row[4],
            # "base_url": row[5],
            # "enabled": row[6],
            # "created_at": row[7],
        }
    @staticmethod
    def serialize_provider_safe(row: Provider) -> dict:
        if not row:
            return None
        row = ProviderService.provider_to_dict(row)

        return {
            "id": row.get("id"),
            "name": row.get("name"),
            "logo": row.get("logo"),
            "type":row.get("type"),
            "enabled": row.get("enabled"),
            "base_url": row.get("base_url"),
            "api_key":  ProviderService.mask_key(row.get("api_key")),
            "created_at": jsonable_encoder(row.get("created_at")),

            # "id": row[0],
            # "name": row[1],
            # "logo": row[2],
            # "type": row[3],
            # "api_key": ProviderService.mask_key(row[4]),
            # "base_url": row[5],
            # "enabled": row[6],
            # "created_at": row[7],
        }
    @staticmethod
    def mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return '*' * len(key)
        return key[:4] + '*' * (len(key) - 8) + key[-4:]
    @staticmethod
    def add_provider( name: str, api_key: str, base_url: str, logo: str, type_: str, enabled: int = 1):
        try:
            id = uuid().lower()
            logo='custom'
            return insert_provider(id, name, api_key, base_url, logo, type_, enabled)
        except Exception as  e:
            print('创建模式失败',e)
    @staticmethod
    def provider_to_dict(p: Provider):
        return {
            "id": p.id,
            "name": p.name,
            "logo": p.logo,
            "type": p.type,
            "api_key": p.api_key,
            "base_url": p.base_url,
            "enabled": p.enabled,
            "created_at": p.created_at,
        }
    @staticmethod
    def get_all_providers():
        rows = get_all_providers()
        if rows is None:
            return []

        return [ProviderService.serialize_provider(row) for row in rows] if rows else []
    @staticmethod
    def get_all_providers_safe():
        rows = get_all_providers()

        return [ProviderService.serialize_provider(row) for row in rows] if (rows) else []
    @staticmethod
    def get_provider_by_name(name: str):
        row = get_provider_by_name(name)
        return ProviderService.serialize_provider(row)

    @staticmethod
    def get_provider_by_id(id: str):  # 已改为 str 类型
        row = get_provider_by_id(id)
        result = ProviderService.serialize_provider(row)
        
        # 详细记录API Key传输信息
        if result:
            api_key = result.get('api_key')
            logger.info(f"ProviderService获取Provider:")
            logger.info(f"Provider ID: {id}")
            logger.info(f"Provider名称: {result.get('name')}")
            logger.info(f"原始API Key长度: {len(api_key) if api_key else 0}")
            logger.info(f"原始API Key前缀: {api_key[:20]}..." if api_key else "API Key为空")
            logger.info(f"原始API Key后缀: ...{api_key[-4:] if api_key and len(api_key) >= 4 else 'N/A'}")
            
        return result

    @staticmethod
    def get_provider_by_id_safe(id: str):  # 已改为 str 类型
        row = get_provider_by_id(id)
        return ProviderService.serialize_provider_safe(row)
            # all_models.extend(provider['models'])

    @staticmethod
    def update_provider(id: str, data: dict)->str | None:
        try:
            logger.info(f"=== 开始更新Provider ===")
            logger.info(f"Provider ID: {id}")
            logger.info(f"接收到的原始数据: {data}")
            
            # 过滤掉空值和id字段
            filtered_data = {k: v for k, v in data.items() if v is not None and k != 'id'}
            logger.info(f"过滤后的数据: {filtered_data}")
            
            # 特殊处理API Key：只有在原来已有API Key且新值为空时才跳过更新
            if 'api_key' in filtered_data:
                logger.info(f"检测到API Key字段，开始处理...")
                
                current_provider = ProviderService.get_provider_by_id(id)
                logger.info(f"当前Provider数据: {current_provider}")
                
                current_api_key = current_provider.get('api_key', '') if current_provider else ''
                new_api_key = filtered_data['api_key'].strip() if filtered_data['api_key'] else ''
                
                logger.info(f"当前API Key: '{current_api_key}' (长度: {len(current_api_key)})")
                logger.info(f"新API Key: '{new_api_key}' (长度: {len(new_api_key)})")
                logger.info(f"当前API Key是否为空: {not bool(current_api_key)}")
                logger.info(f"新API Key是否为空: {not bool(new_api_key)}")
                
                # 如果原来有API Key但新值为空，则保持原值（防止意外清空）
                if current_api_key and not new_api_key:
                    logger.info("条件匹配: 原来有API Key但新值为空，保持原值不变")
                    del filtered_data['api_key']
                # 如果新值不为空，则正常更新（包括从空变为有值的情况）
                elif new_api_key:
                    logger.info(f"条件匹配: 新值不为空，正常更新API Key，长度: {len(new_api_key)}")
                # 如果原来和新值都为空，允许更新（可能是其他字段的更新）
                else:
                    logger.info("条件匹配: 原来和新值都为空，允许更新")
            else:
                logger.info("未检测到API Key字段")
            
            logger.info(f"最终更新的数据: {filtered_data}")
            print('更新模型供应商',filtered_data)
            update_provider(id, **filtered_data)
            logger.info("Provider更新成功")
            return id

        except Exception as e:
            logger.error(f"更新模型供应商失败: {e}")
            print('更新模型供应商失败：',e)
            return None

    @staticmethod
    def delete_provider(id: str):
        return delete_provider(id)
