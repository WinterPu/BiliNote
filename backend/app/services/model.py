

from app.db.model_dao import insert_model, get_all_models, get_model_by_provider_and_name, delete_model
from app.db.provider_dao import get_enabled_providers
from app.enmus.exception import ProviderErrorEnum
from app.exceptions.provider import ProviderError
from app.gpt.gpt_factory import GPTFactory
from app.gpt.provider.OpenAI_compatible_provider import OpenAICompatibleProvider
from app.models.model_config import ModelConfig
from app.services.provider import ProviderService
from app.utils.logger import get_logger

logger=get_logger(__name__)
class ModelService:

    @staticmethod
    def _build_model_config(provider: dict) -> ModelConfig:
        return ModelConfig(
            api_key=provider["api_key"],
            base_url=provider["base_url"],
            provider=provider["name"],
            model_name='',
            name=provider["name"],
        )

    @staticmethod
    def get_model_list(provider_id: int, verbose: bool = False):
        provider = ProviderService.get_provider_by_id(provider_id)
        if not provider:
            logger.error(f"Provider {provider_id} not found")
            return []

        try:
            config = ModelService._build_model_config(provider)
            logger.info(f"Testing API for provider {provider['name']} with base_url: {config.base_url}")
            
            gpt = GPTFactory().from_config(config)
            models = gpt.list_models()
            
            logger.info(f"Models type: {type(models)}")
            logger.info(f"Models has data attr: {hasattr(models, 'data')}")
            
            if hasattr(models, 'data'):
                logger.info(f"Models data length: {len(models.data) if models.data else 0}")
                if models.data:
                    logger.info(f"First model: {models.data[0].id}")
            
            if verbose:
                print(f"[{provider['name']}] 模型列表: {models}")
            return models
        except Exception as e:
            logger.error(f"[{provider['name']}] 获取模型失败: {e}")
            print(f"[{provider['name']}] 获取模型失败: {e}")
            return []

    @staticmethod
    def get_all_models(verbose: bool = False):
        try:
            raw_models = get_all_models()
            if verbose:
                print(f"所有模型列表: {raw_models}")
            return ModelService._format_models(raw_models)
        except Exception as e:
            print(f"获取所有模型失败: {e}")
            return []
    @staticmethod
    def get_all_models_safe(verbose: bool = False):
        try:
            raw_models = get_all_models()
            if verbose:
                print(f"所有模型列表: {raw_models}")
            return ModelService._format_models(raw_models)
        except Exception as e:
            print(f"获取所有模型失败: {e}")
            return []
    @staticmethod
    def _format_models(raw_models: list) -> list:
        """
        格式化模型列表
        """
        formatted = []
        for model in raw_models:
            formatted.append({
                "id": model.get("id"),
                "provider_id": model.get("provider_id"),
                "model_name": model.get("model_name"),
                "created_at": model.get("created_at", None),  # 如果有created_at字段
            })
        return formatted
    @staticmethod
    def get_enabled_models_by_provider( provider_id: str|int,):
        from app.db.model_dao import get_models_by_provider

        all_models = get_models_by_provider(provider_id)
        enabled_models = all_models
        return enabled_models
    @staticmethod
    def get_all_models_by_id(provider_id: str, verbose: bool = False):
        try:
            provider = ProviderService.get_provider_by_id(provider_id)

            models = ModelService.get_model_list(provider["id"], verbose=verbose)
            logger.info(f"Models type: {type(models)}")
            
            # 检查返回值类型和结构
            serializable_models = []
            
            if hasattr(models, 'data') and models.data:
                # OpenAI SDK v1.x 返回的 SyncPage[Model] 对象
                for model in models.data:
                    if hasattr(model, 'model_dump'):
                        # Pydantic v2 方式
                        serializable_models.append(model.model_dump())
                    elif hasattr(model, 'dict'):
                        # Pydantic v1 方式
                        serializable_models.append(model.dict())
                    else:
                        # 直接转换为字典
                        serializable_models.append({
                            "id": getattr(model, 'id', ''),
                            "object": getattr(model, 'object', 'model'),
                            "created": getattr(model, 'created', 0),
                            "owned_by": getattr(model, 'owned_by', '')
                        })
                        
            elif isinstance(models, list):
                # 直接返回的列表
                for model in models:
                    if hasattr(model, 'model_dump'):
                        serializable_models.append(model.model_dump())
                    elif hasattr(model, 'dict'):
                        serializable_models.append(model.dict())
                    else:
                        serializable_models.append(model)
            else:
                logger.warning(f"Unexpected models type: {type(models)}")
            
            model_list = {
                "models": serializable_models
            }

            logger.info(f"[{provider['name']}] 获取模型成功")
            return model_list
        except Exception as e:
            # print(f"[{provider_id}] 获取模型失败: {e}")
            logger.error(f"[{provider_id}] 获取模型失败: {e}")
            return []
    @staticmethod
    def connect_test(id: str) -> bool:
        provider = ProviderService.get_provider_by_id(id)

        if not provider:
            raise ProviderError(code=ProviderErrorEnum.NOT_FOUND.code, message=ProviderErrorEnum.NOT_FOUND.message)
            
        if not provider.get('api_key'):
            raise ProviderError(code=ProviderErrorEnum.INVALID_API_KEY.code, message="API Key为空")
            
        # 详细记录API Key传输信息
        api_key = provider.get('api_key')
        logger.info(f"ModelService连接测试:")
        logger.info(f"Provider ID: {id}")
        logger.info(f"Provider名称: {provider.get('name')}")
        logger.info(f"从数据库获取的API Key长度: {len(api_key) if api_key else 0}")
        
        # 安全的字符串切片，避免None或空字符串错误
        if api_key and len(api_key) > 0:
            safe_prefix = api_key[:20] if len(api_key) >= 20 else api_key
            safe_suffix = api_key[-4:] if len(api_key) >= 4 else api_key
            logger.info(f"从数据库获取的API Key前缀: {safe_prefix}...")
            logger.info(f"从数据库获取的API Key后缀: ...{safe_suffix}")
            logger.info(f"API Key原始内容(安全检查): {repr(api_key)}")  # 使用repr查看原始字符串
        else:
            logger.info(f"API Key为空或None")
            
        logger.info(f"Base URL: {provider.get('base_url')}")
            
        try:
            result = OpenAICompatibleProvider.test_connection(
                api_key=provider.get('api_key'),
                base_url=provider.get('base_url')
            )
            if result:
                return True
            else:
                # 如果test_connection返回False但没有抛出异常，可能是其他问题
                raise ProviderError(code=ProviderErrorEnum.CONNECTION_TEST_FAILED.code, 
                                 message=ProviderErrorEnum.CONNECTION_TEST_FAILED.message)
                                 
        except Exception as e:
            # 根据具体错误类型返回准确的错误信息
            error_str = str(e).lower()
            if "401" in error_str or "unauthorized" in error_str or "api key" in error_str:
                raise ProviderError(code=ProviderErrorEnum.INVALID_API_KEY.code, 
                                 message=ProviderErrorEnum.INVALID_API_KEY.message)
            elif "404" in error_str or "not found" in error_str:
                raise ProviderError(code=ProviderErrorEnum.WRONG_PARAMETER.code, 
                                 message=ProviderErrorEnum.WRONG_PARAMETER.message)
            else:
                # 其他类型的错误
                raise ProviderError(code=ProviderErrorEnum.CONNECTION_TEST_FAILED.code,
                                 message=f"连接测试失败: {str(e)}")



    @staticmethod
    def delete_model_by_id( model_id: int) -> bool:
        try:
            delete_model(model_id)
            return True
        except Exception as e:
            print(f"[{model_id}] <UNK>: {e}")
            return False
    @staticmethod
    def add_new_model(provider_id: int, model_name: str) -> bool:
        try:
            # 先查供应商是否存在
            provider = ProviderService.get_provider_by_id(provider_id)
            if not provider:
                print(f"供应商ID {provider_id} 不存在，无法添加模型")
                return False

            # 查询是否已存在同名模型
            existing = get_model_by_provider_and_name(provider_id, model_name)
            if existing:
                print(f"模型 {model_name} 已存在于供应商ID {provider_id} 下，跳过插入")
                return False

            # 插入模型
            insert_model(provider_id=provider_id, model_name=model_name)
            print(f"模型 {model_name} 已成功添加到供应商ID {provider_id}")
            return True
        except Exception as e:
            print(f"添加模型失败: {e}")
            return False

if __name__ == '__main__':
    # 单个 Provider 测试
    print(ModelService.get_model_list(1, verbose=True))

    # 所有 Provider 模型测试
    # print(ModelService.get_all_models(verbose=True))
