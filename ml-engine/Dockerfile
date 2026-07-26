FROM python:3.10-slim

WORKDIR /app/ml-engine

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "generate_and_train.py"]
