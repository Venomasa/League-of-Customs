@echo off
setlocal enabledelayedexpansion
title Building LeagueOfCustoms.exe
echo.
echo ===================================================================
echo   Building Native Standalone LeagueOfCustoms.exe (C# .NET)
echo ===================================================================
echo.

cd /d "%~dp0"

set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" (
    set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

tasklist /fi "imagename eq LeagueOfCustoms.exe" 2>NUL | find /i "LeagueOfCustoms.exe" >NUL
if %ERRORLEVEL% equ 0 (
    echo [WARNING] LeagueOfCustoms.exe is currently running!
    echo Please close LeagueOfCustoms before rebuilding.
    echo.
    pause
    exit /b 1
)

echo [STEP 1/2] Bundling HTML/CSS/JS frontend assets...
python bundle.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Bundling failed!
    pause
    exit /b 1
)

echo [STEP 2/2] Compiling C# Native Executable...
"%CSC%" /nologo /optimize+ /target:winexe /win32icon:assets\app.ico /res:src\index.bundle.html,index.html /r:System.dll,System.Core.dll,System.Drawing.dll,System.Windows.Forms.dll,System.Web.Extensions.dll,System.Management.dll,Microsoft.Web.WebView2.Core.dll,Microsoft.Web.WebView2.WinForms.dll /out:LeagueOfCustoms.exe src\LeagueOfCustoms.cs

if %ERRORLEVEL% equ 0 (
    echo [OK] Built successfully: LeagueOfCustoms.exe
    for %%A in ("LeagueOfCustoms.exe") do (
        set /a sizeKB=%%~zA / 1024
        echo [INFO] Executable Size: %%~zA bytes [~!sizeKB! KB]
    )
) else (
    echo [ERROR] Build failed!
)
echo.
pause
