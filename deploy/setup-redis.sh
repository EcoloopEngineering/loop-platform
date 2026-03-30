#!/bin/bash
# Install and configure Redis on EC2 for BullMQ
set -euo pipefail

echo "==> Installing Redis..."
sudo apt-get update
sudo apt-get install -y redis-server

echo "==> Enabling and starting Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

echo "==> Verifying Redis..."
redis-cli ping

echo "==> Redis setup complete."
