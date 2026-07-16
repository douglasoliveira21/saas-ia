from pydantic import BaseModel, EmailStr, Field
class Register(BaseModel): company_name:str=Field(min_length=2,max_length=160); document:str|None=None; name:str; email:EmailStr; password:str=Field(min_length=8)
class Login(BaseModel): email:EmailStr; password:str
class Refresh(BaseModel): refresh_token:str
class AgentIn(BaseModel): name:str; description:str=""; ai_model:str="meta-llama/Meta-Llama-3.1-70B-Instruct"; system_prompt:str="Você é um assistente útil."; temperature:float=Field(.7,ge=0,le=2); permissions:dict={}
class InviteIn(BaseModel): email:EmailStr; role:str="member"
class AcceptInvite(BaseModel): token:str; name:str; password:str=Field(min_length=8)
class FolderIn(BaseModel): name:str; shared:bool=False; permissions:dict={}
class UpdateConversation(BaseModel): folder_id:str|None=None; favorite:bool|None=None; title:str|None=None
class ChatIn(BaseModel): conversation_id:str|None=None; agent_id:str|None=None; folder_id:str|None=None; file_ids:list[str]=[]; message:str=Field(min_length=1,max_length=30000)
class AnonymousChatIn(BaseModel): device_id:str=Field(min_length=20,max_length=120); message:str=Field(min_length=1,max_length=12000)
class UserSettingsIn(BaseModel):
    name:str|None=Field(None,min_length=2,max_length=120); preferred_name:str|None=Field(None,max_length=120); occupation:str|None=Field(None,max_length=80); custom_instructions:str|None=Field(None,max_length=5000)
    location_metadata_enabled:bool|None=None; training_opt_in:bool|None=None; memory_enabled:bool|None=None
    location_lat:float|None=Field(None,ge=-90,le=90); location_lng:float|None=Field(None,ge=-180,le=180); location_timezone:str|None=Field(None,max_length=80)
