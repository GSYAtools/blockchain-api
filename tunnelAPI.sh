#!/bin/bash

while true
do
    echo "⏳ Iniciando LocalTunnel..."
    lt -p 43862 -s blockchain-api

    echo "❌ LocalTunnel se detuvo o falló. Reintentando en 5 segundos..."
    sleep 5
done
