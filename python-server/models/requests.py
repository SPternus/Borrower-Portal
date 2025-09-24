"""
Pydantic models for request/response validation
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class InvitationRequest(BaseModel):
    email: str
    contactId: str
    accountId: str
    loanOfficerId: Optional[str] = None


class TokenValidationRequest(BaseModel):
    token: str
    email: str


class RegistrationRequest(BaseModel):
    token: str
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None


class ActivityRequest(BaseModel):
    contactId: str
    activityType: str
    description: str


class OpportunityUpdate(BaseModel):
    stageName: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


class ApplicationSaveRequest(BaseModel):
    application_id: str
    current_step: int
    form_data: dict
    is_submitted: bool = False


class ApplicationProgressResponse(BaseModel):
    application_id: str
    current_step: int
    form_data: dict
    is_submitted: bool
    is_draft: bool
    created_at: str
    updated_at: str 