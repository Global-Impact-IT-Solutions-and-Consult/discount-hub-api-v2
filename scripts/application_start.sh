#!/bin/bash
sudo su

# Navigate to the application directory
cd /home/ec2-user/discounts-hub-api-v2

# Start the application with PM2
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

#start our node app in the background
# npm start > app.out.log 2> app.err.log < /dev/null & 
sudo npm install
# Start the application using PM2
sudo pm2 start pm2.config.js --env production

# Make sure the app restarts after reboot
# sudo pm2 save
# sudo pm2 startup