FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY behavioral-auth-ml-service/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY behavioral-auth-ml-service/backend ./behavioral-auth-ml-service/backend
COPY behavioral-auth-ml-service/frontend ./behavioral-auth-ml-service/frontend
COPY behavioral-auth-ml-service/data/6a9268397e77cbd6c3c3e886.json behavioral-auth-ml-service/data/6ab3f447e9fa5f05ade70262.json behavioral-auth-ml-service/data/6ab4975852379a75c38844e5.json /app/demo-seeds/ml/data/
COPY behavioral-auth-ml-service/models/6a9268397e77cbd6c3c3e886.joblib behavioral-auth-ml-service/models/6ab3f447e9fa5f05ade70262.joblib behavioral-auth-ml-service/models/6ab4975852379a75c38844e5.joblib /app/demo-seeds/ml/models/
RUN useradd --create-home --uid 10001 bioauth \
    && mkdir -p behavioral-auth-ml-service/data behavioral-auth-ml-service/models \
    && chown -R bioauth:bioauth behavioral-auth-ml-service/data behavioral-auth-ml-service/models
USER bioauth
EXPOSE 8000
# File storage and model cache require one worker per instance.
CMD ["uvicorn", "main:app", "--app-dir", "behavioral-auth-ml-service/backend", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers"]
