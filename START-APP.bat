@echo off
REM ============================================================
REM  Learn English App - one-click launcher for Windows
REM  Double-click this file. It moves to its own folder first,
REM  so it works no matter which directory the terminal opens in.
REM ============================================================
chcp 65001 >nul 2>&1
title Learn English App
cd /d "%~dp0"

echo.
echo ============================================================
echo   Learn English App  /  تعلم الانجليزية
echo ============================================================
echo.
echo Folder: %CD%
echo.

if not exist "package.json" (
  echo [ERROR] package.json was not found in this folder.
  echo.
  echo This file must stay next to package.json.
  echo If you opened it from inside the ZIP, extract the ZIP first,
  echo then run START-APP.bat from the extracted folder.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Install it from https://nodejs.org ^(LTS version^), then run this file again.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo Node.js version: %%v
echo.

echo [1/2] Installing dependencies. This takes 1-3 minutes the first time.
echo       Yellow "warn" lines are normal - please wait.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. Read the message above.
  echo Most common cause: no internet connection.
  echo.
  pause
  exit /b 1
)

echo.
echo [2/2] Starting Expo. A QR code will appear below.
echo.
echo   iPhone  : scan the QR code with the normal Camera app
echo   Android : open Expo Go, tap "Scan QR code"
echo.
echo   Phone and PC must be on the SAME Wi-Fi network.
echo   To stop the server press Ctrl+C.
echo.

call npx expo start

echo.
echo Server stopped.
pause
