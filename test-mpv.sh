#!/bin/bash
apt-get update
apt-get install -y mpv
ldd /usr/bin/mpv | grep "not found"
