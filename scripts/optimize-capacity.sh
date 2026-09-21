#!/bin/bash

# AlikoHub Capacity Optimization Script
# Goals: 
# 1. Create a swap file if it doesn't exist to prevent OOM.
# 2. Clean up dangling docker images to free disk space.
# 3. Check current RAM/CPU status.

set -e

echo "--- 📊 Current Resource Status ---"
free -h
df -h /

echo ""
echo "--- 🛠️ Checking Swap Space ---"
if [ $(swapon --show | wc -l) -gt 0 ]; then
    echo "✅ Swap space is already enabled."
else
    echo "⚠️ No swap space detected. Creating a 4GB swap file..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "✅ 4GB Swap file created and enabled."
fi

echo ""
echo "--- 🧹 Cleaning up Docker resources ---"
docker system prune -f --volumes
echo "✅ Docker cleanup completed."

echo ""
echo "--- 📊 Final Resource Status ---"
free -h
swapon --show
