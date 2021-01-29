#!/bin/bash
cd /home/ubuntu/kibana-7.10.0-linux-aarch64
killall kibana
bin/kibana --allow-root -c config/kibana.yml &
cd /home/ubuntu/aquabot
npm start
