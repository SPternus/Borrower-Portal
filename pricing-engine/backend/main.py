"""
Ternus Pricing Engine Backend
"""
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import our modules
from config import settings
from database_models import DatabaseManager, Base
import pricing_api

# Setup logging
logger = logging.getLogger("main")

# Database manager instance
db_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global db_manager
    
    logger.info("🚀 Starting Ternus Pricing Engine Service")
    
    try:
        # Initialize database
        db_manager = DatabaseManager(settings.database_url)
        logger.info(f"📊 Connected to database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'Local'}")
        
        # Override the dependency in pricing_api
        def get_db_session_impl():
            """Get database session implementation"""
            if not db_manager:
                raise HTTPException(status_code=500, detail="Database not initialized")
            
            session = db_manager.get_session()
            try:
                yield session
            finally:
                session.close()
        
        # Replace the placeholder function
        pricing_api.get_db_session = get_db_session_impl
        
        logger.info("✅ Pricing engine initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize pricing engine: {e}")
        raise
    finally:
        # Cleanup
        if db_manager:
            db_manager.close()
            logger.info("🔌 Database connection closed")

# Create FastAPI app
app = FastAPI(
    title="Ternus Pricing Engine",
    description="Real Estate Loan Pricing Engine with Dynamic Rate Calculation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        if db_manager:
            session = db_manager.get_session()
            session.execute(text("SELECT 1"))
            session.close()
            db_status = "connected"
        else:
            db_status = "not_initialized"
        
        return {
            "status": "healthy",
            "service": "Ternus Pricing Engine",
            "version": "1.0.0",
            "database": db_status,
            "pricing_engine_status": "ready"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "Ternus Pricing Engine",
                "version": "1.0.0",
                "database": "disconnected",
                "error": str(e)
            }
        )

# System info endpoint
@app.get("/info")
async def system_info():
    """Get system configuration information"""
    return {
        "service": "Ternus Pricing Engine",
        "version": "1.0.0",
        "environment": settings.environment,
        "database_name": settings.database_url.split("/")[-1] if "/" in settings.database_url else "unknown",
        "features": {
            "audit_logging": settings.enable_audit_logging,
            "excel_integration": settings.enable_excel_integration,
            "rate_precision": settings.rate_precision,
            "cache_duration_minutes": settings.cache_duration_minutes
        },
        "rate_limits": {
            "max_adjustment": settings.max_rate_adjustment,
            "min_adjustment": settings.min_rate_adjustment,
            "default_margin": settings.default_margin
        }
    }

# Include pricing router
app.include_router(
    pricing_api.pricing_router,
    prefix=settings.api_prefix,
    tags=["pricing"]
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Ternus Pricing Engine API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "info": "/info"
    }

# Request middleware for logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests for audit purposes"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Log request details
    process_time = time.time() - start_time
    logger.info(
        f"{request.client.host} - {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Time: {process_time:.3f}s"
    )
    
    return response

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Ternus Pricing Engine directly")
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True if settings.environment == "development" else False,
        log_level=settings.log_level.lower()
    ) 