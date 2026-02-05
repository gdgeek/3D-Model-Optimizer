# 三维模型优化服务 - 支持 KTX2, USDZ, FBX, STEP 和 DAE
FROM node:20-bookworm-slim

# Install dependencies for KTX-Software, Python (for USD/STEP), and FBX2glTF
RUN apt-get update && apt-get install -y \
    wget \
    cmake \
    build-essential \
    git \
    libzstd-dev \
    python3 \
    python3-pip \
    python3-venv \
    unzip \
    libgl1-mesa-glx \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Download and install pre-built KTX-Software (toktx)
RUN wget -q https://github.com/KhronosGroup/KTX-Software/releases/download/v4.3.2/KTX-Software-4.3.2-Linux-x86_64.tar.bz2 \
    && tar -xjf KTX-Software-4.3.2-Linux-x86_64.tar.bz2 \
    && cp KTX-Software-4.3.2-Linux-x86_64/bin/* /usr/local/bin/ \
    && cp -r KTX-Software-4.3.2-Linux-x86_64/lib/* /usr/local/lib/ \
    && ldconfig \
    && rm -rf KTX-Software-4.3.2-Linux-x86_64* \
    && toktx --version

# Download and install FBX2glTF
RUN wget -q https://github.com/facebookincubator/FBX2glTF/releases/download/v0.13.1/FBX2glTF-linux-x64.zip \
    && unzip FBX2glTF-linux-x64.zip \
    && chmod +x FBX2glTF-linux-x64 \
    && mv FBX2glTF-linux-x64 /usr/local/bin/FBX2glTF \
    && rm FBX2glTF-linux-x64.zip \
    && FBX2glTF --help || true

# Download and install COLLADA2GLTF for DAE conversion
RUN wget -q https://github.com/KhronosGroup/COLLADA2GLTF/releases/download/v2.1.5/COLLADA2GLTF-v2.1.5-linux.zip \
    && unzip COLLADA2GLTF-v2.1.5-linux.zip \
    && chmod +x COLLADA2GLTF-bin \
    && mv COLLADA2GLTF-bin /usr/local/bin/COLLADA2GLTF \
    && rm -rf COLLADA2GLTF-v2.1.5-linux.zip \
    && COLLADA2GLTF --help || true

# Install Python packages for USD and STEP conversion
RUN pip3 install --break-system-packages \
    usd-core \
    cadquery \
    OCP \
    trimesh \
    numpy \
    && python3 -c "from pxr import Usd; print('USD installed successfully')"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --cache /tmp/.npm-cache

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create temp directories
RUN mkdir -p temp/uploads temp/results

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
