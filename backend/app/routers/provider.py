from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.exceptions.provider import ProviderError
from app.models.model_config import ModelConfig
from app.services.model import ModelService
from app.utils.response import ResponseWrapper as R
from app.services.provider import ProviderService

router = APIRouter()

#  新增 type 字段
class ProviderRequest(BaseModel):
    name: str
    api_key: str
    base_url: str
    logo: Optional[str] = None
    type: str

class TestRequest(BaseModel):
    id: str
class ProviderUpdateRequest(BaseModel):
    id: str
    name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    logo: Optional[str] = None
    type: Optional[str] = None
    enabled:Optional[int] = None

@router.post("/add_provider")
def add_provider(data: ProviderRequest):
    try:
        res = ProviderService.add_provider(
            name=data.name,
            api_key=data.api_key,
            base_url=data.base_url,
            logo=data.logo,
            type_=data.type
        )
        return R.success(msg='添加模型供应商成功',data=res)
    except Exception as e:
        return R.error(msg=e)

@router.get("/get_all_providers")
def get_all_providers():
    try:
        res = ProviderService.get_all_providers_safe()
        return R.success(data=res)
    except Exception as e:
        return R.error(msg=e)

@router.get("/get_provider_by_id/{id}")
def get_provider_by_id(id: str):
    try:
        # 编辑provider时需要返回真实的API Key，而不是masked版本
        res = ProviderService.get_provider_by_id(id)
        return R.success(data=res)
    except Exception as e:
        return R.error(msg=e)
#
# @router.get("/get_provider_by_name/{name}")
# def get_provider_by_name(name: str):
#     try:
#         res = ProviderService.get_provider_by_name(name)
#         return R.success(data=res)
#     except Exception as e:
#         return R.error(msg=e)


@router.post("/update_provider")
def update_provider(data: ProviderUpdateRequest):
    try:
        from app.utils.logger import get_logger
        logger = get_logger(__name__)
        
        logger.info(f"=== 路由接收到更新请求 ===")
        logger.info(f"请求数据类型: {type(data)}")
        logger.info(f"请求数据内容: {data}")
        logger.info(f"data.id: {data.id}")
        logger.info(f"data.api_key: '{data.api_key}' (长度: {len(data.api_key) if data.api_key else 0})")
        logger.info(f"data.api_key是否为None: {data.api_key is None}")
        logger.info(f"data.api_key是否为空字符串: {data.api_key == '' if data.api_key is not None else 'N/A'}")
        
        if all(
            field is None
            for field in [data.name, data.api_key, data.base_url, data.logo, data.type,data.enabled]
        ):
            logger.warning("所有字段都为None，返回错误")
            return R.error(msg='请至少填写一个参数')

        dict_data = dict(data)
        logger.info(f"转换为字典的数据: {dict_data}")

        provider_id = ProviderService.update_provider(
            id=data.id,
            data=dict_data
        )
        logger.info(f"更新结果: {provider_id}")
        return R.success(msg='更新模型供应商成功',data={'id': provider_id})
    except Exception as e:
        print(e)
        return R.error(msg=str(e))

@router.post('/connect_test')
def gpt_connect_test(data: TestRequest):
    ModelService().connect_test(data.id)
    return R.success(msg='连接成功')
