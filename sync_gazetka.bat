@echo off
cd /d "C:\Users\Maciek\.gemini\antigravity\scratch\generator-nastepnego-miesiaca"
"C:\Program Files\nodejs\node.exe" "scripts\sync_gazetka.js" >> "sync_gazetka.log" 2>&1
