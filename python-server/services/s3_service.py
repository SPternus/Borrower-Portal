"""
AWS S3 Service for Document Uploads
Handles file uploads to S3 with structured folder organization
"""

import boto3
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        """Initialize S3 service with AWS credentials from environment"""
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.s3_bucket_name = os.getenv('S3_BUCKET_NAME')
        self.s3_base_folder = os.getenv('S3_BASE_FOLDER', '').strip().rstrip('/')
        
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.s3_bucket_name]):
            logger.warning("⚠️ AWS credentials or S3 bucket name not configured")
            self.s3_client = None
            return
        
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
                region_name=self.aws_region
            )
            logger.info("✅ S3 client initialized successfully")
            if self.s3_base_folder:
                logger.info(f"📁 Using S3 base folder: {self.s3_base_folder}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 client: {str(e)}")
            self.s3_client = None
    
    def is_configured(self) -> bool:
        """Check if S3 service is properly configured"""
        return self.s3_client is not None
    
    def generate_s3_key(self, opportunity_id: str, category: str, requirement_name: str, filename: str) -> str:
        """
        Generate S3 key with the specified structure:
        [base_folder/]opportunity_id/category/requirement_name/filename
        
        Example: borrower-documents/006Oz00000EDDYwIAP/Income Verification/Pay Stubs/LOI_Template.xlsx
        """
        # Clean up the path components to ensure they're safe for S3
        clean_opportunity_id = opportunity_id.strip()
        clean_category = category.strip().replace('/', '-')
        clean_requirement = requirement_name.strip().replace('/', '-')
        clean_filename = filename.strip()
        
        # Generate unique filename to prevent overwrites
        file_base, file_ext = os.path.splitext(clean_filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{file_base}_{timestamp}{file_ext}"
        
        # Build S3 key with optional base folder
        path_components = []
        
        if self.s3_base_folder:
            path_components.append(self.s3_base_folder)
        
        path_components.extend([
            clean_opportunity_id,
            clean_category,
            clean_requirement,
            unique_filename
        ])
        
        s3_key = "/".join(path_components)
        
        logger.info(f"📁 Generated S3 key: {s3_key}")
        return s3_key
    
    async def upload_file(
        self, 
        file_content: bytes, 
        opportunity_id: str, 
        category: str, 
        requirement_name: str, 
        filename: str,
        content_type: str = 'application/octet-stream'
    ) -> Dict[str, Any]:
        """
        Upload file to S3 with structured folder organization
        
        Args:
            file_content: The file content as bytes
            opportunity_id: Salesforce opportunity ID
            category: Document category (e.g., "Income Verification")
            requirement_name: Specific requirement (e.g., "Pay Stubs")
            filename: Original filename
            content_type: MIME type of the file
            
        Returns:
            Dict containing upload result with S3 key, URL, etc.
        """
        if not self.is_configured():
            raise Exception("S3 service is not configured. Please check AWS credentials and bucket name.")
        
        try:
            # Generate S3 key with the required structure
            s3_key = self.generate_s3_key(opportunity_id, category, requirement_name, filename)
            
            # Prepare metadata
            metadata = {
                'opportunity-id': opportunity_id,
                'category': category,
                'requirement-name': requirement_name,
                'original-filename': filename,
                'upload-timestamp': datetime.now().isoformat()
            }
            
            # Upload to S3
            logger.info(f"📤 Uploading file to S3: {s3_key}")
            
            self.s3_client.put_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                Metadata=metadata,
                ServerSideEncryption='AES256'  # Enable server-side encryption
            )
            
            # Generate presigned URL for access (valid for 1 hour)
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket_name, 'Key': s3_key},
                ExpiresIn=3600
            )
            
            # Get object info
            object_info = self.s3_client.head_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key
            )
            
            logger.info(f"✅ Successfully uploaded file to S3: {s3_key}")
            
            return {
                'success': True,
                's3_key': s3_key,
                's3_url': f"s3://{self.s3_bucket_name}/{s3_key}",
                'presigned_url': presigned_url,
                'bucket': self.s3_bucket_name,
                'file_size': object_info['ContentLength'],
                'etag': object_info['ETag'].strip('"'),
                'last_modified': object_info['LastModified'].isoformat(),
                'metadata': metadata
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"❌ S3 ClientError ({error_code}): {error_message}")
            raise Exception(f"S3 upload failed: {error_message}")
        
        except NoCredentialsError:
            logger.error("❌ AWS credentials not found")
            raise Exception("AWS credentials not configured")
        
        except Exception as e:
            logger.error(f"❌ Unexpected error during S3 upload: {str(e)}")
            raise Exception(f"S3 upload failed: {str(e)}")
    
    async def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        if not self.is_configured():
            raise Exception("S3 service is not configured")
        
        try:
            logger.info(f"🗑️ Deleting file from S3: {s3_key}")
            
            self.s3_client.delete_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key
            )
            
            logger.info(f"✅ Successfully deleted file from S3: {s3_key}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.warning(f"⚠️ File not found in S3: {s3_key}")
                return True  # Consider it successful if file doesn't exist
            else:
                logger.error(f"❌ S3 delete error ({error_code}): {e.response['Error']['Message']}")
                raise Exception(f"S3 delete failed: {e.response['Error']['Message']}")
        
        except Exception as e:
            logger.error(f"❌ Unexpected error during S3 delete: {str(e)}")
            raise Exception(f"S3 delete failed: {str(e)}")
    
    async def get_file_info(self, s3_key: str) -> Dict[str, Any]:
        """Get information about a file in S3"""
        if not self.is_configured():
            raise Exception("S3 service is not configured")
        
        try:
            object_info = self.s3_client.head_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key
            )
            
            # Generate presigned URL for access
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket_name, 'Key': s3_key},
                ExpiresIn=3600
            )
            
            return {
                's3_key': s3_key,
                's3_url': f"s3://{self.s3_bucket_name}/{s3_key}",
                'presigned_url': presigned_url,
                'file_size': object_info['ContentLength'],
                'etag': object_info['ETag'].strip('"'),
                'last_modified': object_info['LastModified'].isoformat(),
                'content_type': object_info.get('ContentType', 'application/octet-stream'),
                'metadata': object_info.get('Metadata', {})
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise Exception(f"File not found in S3: {s3_key}")
            else:
                raise Exception(f"S3 error: {e.response['Error']['Message']}")
        
        except Exception as e:
            raise Exception(f"Failed to get file info: {str(e)}")
    
    def generate_presigned_url(
        self, 
        s3_key: str, 
        expires_in: int = 3600, 
        response_content_disposition: Optional[str] = None,
        response_content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate a presigned URL for viewing or downloading a file
        
        Args:
            s3_key: S3 key of the file
            expires_in: URL expiration time in seconds (default: 1 hour)
            response_content_disposition: Force download with 'attachment' or inline viewing
            response_content_type: Override content type for viewing
            
        Returns:
            Presigned URL string or None if failed
        """
        if not self.is_configured():
            logger.warning("⚠️ S3 service not configured, returning None")
            return None
        
        try:
            # Build parameters
            params = {'Bucket': self.s3_bucket_name, 'Key': s3_key}
            
            # Add response headers if specified
            if response_content_disposition:
                params['ResponseContentDisposition'] = response_content_disposition
            
            if response_content_type:
                params['ResponseContentType'] = response_content_type
            
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            logger.info(f"✅ Generated presigned URL for: {s3_key}")
            return presigned_url
            
        except Exception as e:
            logger.error(f"❌ Failed to generate presigned URL for {s3_key}: {str(e)}")
            return None 