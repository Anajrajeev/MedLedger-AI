FROM python:3.11-slim

WORKDIR /app

COPY . /app

# Set PYTHONPATH to ensure imports work correctly
ENV PYTHONPATH=/app

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "agents/run_appointment_agent.py"]

