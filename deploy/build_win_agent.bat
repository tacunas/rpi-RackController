@echo off
REM =========================================================================
REM  Windows Node Monitoring Agent - PyInstaller Executable Builder
REM =========================================================================

echo [1/3] Checking Python environment and installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r ..\agent\requirements.txt pyinstaller

echo.
echo [2/3] Building standalone agent.exe with PyInstaller...
pyinstaller --noconfirm --clean --onefile --noconsole --name "rack-agent" ^
  --add-data "..\agent\agent_config.json;." ^
  ..\agent\agent.py

echo.
echo [3/3] Build finished!
echo Executable generated at: dist\rack-agent.exe
echo Copy dist\rack-agent.exe and agent_config.json to your target Windows node.
pause
