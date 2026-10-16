@echo off
chcp 65001 >nul
echo ========================================================
echo   Đang đẩy mã nguồn KinXSub Keygen lên GitHub...
echo ========================================================
cd /d "%~dp0"
git add .
git commit -m "Update KinXSub Keygen Web" 2>nul
git push -u origin main --force
echo.
if %ERRORLEVEL% EQU 0 (
    echo [OK] Đã đẩy lên GitHub thành công!
) else (
    echo [LOI] Khong the day len GitHub. Vui long kiem tra repo da duoc tao tren https://github.com/new chua.
)
pause
