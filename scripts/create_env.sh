#!/bin/bash

# Exit on error
set -e

#Go to path
cd /home/ec2-user/discounts-hub-api-v2

# Fetch the Instance ID
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
# Fetch the "Environment" tag using AWS CLI
ENVIRONMENT=$(aws ec2 describe-tags --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Environment" --region "$REGION" --query "Tags[0].Value" --output text)



# Create .env file
sudo su
echo "Creating environment file..."
# Fetch all secrets and parse them into environment variables
aws secretsmanager get-secret-value --secret-id "$ENVIRONMENT" --region "$REGION" --query 'SecretString' --output text | jq -r 'to_entries | .[] | .key + "=" + .value' | sudo tee .env > /dev/null
echo "Environment setup complete"