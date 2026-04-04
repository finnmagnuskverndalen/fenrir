FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nmap \
    whois \
    dnsutils \
    masscan \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create reports directory
RUN mkdir -p reports

EXPOSE 8765

CMD ["python", "backend/main.py"]
