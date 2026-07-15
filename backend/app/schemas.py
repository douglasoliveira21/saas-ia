from pydantic import BaseModel, EmailStr, Field
class Register(BaseModel): company_name:str=Field(min_length=2,max_length=160); document:str|None=None; name:str; email:EmailStr; password:str=Field(min_length=8)
class Login(BaseModel): email:EmailStr; password:str
class Refresh(BaseModel): refresh_token:str
class AgentIn(BaseModel): name:str; description:str=""; ai_model:str="meta-llama/Meta-Llama-3.1-70B-Instruct"; system_prompt:str="Você é um assistente útil."; temperature:float=Field(.7,ge=0,le=2); permissions:dict={}
class InviteIn(BaseModel): email:EmailStr; role:str="member"
class AcceptInvite(BaseModel): token:str; name:str; password:str=Field(min_length=8)
class FolderIn(BaseModel): name:str; shared:bool=False; permissions:dict={}
class MoveConversation(BaseModel): folder_id:str|None=None
class ChatIn(BaseModel): conversation_id:str|None=None; agent_id:str|None=None; folder_id:str|None=None; file_ids:list[str]=[]; message:str=Field(min_length=1,max_length=30000)
