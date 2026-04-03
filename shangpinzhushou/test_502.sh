#!/bin/bash
pm2 status
pm2 logs payforme --lines 50 --nostream
