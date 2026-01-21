# Use Python 3.9 slim image
FROM python:3.9-slim

# Install system dependencies for scapy and networking
RUN apt-get update && apt-get install -y \
    libpcap-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create output directory for logs/captured data
RUN mkdir -p output

# Environment variables
ENV BACKEND_URL=http://backend:3000

# Run the IDS engine
# Note: In production, you'll need to run this container with --net=host and --privileged
ENTRYPOINT ["python", "ids.py"]
CMD ["-m", "models/rf_attack_model.pkl", "-f", "models/selected_features.pkl", "-e", "models/label_encoder.pkl", "--backend-url", "http://backend:3000"]
