@echo off
REM ============================================================
REM  Build an installable Android APK using EAS Build.
REM  Double-click this file. It moves to its own folder first.
REM
REM  The build itself runs on Expo's servers - you do NOT need
REM  Android Studio, a Mac, or any paid account.
REM ============================================================
chcp 65001 >nul 2>&1
title Build Android APK
cd /d "%~dp0"

echo.
echo ============================================================
echo   Build Android APK  /  بناء نسخة اندرويد
echo ============================================================
echo.
echo Folder: %CD%
echo.

if not exist "package.json" (
  echo [ERROR] package.json was not found in this folder.
  echo Extract the ZIP first, then run this file from the extracted folder.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install it from https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [SETUP] Installing dependencies first. This takes 1-3 minutes.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Read the message above.
    pause
    exit /b 1
  )
  echo.
)

echo ------------------------------------------------------------
echo  STEP 1 of 3 - Sign in to Expo
echo ------------------------------------------------------------
echo.
echo  A free account is required. If you do not have one, create it
echo  at https://expo.dev/signup first, then come back here.
echo.
echo  Type your username and password when asked.
echo  NOTE: the password stays invisible while you type - that is
echo  normal, just type it and press Enter.
echo.
pause
call npx --yes eas-cli@21 login
if errorlevel 1 (
  echo.
  echo [ERROR] Login failed. Run this file again and re-enter your details.
  pause
  exit /b 1
)

echo.
echo ------------------------------------------------------------
echo  STEP 2 of 3 - Link this project to your Expo account
echo ------------------------------------------------------------
echo.
echo  Answer "y" if it asks to create a new project.
echo.
call npx --yes eas-cli@21 init
if errorlevel 1 (
  echo.
  echo [ERROR] Project setup failed. Read the message above.
  pause
  exit /b 1
)

echo.
echo ------------------------------------------------------------
echo  STEP 3 of 3 - Build the APK
echo ------------------------------------------------------------
echo.
echo  If it asks to generate a new Android Keystore, answer "y".
echo  Expo stores it for you - you need it for every future update,
echo  so never delete the project from your Expo account.
echo.
echo  The build runs on Expo servers and takes 10-20 minutes.
echo  You can close this window once it says the build is queued -
echo  progress is also visible at https://expo.dev
echo.
pause
call npx --yes eas-cli@21 build --platform android --profile preview

echo.
echo ============================================================
echo  Done. Copy the build link shown above and open it on your
echo  Android phone to download and install the APK.
echo ============================================================
echo.
pause
